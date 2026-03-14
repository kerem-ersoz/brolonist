import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';

function generateGuestName(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `Settler_${num}`;
}

const PROVIDER_ICONS: Record<string, string> = {
  Google: '🔵',
  Discord: '💬',
  GitHub: '🐱',
};

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/" />;

  const handlePlayNow = async () => {
    setLoading(true);
    setError('');
    try {
      await login(generateGuestName());
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!/^[a-zA-Z0-9_]{2,20}$/.test(trimmed)) {
      setError('Name must be 2-20 characters, letters, numbers, and underscores only');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(name.trim());
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-end px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'tr' ? 'en' : 'tr')}
            className="text-sm text-gray-400 hover:text-white border border-gray-700 rounded-md px-2.5 py-1 transition-colors"
          >
            {i18n.language === 'tr' ? '🇬🇧 EN' : '🇹🇷 TR'}
          </button>
        </div>
      </header>

      {/* Center content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-8">
        {/* Title */}
        <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-8 tracking-tight">
          Brolonist
        </h1>

        {/* Auth card */}
        <div className="w-full max-w-md">
          <div className="backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-2xl space-y-5" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>

            {/* Custom name option */}
            <form onSubmit={handleGuestLogin} className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('auth.guestName')}
                className="flex-1 px-4 py-2.5 text-white rounded-lg border border-gray-700/50 focus:border-amber-500 focus:outline-none text-sm placeholder:text-gray-500 backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                maxLength={20}
              />
              <button
                type="submit"
                disabled={!name.trim() || loading || (name.trim().length > 0 && !/^[a-zA-Z0-9_]{2,20}$/.test(name.trim()))}
                className="px-5 py-2.5 text-white rounded-lg font-medium text-sm transition-colors whitespace-nowrap border border-gray-700/50 hover:border-gray-600 disabled:text-gray-600"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
              >
                {t('auth.login')}
              </button>
            </form>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-700" />
              <button
                onClick={() => setShowMore(!showMore)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showMore
                  ? (i18n.language === 'tr' ? 'Daha az' : 'Less options')
                  : (i18n.language === 'tr' ? 'Daha fazla seçenek' : 'More options')}
              </button>
              <div className="flex-1 h-px bg-gray-700" />
            </div>

            {/* OAuth providers — collapsed by default */}
            {showMore && (
              <div className="space-y-2.5 animate-fade-in">
                <button
                  onClick={handlePlayNow}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg font-medium transition-colors border border-gray-700 text-sm"
                >
                  <span>🎮</span>
                  {t('auth.guest')}
                </button>
                {['Google', 'Discord', 'GitHub'].map((provider) => (
                  <button
                    key={provider}
                    onClick={() => window.location.href = `/api/auth/${provider.toLowerCase()}`}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg font-medium transition-colors border border-gray-700 text-sm"
                  >
                    <span>{PROVIDER_ICONS[provider]}</span>
                    {t('auth.loginWith', { provider })}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-xs text-gray-600">
        <span>Brolonist © 2026</span>
        <span className="mx-2">·</span>
        <span>{i18n.language === 'tr' ? 'Şartlar' : 'Terms'}</span>
        <span className="mx-2">·</span>
        <span>{i18n.language === 'tr' ? 'Gizlilik' : 'Privacy'}</span>
      </footer>
    </div>
  );
}
