import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';

export function LobbyPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">{t('lobby.title')}</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">{user?.name}</span>
            <button onClick={logout} className="text-sm text-red-400 hover:text-red-300">
              {t('auth.logout')}
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
          {t('lobby.waitingForPlayers')}
        </div>
      </div>
    </div>
  );
}
