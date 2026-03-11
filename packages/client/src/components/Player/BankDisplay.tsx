interface BankDisplayProps {
  deckSize: number;
  players: Array<{
    resources: Record<string, number>;
    resourceCount?: number;
  }>;
  myPlayerId: string | null;
}

const BANK_TOTAL_PER_RESOURCE = 19;

const RESOURCE_ORDER = ['brick', 'lumber', 'ore', 'grain', 'wool'] as const;

const RESOURCE_STYLES: Record<string, { bg: string; icon: string }> = {
  brick: { bg: 'bg-red-800', icon: '🧱' },
  lumber: { bg: 'bg-green-800', icon: '🪵' },
  ore: { bg: 'bg-gray-600', icon: '⛏️' },
  grain: { bg: 'bg-yellow-700', icon: '🌾' },
  wool: { bg: 'bg-lime-700', icon: '🐑' },
};

export function BankDisplay({ deckSize, players }: BankDisplayProps) {
  // Calculate remaining bank resources: 19 - sum across all players
  // For opponents, resources is zeroed and resourceCount holds total, so
  // we can only compute an exact per-resource bank count based on visible data
  const usedResources: Record<string, number> = { brick: 0, lumber: 0, ore: 0, grain: 0, wool: 0 };
  for (const p of players) {
    for (const r of RESOURCE_ORDER) {
      usedResources[r] += p.resources[r] ?? 0;
    }
  }

  return (
    <div data-bank-display className="flex items-center justify-center gap-1.5 px-2 py-2 bg-gray-800/60 border-y border-gray-700/50">
      {/* Dev card stack */}
      <div className="flex flex-col items-center">
        <div className="w-9 h-12 rounded bg-purple-900 border border-purple-500/40 flex items-center justify-center shadow-sm">
          <span className="text-sm">📜</span>
        </div>
        <span className="text-[10px] text-gray-400 mt-0.5">{deckSize}</span>
      </div>

      {/* Resource card stacks */}
      {RESOURCE_ORDER.map((r) => {
        const remaining = BANK_TOTAL_PER_RESOURCE - usedResources[r];
        const style = RESOURCE_STYLES[r];
        return (
          <div key={r} className="flex flex-col items-center">
            <div
              className={`w-9 h-12 rounded ${style.bg} border border-white/10 flex items-center justify-center shadow-sm`}
            >
              <span className="text-sm">{style.icon}</span>
            </div>
            <span className="text-[10px] text-gray-400 mt-0.5">{remaining}</span>
          </div>
        );
      })}
    </div>
  );
}
