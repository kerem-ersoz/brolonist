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

interface TradeModalProps {
  myResources: Record<string, number>;
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

  // Bank trade state
  const [bankGiving, setBankGiving] = useState<string>(preselectedResource ?? 'brick');
  const [bankReceiving, setBankReceiving] = useState<string>(
    preselectedResource && preselectedResource !== 'lumber' ? 'lumber' : 'grain',
  );

  const hasGiving = Object.values(giving).some((v) => v > 0);
  const hasGetting = Object.values(getting).some((v) => v > 0);
  const canPropose = hasGiving && hasGetting;

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

  const adjustGive = (r: string, delta: number) => {
    setGiving((prev) => ({
      ...prev,
      [r]: Math.max(0, Math.min(myResources[r] ?? 0, prev[r] + delta)),
    }));
  };

  const adjustGet = (r: string, delta: number) => {
    setGetting((prev) => ({
      ...prev,
      [r]: Math.max(0, prev[r] + delta),
    }));
  };

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      {/* Modal */}
      <div
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-750 border-b border-gray-700">
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
          <div>
            {/* YOU GIVE */}
            <div className="px-5 py-3 bg-red-900/20">
              <div className="text-red-300 text-xs font-semibold uppercase mb-2">{t('trade.give')}</div>
              <div className="flex gap-3 flex-wrap">
                {RESOURCES.map((r) => (
                  <ResourceStepper
                    key={r}
                    resource={r}
                    value={giving[r]}
                    max={myResources[r] ?? 0}
                    onChange={(v) => setGiving((prev) => ({ ...prev, [r]: v }))}
                    onIncrement={() => adjustGive(r, 1)}
                    onDecrement={() => adjustGive(r, -1)}
                  />
                ))}
              </div>
            </div>

            {/* YOU GET */}
            <div className="px-5 py-3 bg-green-900/20">
              <div className="text-green-300 text-xs font-semibold uppercase mb-2">{t('trade.want')}</div>
              <div className="flex gap-3 flex-wrap">
                {RESOURCES.map((r) => (
                  <ResourceStepper
                    key={r}
                    resource={r}
                    value={getting[r]}
                    max={99}
                    onChange={(v) => setGetting((prev) => ({ ...prev, [r]: v }))}
                    onIncrement={() => adjustGet(r, 1)}
                    onDecrement={() => adjustGet(r, -1)}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-5 py-3 border-t border-gray-700">
              <button
                onClick={handlePropose}
                disabled={!canPropose}
                className="flex-1 py-2 rounded-lg font-semibold text-sm transition-colors bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                📢 {t('trade.propose')}
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

/* ── Resource Stepper Sub-component ──────────────────────────── */

function ResourceStepper({
  resource,
  value,
  max,
  onIncrement,
  onDecrement,
}: {
  resource: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[50px]">
      <span className="text-lg" title={t(`resources.${resource}`)}>
        {RESOURCE_ICONS[resource]}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={onDecrement}
          disabled={value <= 0}
          className="w-5 h-5 rounded bg-gray-600 text-white text-xs flex items-center justify-center hover:bg-gray-500 disabled:opacity-30"
        >
          −
        </button>
        <span className="text-white text-sm font-mono w-4 text-center">{value}</span>
        <button
          onClick={onIncrement}
          disabled={value >= max}
          className="w-5 h-5 rounded bg-gray-600 text-white text-xs flex items-center justify-center hover:bg-gray-500 disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
