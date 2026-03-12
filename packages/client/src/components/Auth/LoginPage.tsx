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
    if (!name.trim()) return;
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
      {/* Animated ocean/map background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0d2137] to-[#1a3a2a]">
        {/* Subtle animated waves */}
        <div className="absolute bottom-0 left-0 right-0 h-64 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 to-transparent animate-pulse" style={{ animationDuration: '4s' }} />
        </div>
        {/* Floating hex pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hexes" width="60" height="52" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
              <polygon points="30,2 54,15 54,37 30,50 6,37 6,15" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hexes)" />
        </svg>
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="text-xl font-bold text-amber-400 tracking-wider">🎲 BROLONIST</div>
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
        <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-2 tracking-tight">
          Brolonist
        </h1>
        <p className="text-gray-400 mb-8 text-center text-sm sm:text-base">
          {i18n.language === 'tr' ? 'Arkadaşlarınla online Catan oyna' : 'Play Catan online with friends'}
        </p>

        {/* Auth card */}
        <div className="w-full max-w-md">
          <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-2xl space-y-5">

            {/* Play Now — primary CTA */}
            <button
              onClick={handlePlayNow}
              disabled={loading}
              className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-amber-600/20 hover:shadow-amber-500/30 active:scale-[0.98]"
            >
              {loading ? '⏳' : '🎮'} {t('auth.guest')}
            </button>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Custom name option */}
            <form onSubmit={handleGuestLogin} className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('auth.guestName')}
                className="flex-1 px-4 py-2.5 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-amber-500 focus:outline-none text-sm placeholder:text-gray-500"
                maxLength={50}
              />
              <button
                type="submit"
                disabled={!name.trim() || loading}
                className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg font-medium text-sm transition-colors whitespace-nowrap"
              >
                {t('auth.login')}
              </button>
            </form>

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

          {/* Social proof strip */}
          <div className="mt-4 text-center text-xs text-gray-500">
            {i18n.language === 'tr'
              ? '🟢 Şu anda oyunculara açık'
              : '🟢 Open to players now'}
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
