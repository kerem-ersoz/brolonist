import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

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

const RESOURCE_ORDER = ['brick', 'lumber', 'ore', 'grain', 'wool'] as const;

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

const DEV_CARD_STYLES: Record<string, { icon: string; color: string; border: string; label: string }> = {
  knight: { icon: '⚔️', color: 'bg-red-900', border: 'border-red-500/50', label: 'Knight' },
  victory_point: { icon: '⭐', color: 'bg-yellow-900', border: 'border-yellow-500/50', label: 'VP' },
  road_building: { icon: '🛣️', color: 'bg-green-900', border: 'border-green-500/50', label: 'Roads' },
  year_of_plenty: { icon: '🎁', color: 'bg-blue-900', border: 'border-blue-500/50', label: 'Plenty' },
  monopoly: { icon: '👑', color: 'bg-purple-900', border: 'border-purple-500/50', label: 'Monopoly' },
};

const DEV_CARD_I18N: Record<string, string> = {
  knight: 'knight',
  victory_point: 'victoryPoint',
  road_building: 'roadBuilding',
  year_of_plenty: 'yearOfPlenty',
  monopoly: 'monopoly',
};

const RESOURCE_ORDER_ALL = ['brick', 'lumber', 'ore', 'grain', 'wool'] as const;

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

      {/* Dev cards — pinned to far left, stacked by type */}
      {developmentCards.length > 0 && (
        <div className="pointer-events-auto absolute bottom-2 left-3 flex items-end gap-1.5 z-40">
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
                  if (!canPlay) return;
                  if (type === 'year_of_plenty' || type === 'monopoly') {
                    setPendingCard(type);
                    setSelectedResources([]);
                  } else {
                    onPlayDevCard(type);
                  }
                }}
                disabled={!canPlay}
                className={`relative rounded-lg border-2 ${style.color} ${style.border} flex flex-col items-center justify-center shadow-lg select-none transition-transform duration-150
                  ${canPlay ? 'cursor-pointer hover:-translate-y-2 hover:shadow-xl' : 'opacity-60 cursor-default'}`}
                style={{ width: 48, height: 68 }}
                title={`${t(`devCards.${i18nKey}`)}${count > 1 ? ` (×${count})` : ''}${isVP ? ' (auto-scored)' : canPlay ? ' — click to play' : !isMyTurn ? ' — not your turn' : devCardPlayedThisTurn ? ' — already played one this turn' : ' — bought this turn'}`}
              >
                <span className="text-lg leading-none">{style.icon}</span>
                <span className="text-[9px] text-white/80 font-semibold mt-0.5 leading-tight text-center">
                  {style.label}
                </span>
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
              <div className="flex gap-2 justify-center">
                {RESOURCE_ORDER_ALL.map((r) => {
                  const selected = selectedResources.filter((s) => s === r).length;

                  return (
                    <button
                      key={r}
                      onClick={() => {
                        if (pendingCard === 'monopoly') {
                          onPlayDevCard('monopoly', { resourceType: r });
                          setPendingCard(null);
                          setSelectedResources([]);
                        } else {
                          const next = [...selectedResources, r];
                          if (next.length <= 2) {
                            setSelectedResources(next);
                          }
                        }
                      }}
                      disabled={pendingCard === 'year_of_plenty' ? selectedResources.length >= 2 : false}
                      className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border transition-colors
                        ${(pendingCard === 'year_of_plenty' ? selectedResources.length < 2 : true) ? 'border-gray-500 hover:border-white hover:bg-gray-700 cursor-pointer' : 'border-gray-700 opacity-40 cursor-default'}
                        ${selected > 0 ? 'bg-gray-700 border-white ring-1 ring-white/40' : ''}`}
                    >
                      <span className="text-lg">{RESOURCE_ICONS[r]}</span>
                      <span className="text-[10px] text-gray-300">{t(`resources.${r}`)}</span>
                      {selected > 0 && <span className="text-[9px] text-yellow-400 font-bold">×{selected}</span>}
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

      {/* Resource cards — horizontal line with overlap */}
      <div className="pointer-events-auto flex justify-center pb-2 px-4" style={{ minHeight: 90 }}>
        <div className="flex justify-center">
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
                      // In discard mode, cap the selection at discardMax
                      if (!isSelected && discardMode && discardMax != null) {
                        const currentCount = prev.length;
                        if (currentCount >= discardMax) return prev;
                      }
                      const next = isSelected ? prev.filter((k) => k !== key) : [...prev, key];
                      // Compute resource counts from selection
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
                  className="rounded-lg shadow-lg border-2 border-white/20 flex flex-col items-center justify-center select-none cursor-pointer transition-all duration-200 hover:-translate-y-2 hover:shadow-xl"
                  style={{
                    width: 52,
                    height: 75,
                    backgroundColor: RESOURCE_COLORS[card.resource],
                    transform: selected ? 'translateY(-14px)' : 'translateY(0)',
                    zIndex: i,
                    position: 'relative',
                  }}
                  title={t(`resources.${card.resource}`)}
                >
                  <span className="text-xl leading-none">{RESOURCE_ICONS[card.resource]}</span>
                  <span className="text-[10px] text-white/80 font-semibold mt-1">
                    {t(`resources.${card.resource}`)}
                  </span>
                </button>
              </div>
            );
          })}

          {totalCards === 0 && (
            <div className="text-gray-500 text-sm italic pb-4">{t('trade.noResources', 'No resources')}</div>
          )}
        </div>
      </div>
    </div>
  );
}
