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

const RESOURCE_ICONS = {
  wood: '🌲',
  brick: '🧱',
  sheep: '🐑',
  grain: '🌾',
  ore: '⛰️'
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
                                                                      <d                                            ap-1                                                             ma                                                    sNa                         one"                                   of                                           4                   
                          e="te                     co                      </div>                      iv>           Dev c               {d               .l             (
             class ame             class ame             class ame             class ame             class ame             class ame             class ame      t             class ame                      `d             class ame             class ame            
                                                       }
                                                                               e="flex items-center gap-1"><SpriteImag                                           /span>} className="w-3 h-3 object-contain" /> {15 - roadsBuilt}</span>
        <span className="flex items-center gap-1"><SpriteImage src={ICONS.settlement} fallback={<span>🏠</span>} className="w-3 h-3 object-contain" /> {5 - settlementsBuilt}</span>
        <span className="flex items-center gap-1"><SpriteImage src={ICONS.city} fallback={<span>🏙️</span>} className="w-3 h-3 object-contain" /> {4 - citiesBuilt}</span>
      </div>
    </div>
  );
}
