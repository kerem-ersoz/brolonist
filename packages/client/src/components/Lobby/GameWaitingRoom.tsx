import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface LobbyPlayerView {
  id: string;
  name: string;
  ready: boolean;
  isBot: boolean;
  botStrategy?: string;
}

export interface GameWaitingRoomProps {
  lobby: {
    id: string;
    name: string;
    hostId: string;
    players: LobbyPlayerView[];
    config: {
      maxPlayers: number;
      victoryPoints: number;
      mapType: string;
      turnTimerSeconds: number;
    };
  };
  myPlayerId: string | null;
  onReady: (ready: boolean) => void;
  onAddBot: (strategy: string) => void;
  onRemoveBot: (botId: string) => void;
  onKick: (playerId: string) => void;
  onStartGame: () => void;
}

const PLAYER_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-yellow-500',
  'bg-orange-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-teal-500',
];

const BOT_STRATEGIES = [
  { value: 'random', labelKey: 'lobby.bot.random' },
  { value: 'greedy', labelKey: 'lobby.bot.greedy' },
  { value: 'smart', labelKey: 'lobby.bot.smart' },
];

export function GameWaitingRoom({
  lobby,
  myPlayerId,
  onReady,
  onAddBot,
  onRemoveBot,
  onKick,
  onStartGame,
}: GameWaitingRoomProps) {
  const { t } = useTranslation();
  const [botStrategy, setBotStrategy] = useState('random');

  const isHost = myPlayerId === lobby.hostId;
  const me = lobby.players.find((p) => p.id === myPlayerId);
  const allReady = lobby.players.length >= 2 && lobby.players.every((p) => p.ready);
  const emptySlots = lobby.config.maxPlayers - lobby.players.length;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-700 px-4 py-4 sm:px-6">
        <h1 className="text-2xl font-bold">{lobby.name}</h1>
        <p className="text-sm text-gray-400 mt-1">
          {lobby.players.length}/{lobby.config.maxPlayers} {t('common.players')}
        </p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 sm:p-6 max-w-5xl mx-auto w-full">
        {/* Player List */}
        <div className="flex-1 space-y-3">
          <h2 className="text-lg font-semibold mb-3">{t('common.players')}</h2>

          {lobby.players.map((player, idx) => (
            <div
              key={player.id}
              className="flex items-center gap-3 bg-gray-800 rounded-lg p-3 transition-all"
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${PLAYER_COLORS[idx % PLAYER_COLORS.length]}`}>
                {player.isBot ? '🤖' : player.name.charAt(0).toUpperCase()}
              </div>

              {/* Name + badges */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{player.name}</span>
                  {player.id === lobby.hostId && (
                    <span className="text-yellow-400 text-sm" title={t('lobby.host')}>👑</span>
                  )}
                </div>
                {player.isBot && (
                  <div className="mt-1">
                    {isHost ? (
                      <select
                        value={player.botStrategy ?? 'random'}
                        onChange={() => {
                          // Bot strategy change: remove + re-add
                          onRemoveBot(player.id);
                        }}
                        className="text-xs bg-gray-700 text-gray-200 rounded px-2 py-0.5 border border-gray-600"
                      >
                        {BOT_STRATEGIES.map((s) => (
                          <option key={s.value} value={s.value}>{t(s.labelKey)}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {t(`lobby.bot.${player.botStrategy ?? 'random'}`)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Ready indicator */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all ${
                player.ready
                  ? 'bg-green-600 scale-110'
                  : 'bg-gray-700'
              }`}>
                {player.ready ? '✓' : '·'}
              </div>

              {/* Host kick / remove bot */}
              {isHost && player.id !== myPlayerId && (
                <button
                  onClick={() => player.isBot ? onRemoveBot(player.id) : onKick(player.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-600/30 text-gray-400 hover:text-red-400 transition-colors"
                  title={player.isBot ? t('lobby.removeBot') : t('lobby.kick')}
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: emptySlots }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3 border border-dashed border-gray-700"
            >
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-500">
                ?
              </div>
              <span className="flex-1 text-gray-500 italic">{t('lobby.slot.empty')}</span>
              {isHost && (
                <button
                  onClick={() => onAddBot(botStrategy)}
                  className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  🤖 {t('lobby.slot.addBot')}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Settings panel + actions */}
        <div className="lg:w-72 space-y-4">
          {/* Game settings */}
          <div className="bg-gray-800 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-300 uppercase tracking-wider">{t('common.settings')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">{t('lobby.mapType')}</span>
                <span>{t(`map.${lobby.config.mapType}`)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{t('lobby.victoryPoints')}</span>
                <span>{lobby.config.victoryPoints}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{t('lobby.maxPlayers')}</span>
                <span>{lobby.config.maxPlayers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Timer</span>
                <span>{lobby.config.turnTimerSeconds}s</span>
              </div>
            </div>
          </div>

          {/* Bot strategy selector for host */}
          {isHost && emptySlots > 0 && (
            <div className="bg-gray-800 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-sm text-gray-300 uppercase tracking-wider">
                {t('lobby.addBot')}
              </h3>
              <select
                value={botStrategy}
                onChange={(e) => setBotStrategy(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600"
              >
                {BOT_STRATEGIES.map((s) => (
                  <option key={s.value} value={s.value}>{t(s.labelKey)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Status message */}
          <div className="text-center text-sm">
            {allReady ? (
              <p className="text-green-400 font-medium animate-pulse">{t('lobby.allReady')}</p>
            ) : lobby.players.length < 2 ? (
              <p className="text-yellow-400">{t('lobby.minPlayers')}</p>
            ) : (
              <p className="text-gray-400">{t('lobby.waitingForPlayers')}</p>
            )}
          </div>

          {/* Ready / Start buttons */}
          {isHost ? (
            <button
              onClick={onStartGame}
              disabled={!allReady}
              className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
                allReady
                  ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30 animate-pulse'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {t('lobby.startGame')}
            </button>
          ) : me ? (
            <button
              onClick={() => onReady(!me.ready)}
              className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
                me.ready
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              {me.ready ? t('lobby.ready') + ' ✓' : t('lobby.notReady')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
