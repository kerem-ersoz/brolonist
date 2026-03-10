import { useTranslation } from 'react-i18next';

interface PlayerPanelProps {
  resources: Record<string, number>;
  developmentCards: Array<{ type: string }>;
  roadsBuilt: number;
  settlementsBuilt: number;
  citiesBuilt: number;
  victoryPoints: number;
}

const RESOURCE_ICONS: Record<string, string> = { brick: '🧱', lumber: '🪵', ore: '⛏️', grain: '🌾', wool: '🐑' };

export function PlayerPanel({ resources, developmentCards, roadsBuilt, settlementsBuilt, citiesBuilt, victoryPoints }: PlayerPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-white font-semibold">VP: {victoryPoints}</span>
      </div>
      {/* Resources */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(resources).map(([type, count]) => (
          <div key={type} className="flex items-center gap-1 bg-gray-700 rounded px-2 py-1 text-sm">
            <span>{RESOURCE_ICONS[type]}</span>
            <span className="text-white font-mono">{count}</span>
          </div>
        ))}
      </div>
      {/* Dev cards */}
      {developmentCards.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {developmentCards.map((card, i) => (
            <div key={i} className="bg-purple-900 text-purple-200 text-xs px-2 py-1 rounded">
              {t(`devCards.${card.type}`)}
            </div>
          ))}
        </div>
      )}
      {/* Building inventory */}
      <div className="flex gap-3 text-xs text-gray-400">
        <span>🛣️ {15 - roadsBuilt}</span>
        <span>🏠 {5 - settlementsBuilt}</span>
        <span>🏙️ {4 - citiesBuilt}</span>
      </div>
    </div>
  );
}
