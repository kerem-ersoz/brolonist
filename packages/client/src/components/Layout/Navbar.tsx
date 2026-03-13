import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface NavbarProps {
  userName?: string;
  connectionStatus: string;
  onLogout: () => void;
  turnDeadline?: string | null;
  turnTimerSeconds?: number;
}

export function Navbar({ userName, connectionStatus, onLogout, turnDeadline, turnTimerSeconds }: NavbarProps) {
  const { t, i18n } = useTranslation();
  const statusColor = connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500';

  const [secondsLeft, setSecondsLeft] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!turnDeadline) {
      setSecondsLeft(0);
      return;
    }
    const deadlineMs = new Date(turnDeadline).getTime();
    const tick = () => {
      const remaining = deadlineMs - Date.now();
      setSecondsLeft(Math.max(0, Math.ceil(remaining / 1000)));
      if (remaining > 0) rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(rafRef.current);
  }, [turnDeadline]);

  return (
    <nav className="bg-gray-800 px-4 py-2 flex items-center justify-between">
      <span className="text-white font-bold">{t('app.title')}</span>
      <div className="flex items-center gap-3">
        {turnDeadline && secondsLeft > 0 ? (
          <span className={`text-sm font-bold ${secondsLeft > 10 ? 'text-yellow-400' : 'text-red-400'}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
          </span>
        ) : null}
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
