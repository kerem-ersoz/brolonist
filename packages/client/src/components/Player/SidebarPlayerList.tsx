import { ICONS, DEV_CARD_SPRITES } from '../../utils/sprites';
import { SpriteImage } from '../Sprites/SpriteImage';

interface SidebarPlayer {
  id: string;
  name: string;
  color: string;
  status: string;
  victoryPoints: number;
  resourceCount?: number;
  devCardCount?: number;
  resources: Record<string, number>;
  developmentCards: unknown[];
  hasLongestRoad: boolean;
  hasLargestArmy: boolean;
  longestRoadLength?: number;
  roadsBuilt: number;
  settlementsBuilt: number;
  citiesBuilt: number;
  knightsPlayed: number;
}

interface SidebarPlayerListProps {
  players: SidebarPlayer[];
  currentPlayerId: string | null;
  myPlayerId: string | null;
}

const PLAYER_COLORS: Record<string, string> = {
  red: 'bg-red-600',
  blue: 'bg-blue-600',
  white: 'bg-gray-200',
  orange: 'bg-orange-500',
  green: 'bg-green-600',
  brown: 'bg-amber-800',
  purple: 'bg-purple-600',
  teal: 'bg-teal-600',
};

const PLAYER_BORDER_COLORS: Record<string, string> = {
  red: 'border-red-500',
  blue: 'border-blue-500',
  white: 'border-gray-300',
  orange: 'border-orange-400',
  green: 'border-green-500',
  brown: 'border-amber-700',
  purple: 'border-purple-500',
  teal: 'border-teal-500',
};

const RESOURCE_ICONS: Record<string, { icon: string; color: string }> = {
  brick: { icon: '🧱', color: 'bg-red-800' },
  lumber: { icon: '🪵', color: 'bg-green-800' },
  ore: { icon: '⛏️', color: 'bg-gray-500' },
  grain: { icon: '🌾', color: 'bg-yellow-700' },
  wool: { icon: '🐑', color: 'bg-lime-700' },
};

const RESOURCE_ORDER = ['brick', 'lumber', 'ore', 'grain', 'wool'] as const;

export function SidebarPlayerList({ players, currentPlayerId, myPlayerId }: SidebarPlayerListProps) {
  return (
    <div className="flex flex-col gap-1.5 px-2 py-2">
      {players.map((p) => {
        const isCurrentTurn = p.id === currentPlayerId;
        const isMe = p.id === myPlayerId;
        const totalCards = isMe
          ? Object.values(p.resources).reduce((a, b) => a + b, 0)
          : (p.resourceCount ?? 0);
        const devCards = isMe
          ? p.developmentCards.length
          : (p.devCardCount ?? 0);

        return (
          <div
            key={p.id}
            data-player-id={p.id}
            className={`rounded-lg p-2 ${
              isCurrentTurn ? 'ring-2 ring-yellow-400' : ''
            } ${p.status === 'quit' ? 'opacity-40' : ''}`}
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          >
            <div className="flex items-center gap-2">
              {/* Player avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 ${
                  PLAYER_COLORS[p.color] || 'bg-gray-500'
                } ${PLAYER_BORDER_COLORS[p.color] || 'border-gray-400'}`}
              >
                {p.name.charAt(0).toUpperCase()}
              </div>

              {/* Name (top) + stats (bottom) */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <span className="text-white text-xs font-semibold truncate leading-tight">
                  {p.name}
                  {isMe && <span className="text-gray-400 ml-1">(you)</span>}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex items-center gap-0.5" title={p.hasLargestArmy ? 'Largest Army' : 'Knights played'}>
                    <SpriteImage src={DEV_CARD_SPRITES.knight} fallback={<span className="text-[12px] leading-none">⚔️</span>} className="w-3 h-3 object-contain" />
                    <span className={`text-[10px] font-medium ${p.hasLargestArmy ? 'text-yellow-400' : 'text-gray-300'}`}>{p.knightsPlayed}</span>
                  </div>
                  <div className="flex items-center gap-0.5" title={p.hasLongestRoad ? 'Longest Road' : 'Longest road'}>
                    <SpriteImage src={ICONS.road} fallback={<span className="text-[12px] leading-none">🛣️</span>} className="w-3 h-3 object-contain" />
                    <span className={`text-[10px] font-medium ${p.hasLongestRoad ? 'text-yellow-400' : 'text-gray-300'}`}>{p.longestRoadLength ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Card counts + VP */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="relative" title="Resource cards">
                  <SpriteImage src={ICONS.cardResource} fallback={<span className="text-[16px]">🎴</span>} className="object-fill rounded-sm" style={{ width: 26, height: 37 }} />
                  <span className="absolute -top-1.5 -right-2 bg-gray-900 text-white text-[11px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center border border-gray-600 px-0.5">
                    {totalCards}
                  </span>
                </div>
                <div className="relative" title="Development cards">
                  <SpriteImage src={ICONS.cardDev} fallback={<span className="text-[16px]">🃏</span>} className="object-fill rounded-sm" style={{ width: 26, height: 37 }} />
                  <span className="absolute -top-1.5 -right-2 bg-gray-900 text-white text-[11px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center border border-gray-600 px-0.5">
                    {devCards}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 ml-1">
                  <span className="text-yellow-400 text-xs font-bold">{p.victoryPoints}</span>
                  <span className="text-[10px] text-gray-400">VP</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
