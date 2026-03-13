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

interface TradeOffer {
  id: string;
  fromPlayerName: string;
  fromPlayerColor: string;
  offering: Record<string, number>;
  requesting: Record<string, number>;
  openToOffers?: boolean;
  expiresAt?: number;
}

interface TradeOfferCardProps {
  offers: TradeOffer[];
  onAccept: (offerId: string) => void;
  onDecline: (offerId: string) => void;
  onCounter: (offer: TradeOffer) => void;
}

const PLAYER_COLOR_DOT: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  white: 'bg-gray-200',
  orange: 'bg-orange-500',
  green: 'bg-green-500',
  brown: 'bg-amber-700',
  purple: 'bg-purple-500',
  teal: 'bg-teal-500',
};

function formatResources(resources: Record<string, number>): string {
  return Object.entries(resources)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${RESOURCE_ICONS[k]}×${v}`)
    .join(' ');
}

export function TradeOfferCard({ offers, onAccept, onDecline, onCounter }: TradeOfferCardProps) {
  const { t } = useTranslation();

  if (offers.length === 0) return null;

  return (
    <>
      {offers.map((offer, i) => (
        <OfferCard key={offer.id} offer={offer} index={i} total={offers.length} onAccept={onAccept} onDecline={onDecline} onCounter={onCounter} />
      ))}
    </>
  );
}

function OfferCard({ offer, index, total, onAccept, onDecline, onCounter }: {
  offer: TradeOffer; index: number; total: number;
  onAccept: (id: string) => void; onDecline: (id: string) => void; onCounter: (o: TradeOffer) => void;
}) {
  const { t } = useTranslation();
  const secondsLeft = useCountdown(offer.expiresAt);

  return (
        <div
          style={{ flexShrink: 0 }}
          className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${PLAYER_COLOR_DOT[offer.fromPlayerColor] ?? 'bg-gray-500'}`} />
            <span className="text-white text-sm font-semibold flex-1">{offer.fromPlayerName} {t('trade.offers', 'offers')}:</span>
            {secondsLeft > 0 && (
              <span className={`text-xs font-bold ${secondsLeft <= 5 ? 'text-red-400' : 'text-gray-400'}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                {secondsLeft}s
              </span>
            )}
          </div>

          {/* Give / Want */}
          <div className="space-y-1 text-xs mb-3">
            <div className="text-gray-400">
              <span className="text-red-300 font-semibold">{t('trade.give')}:</span>{' '}
              <span className="text-white">{formatResources(offer.offering)}</span>
            </div>
            <div className="text-gray-400">
              <span className="text-green-300 font-semibold">{t('trade.want')}:</span>{' '}
              <span className="text-white">
                {offer.openToOffers && !Object.values(offer.requesting).some(v => v > 0)
                  ? `❓ ${t('trade.openToOffers', 'Open to offers')}`
                  : formatResources(offer.requesting)}
                {offer.openToOffers && Object.values(offer.requesting).some(v => v > 0) && ` + ❓`}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1.5">
            {!offer.openToOffers && (
              <button
                onClick={() => onAccept(offer.id)}
                className="flex-1 py-1.5 rounded text-xs font-semibold bg-green-700 hover:bg-green-600 text-white transition-colors"
              >
                ✅ {t('trade.accept')}
              </button>
            )}
            <button
              onClick={() => onDecline(offer.id)}
              className="flex-1 py-1.5 rounded text-xs font-semibold bg-red-700 hover:bg-red-600 text-white transition-colors"
            >
              ❌ {t('trade.decline')}
            </button>
            <button
              onClick={() => onCounter(offer)}
              className="flex-1 py-1.5 rounded text-xs font-semibold bg-gray-600 hover:bg-gray-500 text-white transition-colors"
            >
              🔄 {t('trade.counter')}
            </button>
          </div>
        </div>
  );
}
