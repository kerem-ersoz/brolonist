import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const PLAYER_COLORS: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', white: '#d1d5db', orange: '#f97316',
  green: '#22c55e', brown: '#92400e', purple: '#a855f7', teal: '#14b8a6',
};

interface PlayerStanding {
  playerId: string;
  name: string;
  color: string;
  totalVP: number;
  settlements: number;
  cities: number;
  longestRoad: boolean;
  largestArmy: boolean;
  vpCards: number;
  knightsPlayed: number;
  roadsBuilt: number;
}

interface VictoryModalProps {
  winnerId: string;
  winnerName: string;
  winnerColor?: string;
  victoryPoints: number;
  standings?: PlayerStanding[];
  myPlayerId: string | null;
  onHome: () => void;
  onPlayAgain?: () => void;
}

const RANK_STYLES = [
  'text-yellow-400', // 1st
  'text-gray-300',   // 2nd
  'text-amber-600',  // 3rd
  'text-gray-500',   // 4th+
];

const RANK_ICONS = ['🥇', '🥈', '🥉'];

export function VictoryModal({ winnerId, winnerName, winnerColor, victoryPoints, standings, myPlayerId, onHome }: VictoryModalProps) {
  const { t } = useTranslation();
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const isWinner = winnerId === myPlayerId;
  const color = PLAYER_COLORS[winnerColor || 'blue'] || PLAYER_COLORS.blue;

  // Animate scoreboard in after 1s
  useEffect(() => {
    const timer = setTimeout(() => setShowScoreboard(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-minimize after 60s
  useEffect(() => {
    const timer = setTimeout(() => setMinimized(true), 60000);
    return () => clearTimeout(timer);
  }, []);

  if (minimized) {
    return (
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-2 cursor-pointer"
        style={{ backgroundColor: color }}
        onClick={() => setMinimized(false)}
      >
        <span className="text-white font-bold text-sm">
          🏆 {isWinner ? 'You won!' : `${winnerName} wins!`} — {victoryPoints} VP
          <span className="text-white/60 ml-2">(click to expand)</span>
        </span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-gray-700">
        {/* Winner announcement */}
        <div className="relative px-6 pt-8 pb-6 text-center" style={{ background: `linear-gradient(180deg, ${color}33 0%, transparent 100%)` }}>
          {/* Crown / Trophy */}
          <div className="text-6xl mb-3">{isWinner ? '👑' : '🏆'}</div>

          {/* Winner avatar */}
          <div
            className="w-16 h-16 rounded-full mx-auto mb-3 border-4 flex items-center justify-center"
            style={{ backgroundColor: color, borderColor: '#fbbf24' }}
          >
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white/90">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>

          {/* Winner name */}
          <h1 className="text-2xl font-bold mb-1" style={{ color }}>
            {isWinner ? 'You won!' : `${winnerName} wins!`}
          </h1>
          <p className="text-gray-400 text-sm">{victoryPoints} Victory Points</p>
        </div>

        {/* Scoreboard */}
        {standings && standings.length > 0 && (
          <div className={`px-4 pb-4 transition-all duration-700 ${showScoreboard ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 text-center">Final Standings</h3>
            <div className="space-y-1.5">
              {standings.map((p, i) => {
                const pColor = PLAYER_COLORS[p.color] || '#6b7280';
                const isMe = p.playerId === myPlayerId;
                return (
                  <div
                    key={p.playerId}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 ${isMe ? 'bg-white/10 ring-1 ring-white/20' : 'bg-gray-800/50'}`}
                    style={{ animationDelay: `${i * 200}ms` }}
                  >
                    {/* Rank */}
                    <span className={`text-lg w-7 text-center ${RANK_STYLES[Math.min(i, 3)]}`}>
                      {RANK_ICONS[i] || `${i + 1}.`}
                    </span>

                    {/* Player color dot + name */}
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: pColor }}
                    />
                    <span className={`text-sm font-semibold flex-1 truncate ${isMe ? 'text-white' : 'text-gray-300'}`}>
                      {p.name}{isMe ? ' (you)' : ''}
                    </span>

                    {/* VP total */}
                    <span className={`text-lg font-bold ${RANK_STYLES[Math.min(i, 3)]}`}>
                      {p.totalVP}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* VP Breakdown for top player */}
            {standings.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700/50">
                <h4 className="text-gray-500 text-[10px] font-semibold uppercase mb-2 text-center">VP Breakdown — {standings[0].name}</h4>
                <div className="flex flex-wrap justify-center gap-2 text-xs">
                  {standings[0].settlements > 0 && (
                    <span className="bg-gray-800 px-2 py-1 rounded text-gray-300">🏠 ×{standings[0].settlements}</span>
                  )}
                  {standings[0].cities > 0 && (
                    <span className="bg-gray-800 px-2 py-1 rounded text-gray-300">🏰 ×{standings[0].cities} <span className="text-gray-500">({standings[0].cities * 2}VP)</span></span>
                  )}
                  {standings[0].longestRoad && (
                    <span className="bg-gray-800 px-2 py-1 rounded text-gray-300">🛣️ Longest Road <span className="text-gray-500">(2VP)</span></span>
                  )}
                  {standings[0].largestArmy && (
                    <span className="bg-gray-800 px-2 py-1 rounded text-gray-300">⚔️ Largest Army <span className="text-gray-500">(2VP)</span></span>
                  )}
                  {standings[0].vpCards > 0 && (
                    <span className="bg-gray-800 px-2 py-1 rounded text-gray-300">🃏 ×{standings[0].vpCards} VP cards</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={onHome}
            className="flex-1 py-2.5 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            🏠 {t('common.back', 'Home')}
          </button>
          <button
            onClick={() => setMinimized(true)}
            className="px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            View Board
          </button>
        </div>
      </div>
    </div>
  );
}
