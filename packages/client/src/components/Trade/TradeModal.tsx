import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const RESOURCES = ['brick', 'lumber', 'ore', 'grain', 'wool'] as const;
const RESOURCE_ICONS: Record<string, string> = {
  brick: '🧱',
  lumber: '🪵',
  ore: '⛏️',
  grain: '🌾',
  wool: '🐑',
};

const RESOURCE_COLORS: Record<string, string> = {
  brick: '#c45a2c',
  lumber: '#2d6b2d',
  ore: '#6b6b6b',
  grain: '#d4a832',
  wool: '#7bc67b',
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
};

interface TradeModalProps {
  myResources: Record<string, number>;
  myColor?: string;
  harbors: string[];
  preselectedResource?: string | null;
  /** Pre-fill give/get for counter-offers */
  prefillGive?: Record<string, number> | null;
  prefillGet?: Record<string, number> | null;
  onPropose: (offering: Record<string, number>, requesting: Record<string, number>) => void;
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
  preselectedResource,
  prefillGive,
  prefillGet,
  onPropose,
  onBankTrade,
  onClose,
}: TradeModalProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'player' | 'bank'>('player');

  // Player trade state
  const [giving, setGiving] = useState<Record<string, number>>(() => {
    if (prefillGive) return { ...emptyResources(), ...prefillGive };
    if (preselectedResource) return { ...emptyResources(), [preselectedResource]: 1 };
    return emptyResources();
  });
  const [getting, setGetting] = useState<Record<string, number>>(() => {
    if (prefillGet) return { ...emptyResources(), ...prefillGet };
    return emptyResources();
  });
  const [openToOffers, setOpenToOffers] = useState(false);

  // Bank trade state
  const [bankGiving, setBankGiving] = useState<string>(preselectedResource ?? 'brick');
  const [bankReceiving, setBankReceiving] = useState<string>(
    preselectedResource && preselectedResource !== 'lumber' ? 'lumber' : 'grain',
  );

  const hasGiving = Object.values(giving).some((v) => v > 0);
  const hasGetting = Object.values(getting).some((v) => v > 0);
  const canPropose = hasGiving && (hasGetting || openToOffers);

  const bankRate = useMemo(() => getBankRate(bankGiving, harbors), [bankGiving, harbors]);
  const canBankTrade = (myResources[bankGiving] ?? 0) >= bankRate && bankGiving !== bankReceiving;

  const handlePropose = useCallback(() => {
    if (!canPropose) return;
    onPropose(giving, getting);
  }, [canPropose, giving, getting, onPropose]);

  const handleBankTrade = useCallback(() => {
    if (!canBankTrade) return;
    onBankTrade(bankGiving, bankRate, bankReceiving);
  }, [canBankTrade, bankGiving, bankRate, bankReceiving, onBankTrade]);

  const handleGiveClick = (r: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (e.button === 2 || e.shiftKey) {
      setGiving((prev) => ({ ...prev, [r]: Math.max(0, prev[r] - 1) }));
    } else {
      setGiving((prev) => ({
        ...prev,
        [r]: Math.min(myResources[r] ?? 0, prev[r] + 1),
      }));
    }
  };

  const handleGetClick = (r: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (e.button === 2 || e.shiftKey) {
      setGetting((prev) => ({ ...prev, [r]: Math.max(0, prev[r] - 1) }));
    } else {
      setGetting((prev) => ({ ...prev, [r]: prev[r] + 1 }));
    }
  };

  const playerColor = PLAYER_COLORS[myColor] || PLAYER_COLORS.blue;

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      {/* Modal */}
      <div
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <h2 className="text-white font-bold text-lg">{t('game.trade')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">
            ✕
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setMode('player')}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${
              mode === 'player' ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            📢 {t('trade.offer')}
          </button>
          <button
            onClick={() => setMode('bank')}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${
              mode === 'bank' ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            🏦 {t('trade.bankTrade')}
          </button>
        </div>

        {mode === 'player' && (
          <div className="p-4 space-y-3">
            {/* GIVE ROW — player avatar + green arrow + hand cards */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <div
                  className="w-9 h-9 rounded-full border-2 flex items-center justify-center"
                  style={{ backgroundColor: playerColor, borderColor: playerColor }}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white/90">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                </div>
                <span className="text-green-400 text-lg font-bold leading-none">↑</span>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {RESOURCES.map((r) => {
                  const available = myResources[r] ?? 0;
                  const selected = giving[r];
                  const hasAny = available > 0;
                  return (
                    <button
                      key={r}
                      onClick={(e) => handleGiveClick(r, e)}
                      onContextMenu={(e) => handleGiveClick(r, e)}
                      disabled={!hasAny}
                      className={`relative w-12 h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-all select-none ${
                        selected > 0
                          ? 'border-green-400 shadow-[0_0_8px_rgba(74,222,128,0.4)] -translate-y-1'
                          : hasAny
                            ? 'border-white/20 hover:border-white/50'
                            : 'border-gray-700 opacity-30 cursor-not-allowed'
                      }`}
                      style={{ backgroundColor: RESOURCE_COLORS[r] }}
                      title={`${t(`resources.${r}`)} (${available})`}
                    >
                      <span className="text-xl leading-none drop-shadow">{RESOURCE_ICONS[r]}</span>
                      <span className="text-[9px] text-white/60 font-medium mt-0.5">{available}</span>
                      {selected > 0 && (
                        <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-md px-0.5">
                          {selected}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RECEIVE ROW — red avatar + red arrow + all resources + ? card */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <div className="w-9 h-9 rounded-full border-2 border-red-500 bg-red-500 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white/90">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                </div>
                <span className="text-red-400 text-lg font-bold leading-none">↑</span>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {RESOURCES.map((r) => {
                  const selected = getting[r];
                  return (
                    <button
                      key={r}
                      onClick={(e) => handleGetClick(r, e)}
                      onContextMenu={(e) => handleGetClick(r, e)}
                      className={`relative w-12 h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-all select-none ${
                        selected > 0
                          ? 'border-red-400 shadow-[0_0_8px_rgba(248,113,113,0.4)] -translate-y-1'
                          : 'border-white/20 hover:border-white/50'
                      }`}
                      style={{ backgroundColor: RESOURCE_COLORS[r] }}
                      title={t(`resources.${r}`)}
                    >
                      <span className="text-xl leading-none drop-shadow">{RESOURCE_ICONS[r]}</span>
                      {selected > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-md px-0.5">
                          {selected}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* ? card — open to offers */}
                <button
                  onClick={() => setOpenToOffers((v) => !v)}
                  className={`relative w-12 h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-all select-none ${
                    openToOffers
                      ? 'border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.4)] -translate-y-1 bg-yellow-700/70'
                      : 'border-white/20 hover:border-white/50 bg-gray-600'
                  }`}
                  title={t('trade.openToOffers', 'Open to offers')}
                >
                  <span className="text-xl leading-none">❓</span>
                </button>
              </div>
            </div>

            {/* Hint */}
            <p className="text-gray-500 text-[10px] text-center">
              {t('trade.clickHint', 'Click to add · Shift+click to remove')}
            </p>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handlePropose}
                disabled={!canPropose}
                className="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-colors bg-green-600 hover:bg-green-700 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <span className="text-base">✓</span> {t('trade.propose')}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600"
              >
                {t('game.cancel')}
              </button>
            </div>
          </div>
        )}

        {mode === 'bank' && (
          <div className="px-5 py-4 space-y-4">
            {/* Giving selector */}
            <div>
              <div className="text-red-300 text-xs font-semibold uppercase mb-2">{t('trade.give')}</div>
              <div className="flex gap-2 flex-wrap">
                {RESOURCES.map((r) => {
                  const rate = getBankRate(r, harbors);
                  const affordable = (myResources[r] ?? 0) >= rate;
                  return (
                    <button
                      key={r}
                      onClick={() => setBankGiving(r)}
                      className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border-2 transition-colors text-sm ${
                        bankGiving === r
                          ? 'border-red-400 bg-red-900/30 text-white'
                          : affordable
                            ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-400'
                            : 'border-gray-700 bg-gray-800 text-gray-600 cursor-not-allowed'
                      }`}
                      disabled={!affordable && bankGiving !== r}
                    >
                      <span className="text-lg">{RESOURCE_ICONS[r]}</span>
                      <span className="text-[10px]">{rate}:1</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Receiving selector */}
            <div>
              <div className="text-green-300 text-xs font-semibold uppercase mb-2">{t('trade.want')}</div>
              <div className="flex gap-2 flex-wrap">
                {RESOURCES.filter((r) => r !== bankGiving).map((r) => (
                  <button
                    key={r}
                    onClick={() => setBankReceiving(r)}
                    className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border-2 transition-colors text-sm ${
                      bankReceiving === r
                        ? 'border-green-400 bg-green-900/30 text-white'
                        : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <span className="text-lg">{RESOURCE_ICONS[r]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bank trade button */}
            <div className="flex gap-2">
              <button
                onClick={handleBankTrade}
                disabled={!canBankTrade}
                className="flex-1 py-2 rounded-lg font-semibold text-sm transition-colors bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                🏦 {t('trade.bankTrade')} ({bankRate}× {RESOURCE_ICONS[bankGiving]} → 1× {RESOURCE_ICONS[bankReceiving]})
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600"
              >
                {t('game.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
