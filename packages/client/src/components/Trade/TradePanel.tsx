import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const RESOURCES = ['brick', 'lumber', 'ore', 'grain', 'wool'] as const;
const RESOURCE_ICONS: Record<string, string> = { brick: '🧱', lumber: '🪵', ore: '⛏️', grain: '🌾', wool: '🐑' };

interface TradePanelProps {
  myResources: Record<string, number>;
  activeOffers: Array<{
    id: string;
    fromPlayerName: string;
    offering: Record<string, number>;
    requesting: Record<string, number>;
  }>;
  onPropose: (offering: Record<string, number>, requesting: Record<string, number>) => void;
  onAccept: (offerId: string) => void;
  onDecline: (offerId: string) => void;
  onBankTrade: (giving: string, givingCount: number, receiving: string) => void;
  harbors: string[];
  onClose: () => void;
}

export function TradePanel({ myResources, activeOffers, onPropose, onAccept, onDecline, harbors, onClose }: TradePanelProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'offer' | 'bank'>('offer');
  const [offering, setOffering] = useState<Record<string, number>>({ brick: 0, lumber: 0, ore: 0, grain: 0, wool: 0 });
  const [requesting, setRequesting] = useState<Record<string, number>>({ brick: 0, lumber: 0, ore: 0, grain: 0, wool: 0 });

  const handlePropose = () => {
    const hasOffer = Object.values(offering).some(v => v > 0);
    const hasRequest = Object.values(requesting).some(v => v > 0);
    if (hasOffer && hasRequest) {
      onPropose(offering, requesting);
      setOffering({ brick: 0, lumber: 0, ore: 0, grain: 0, wool: 0 });
      setRequesting({ brick: 0, lumber: 0, ore: 0, grain: 0, wool: 0 });
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4 max-w-md">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-bold">{t('game.trade')}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('offer')} className={`px-3 py-1 rounded text-sm ${tab === 'offer' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
          {t('trade.offer')}
        </button>
        <button onClick={() => setTab('bank')} className={`px-3 py-1 rounded text-sm ${tab === 'bank' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
          {t('trade.bankTrade')}
        </button>
      </div>

      {tab === 'offer' && (
        <>
          {/* Give */}
          <div>
            <div className="text-gray-400 text-sm mb-1">{t('trade.give')}</div>
            <div className="flex gap-1">
              {RESOURCES.map(r => (
                <div key={r} className="flex flex-col items-center">
                  <span className="text-lg">{RESOURCE_ICONS[r]}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setOffering(o => ({ ...o, [r]: Math.max(0, o[r] - 1) }))} className="text-gray-400 text-xs">-</button>
                    <span className="text-white text-sm w-4 text-center">{offering[r]}</span>
                    <button onClick={() => setOffering(o => ({ ...o, [r]: Math.min(myResources[r] || 0, o[r] + 1) }))} className="text-gray-400 text-xs">+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Want */}
          <div>
            <div className="text-gray-400 text-sm mb-1">{t('trade.want')}</div>
            <div className="flex gap-1">
              {RESOURCES.map(r => (
                <div key={r} className="flex flex-col items-center">
                  <span className="text-lg">{RESOURCE_ICONS[r]}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setRequesting(o => ({ ...o, [r]: Math.max(0, o[r] - 1) }))} className="text-gray-400 text-xs">-</button>
                    <span className="text-white text-sm w-4 text-center">{requesting[r]}</span>
                    <button onClick={() => setRequesting(o => ({ ...o, [r]: o[r] + 1 }))} className="text-gray-400 text-xs">+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={handlePropose} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">
            {t('trade.propose')}
          </button>

          {/* Active offers */}
          {activeOffers.length > 0 && (
            <div className="space-y-2">
              {activeOffers.map(offer => (
                <div key={offer.id} className="bg-gray-700 rounded p-2 text-sm">
                  <div className="text-white mb-1">{offer.fromPlayerName}:</div>
                  <div className="text-gray-300 text-xs">
                    Gives: {Object.entries(offer.offering).filter(([, v]) => v > 0).map(([k, v]) => `${RESOURCE_ICONS[k]}×${v}`).join(' ')}
                  </div>
                  <div className="text-gray-300 text-xs">
                    Wants: {Object.entries(offer.requesting).filter(([, v]) => v > 0).map(([k, v]) => `${RESOURCE_ICONS[k]}×${v}`).join(' ')}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => onAccept(offer.id)} className="px-2 py-1 bg-green-700 text-white rounded text-xs">{t('trade.accept')}</button>
                    <button onClick={() => onDecline(offer.id)} className="px-2 py-1 bg-red-700 text-white rounded text-xs">{t('trade.decline')}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'bank' && (
        <div className="text-gray-400 text-sm text-center py-4">
          {t('trade.bankTrade')} — 4:1 {harbors.length > 0 ? `(${harbors.join(', ')})` : ''}
        </div>
      )}
    </div>
  );
}
