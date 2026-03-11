import { useTranslation } from 'react-i18next';

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
    <div className="fixed top-16 right-4 z-40 flex flex-col gap-2 max-w-xs">
      {offers.map((offer) => (
        <div
          key={offer.id}
          className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 animate-in slide-in-from-right"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${PLAYER_COLOR_DOT[offer.fromPlayerColor] ?? 'bg-gray-500'}`} />
            <span className="text-white text-sm font-semibold">{offer.fromPlayerName} {t('trade.offers', 'offers')}:</span>
          </div>

          {/* Give / Want */}
          <div className="space-y-1 text-xs mb-3">
            <div className="text-gray-400">
              <span className="text-red-300 font-semibold">{t('trade.give')}:</span>{' '}
              <span className="text-white">{formatResources(offer.offering)}</span>
            </div>
            <div className="text-gray-400">
              <span className="text-green-300 font-semibold">{t('trade.want')}:</span>{' '}
              <span className="text-white">{formatResources(offer.requesting)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1.5">
            <button
              onClick={() => onAccept(offer.id)}
              className="flex-1 py-1.5 rounded text-xs font-semibold bg-green-700 hover:bg-green-600 text-white transition-colors"
            >
              ✅ {t('trade.accept')}
            </button>
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
      ))}
    </div>
  );
}
