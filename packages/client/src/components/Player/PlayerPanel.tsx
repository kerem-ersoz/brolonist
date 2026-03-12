import { useTranslation } from 'react-i18next';
import { RESOURCE_SPRITES, ICONS } from '../../utils/sprites';
import { SpriteImage } from '../Sprites/SpriteImage';

interface PlayerPanelProps {
  resources: Record<string, number>;
  developmentCards: Array<{ type: string }>;
  roadsBuilt: number;
  settlementsBuilt: number;
  citiesBuilt: number;
  victoryPoints: number;
}

const RESOURCES = ['brick', 'lumber', 'ore', 'grain', 'wool'] as const;
const RESOURCE_EMOJI: Record<string, string> = {
  brick: '🧱', lumber: '🪵', ore: '⛏️', grain: '🌾', wool: '🐑',
};

export function PlayerPanel({ resources, developmentCards, roadsBuilt, settlementsBuilt, citiesBuilt, victoryPoints }: PlayerPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-white font-semibold">VP: {victoryPoints}</span>
      </div>
      {/* Resources */}
      <div className="flex gap-2 flex-wrap">
        {RESOURCES.map((r) => (
          <div key={r} className="flex items-center gap-1">
            <SpriteImage src={RESOURCE_SPRITES[r]} fallback={<span>{RESOURCE_EMOJI[r]}</span>} className="w-4 h-4 object-contain" />
            <span className="text-white text-sm">{resources[r] ?? 0}</span>
          </div>
        ))}
      </div>
      {/* Dev cards */}
      {developmentCards.length > 0 && (
        <div className="text-gray-400 text-xs">
          Dev cards: {developmentCards.length}
        </div>
      )}
      {/* Building inventory */}
      <div className="flex gap-3 text-xs text-gray-300">
        <span className="flex items-center gap-1"><SpriteImage src={ICONS.road} fallback={<span>🛣️</span>} className="w-3 h-3 object-contain" /> {15 - roadsBuilt}</span>
        <span className="flex items-center gap-1"><SpriteImage src={ICONS.settlement} fallback={<span>🏠</span>} className="w-3 h-3 object-contain" /> {5 - settlementsBuilt}</span>
        <span className="flex items-center gap-1"><SpriteImage src={ICONS.city} fallback={<span>🏙️</span>} className="w-3 h-3 object-contain" /> {4 - citiesBuilt}</span>
      </div>
    </div>
  );
}
