import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await login(name.trim());
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'tr' ? 'en' : 'tr');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-5xl font-bold text-white text-center mb-8">{t('app.title')}</h1>

        <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
          <form onSubmit={handleGuestLogin} className="space-y-4">
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('auth.guestName')}
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                maxLength={50}
              />
            </div>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
            >
              {loading ? '...' : t('auth.guest')}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="text-gray-400 text-center text-sm">— {t('auth.login')} —</div>
            {['Google', 'Discord', 'GitHub'].map((provider) => (
              <button
                key={provider}
                onClick={() => window.location.href = `/api/auth/${provider.toLowerCase()}`}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                {t('auth.loginWith', { provider })}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={toggleLanguage}
          className="mt-4 mx-auto block text-gray-400 hover:text-white text-sm"
        >
          {i18n.language === 'tr' ? 'English' : 'Türkçe'}
        </button>
      </div>
    </div>
  );
}
