import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useLobbyStore } from '../../store/lobbyStore';
import { Navbar } from '../Layout/Navbar';

export function LobbyPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { games, fetchGames, createGame, loading } = useLobbyStore();

  useEffect(() => { fetchGames(); }, [fetchGames]);

  const handleCreate = async () => {
    const gameId = await createGame();
    navigate(`/game/${gameId}`);
  };

  const handleJoin = (gameId: string) => {
    navigate(`/game/${gameId}`);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar userName={user?.name} connectionStatus="connected" onLogout={logout} />
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">{t('lobby.title')}</h1>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
          >
            {t('lobby.createGame')}
          </button>
        </div>

        <div className="space-y-2">
          {loading && <div className="text-gray-400 text-center py-8">Loading...</div>}
          {!loading && games.length === 0 && (
            <div className="text-gray-400 text-center py-8">{t('lobby.waitingForPlayers')}</div>
          )}
          {games.map((game) => (
            <div key={game.id} className="bg-gray-800 rounded-lg p-4 flex justify-between items-center">
              <div>
                <h3 className="text-white font-medium">{game.name}</h3>
                <p className="text-gray-400 text-sm">
                  {game.host} · {game.playerCount} {t('common.players')} · {t(`map.${game.mapType}` as never) || game.mapType}
                </p>
              </div>
              <button
                onClick={() => handleJoin(game.id)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                {t('lobby.joinGame')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
