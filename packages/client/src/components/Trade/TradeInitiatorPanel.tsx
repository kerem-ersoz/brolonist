import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function useCountdown(expiresAt?: number): number {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    expiresAt ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)) : 0,
  );
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return secondsLeft;
}

const RESOURCE_ICONS: Record<string, string> = {
  brick: '🧱',
  lumber: '🪵',
  ore: '⛏️',
  grain: '🌾',
  wool: '🐑',
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

interface PlayerInfo {
  id: string;
  name: string;
  color: string;
}

interface ActiveOffer {
  id: string;
  offering: Record<string, number>;
  requesting: Record<string, number>;
  openToOffers?: boolean;
  responses: Record<string, 'accept' | 'decline' | 'counter'>;
  counterOffers: Record<string, { offering: Record<string, number>; requesting: Record<string, number> }>;
  expiresAt?: number;
}

interface TradeInitiatorPanelProps {
  offer: ActiveOffer;
  opponents: PlayerInfo[];
  onConfirm: (offerId: string, withPlayerId: string) => void;
  onCancel: (offerId: string) => void;
}

function formatResources(resources: Record<string, number>): string {
  return Object.entries(resources)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${RESOURCE_ICONS[k]}×${v}`)
    .join(' ');
}

export function TradeInitiatorPanel({ offer, opponents, onConfirm, onCancel }: TradeInitiatorPanelProps) {
  const { t } = useTranslation();
  const secondsLeft = useCountdown(offer.expiresAt);

  return (
    <div style={{ flexShrink: 0 }} className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold text-sm">{t('trade.yourOffer', 'Your Trade Offer')}</h3>
        <div className="flex items-center gap-2">
          {secondsLeft > 0 && (
            <span className={`text-xs font-mono font-bold ${secondsLeft <= 5 ? 'text-red-400' : 'text-gray-400'}`}>
              {secondsLeft}s
            </span>
          )}
          <button
            onClick={() => onCancel(offer.id)}
            className="text-gray-400 hover:text-white text-lg leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Offer summary */}
      <div className="text-xs text-gray-400 mb-3 space-y-0.5">
        <div>
          <span className="text-green-300 font-semibold">{t('trade.give')}:</span>{' '}
          <span className="text-white">{formatResources(offer.offering)}</span>
        </div>
        <div>
          <span className="text-red-300 font-semibold">{t('trade.want')}:</span>{' '}
          <span className="text-white">
            {offer.openToOffers && !Object.values(offer.requesting).some(v => v > 0)
              ? `❓ ${t('trade.openToOffers', 'Open to offers')}`
              : formatResources(offer.requesting)}
            {offer.openToOffers && Object.values(offer.requesting).some(v => v > 0) && ' + ❓'}
          </span>
        </div>
      </div>

      {/* Player avatars with response status */}
      <div className="flex gap-3 justify-center flex-wrap mb-3">
        {opponents.map((player) => {
          const response = offer.responses[player.id];
          const counter = offer.counterOffers[player.id];
          const playerColor = PLAYER_COLORS[player.color] || '#6b7280';
          const accepted = response === 'accept';
          const declined = response === 'decline';
          const countered = response === 'counter';
          const waiting = !response;

          return (
            <div key={player.id} className="flex flex-col items-center gap-1 min-w-[72px]">
              {/* Avatar */}
              <div
                className={`w-10 h-10 rounded-full border-3 flex items-center justify-center transition-all ${
                  accepted
                    ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-gray-800'
                    : declined
                      ? 'opacity-40'
                      : ''
                }`}
                style={{ backgroundColor: playerColor, borderColor: playerColor }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white/90">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>

              {/* Name */}
              <span className={`text-[10px] font-medium truncate max-w-[72px] text-center ${declined ? 'text-gray-600' : 'text-gray-300'}`}>
                {player.name}
              </span>

              {/* Status indicator */}
              {waiting && (
                <span className="text-[10px] text-gray-500 animate-pulse">⏳</span>
              )}
              {declined && (
                <span className="text-[10px] text-red-400">❌</span>
              )}
              {countered && counter && (
                <div className="text-[9px] text-yellow-300 text-center">
                  🔄 {formatResources(counter.offering)}
                </div>
              )}

              {/* Confirm button for accepted players */}
              {accepted && (
                <button
                  onClick={() => onConfirm(offer.id, player.id)}
                  className="px-2 py-1 rounded text-[10px] font-bold bg-green-600 hover:bg-green-500 text-white transition-colors"
                >
                  ✓ {t('trade.confirm', 'Trade')}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Cancel button */}
      <button
        onClick={() => onCancel(offer.id)}
        className="w-full py-1.5 rounded-lg text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
      >
        {t('game.cancel')}
      </button>
    </div>
  );
}
