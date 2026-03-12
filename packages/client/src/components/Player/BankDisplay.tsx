import { SpriteImage } from '../Sprites/SpriteImage';
import { ICONS } from '../../utils/sprites';

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

const RESOURCE_CARD_SPRITES: Record<string, string> = {
  brick: '/assets/sprites/card-brick.png',
  lumber: '/assets/sprites/card-wood.png',
  ore: '/assets/sprites/card-ore.png',
  grain: '/assets/sprites/card-grain.png',
  wool: '/assets/sprites/card-sheep.png',
};

const RESOURCE_FALLBACKS: Record<string, string> = {
  brick: '🧱',
  lumber: '🪵',
  ore: '⛏️',
  grain: '🌾',
  wool: '🐑',
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
    <div data-bank-display className="flex items-center justify-center gap-1.5 px-2 py-2 border-y border-white/10" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
      {/* Dev card stack */}
      <div className="flex flex-col items-center">
        <div className="w-9 h-12 rounded overflow-hidden border border-white/10 shadow-sm">
          <SpriteImage
            src={ICONS.cardDev}
            fallback={<span className="text-sm">📜</span>}
            className="w-full h-full object-fill"
          />
        </div>
        <span className="text-[10px] text-gray-400 mt-0.5">{deckSize}</span>
      </div>

      {/* Resource card stacks */}
      {RESOURCE_ORDER.map((r) => {
        const remaining = BANK_TOTAL_PER_RESOURCE - usedResources[r];
        return (
          <div key={r} className="flex flex-col items-center">
            <div className="w-9 h-12 rounded overflow-hidden border border-white/10 shadow-sm">
              <SpriteImage
                src={RESOURCE_CARD_SPRITES[r]}
                fallback={<span className="text-sm">{RESOURCE_FALLBACKS[r]}</span>}
                className="w-full h-full object-fill"
              />
            </div>
            <span className="text-[10px] text-gray-400 mt-0.5">{remaining}</span>
          </div>
        );
      })}
    </div>
  );
}
