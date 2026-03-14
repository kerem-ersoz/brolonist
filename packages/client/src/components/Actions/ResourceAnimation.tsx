import { assetPath } from '../../utils/sprites';
import { useEffect, useState, useCallback, useRef } from 'react';

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

export interface OutgoingAnimationItem {
  kind: 'outgoing';
  id: string;
  resources: Record<string, number>;
}

export type ResourceAnimationItem = DistributeAnimationItem | TradeAnimationItem | OutgoingAnimationItem;

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
  fading: boolean;
}

const CARD_WIDTH = 52;
const CARD_HEIGHT = 75;
const CARD_OVERLAP = 28;
const CARD_SPACING = CARD_WIDTH - CARD_OVERLAP; // 24px

/** Get the hand container's screen rect and current card count */
function getHandSlotInfo(): { left: number; bottom: number; cardCount: number } {
  const el = document.querySelector('[data-hand-container]');
  if (el) {
    const rect = el.getBoundingClientRect();
    return { left: rect.left, bottom: rect.bottom, cardCount: el.children.length };
  }
  return { left: 30, bottom: window.innerHeight - 16, cardCount: 0 };
}

/** Get the screen position (center) of the card slot at the given index in the hand */
function getCardSlotPos(slotIndex: number): { x: number; y: number } {
  const info = getHandSlotInfo();
  return {
    x: info.left + slotIndex * CARD_SPACING + CARD_WIDTH / 2,
    y: info.bottom - CARD_HEIGHT / 2,
  };
}

const RESOURCE_ORDER = ['lumber', 'brick', 'wool', 'grain', 'ore'] as const;

/** Compute the sorted slot indices for incoming cards, given the current hand state.
 * Returns an array of slot indices (one per incoming card) in the order they'll appear in the sorted hand. */
function getSortedSlotIndices(incoming: Record<string, number>): number[] {
  // Read current hand from DOM: count cards per resource by their data attribute
  const el = document.querySelector('[data-hand-container]');
  const currentCounts: Record<string, number> = { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 };
  if (el) {
    for (const child of Array.from(el.children)) {
      const btn = child.querySelector('button');
      const title = btn?.getAttribute('title')?.toLowerCase() || '';
      for (const r of RESOURCE_ORDER) {
        if (title.includes(r)) { currentCounts[r]++; break; }
      }
    }
  }

  // Build the final sorted hand with markers for which cards are new
  const slots: Array<{ resource: string; isNew: boolean }> = [];
  for (const r of RESOURCE_ORDER) {
    const existing = currentCounts[r] || 0;
    const added = incoming[r] || 0;
    for (let i = 0; i < existing; i++) slots.push({ resource: r, isNew: false });
    for (let i = 0; i < added; i++) slots.push({ resource: r, isNew: true });
  }

  // Extract the indices of new cards in order
  const indices: number[] = [];
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].isNew) indices.push(i);
  }
  return indices;
}

export function ResourceAnimation({ items, onComplete }: ResourceAnimationProps) {
  const [cards, setCards] = useState<FlyingCard[]>([]);
  const processedIds = useRef(new Set<string>());

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
          fading: false,
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

      // Cards I give: slide out of hand upward
      const myGiving = iAmFrom ? item.offering : item.requesting;
      let giveIdx = 0;
      for (const [resource, count] of Object.entries(myGiving)) {
        if (count <= 0) continue;
        for (let i = 0; i < count; i++) {
          newCards.push({
            id: `${item.id}-give-${resource}-${i}`,
            resource,
            startX: handPos.x + giveIdx * 30,
            startY: handPos.y,
            endX: otherPos.x + (giveIdx - 1) * 8,
            endY: otherPos.y,
            delay: giveIdx * 250,
            animating: false,
            fading: false,
          });
          giveIdx++;
        }
      }

      // Cards I receive: slide into hand slot positions sequentially
      const myReceiving = iAmFrom ? item.requesting : item.offering;
      const receiveBaseDelay = giveIdx * 250 + 300;
      const recvSlots = getSortedSlotIndices(myReceiving);
      let recvIdx = 0;
      for (const [resource, count] of Object.entries(myReceiving)) {
        if (count <= 0) continue;
        for (let i = 0; i < count; i++) {
          const slotPos = getCardSlotPos(recvSlots[recvIdx] ?? recvIdx);
          newCards.push({
            id: `${item.id}-recv-${resource}-${i}`,
            resource,
            startX: slotPos.x,
            startY: slotPos.y - 120,
            endX: slotPos.x,
            endY: slotPos.y,
            delay: receiveBaseDelay + recvIdx * 250,
            animating: false,
            fading: false,
          });
          recvIdx++;
        }
      }

      return newCards;
    }

    // Outgoing items are animated inline in PlayerHand; complete after animation
    if (item.kind === 'outgoing') {
      return [];
    }

    // Distribute animation: my cards are handled inline in PlayerHand gaps
    if (item.isMe) {
      return [];
    }

    // Opponent receives — fly to their player tab
    const newCards: FlyingCard[] = [];
    let cardIndex = 0;
    {
      const pos = getPlayerPos(item.playerId);
      for (const [resource, count] of Object.entries(item.resources)) {
        if (count <= 0) continue;
        for (let i = 0; i < count; i++) {
          newCards.push({
            id: `${item.id}-${resource}-${i}`,
            resource,
            startX: -40,
            startY: pos.y + (Math.random() * 30 - 15),
            endX: pos.x + (cardIndex - 1) * 8,
            endY: pos.y,
            delay: cardIndex * 150,
            animating: false,
            fading: false,
          });
          cardIndex++;
        }
      }
    }

    return newCards;
  }, [getPlayerPos, getPlayerAreaPos, getHandPos, getBankPos, buildCardsForResources]);

  useEffect(() => {
    // Clean up processedIds for items that have been removed
    const currentIds = new Set(items.map(it => it.id));
    for (const id of processedIds.current) {
      if (!currentIds.has(id)) processedIds.current.delete(id);
    }

    if (items.length === 0) return;

    // Only process items we haven't seen before
    const newItems = items.filter(it => !processedIds.current.has(it.id));
    if (newItems.length === 0) return;

    for (const item of newItems) processedIds.current.add(item.id);

    const allNewCards: FlyingCard[] = [];
    for (const item of newItems) {
      allNewCards.push(...processItem(item));
    }

    if (allNewCards.length === 0) {
      // Distribute-to-me items are animated inline in PlayerHand; complete after their animation finishes
      const inlineItems = newItems.filter(it => (it.kind === 'distribute' && it.isMe) || it.kind === 'outgoing');
      const otherItems = newItems.filter(it => !((it.kind === 'distribute' && it.isMe) || it.kind === 'outgoing'));
      for (const item of otherItems) onComplete(item.id);
      if (inlineItems.length > 0) {
        const incomingItems = inlineItems.filter(it => it.kind === 'distribute');
        const outgoingItems = inlineItems.filter(it => it.kind === 'outgoing');

        const incomingCards = incomingItems.reduce((sum, it) => sum + Object.values(it.resources).reduce((a, b) => a + b, 0), 0);
        const outgoingCards = outgoingItems.reduce((sum, it) => sum + Object.values(it.resources).reduce((a, b) => a + b, 0), 0);

        const incomingDuration = incomingCards > 0 ? Math.max(incomingCards - 1, 0) * 250 + 500 - 200 : 0;
        const outgoingDuration = outgoingCards > 0 ? Math.max(outgoingCards - 1, 0) * 250 + 800 + 300 : 0;

        const inlineDuration = Math.max(incomingDuration, outgoingDuration);
        setTimeout(() => {
          for (const item of inlineItems) onComplete(item.id);
        }, inlineDuration);
      }
      return;
    }

    setCards((prev) => [...prev, ...allNewCards]);

    // Trigger animation after mount
    requestAnimationFrame(() => {
      setCards((prev) =>
        prev.map((c) =>
          allNewCards.some((nc) => nc.id === c.id) ? { ...c, animating: true } : c
        )
      );
    });

    // Fire onComplete 200ms before animation visually ends
    const maxDelay = Math.max(...allNewCards.map((c) => c.delay));
    const animDuration = 500;
    const earlyMs = 200;

    setTimeout(() => {
      for (const item of newItems) onComplete(item.id);
    }, maxDelay + animDuration - earlyMs);

    // Start fade-out when animation finishes, then remove elements after fade
    setTimeout(() => {
      setCards((prev) =>
        prev.map((c) =>
          allNewCards.some((nc) => nc.id === c.id) ? { ...c, fading: true } : c
        )
      );
      setTimeout(() => {
        setCards((prev) => prev.filter((c) => !allNewCards.some((nc) => nc.id === c.id)));
      }, 250);
    }, maxDelay + animDuration);
  }, [items, onComplete, processItem]);

  if (cards.length === 0) return null;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none overflow-hidden">
      {cards.map((card) => {
        const sprite = RESOURCE_CARD_SPRITES[card.resource];
        return (
          <div
            key={card.id}
            className="absolute rounded-lg shadow-lg overflow-hidden"
            style={{
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              left: card.animating ? card.endX - CARD_WIDTH / 2 : card.startX - CARD_WIDTH / 2,
              top: card.animating ? card.endY - CARD_HEIGHT / 2 : card.startY - CARD_HEIGHT / 2,
              opacity: card.fading ? 0 : card.animating ? 1 : 0,
              transition: `left 500ms cubic-bezier(0.25, 0.1, 0.25, 1) ${card.delay}ms, top 500ms cubic-bezier(0.25, 0.1, 0.25, 1) ${card.delay}ms, opacity ${card.fading ? '200ms' : '200ms'} ease ${card.fading ? '0ms' : card.delay + 'ms'}`,
              zIndex: 1,
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
