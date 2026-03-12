import { assetPath } from '../../utils/sprites';
import { useEffect, useState, useCallback } from 'react';

export interface DistributeAnimationItem {
  kind: 'distribute';
  id: string;
  playerId: string;
  resources: Record<string, number>;
  isMe: boolean;
}

export interface TradeAnimationItem {
  kind: 'trade';
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  offering: Record<string, number>;   // what fromPlayer gives
  requesting: Record<string, number>; // what fromPlayer receives
  myPlayerId: string;
  isSteal?: boolean;
}

export type ResourceAnimationItem = DistributeAnimationItem | TradeAnimationItem;

interface ResourceAnimationProps {
  items: ResourceAnimationItem[];
  onComplete: (id: string) => void;
}

const RESOURCE_COLORS: Record<string, string> = {
  brick: '#c45a2c',
  lumber: '#2d6b2d',
  ore: '#6b6b6b',
  grain: '#d4a832',
  wool: '#7bc67b',
  devcard: '#6b21a8',
};

const RESOURCE_CARD_SPRITES: Record<string, string> = {
  brick: assetPath('assets/sprites/card-brick.png'),
  lumber: assetPath('assets/sprites/card-wood.png'),
  ore: assetPath('assets/sprites/card-ore.png'),
  grain: assetPath('assets/sprites/card-grain.png'),
  wool: assetPath('assets/sprites/card-sheep.png'),
  devcard: assetPath('assets/sprites/dev-card-back.png'),
};

interface FlyingCard {
  id: string;
  resource: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  delay: number;
  animating: boolean;
}

export function ResourceAnimation({ items, onComplete }: ResourceAnimationProps) {
  const [cards, setCards] = useState<FlyingCard[]>([]);

  const getPlayerPos = useCallback((playerId: string) => {
    const el = document.querySelector(`[data-player-id="${CSS.escape(playerId)}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return { x: window.innerWidth - 160, y: window.innerHeight / 2 };
  }, []);

  const getPlayerAreaPos = useCallback(() => {
    const el = document.querySelector('[data-player-id]');
    if (el) {
      const parent = el.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 3 };
      }
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return { x: window.innerWidth - 160, y: window.innerHeight / 3 };
  }, []);

  const getHandPos = useCallback(() => {
    return { x: 80, y: window.innerHeight - 40 };
  }, []);

  const getBankPos = useCallback((offset: number) => {
    const bankEl = document.querySelector('[data-bank-display]');
    if (bankEl) {
      const rect = bankEl.getBoundingClientRect();
      return { x: rect.left + rect.width / 2 + offset * 15, y: rect.top + rect.height / 2 };
    }
    return { x: window.innerWidth - 160, y: window.innerHeight / 2 };
  }, []);

  const buildCardsForResources = useCallback((
    resources: Record<string, number>,
    startPos: { x: number; y: number },
    endPos: { x: number; y: number },
    idPrefix: string,
    baseDelay: number,
  ): FlyingCard[] => {
    const result: FlyingCard[] = [];
    let idx = 0;
    for (const [resource, count] of Object.entries(resources)) {
      if (count <= 0) continue;
      for (let i = 0; i < count; i++) {
        result.push({
          id: `${idPrefix}-${resource}-${i}`,
          resource,
          startX: startPos.x + (idx - 1) * 10,
          startY: startPos.y,
          endX: endPos.x + (idx - 1) * 8,
          endY: endPos.y,
          delay: baseDelay + idx * 80,
          animating: false,
        });
        idx++;
      }
    }
    return result;
  }, []);

  const processItem = useCallback((item: ResourceAnimationItem): FlyingCard[] => {
    if (item.kind === 'trade') {
      const newCards: FlyingCard[] = [];
      const handPos = getHandPos();
      const iAmFrom = item.fromPlayerId === item.myPlayerId;
      const otherPlayerId = iAmFrom ? item.toPlayerId : item.fromPlayerId;
      const otherPos = item.isSteal ? getPlayerAreaPos() : getPlayerPos(otherPlayerId);

      // Cards I give: from my hand -> their player tab
      const myGiving = iAmFrom ? item.offering : item.requesting;
      newCards.push(...buildCardsForResources(myGiving, handPos, otherPos, `${item.id}-give`, 0));

      // Cards I receive: from their player tab -> my hand
      const myReceiving = iAmFrom ? item.requesting : item.offering;
      const giveCount = newCards.length;
      const receiveDelay = giveCount * 80 + 200; // slight pause between give/receive
      newCards.push(...buildCardsForResources(myReceiving, otherPos, handPos, `${item.id}-recv`, receiveDelay));

      return newCards;
    }

    // Distribute animation (existing logic)
    const newCards: FlyingCard[] = [];
    let cardIndex = 0;

    let endX: number;
    let endY: number;

    if (item.isMe) {
      const hand = getHandPos();
      endX = hand.x;
      endY = hand.y;
    } else {
      const pos = getPlayerPos(item.playerId);
      endX = pos.x;
      endY = pos.y;
    }

    for (const [resource, count] of Object.entries(item.resources)) {
      if (count <= 0) continue;
      for (let i = 0; i < count; i++) {
        const cardId = `${item.id}-${resource}-${i}`;

        let startX: number;
        let startY: number;

        if (item.isMe) {
          const bankPos = getBankPos(cardIndex - 1);
          startX = bankPos.x;
          startY = bankPos.y;
        } else {
          startX = -40;
          startY = endY + (Math.random() * 30 - 15);
        }

        newCards.push({
          id: cardId,
          resource,
          startX,
          startY,
          endX: endX + (cardIndex - 1) * 8,
          endY,
          delay: cardIndex * 80,
          animating: false,
        });
        cardIndex++;
      }
    }

    return newCards;
  }, [getPlayerPos, getPlayerAreaPos, getHandPos, getBankPos, buildCardsForResources]);

  useEffect(() => {
    if (items.length === 0) return;

    const allNewCards: FlyingCard[] = [];
    for (const item of items) {
      allNewCards.push(...processItem(item));
    }

    if (allNewCards.length === 0) {
      for (const item of items) onComplete(item.id);
      return;
    }

    setCards((prev) => [...prev, ...allNewCards]);

    // Trigger animation after mount
    const animateTimer = requestAnimationFrame(() => {
      setCards((prev) =>
        prev.map((c) =>
          allNewCards.some((nc) => nc.id === c.id) ? { ...c, animating: true } : c
        )
      );
    });

    // Cleanup after animation finishes
    const maxDelay = Math.max(...allNewCards.map((c) => c.delay));
    const cleanupTimer = setTimeout(() => {
      setCards((prev) => prev.filter((c) => !allNewCards.some((nc) => nc.id === c.id)));
      for (const item of items) onComplete(item.id);
    }, maxDelay + 1290); // fire onComplete 300ms before animation visually ends

    return () => {
      cancelAnimationFrame(animateTimer);
      clearTimeout(cleanupTimer);
    };
  }, [items, onComplete, processItem]);

  if (cards.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {cards.map((card) => {
        const sprite = RESOURCE_CARD_SPRITES[card.resource];
        return (
          <div
            key={card.id}
            className="absolute rounded-lg shadow-lg overflow-hidden"
            style={{
              width: 40,
              height: 58,
              left: card.animating ? card.endX - 20 : card.startX - 20,
              top: card.animating ? card.endY - 29 : card.startY - 29,
              transition: `left 1540ms cubic-bezier(0.4, 0, 0.2, 1) ${card.delay}ms, top 1540ms cubic-bezier(0.4, 0, 0.2, 1) ${card.delay}ms`,
              zIndex: 60,
            }}
          >
            {sprite ? (
              <img src={sprite} alt={card.resource} className="w-full h-full object-cover" draggable={false} />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center border border-white/30"
                style={{ backgroundColor: RESOURCE_COLORS[card.resource] || '#666' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
