import { assetPath } from '../../utils/sprites';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '../../store/notificationStore';

interface PlayerHandProps {
  resources: Record<string, number>;
  developmentCards: Array<{ type: string; turnPurchased?: number }>;
  turnNumber: number;
  isMyTurn: boolean;
  devCardPlayedThisTurn: boolean;
  roadsBuilt: number;
  settlementsBuilt: number;
  citiesBuilt: number;
  victoryPoints: number;
  onCardClick: (resource: string) => void;
  onPlayDevCard: (cardType: string, params?: Record<string, unknown>) => void;
  onSelectionChange?: (selected: Record<string, number>) => void;
  clearSelection?: number;
  discardMode?: boolean;
  discardMax?: number;
}

import { SpriteImage } from '../Sprites/SpriteImage';

const RESOURCE_ORDER = ['lumber', 'brick', 'wool', 'grain', 'ore'] as const;

const RESOURCE_COLORS: Record<string, string> = {
  brick: '#c45a2c',
  lumber: '#2d6b2d',
  ore: '#6b6b6b',
  grain: '#d4a832',
  wool: '#7bc67b',
};

const RESOURCE_ICONS: Record<string, string> = {
  brick: '🧱',
  lumber: '🪵',
  ore: '⛏️',
  grain: '🌾',
  wool: '🐑',
};

const RESOURCE_SPRITES: Record<string, string> = {
  brick: assetPath('assets/sprites/pip-brick.svg'),
  lumber: assetPath('assets/sprites/pip-wood.svg'),
  ore: assetPath('assets/sprites/pip-ore.svg'),
  grain: assetPath('assets/sprites/pip-grain.svg'),
  wool: assetPath('assets/sprites/pip-sheep.svg'),
};

const RESOURCE_CARD_SPRITES: Record<string, string> = {
  brick: assetPath('assets/sprites/card-brick.png'),
  lumber: assetPath('assets/sprites/card-wood.png'),
  ore: assetPath('assets/sprites/card-ore.png'),
  grain: assetPath('assets/sprites/card-grain.png'),
  wool: assetPath('assets/sprites/card-sheep.png'),
};

const DEV_CARD_STYLES: Record<string, { sprite: string; fallback: string; color: string; border: string; label: string }> = {
  knight: { sprite: assetPath('assets/sprites/dev-knight.png'), fallback: '⚔️', color: 'bg-red-900', border: 'border-red-500/50', label: 'Knight' },
  victory_point: { sprite: assetPath('assets/sprites/dev-vp.png'), fallback: '⭐', color: 'bg-yellow-900', border: 'border-yellow-500/50', label: 'VP' },
  road_building: { sprite: assetPath('assets/sprites/dev-roads.png'), fallback: '🛣️', color: 'bg-green-900', border: 'border-green-500/50', label: 'Roads' },
  year_of_plenty: { sprite: assetPath('assets/sprites/dev-yop.png'), fallback: '🎁', color: 'bg-blue-900', border: 'border-blue-500/50', label: 'Plenty' },
  monopoly: { sprite: assetPath('assets/sprites/dev-mono.png'), fallback: '👑', color: 'bg-purple-900', border: 'border-purple-500/50', label: 'Monopoly' },
};

const DEV_CARD_I18N: Record<string, string> = {
  knight: 'knight',
  victory_point: 'victoryPoint',
  road_building: 'roadBuilding',
  year_of_plenty: 'yearOfPlenty',
  monopoly: 'monopoly',
};

export function PlayerHand({
  resources,
  developmentCards,
  turnNumber,
  isMyTurn,
  devCardPlayedThisTurn,
  roadsBuilt,
  settlementsBuilt,
  citiesBuilt,
  victoryPoints,
  onCardClick,
  onPlayDevCard,
  onSelectionChange,
  clearSelection,
  discardMode,
  discardMax,
}: PlayerHandProps) {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [pendingCard, setPendingCard] = useState<string | null>(null);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [selectedForTrade, setSelectedForTrade] = useState<string[]>([]);

  // Clear selection when clearSelection counter changes
  useEffect(() => {
    setSelectedForTrade([]);
  }, [clearSelection]);

  // Build individual card list from resource counts
  const cards: Array<{ resource: string; index: number }> = [];
  for (const r of RESOURCE_ORDER) {
    const count = resources[r] ?? 0;
    for (let i = 0; i < count; i++) {
      cards.push({ resource: r, index: i });
    }
  }

  const totalCards = cards.length;

  // Group dev cards by type for stacked display
  const devCardGroups = developmentCards.reduce<Record<string, Array<{ type: string; turnPurchased?: number }>>>((acc, card) => {
    if (!acc[card.type]) acc[card.type] = [];
    acc[card.type].push(card);
    return acc;
  }, {});

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">

      {/* Hand area — resource cards + dev cards, pinned to bottom-left */}
      <div className="pointer-events-auto absolute bottom-4 left-6 flex items-end gap-3 z-40">

        {/* Resource cards — horizontal line with overlap */}
        <div className="flex items-end" style={{ minHeight: 80 }}>
          <div className="flex">
            {cards.map((card, i) => {
              const key = `${card.resource}-${card.index}`;
              const selected = selectedForTrade.includes(key);

              return (
                <div
                  key={key}
                  className="transition-all duration-200"
                  style={{ marginLeft: i === 0 ? 0 : -28 }}
                >
                  <button
                    onClick={() => {
                      setSelectedForTrade((prev) => {
                        const isSelected = prev.includes(key);
                        if (!isSelected && discardMode && discardMax != null) {
                          const currentCount = prev.length;
                          if (currentCount >= discardMax) return prev;
                        }
                        const next = isSelected ? prev.filter((k) => k !== key) : [...prev, key];
                        if (onSelectionChange) {
                          const counts: Record<string, number> = { brick: 0, lumber: 0, ore: 0, grain: 0, wool: 0 };
                          for (const k of next) {
                            const res = k.split('-')[0];
                            counts[res] = (counts[res] || 0) + 1;
                          }
                          onSelectionChange(counts);
                        }
                        return next;
                      });
                      if (!discardMode) onCardClick(card.resource);
                    }}
                    className="rounded-lg shadow-lg border border-white/20 flex flex-col items-center justify-center select-none cursor-pointer transition-all duration-200 hover:shadow-xl"
                    style={{
                      width: 52,
                      height: 75,
                      transform: selected ? 'translateY(-14px)' : undefined,
                      zIndex: i,
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.transform = 'translateY(-8px)'; }}
                    onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.transform = ''; }}
                    title={t(`resources.${card.resource}`)}
                  >
                    <SpriteImage src={RESOURCE_CARD_SPRITES[card.resource]} fallback={<span className="text-[20px] leading-none">{RESOURCE_ICONS[card.resource as keyof typeof RESOURCE_ICONS]}</span>} className="w-full h-full object-fill pointer-events-none rounded-lg" />
                  </button>
                </div>
              );
            })}

            {totalCards === 0 && (
              <div className="text-gray-500 text-sm italic pb-4">{t('trade.noResources', 'No resources')}</div>
            )}
          </div>
        </div>

        {/* Dev cards — to the right of resource cards, stacked by type */}
        {developmentCards.length > 0 && (
          <div className="flex items-end gap-1.5 relative">
            {Object.entries(devCardGroups).map(([type, group]) => {
            const style = DEV_CARD_STYLES[type] || DEV_CARD_STYLES.knight;
            const i18nKey = DEV_CARD_I18N[type] || type;
            const isVP = type === 'victory_point';
            const playable = group.find(
              (c) => c.turnPurchased == null || c.turnPurchased < turnNumber,
            );
            const canPlay = isMyTurn && !devCardPlayedThisTurn && !isVP && !!playable;
            const count = group.length;

            return (
              <button
                key={type}
                onClick={() => {
                  if (!canPlay) {
                    if (isVP) return;
                    if (!isMyTurn) addNotification(t('errors.notYourTurn'));
                    else if (devCardPlayedThisTurn) addNotification(t('errors.devCardAlreadyPlayed'));
                    else if (!playable) addNotification(t('errors.devCardBoughtThisTurn'));
                    return;
                  }
                  if (type === 'year_of_plenty' || type === 'monopoly') {
                    setPendingCard(type);
                    setSelectedResources([]);
                  } else {
                    onPlayDevCard(type);
                  }
                }}
                disabled={!canPlay}
                className={`relative rounded-lg border ${canPlay ? 'border-white/30 cursor-pointer hover:-translate-y-2 hover:shadow-xl' : 'border-white/10 opacity-60 cursor-default'} flex flex-col items-center justify-center shadow-lg select-none transition-transform duration-150`}
                style={{ width: 48, height: 76 }}
                title={`${t(`devCards.${i18nKey}`)}${count > 1 ? ` (×${count})` : ''}${isVP ? ' (auto-scored)' : canPlay ? ' — click to play' : !isMyTurn ? ' — not your turn' : devCardPlayedThisTurn ? ' — already played one this turn' : ' — bought this turn'}`}
              >
                <SpriteImage 
                  src={style.sprite} 
                  fallback={<span className="text-lg leading-none">{style.fallback}</span>}
                  alt={style.label} 
                  className="w-full h-full object-fill pointer-events-none" 
                />
                {count > 1 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-white text-gray-900 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow">
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Resource picker popover for Year of Plenty / Monopoly */}
          {pendingCard && (
            <div className="absolute bottom-full mb-2 left-0 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-3 z-60 pointer-events-auto">
              <div className="text-white text-xs font-semibold mb-2 text-center">
                {pendingCard === 'year_of_plenty'
                  ? `${t('devCards.yearOfPlenty')}: Pick 2 resources`
                  : `${t('devCards.monopoly')}: Pick 1 resource`}
              </div>
              <div className="flex gap-1.5 justify-center">
                {RESOURCE_ORDER.map((r) => {
                  const selected = selectedResources.filter((s) => s === r).length;

                  return (
                    <button
                      key={r}
                      onClick={(e) => {
                        e.preventDefault();
                        if (pendingCard === 'monopoly') {
                          onPlayDevCard('monopoly', { resourceType: r });
                          setPendingCard(null);
                          setSelectedResources([]);
                        } else {
                          if (selectedResources.length < 2) {
                            setSelectedResources([...selectedResources, r]);
                          }
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (pendingCard === 'year_of_plenty' && selected > 0) {
                          const idx = selectedResources.lastIndexOf(r);
                          if (idx !== -1) {
                            setSelectedResources(selectedResources.filter((_, i) => i !== idx));
                          }
                        }
                      }}
                      className={`relative w-11 h-14 rounded-lg border-2 flex flex-col items-center justify-center transition-all select-none ${
                        selected > 0
                          ? 'border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.4)] -translate-y-0.5'
                          : (pendingCard === 'year_of_plenty' && selectedResources.length >= 2)
                            ? 'border-white/20 opacity-40 cursor-default'
                            : 'border-white/20 hover:border-white/50 cursor-pointer'
                      }`}
                      title={t(`resources.${r}`)}
                    >
                      <SpriteImage src={RESOURCE_CARD_SPRITES[r]} fallback={<span className="text-lg leading-none drop-shadow">{RESOURCE_ICONS[r as keyof typeof RESOURCE_ICONS]}</span>} className="w-full h-full object-fill pointer-events-none" />
                      {selected > 0 && (
                        <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-[10px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center shadow-md px-0.5">
                          {selected}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {pendingCard === 'year_of_plenty' && (
                <button
                  onClick={() => {
                    if (selectedResources.length === 2) {
                      onPlayDevCard('year_of_plenty', { resource1: selectedResources[0], resource2: selectedResources[1] });
                      setPendingCard(null);
                      setSelectedResources([]);
                    }
                  }}
                  disabled={selectedResources.length !== 2}
                  className={`mt-2 w-full py-1.5 rounded-lg text-xs font-semibold transition-colors
                    ${selectedResources.length === 2 ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' : 'bg-gray-700 text-gray-500 cursor-default'}`}
                >
                  Confirm
                </button>
              )}
              <button
                onClick={() => { setPendingCard(null); setSelectedResources([]); }}
                className="mt-2 w-full text-center text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      </div>
    </div>
  );
}
