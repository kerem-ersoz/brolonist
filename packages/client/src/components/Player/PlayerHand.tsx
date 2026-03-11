import { useTranslation } from 'react-i18next';

interface PlayerHandProps {
  resources: Record<string, number>;
  developmentCards: Array<{ type: string }>;
  roadsBuilt: number;
  settlementsBuilt: number;
  citiesBuilt: number;
  victoryPoints: number;
  onCardClick: (resource: string) => void;
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

export function PlayerHand({
  resources,
  developmentCards,
  roadsBuilt,
  settlementsBuilt,
  citiesBuilt,
  victoryPoints,
  onCardClick,
}: PlayerHandProps) {
  const { t } = useTranslation();

  // Build individual card list from resource counts
  const cards: Array<{ resource: string; index: number }> = [];
  for (const r of RESOURCE_ORDER) {
    const count = resources[r] ?? 0;
    for (let i = 0; i < count; i++) {
      cards.push({ resource: r, index: i });
    }
  }

  const totalCards = cards.length;
  // Fan: each card is offset by a rotation based on position
  const maxRotation = Math.min(totalCards * 2, 30);
  const cardOverlap = Math.min(40, totalCards > 1 ? 300 / totalCards : 60);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      {/* Stats bar above the hand */}
      <div className="pointer-events-auto flex items-center justify-center gap-4 px-4 py-1 text-xs text-gray-300">
        <span className="bg-gray-800/80 backdrop-blur rounded px-2 py-0.5 font-semibold text-yellow-400">
          🏆 VP: {victoryPoints}
        </span>
        <span className="bg-gray-800/80 backdrop-blur rounded px-2 py-0.5">
          🛣️ {15 - roadsBuilt}
        </span>
        <span className="bg-gray-800/80 backdrop-blur rounded px-2 py-0.5">
          🏠 {5 - settlementsBuilt}
        </span>
        <span className="bg-gray-800/80 backdrop-blur rounded px-2 py-0.5">
          🏙️ {4 - citiesBuilt}
        </span>
      </div>

      {/* Card fan area */}
      <div className="pointer-events-auto flex items-end justify-center pb-2 px-4" style={{ minHeight: 100 }}>
        {/* Resource cards */}
        <div className="relative flex items-end justify-center" style={{ height: 95 }}>
          {cards.map((card, i) => {
            const center = (totalCards - 1) / 2;
            const offset = i - center;
            const rotation = totalCards > 1 ? (offset / center || 0) * maxRotation : 0;
            const translateX = offset * cardOverlap;
            const translateY = Math.abs(offset) * 3;

            return (
              <button
                key={`${card.resource}-${card.index}`}
                onClick={() => onCardClick(card.resource)}
                className="absolute transition-transform duration-150 hover:-translate-y-3 hover:z-50 cursor-pointer rounded-lg shadow-lg border-2 border-white/20 flex flex-col items-center justify-center select-none"
                style={{
                  width: 52,
                  height: 75,
                  backgroundColor: RESOURCE_COLORS[card.resource],
                  transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotation}deg)`,
                  transformOrigin: 'bottom center',
                  zIndex: i,
                }}
                title={t(`resources.${card.resource}`)}
              >
                <span className="text-xl leading-none">{RESOURCE_ICONS[card.resource]}</span>
                <span className="text-[10px] text-white/80 font-semibold mt-1">
                  {t(`resources.${card.resource}`)}
                </span>
              </button>
            );
          })}

          {totalCards === 0 && (
            <div className="text-gray-500 text-sm italic pb-4">{t('trade.noResources', 'No resources')}</div>
          )}
        </div>

        {/* Dev cards to the right */}
        {developmentCards.length > 0 && (
          <div className="flex items-end ml-6 gap-1 pb-1">
            {developmentCards.map((card, i) => (
              <div
                key={i}
                className="rounded border border-purple-400/40 bg-purple-900 flex items-center justify-center shadow-md"
                style={{ width: 36, height: 50 }}
                title={t(`devCards.${card.type}`)}
              >
                <span className="text-xs text-purple-200">📜</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
