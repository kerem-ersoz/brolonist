import { useTranslation } from 'react-i18next';

interface NavbarProps {
  userName?: string;
  connectionStatus: string;
  onLogout: () => void;
}

export function Navbar({ userName, connectionStatus, onLogout }: NavbarProps) {
  const { t, i18n } = useTranslation();
  const statusColor = connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <nav className="bg-gray-800 px-4 py-2 flex items-center justify-between">
      <span className="text-white font-bold">{t('app.title')}</span>
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${statusColor}`} />
        <button onClick={() => i18n.changeLanguage(i18n.language === 'tr' ? 'en' : 'tr')} className="text-gray-400 hover:text-white text-sm">
          {i18n.language === 'tr' ? 'EN' : 'TR'}
        </button>
        {userName && <span className="text-gray-300 text-sm">{userName}</span>}
        <button onClick={onLogout} className="text-red-400 hover:text-red-300 text-sm">{t('auth.logout')}</button>
      </div>
    </nav>
  );
}
