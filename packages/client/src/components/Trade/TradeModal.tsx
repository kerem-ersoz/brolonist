import { assetPath } from '../../utils/sprites';
import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SpriteImage } from '../Sprites/SpriteImage';

const RESOURCES = ['lumber', 'brick', 'wool', 'grain', 'ore'] as const;
const RESOURCE_ICONS: Record<string, string> = {
  brick: '🧱',
  lumber: '🪵',
  ore: '⛏️',
  grain: '🌾',
  wool: '🐑',
};

const RESOURCE_CARD_SPRITES: Record<string, string> = {
  brick: assetPath('assets/sprites/card-brick.png'),
  lumber: assetPath('assets/sprites/card-wood.png'),
  ore: assetPath('assets/sprites/card-ore.png'),
  grain: assetPath('assets/sprites/card-grain.png'),
  wool: assetPath('assets/sprites/card-sheep.png'),
};

const PLAYER_COLORS: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  white: '#d1d5db',
  orange: '#f97316',
  green: '#22c55e',
  brown: '#92400e',
  purple: '#a855f7',
  teal: '#14b8a6',
  pink: '#ec4899',
  black: '#1f2937',
};

interface TradeModalProps {
  myResources: Record<string, number>;
  myColor?: string;
  harbors: string[];
  offering: Record<string, number>;
  preselectedResource?: string | null;
  prefillGet?: Record<string, number> | null;
  onPropose: (offering: Record<string, number>, requesting: Record<string, number>, openToOffers: boolean) => void;
  onBankTrade: (giving: string, givingCount: number, receiving: string) => void;
  onClose: () => void;
}

function emptyResources(): Record<string, number> {
  return { brick: 0, lumber: 0, ore: 0, grain: 0, wool: 0 };
}

function getBankRate(resource: string, harbors: string[]): number {
  if (harbors.includes(resource)) return 2;
  if (harbors.includes('any')) return 3;
  return 4;
}

export function TradeModal({
  myResources,
  myColor = 'blue',
  harbors,
  offering,
  preselectedResource,
  prefillGet,
  onPropose,
  onBankTrade,
  onClose,
}: TradeModalProps) {
  const { t } = useTranslation();

  // The giving amounts come from hand card selection (offering prop)
  const giving = offering;
  const [getting, setGetting] = useState<Record<string, number>>(() => {
    if (prefillGet) return { ...emptyResources(), ...prefillGet };
    return emptyResources();
  });
  const [openToOffers, setOpenToOffers] = useState(false);

  const hasGiving = Object.values(giving).some((v) => v > 0);
  const hasGetting = Object.values(getting).some((v) => v > 0);
  const canPropose = hasGiving && (hasGetting || openToOffers);

  // Bank trade: check if the current give/get selection qualifies as a valid bank trade
  // Exactly one resource type being given, exactly one being received, and the give count matches the bank rate
  const bankTradeInfo = useMemo(() => {
    const givingEntries = Object.entries(giving).filter(([, v]) => v > 0);
    const gettingEntries = Object.entries(getting).filter(([, v]) => v > 0);
    if (givingEntries.length !== 1 || gettingEntries.length !== 1) return null;
    const [giveRes, giveCount] = givingEntries[0];
    const [getRes, getCount] = gettingEntries[0];
    if (giveRes === getRes || getCount !== 1) return null;
    const rate = getBankRate(giveRes, harbors);
    if (giveCount !== rate) return null;
    if ((myResources[giveRes] ?? 0) < rate) return null;
    return { giving: giveRes, givingCount: rate, receiving: getRes, rate };
  }, [giving, getting, harbors, myResources]);

  const canBankTrade = bankTradeInfo !== null;

  const handlePropose = useCallback(() => {
    if (!canPropose) return;
    onPropose(giving, getting, openToOffers);
  }, [canPropose, giving, getting, openToOffers, onPropose]);

  const handleBankTrade = useCallback(() => {
    if (!bankTradeInfo) return;
    onBankTrade(bankTradeInfo.giving, bankTradeInfo.givingCount, bankTradeInfo.receiving);
  }, [bankTradeInfo, onBankTrade]);

  const handleGetClick = (r: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (e.button === 2 || e.shiftKey) {
      setGetting((prev) => ({ ...prev, [r]: Math.max(0, prev[r] - 1) }));
    } else {
      setGetting((prev) => ({ ...prev, [r]: prev[r] + 1 }));
    }
  };

  return (
    // Centered above the hand
    <div style={{ position: 'fixed', bottom: 108, left: 23, zIndex: 50, width: 380 }}>
      <div className="bg-gray-800/95 backdrop-blur rounded-xl shadow-2xl overflow-hidden border border-gray-600">
        <div className="p-3 space-y-2">
          {/* Close button */}
          <div className="flex justify-end">
            <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">✕</button>
          </div>

          {/* REQUESTING ROW — what you want from opponents */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-0.5 shrink-0 w-10">
              <div className="w-7 h-7 rounded-full border-2 border-red-500 bg-red-500 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white/90">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>
              <span className="text-red-400 text-sm font-bold leading-none">↓</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {RESOURCES.map((r) => {
                const selected = getting[r];
                return (
                  <button
                    key={r}
                    onClick={(e) => handleGetClick(r, e)}
                    onContextMenu={(e) => handleGetClick(r, e)}
                    className={`relative w-11 h-14 rounded-lg border-2 flex flex-col items-center justify-center transition-all select-none ${
                      selected > 0
                        ? 'border-red-400 shadow-[0_0_8px_rgba(248,113,113,0.4)] -translate-y-0.5'
                        : 'border-white/20 hover:border-white/50'
                    }`}
                    title={t(`resources.${r}`)}
                  >
                    <SpriteImage src={RESOURCE_CARD_SPRITES[r]} fallback={<span className="text-lg leading-none drop-shadow">{RESOURCE_ICONS[r]}</span>} className="w-full h-full object-fill" />
                    {selected > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center shadow-md px-0.5">
                        {selected}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* ? card — open to offers */}
              <button
                onClick={() => setOpenToOffers((v) => !v)}
                className={`relative w-11 h-14 rounded-lg border-2 flex flex-col items-center justify-center transition-all select-none ${
                  openToOffers
                    ? 'border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.4)] -translate-y-0.5 bg-yellow-700/70'
                    : 'border-white/20 hover:border-white/50 bg-gray-600'
                }`}
                title={t('trade.openToOffers', 'Open to offers')}
              >
                <span className="text-lg leading-none">❓</span>
              </button>
            </div>
          </div>

          {/* Hint */}
          <p className="text-gray-500 text-[10px] text-center">
            Select cards from your hand to offer · Click above to request
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handlePropose}
              disabled={!canPropose}
              className="flex-1 py-1.5 rounded-lg font-semibold text-sm transition-colors bg-green-600 hover:bg-green-700 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <span className="text-base">✓</span> {t('trade.propose')}
            </button>
            <button
              onClick={handleBankTrade}
              disabled={!canBankTrade}
              className="flex-1 py-1.5 rounded-lg font-semibold text-sm transition-colors bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              title={canBankTrade
                ? `${bankTradeInfo!.rate}:1 ${RESOURCE_ICONS[bankTradeInfo!.giving]} → ${RESOURCE_ICONS[bankTradeInfo!.receiving]}`
                : t('trade.bankTradeHint', 'Select exactly one resource to give at the right ratio (4:1, 3:1, or 2:1) and one to receive')}
            >
              🏦 {t('trade.bankTrade')}
              {canBankTrade && ` ${bankTradeInfo!.rate}:1`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
