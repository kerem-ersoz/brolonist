import { useTranslation } from 'react-i18next';

interface ActionBarProps {
  phase: string;
  isMyTurn: boolean;
  canRoll: boolean;
  canBuild: boolean;
  canTrade: boolean;
  canBuyDevCard: boolean;
  canEndTurn: boolean;
  onRollDice: () => void;
  onBuild: (type: 'road' | 'settlement' | 'city') => void;
  onBuyDevCard: () => void;
  onTrade: () => void;
  onEndTurn: () => void;
}

export function ActionBar({
  isMyTurn, canRoll, canBuild, canTrade, canBuyDevCard, canEndTurn,
  onRollDice, onBuild, onBuyDevCard, onTrade, onEndTurn,
}: ActionBarProps) {
  const { t } = useTranslation();

  if (!isMyTurn) {
    return (
      <div className="bg-gray-800 rounded-lg p-3 text-center text-gray-400">
        ⏳ {t('lobby.waitingForPlayers')}
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-3 flex flex-wrap gap-2">
      {canRoll && (
        <button onClick={onRollDice} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold">
          🎲 {t('game.rollDice')}
        </button>
      )}
      {canBuild && (
        <>
          <button onClick={() => onBuild('road')} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
            🛣️ {t('buildings.road')}
          </button>
          <button onClick={() => onBuild('settlement')} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
            🏠 {t('buildings.settlement')}
          </button>
          <button onClick={() => onBuild('city')} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
            🏙️ {t('buildings.city')}
          </button>
        </>
      )}
      {canBuyDevCard && (
        <button onClick={onBuyDevCard} className="px-3 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-sm">
          📜 {t('game.buyDevCard')}
        </button>
      )}
      {canTrade && (
        <button onClick={onTrade} className="px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-sm">
          🤝 {t('game.trade')}
        </button>
      )}
      {canEndTurn && (
        <button onClick={onEndTurn} className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg font-semibold">
          ⏭️ {t('game.endTurn')}
        </button>
      )}
    </div>
  );
}
