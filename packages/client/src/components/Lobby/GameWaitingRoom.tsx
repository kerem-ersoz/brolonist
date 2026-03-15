import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomMapConfigurator } from './CustomMapConfigurator';

// Miniature hex grid preview for map thumbnails
const HEX_SIZE = 6;
function hexToPixel(q: number, r: number): { x: number; y: number } {
  return { x: HEX_SIZE * (3 / 2 * q), y: HEX_SIZE * (Math.sqrt(3) * (r + q / 2)) };
}
function hexPoints(cx: number, cy: number, s: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${cx + s * Math.cos(angle)},${cy + s * Math.sin(angle)}`;
  }).join(' ');
}

// Standard 19-hex grid (ring 0-2)
function ring2(): Array<{ q: number; r: number }> {
  const hexes: Array<{ q: number; r: number }> = [];
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      if (Math.abs(-q - r) <= 2) hexes.push({ q, r });
    }
  }
  return hexes;
}

// Map-specific hex layouts (simplified for preview)
const MAP_HEXES: Record<string, Array<{ q: number; r: number }>> = {
  standard: ring2(),
  archipelago: [
    { q: -2, r: 0 }, { q: -2, r: 1 }, { q: -1, r: -1 },
    { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 },
    { q: 2, r: -1 }, { q: 2, r: 0 }, { q: 1, r: 1 },
    { q: 0, r: 2 }, { q: -1, r: 2 }, { q: -2, r: 2 },
    { q: 0, r: 0 }, { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 },
  ],
  world: [
    ...ring2(),
    { q: -3, r: 1 }, { q: -3, r: 2 }, { q: 3, r: -2 }, { q: 3, r: -1 },
    { q: 0, r: -3 }, { q: 0, r: 3 }, { q: -1, r: 3 }, { q: 1, r: -3 },
  ],
  diamond: [
    { q: 0, r: -3 }, { q: 1, r: -3 }, { q: -1, r: -2 }, { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -3 },
    { q: -2, r: -1 }, { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 2, r: -2 },
    { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 },
    { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 },
  ],
  british_isles: [
    { q: -1, r: -2 }, { q: 0, r: -2 }, { q: -2, r: 0 }, { q: -1, r: -1 }, { q: 0, r: -1 },
    { q: -2, r: 1 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: -1 },
    { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 0 }, { q: 1, r: 1 },
    { q: -1, r: 2 }, { q: 0, r: 2 },
    { q: 2, r: -2 }, { q: 2, r: -1 }, { q: 3, r: -2 },
  ],
  gear: [
    ...ring2(),
    { q: 0, r: -3 }, { q: 3, r: -3 }, { q: 3, r: 0 }, { q: 0, r: 3 }, { q: -3, r: 3 }, { q: -3, r: 0 },
  ],
  lakes: ring2(),
  custom: ring2(), // fallback preview for custom maps
};

const ALL_MAP_TYPES = ['standard','archipelago','world','diamond','british_isles','gear','lakes','custom'] as const;

function MapPreview({ mapType, size = 48 }: { mapType: string; size?: number }): ReactNode {
  const hexes = MAP_HEXES[mapType] || MAP_HEXES.standard;
  const pixels = hexes.map(h => hexToPixel(h.q, h.r));
  const minX = Math.min(...pixels.map(p => p.x)) - HEX_SIZE;
  const maxX = Math.max(...pixels.map(p => p.x)) + HEX_SIZE;
  const minY = Math.min(...pixels.map(p => p.y)) - HEX_SIZE;
  const maxY = Math.max(...pixels.map(p => p.y)) + HEX_SIZE;
  const vw = maxX - minX;
  const vh = maxY - minY;
  return (
    <svg width={size} height={size} viewBox={`${minX} ${minY} ${vw} ${vh}`} className="flex-shrink-0">
      {hexes.map((h, i) => {
        const p = hexToPixel(h.q, h.r);
        return <polygon key={i} points={hexPoints(p.x, p.y, HEX_SIZE * 0.9)} fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />;
      })}
    </svg>
  );
}

function MapPickerButton({ currentMap, onSelect }: { currentMap: string; onSelect: (map: string) => void }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full mt-1 flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white rounded px-2 py-1.5 text-sm border border-gray-600 transition-colors"
      >
        <MapPreview mapType={currentMap} size={28} />
        <span className="flex-1 text-left">{t(`map.${currentMap}`)}</span>
        <span className="text-gray-400 text-xs">▼</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">{t('common.selectMap')}</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ALL_MAP_TYPES.map((m) => (
                <button
                  key={m}
                  onClick={() => { onSelect(m); setOpen(false); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                    m === currentMap
                      ? 'border-amber-500 bg-amber-900/30'
                      : 'border-gray-700/50 hover:border-gray-500 hover:bg-white/5'
                  }`}
                >
                  <MapPreview mapType={m} size={56} />
                  <span className="text-white text-[11px] font-medium text-center leading-tight">{t(`map.${m}`)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface LobbyPlayerView {
  id: string;
  name: string;
  color: string;
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
    spectators?: { id: string; name: string }[];
    config: {
      victoryPoints: number;
      mapType: string;
      turnTimerSeconds: number;
      customMapConfig?: { tileCount: number; shape: string; seed?: string; resourceRatio?: number; desertRatio?: number; waterRatio?: number };
    };
  };
  myPlayerId: string | null;
  onReady: (ready: boolean) => void;
  onAddBot: (strategy: string) => void;
  onRemoveBot: (botId: string) => void;
  onKick: (playerId: string) => void;
  onStartGame: () => void;
  onUpdateConfig: (updates: { victoryPoints?: number; turnTimerSeconds?: number; mapType?: string; customMapConfig?: { tileCount: number; shape: string; seed?: string; resourceRatio?: number; desertRatio?: number; waterRatio?: number } }) => void;
  onChangeColor: (color: string) => void;
}

const PLAYER_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-gray-200',
  'bg-orange-500',
  'bg-green-500',
  'bg-amber-800',
  'bg-purple-500',
  'bg-teal-500',
  'bg-pink-500',
  'bg-gray-900',
];

const COLOR_NAMES = ['red', 'blue', 'white', 'orange', 'green', 'brown', 'purple', 'teal', 'pink', 'black'];

const COLOR_BG_MAP: Record<string, string> = {
  red: 'bg-red-500', blue: 'bg-blue-500', white: 'bg-gray-200', orange: 'bg-orange-500',
  green: 'bg-green-500', brown: 'bg-amber-800', purple: 'bg-purple-500', teal: 'bg-teal-500',
  pink: 'bg-pink-500', black: 'bg-gray-900',
};

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
  onUpdateConfig,
  onChangeColor,
}: GameWaitingRoomProps) {
  const { t } = useTranslation();
  const [botStrategy, setBotStrategy] = useState('random');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const isHost = myPlayerId === lobby.hostId;
  const me = lobby.players.find((p) => p.id === myPlayerId);
  const spectators = lobby.spectators ?? [];
  const isSpectator = spectators.some((s) => s.id === myPlayerId);
  const allReady = lobby.players.length >= 2 && lobby.players.every((p) => p.ready);
  const canAddMore = lobby.players.length < 8;

  return (
    <div className="flex-1 min-h-0 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-700 px-4 py-4 sm:px-6">
        <h1 className="text-2xl font-bold">{lobby.name}</h1>
        <p className="text-sm text-gray-400 mt-1">
          {lobby.players.length} {t('common.players')}{spectators.length > 0 ? ` · ${spectators.length} ${t('lobby.spectators')}` : ''}
        </p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 p-4 sm:p-6 max-w-5xl mx-auto w-full overflow-hidden">
        {/* Player List */}
        <div className="flex-1 space-y-3 overflow-y-auto min-h-0">
          <h2 className="text-lg font-semibold mb-3">{t('common.players')}</h2>

          {lobby.players.map((player, idx) => (
            <div
              key={player.id}
              className="flex items-center gap-3 bg-gray-800 rounded-lg p-3 transition-all"
            >
              {/* Avatar — clickable for self to open color picker */}
              <div className="relative">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${COLOR_BG_MAP[player.color] || PLAYER_COLORS[idx % PLAYER_COLORS.length]} ${player.id === myPlayerId && !player.isBot ? 'cursor-pointer ring-2 ring-transparent hover:ring-white/40 transition-all' : ''}`}
                  onClick={player.id === myPlayerId && !player.isBot ? () => setColorPickerOpen(!colorPickerOpen) : undefined}
                  title={player.id === myPlayerId && !player.isBot ? 'Click to change color' : undefined}
                >
                  {player.isBot ? '🤖' : player.name.charAt(0).toUpperCase()}
                </div>
                {/* Color picker modal */}
                {player.id === myPlayerId && !player.isBot && colorPickerOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setColorPickerOpen(false)}>
                    <div className="bg-gray-800 rounded-xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                      <div className="grid grid-cols-4 gap-3 place-items-center">
                        {COLOR_NAMES.map(c => {
                          const taken = lobby.players.some(p => p.id !== myPlayerId && p.color === c);
                          const isSelected = c === player.color;
                          return (
                            <button
                              key={c}
                              onClick={() => { if (!taken) { onChangeColor(c); setColorPickerOpen(false); } }}
                              disabled={taken}
                              className={`w-11 h-11 rounded-lg transition-all flex items-center justify-center ${
                                isSelected ? 'scale-110 ring-2 ring-white/60 bg-white/10' :
                                taken ? 'opacity-25 cursor-not-allowed' :
                                'hover:scale-110 hover:bg-white/10 cursor-pointer'
                              }`}
                              title={taken ? `${c} (taken)` : c}
                            >
                              <img src={`/assets/sprites/settlement-${c}.png`} alt={c} className="w-9 h-9 object-contain" draggable={false} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
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

          {/* Spectators */}
          {spectators.length > 0 && (
            <>
              <h2 className="text-lg font-semibold mt-6 mb-3">{t('lobby.spectators')}</h2>
              {spectators.map((spec) => (
                <div
                  key={spec.id}
                  className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-gray-300 font-bold">
                    👁
                  </div>
                  <span className="flex-1 text-gray-400">{spec.name}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Settings panel + actions */}
        <div className="lg:w-72 lg:flex-shrink-0 space-y-4 overflow-y-auto overflow-x-hidden scrollbar-hide min-h-0 pb-4">
          {/* Game settings */}
          <div className="bg-gray-800 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-300 uppercase tracking-wider">{t('common.settings')}</h3>
            <div className="space-y-2 text-sm">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{t('lobby.mapType')}</span>
                  {!isHost && (
                    <div className="flex items-center gap-2">
                      <MapPreview mapType={lobby.config.mapType} size={24} />
                      <span>{t(`map.${lobby.config.mapType}`)}</span>
                    </div>
                  )}
                </div>
                {isHost && (
                  <MapPickerButton
                    currentMap={lobby.config.mapType}
                    onSelect={(m) => onUpdateConfig({ mapType: m })}
                  />
                )}
                {/* Custom map configurator */}
                {lobby.config.mapType === 'custom' && isHost && (
                  <div className="mt-2">
                    <CustomMapConfigurator
                      tileCount={lobby.config.customMapConfig?.tileCount ?? 37}
                      shape={lobby.config.customMapConfig?.shape ?? 'round'}
                      seed={lobby.config.customMapConfig?.seed ?? ''}
                      resourceRatio={lobby.config.customMapConfig?.resourceRatio}
                      desertRatio={lobby.config.customMapConfig?.desertRatio}
                      waterRatio={lobby.config.customMapConfig?.waterRatio}
                      onChange={(cfg) => onUpdateConfig({ customMapConfig: cfg })}
                    />
                  </div>
                )}
                {lobby.config.mapType === 'custom' && !isHost && lobby.config.customMapConfig && (
                  <div className="mt-1 text-xs text-gray-400">
                    {lobby.config.customMapConfig.tileCount} {t('map.custom_tileCount')} · {t(`map.custom_${lobby.config.customMapConfig.shape}`)}
                    {lobby.config.customMapConfig.seed && ` · ${lobby.config.customMapConfig.seed}`}
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{t('lobby.victoryPoints')}</span>
                  <span className="font-bold">{lobby.config.victoryPoints}</span>
                </div>
                {isHost && (
                  <input
                    type="range"
                    min={5}
                    max={20}
                    value={lobby.config.victoryPoints}
                    onChange={(e) => onUpdateConfig({ victoryPoints: Number(e.target.value) })}
                    className="w-full mt-1 accent-blue-500"
                  />
                )}
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{t('lobby.turnTimer')}</span>
                  <span className="font-bold">{lobby.config.turnTimerSeconds}s</span>
                </div>
                {isHost && (
                  <select
                    value={lobby.config.turnTimerSeconds}
                    onChange={(e) => onUpdateConfig({ turnTimerSeconds: Number(e.target.value) })}
                    className="w-full mt-1 bg-gray-700 text-white rounded px-2 py-1 text-sm border border-gray-600"
                  >
                    {[30, 60, 90, 120, 180, 300].map((s) => (
                      <option key={s} value={s}>{s}s</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Bot strategy selector for host */}
          {isHost && canAddMore && (
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
              <button
                onClick={() => onAddBot(botStrategy)}
                className="w-full px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                🤖 {t('lobby.addBot')}
              </button>
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
          ) : isSpectator ? (
            <div className="w-full py-3 rounded-lg text-center text-gray-400 bg-gray-800">
              👁 {t('lobby.spectating')}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
