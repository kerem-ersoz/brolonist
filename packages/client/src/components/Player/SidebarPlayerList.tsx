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
    <div className="flex flex-col gap-1.5 overflow-y-auto px-2 py-2 min-h-0">
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
            className={`rounded-lg p-2 ${
              isCurrentTurn ? 'ring-2 ring-yellow-400 bg-gray-800' : 'bg-gray-800/60'
            } ${p.status === 'quit' ? 'opacity-40' : ''}`}
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

              {/* Name & badges */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-white text-xs font-semibold truncate">
                    {p.name}
                    {isMe && <span className="text-gray-400 ml-1">(you)</span>}
                  </span>
                </div>
              </div>

              {/* VP badge */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-yellow-400 text-xs font-bold">{p.victoryPoints}</span>
                <span className="text-[10px] text-gray-400">VP</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-2 mt-1.5 pl-10">
              {/* Cards count */}
              <div className="flex items-center gap-0.5" title="Total resource cards">
                <span className="text-[10px]">🃏</span>
                <span className="text-[10px] text-gray-300 font-medium">{totalCards}</span>
              </div>

              {/* Dev cards */}
              <div className="flex items-center gap-0.5" title="Development cards">
                <span className="text-[10px]">📜</span>
                <span className="text-[10px] text-gray-300 font-medium">{devCards}</span>
              </div>

              {/* Knights */}
              <div className="flex items-center gap-0.5" title="Knights played">
                <span className="text-[10px]">⚔️</span>
                <span className="text-[10px] text-gray-300 font-medium">{p.knightsPlayed}</span>
              </div>

              {/* Pieces remaining */}
              <div className="flex items-center gap-0.5 ml-auto" title="Roads remaining">
                <span className="text-[10px]">🛣️</span>
                <span className="text-[10px] text-gray-300">{15 - p.roadsBuilt}</span>
              </div>
              <div className="flex items-center gap-0.5" title="Settlements remaining">
                <span className="text-[10px]">🏠</span>
                <span className="text-[10px] text-gray-300">{5 - p.settlementsBuilt}</span>
              </div>
              <div className="flex items-center gap-0.5" title="Cities remaining">
                <span className="text-[10px]">🏙️</span>
                <span className="text-[10px] text-gray-300">{4 - p.citiesBuilt}</span>
              </div>
            </div>

            {/* Resource breakdown — only shown for self */}
            {isMe && (
              <div className="flex items-center gap-1.5 mt-1 pl-10">
                {RESOURCE_ORDER.map((r) => (
                  <div key={r} className="flex items-center gap-0.5" title={r}>
                    <span className="text-[10px]">{RESOURCE_ICONS[r].icon}</span>
                    <span className="text-[10px] text-gray-300 font-medium">{p.resources[r] ?? 0}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Achievement badges */}
            {(p.hasLongestRoad || p.hasLargestArmy) && (
              <div className="flex gap-1 mt-1 pl-10">
                {p.hasLongestRoad && (
                  <span className="text-[10px] bg-yellow-900/40 text-yellow-400 rounded px-1">🛣️ Longest</span>
                )}
                {p.hasLargestArmy && (
                  <span className="text-[10px] bg-yellow-900/40 text-yellow-400 rounded px-1">⚔️ Largest</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
