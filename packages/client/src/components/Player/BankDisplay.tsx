import { assetPath } from '../../utils/sprites';
import { SpriteImage } from '../Sprites/SpriteImage';
import { ICONS } from '../../utils/sprites';

interface BankDisplayProps {
  deckSize: number;
  bankResources?: Record<string, number>;
  players: Array<{
    resources: Record<string, number>;
    resourceCount?: number;
  }>;
  myPlayerId: string | null;
}

const BANK_TOTAL_PER_RESOURCE = 19;

const RESOURCE_ORDER = ['lumber', 'brick', 'wool', 'grain', 'ore'] as const;

const RESOURCE_CARD_SPRITES: Record<string, string> = {
  brick: assetPath('assets/sprites/card-brick.png'),
  lumber: assetPath('assets/sprites/card-wood.png'),
  ore: assetPath('assets/sprites/card-ore.png'),
  grain: assetPath('assets/sprites/card-grain.png'),
  wool: assetPath('assets/sprites/card-sheep.png'),
};

const RESOURCE_FALLBACKS: Record<string, string> = {
  brick: '🧱',
  lumber: '🪵',
  ore: '⛏️',
  grain: '🌾',
  wool: '🐑',
};

export function BankDisplay({ deckSize, bankResources, players }: BankDisplayProps) {
  // Use server-provided bank resources if available, otherwise estimate from visible data
  let remainingResources: Record<string, number>;
  if (bankResources) {
    remainingResources = bankResources;
  } else {
    const usedResources: Record<string, number> = { brick: 0, lumber: 0, ore: 0, grain: 0, wool: 0 };
    for (const p of players) {
      for (const r of RESOURCE_ORDER) {
        usedResources[r] += p.resources[r] ?? 0;
      }
    }
    remainingResources = {} as Record<string, number>;
    for (const r of RESOURCE_ORDER) {
      remainingResources[r] = BANK_TOTAL_PER_RESOURCE - usedResources[r];
    }
  }

  return (
    <div data-bank-display className="flex items-end justify-center gap-2.5 px-2 border-y border-white/10" style={{ backgroundColor: 'rgba(0,0,0,0.3)', paddingTop: 13, paddingBottom: 13 }}>
      {/* Dev card stack */}
      {(() => {
        const devTotal = 25;
        const pct = deckSize / devTotal;
        const stackCount = deckSize === 0 ? 0 : pct >= 0.66 ? 3 : pct >= 0.33 ? 2 : 1;

        if (stackCount === 0) {
          return (
            <div className="relative" style={{ width: 36, height: 48 }}>
              <div className="w-full h-full rounded border border-white/5 bg-white/5" />
            </div>
          );
        }

        return (
          <div className="relative" style={{ width: 36, height: 48 }}>
            {Array.from({ length: stackCount }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded overflow-hidden border border-white/10 shadow-sm"
                style={{ width: 36, height: 48, top: -(stackCount - 1 - i) * 3, left: (stackCount - 1 - i) * 1 }}
              >
                <SpriteImage
                  src={ICONS.cardDev}
                  fallback={<span className="text-sm">📜</span>}
                  className="w-full h-full object-fill"
                />
              </div>
            ))}
            <span className="absolute -top-1.5 -right-2 bg-gray-900 text-white text-[10px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center border border-gray-600 px-0.5" style={{ zIndex: 10 }}>
              {deckSize}
            </span>
          </div>
        );
      })()}

      {/* Resource card stacks */}
      {RESOURCE_ORDER.map((r) => {
        const remaining = remainingResources[r] ?? 0;
        const pct = remaining / BANK_TOTAL_PER_RESOURCE;
        const stackCount = remaining === 0 ? 0 : pct >= 0.66 ? 3 : pct >= 0.33 ? 2 : 1;

        if (stackCount === 0) {
          return (
            <div key={r} className="relative" style={{ width: 36, height: 48 }}>
              <div className="w-full h-full rounded border border-white/5 bg-white/5" />
            </div>
          );
        }

        return (
          <div key={r} className="relative" style={{ width: 36, height: 48 }}>
            {Array.from({ length: stackCount }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded overflow-hidden border border-white/10 shadow-sm"
                style={{ width: 36, height: 48, top: -(stackCount - 1 - i) * 3, left: (stackCount - 1 - i) * 1 }}
              >
                <SpriteImage
                  src={RESOURCE_CARD_SPRITES[r]}
                  fallback={<span className="text-sm">{RESOURCE_FALLBACKS[r]}</span>}
                  className="w-full h-full object-fill"
                />
              </div>
            ))}
            <span className="absolute -top-1.5 -right-2 bg-gray-900 text-white text-[10px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center border border-gray-600 px-0.5" style={{ zIndex: 10 }}>
              {remaining}
            </span>
          </div>
        );
      })}
    </div>
  );
}
