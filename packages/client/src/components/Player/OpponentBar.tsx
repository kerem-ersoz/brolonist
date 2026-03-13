import { ICONS } from '../../utils/sprites';
import { SpriteImage } from '../Sprites/SpriteImage';

interface OpponentBarProps {
  opponents: Array<{
    id: string;
    name: string;
    color: string;
    victoryPoints: number;
    resourceCount?: number;
    devCardCount?: number;
    hasLongestRoad: boolean;
    hasLargestArmy: boolean;
    status: string;
  }>;
  currentPlayerId: string | null;
}

const COLORS: Record<string, string> = {
  red: 'bg-red-600', blue: 'bg-blue-600', white: 'bg-gray-200 text-black', orange: 'bg-orange-500',
  green: 'bg-green-600', brown: 'bg-amber-800', purple: 'bg-purple-600', teal: 'bg-teal-600',
};

export function OpponentBar({ opponents, currentPlayerId }: OpponentBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {opponents.map((p) => (
        <div
          key={p.id}
          className={`flex-shrink-0 rounded-lg p-2 min-w-[120px] ${
            p.id === currentPlayerId ? 'ring-2 ring-yellow-400' : ''
          } ${p.status === 'quit' ? 'opacity-40' : ''} bg-gray-800`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-3 h-3 rounded-full ${COLORS[p.color] || 'bg-gray-500'}`} />
            <span className="text-white text-sm font-medium truncate">{p.name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>🏆 {p.victoryPoints}</span>
            <div className="relative" title="Resource cards">
              <SpriteImage src={ICONS.cardResource} fallback={<span className="text-[12px]">🎴</span>} className="w-5 h-7 object-fill rounded-sm" />
              <span className="absolute -top-1.5 -right-2 bg-gray-900 text-white text-[9px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center border border-gray-600 px-0.5">
                {p.resourceCount ?? '?'}
              </span>
            </div>
            <div className="relative" title="Development cards">
              <SpriteImage src={ICONS.cardDev} fallback={<span className="text-[12px]">🃏</span>} className="w-5 h-7 object-fill rounded-sm" />
              <span className="absolute -top-1.5 -right-2 bg-gray-900 text-white text-[9px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center border border-gray-600 px-0.5">
                {p.devCardCount ?? '?'}
              </span>
            </div>
          </div>
          <div className="flex gap-1 mt-1">
            {p.hasLongestRoad && <span className="text-xs">🛣️</span>}
            {p.hasLargestArmy && <span className="text-xs">⚔️</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
