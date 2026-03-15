import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { assetPath } from '../../utils/sprites';

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

const RESOURCE_CARD_SPRITES: Record<string, string> = {
  brick: assetPath('assets/sprites/card-brick.png'),
  lumber: assetPath('assets/sprites/card-wood.png'),
  ore: assetPath('assets/sprites/card-ore.png'),
  grain: assetPath('assets/sprites/card-grain.png'),
  wool: assetPath('assets/sprites/card-sheep.png'),
};

const RESOURCE_EMOJI: Record<string, string> = {
  brick: '🧱', lumber: '🪵', ore: '⛏️', grain: '🌾', wool: '🐑',
};

const PLAYER_COLORS: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', white: '#d1d5db', orange: '#f97316',
  green: '#22c55e', brown: '#92400e', purple: '#a855f7', teal: '#14b8a6',
  pink: '#ec4899', black: '#1f2937',
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

function ResourceCards({ resources }: { resources: Record<string, number> }) {
  return (
    <div className="flex gap-1 items-center">
      {Object.entries(resources).filter(([, v]) => v > 0).map(([res, count]) => (
        <div key={res} className="relative w-6 h-8">
          <img
            src={RESOURCE_CARD_SPRITES[res]}
            alt={res}
            className="w-full h-full object-contain rounded-sm"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {count > 1 && (
            <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-[8px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center border border-gray-600">
              {count}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function TradeInitiatorPanel({ offer, opponents, onConfirm, onCancel }: TradeInitiatorPanelProps) {
  const { t } = useTranslation();
  const secondsLeft = useCountdown(offer.expiresAt);

  return (
    <div style={{ flexShrink: 0 }} className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl px-3 py-2 w-full">
      {/* Offer summary with card sprites */}
      <div className="flex items-center gap-2 mb-2 text-xs">
        <span className="text-green-300 font-semibold">{t('trade.give')}:</span>
        <ResourceCards resources={offer.offering} />
        <span className="text-gray-500 mx-1">→</span>
        <span className="text-red-300 font-semibold">{t('trade.want')}:</span>
        {offer.openToOffers && !Object.values(offer.requesting).some(v => v > 0)
          ? <span className="text-yellow-300">❓</span>
          : <ResourceCards resources={offer.requesting} />}
        {offer.openToOffers && Object.values(offer.requesting).some(v => v > 0) && <span className="text-yellow-300">+ ❓</span>}
        <span className="flex-1" />
        {secondsLeft > 0 && (
          <span className={`text-xs font-bold ${secondsLeft <= 5 ? 'text-red-400' : 'text-gray-400'}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
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

      {/* Player avatars with response status */}
      <div className="flex gap-2 justify-center flex-wrap">
        {opponents.map((player) => {
          const response = offer.responses[player.id];
          const counter = offer.counterOffers[player.id];
          const playerColor = PLAYER_COLORS[player.color] || '#6b7280';
          const accepted = response === 'accept';
          const declined = response === 'decline';
          const countered = response === 'counter';
          const waiting = !response;
          const clickable = accepted || countered;

          return (
            <div key={player.id} className="flex flex-col items-center gap-0.5">
              {/* Avatar with overlay status */}
              <div
                className={`relative w-[30px] h-[30px] rounded-full flex items-center justify-center transition-all ${
                  accepted
                    ? 'ring-2 ring-green-400 ring-offset-1 ring-offset-gray-800 cursor-pointer hover:brightness-125'
                    : countered
                      ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-gray-800 cursor-pointer hover:brightness-125'
                      : declined
                        ? 'opacity-30'
                        : ''
                }`}
                style={{ backgroundColor: playerColor }}
                onClick={clickable ? () => onConfirm(offer.id, player.id) : undefined}
                title={accepted ? 'Click to confirm trade' : countered ? 'Click to accept counter-offer' : undefined}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white/90">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
                {/* Status overlay */}
                {declined && (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] bg-black/40 rounded-full">❌</span>
                )}
                {accepted && (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] bg-black/30 rounded-full">✓</span>
                )}
                {countered && (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] bg-black/30 rounded-full">🔄</span>
                )}
              </div>
              {/* Counter-offer resources shown below */}
              {countered && counter && (
                <div className="flex items-center gap-0.5">
                  <ResourceCards resources={counter.offering} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
