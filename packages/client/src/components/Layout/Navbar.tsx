import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface NavbarProps {
  userName?: string;
  connectionStatus: string;
  onLogout: () => void;
  onLeaveGame?: () => void;
  turnDeadline?: string | null;
  turnTimerSeconds?: number;
}

export function Navbar({ userName, connectionStatus, onLogout, onLeaveGame, turnDeadline, turnTimerSeconds }: NavbarProps) {
  const { t, i18n } = useTranslation();
  const statusColor = connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500';

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    <nav className="px-4 py-2 flex items-center justify-between border-b border-gray-700/50 backdrop-blur-sm" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
      <span className="text-white font-bold">{t('app.title')}</span>
      <div className="flex items-center gap-3">
        {turnDeadline && secondsLeft > 0 ? (
          <span className={`text-sm font-bold ${secondsLeft > 10 ? 'text-yellow-400' : 'text-red-400'}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
          </span>
        ) : null}
        <div className={`w-2 h-2 rounded-full ${statusColor}`} />
        {userName && <span className="text-gray-300 text-sm">{userName}</span>}
        {onLeaveGame && (
          <button onClick={onLeaveGame} className="text-red-400 hover:text-red-300 text-sm">
            {t('game.leave', 'Leave Game')}
          </button>
        )}
        <button onClick={() => setSettingsOpen(true)} className="text-gray-400 hover:text-white text-sm" title="Settings">
          ⚙️
        </button>
      </div>

      {/* Settings Modal — portaled to body to avoid clipping */}
      {settingsOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setSettingsOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative rounded-xl p-6 shadow-2xl border border-gray-600 w-80 space-y-4" style={{ backgroundColor: 'rgba(30,30,40,0.95)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="text-white font-bold text-lg">{t('settings.title', 'Settings')}</h2>
              <button onClick={() => setSettingsOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">{t('settings.language', 'Language')}</span>
                <button
                  onClick={() => i18n.changeLanguage(i18n.language === 'tr' ? 'en' : 'tr')}
                  className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm"
                >
                  {i18n.language === 'tr' ? 'English' : 'Türkçe'}
                </button>
              </div>

              {userName && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">{t('settings.player', 'Player')}</span>
                  <span className="text-white text-sm">{userName}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => { setSettingsOpen(false); onLogout(); }}
              className="w-full py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white font-semibold text-sm"
            >
              {t('auth.logout')}
            </button>
          </div>
        </div>,
        document.body
      )}
    </nav>
  );
}
