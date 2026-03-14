import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRedis } from '../store/redis.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const turkishWords: string[] = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'data', 'turkish-words.json'), 'utf-8'),
);

function generateTableName(existing: Map<string, GameLobby>): string {
  let word: string;
  let attempts = 0;
  do {
    word = turkishWords[Math.floor(Math.random() * turkishWords.length)];
    attempts++;
  } while ([...existing.values()].some((g) => g.name === word) && attempts < 100);
  if (attempts >= 100) {
    word = word + Math.floor(Math.random() * 100);
  }
  return word;
}

export interface LobbyPlayer {
  id: string;
  name: string;
  color: string;
  ready: boolean;
  isBot: boolean;
  botStrategy?: string;
}

const ALL_COLORS = ['red', 'blue', 'white', 'orange', 'green', 'brown', 'purple', 'teal'];

function getNextAvailableColor(players: LobbyPlayer[]): string {
  const usedColors = new Set(players.map(p => p.color));
  return ALL_COLORS.find(c => !usedColors.has(c)) || ALL_COLORS[0];
}

export interface GameLobby {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  players: LobbyPlayer[];
  spectators: { id: string; name: string }[];
  config: {
    victoryPoints: number;
    mapType: string;
    turnTimerSeconds: number;
    isPrivate: boolean;
  };
  status: 'lobby' | 'playing' | 'finished';
  createdAt: string;
}

// Shared in-memory store accessible by both REST routes and WS handler
export const lobbyGames = new Map<string, GameLobby>();

export function createLobbyGame(
  hostId: string,
  hostName: string,
  opts: {
    isPrivate?: boolean;
  } = {},
): GameLobby {
  const game: GameLobby = {
    id: uuidv4(),
    name: generateTableName(lobbyGames),
    hostId,
    hostName,
    players: [{ id: hostId, name: hostName, color: ALL_COLORS[0], ready: true, isBot: false }],
    spectators: [],
    config: {
      victoryPoints: 10,
      mapType: 'standard',
      turnTimerSeconds: 120,
      isPrivate: opts.isPrivate ?? false,
    },
    status: 'lobby',
    createdAt: new Date().toISOString(),
  };

  lobbyGames.set(game.id, game);
  persistLobbyToRedis(game.id, game);
  return game;
}

export function getLobbyGame(gameId: string): GameLobby | undefined {
  return lobbyGames.get(gameId);
}

const MAX_PLAYERS = 8;

export function addPlayerToLobby(
  gameId: string,
  playerId: string,
  playerName: string,
): GameLobby | null {
  const game = lobbyGames.get(gameId);
  if (!game || game.status !== 'lobby') return null;
  if (game.players.some((p) => p.id === playerId)) {
    // Reassign host if current host is gone (only bots remain)
    reassignHostIfNeeded(game, playerId, playerName);
    return game;
  }
  if (game.spectators.some((s) => s.id === playerId)) return game; // already spectating
  if (game.players.length >= MAX_PLAYERS) {
    // Join as spectator
    game.spectators.push({ id: playerId, name: playerName });
    persistLobbyToRedis(game.id, game);
    return game;
  }
  game.players.push({ id: playerId, name: playerName, color: getNextAvailableColor(game.players), ready: false, isBot: false });

  // Reassign host if current host doesn't exist or is a bot
  reassignHostIfNeeded(game, playerId, playerName);

  persistLobbyToRedis(game.id, game);
  return game;
}

/** If the current host is not a human player in the lobby, reassign to the given player. */
function reassignHostIfNeeded(game: GameLobby, candidateId: string, candidateName: string): void {
  const currentHost = game.players.find((p) => p.id === game.hostId && !p.isBot);
  if (!currentHost) {
    game.hostId = candidateId;
    game.hostName = candidateName;
  }
  // Host should always be ready
  const host = game.players.find((p) => p.id === game.hostId);
  if (host && !host.ready) {
    host.ready = true;
  }
}

export function removePlayerFromLobby(
  gameId: string,
  playerId: string,
): GameLobby | null {
  const game = lobbyGames.get(gameId);
  if (!game) return null;
  game.players = game.players.filter((p) => p.id !== playerId);
  game.spectators = game.spectators.filter((s) => s.id !== playerId);

  // Host reassignment: if host left, pick next human player
  if (game.hostId === playerId) {
    const nextHuman = game.players.find((p) => !p.isBot);
    if (nextHuman) {
      game.hostId = nextHuman.id;
      game.hostName = nextHuman.name;
    }
    // If only bots remain, hostId stays stale — will be reassigned on next human join
  }

  // Clean up empty lobbies (no humans left, no bots)
  if (game.players.length === 0 && game.spectators.length === 0) {
    lobbyGames.delete(gameId);
    persistLobbyToRedis(game.id, null);
    return null;
  }

  persistLobbyToRedis(game.id, game);
  return game;
}

export function setPlayerReady(
  gameId: string,
  playerId: string,
  ready: boolean,
): GameLobby | null {
  const game = lobbyGames.get(gameId);
  if (!game) return null;
  const player = game.players.find((p) => p.id === playerId);
  if (player) player.ready = ready;
  persistLobbyToRedis(gameId, game);
  return game;
}

export function addBotToLobby(
  gameId: string,
  strategy: string = 'random',
): GameLobby | null {
  const game = lobbyGames.get(gameId);
  if (!game || game.status !== 'lobby') return null;
  if (game.players.length >= MAX_PLAYERS) return null;

  const botId = `bot-${uuidv4().slice(0, 8)}`;
  const botNumber = game.players.filter((p) => p.isBot).length + 1;

  game.players.push({
    id: botId,
    name: `Bot ${botNumber}`,
    color: getNextAvailableColor(game.players),
    ready: true,
    isBot: true,
    botStrategy: strategy,
  });
  persistLobbyToRedis(gameId, game);
  return game;
}

export function removeBotFromLobby(
  gameId: string,
  botId: string,
): GameLobby | null {
  const game = lobbyGames.get(gameId);
  if (!game) return null;
  const bot = game.players.find((p) => p.id === botId && p.isBot);
  if (!bot) return null;
  game.players = game.players.filter((p) => p.id !== botId);
  persistLobbyToRedis(gameId, game);
  return game;
}

export function updateLobbyConfig(
  gameId: string,
  updates: { victoryPoints?: number; turnTimerSeconds?: number; mapType?: string },
): GameLobby | null {
  const game = lobbyGames.get(gameId);
  if (!game || game.status !== 'lobby') return null;
  if (updates.victoryPoints !== undefined) {
    game.config.victoryPoints = Math.min(20, Math.max(5, updates.victoryPoints));
  }
  if (updates.turnTimerSeconds !== undefined) {
    game.config.turnTimerSeconds = updates.turnTimerSeconds;
  }
  if (updates.mapType !== undefined) {
    const validMaps = ['standard', 'random', 'pangaea', 'archipelago', 'rich_coast', 'desert_ring', 'turkey', 'world', 'diamond', 'british_isles', 'gear', 'lakes'];
    if (validMaps.includes(updates.mapType)) {
      game.config.mapType = updates.mapType;
    }
  }
  persistLobbyToRedis(gameId, game);
  return game;
}

export function canStartGame(gameId: string): { ok: boolean; reason?: string } {
  const game = lobbyGames.get(gameId);
  if (!game) return { ok: false, reason: 'Game not found' };
  if (game.players.length < 2) return { ok: false, reason: 'Need at least 2 players' };
  if (!game.players.every((p) => p.ready)) return { ok: false, reason: 'Not all players are ready' };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Redis persistence
// ---------------------------------------------------------------------------

const REDIS_LOBBY_PREFIX = 'lobby:';
const LOBBY_TTL_SECONDS = 3600; // 1 hour

function persistLobbyToRedis(gameId: string, lobby: GameLobby | null): void {
  try {
    const redis = getRedis();
    if (redis.status !== 'ready') return;
    if (lobby) {
      redis.set(REDIS_LOBBY_PREFIX + gameId, JSON.stringify(lobby), 'EX', LOBBY_TTL_SECONDS).catch(() => {});
    } else {
      redis.del(REDIS_LOBBY_PREFIX + gameId).catch(() => {});
    }
  } catch {
    // Redis not available — gracefully degrade
  }
}

/** Persist all in-memory lobbies to Redis (called periodically). */
export async function persistAllLobbies(): Promise<void> {
  try {
    const redis = getRedis();
    if (redis.status !== 'ready') return;
    const pipeline = redis.pipeline();
    for (const [id, lobby] of lobbyGames) {
      if (lobby.status === 'lobby') {
        pipeline.set(REDIS_LOBBY_PREFIX + id, JSON.stringify(lobby), 'EX', LOBBY_TTL_SECONDS);
      }
    }
    await pipeline.exec();
  } catch {
    // Silently fail — Redis is optional
  }
}

/** Load lobbies from Redis on server startup. */
export async function loadLobbiesFromRedis(): Promise<number> {
  try {
    const redis = getRedis();
    if (redis.status !== 'ready') return 0;
    const keys = await redis.keys(REDIS_LOBBY_PREFIX + '*');
    if (keys.length === 0) return 0;
    const values = await redis.mget(...keys);
    let loaded = 0;
    for (const val of values) {
      if (!val) continue;
      try {
        const lobby: GameLobby = JSON.parse(val);
        if (lobby.status === 'lobby' && !lobbyGames.has(lobby.id)) {
          lobbyGames.set(lobby.id, lobby);
          loaded++;
        }
      } catch {
        // Skip corrupt entries
      }
    }
    console.log(`[Lobby] Loaded ${loaded} lobbies from Redis`);
    return loaded;
  } catch {
    console.warn('[Lobby] Could not load lobbies from Redis');
    return 0;
  }
}

let persistInterval: ReturnType<typeof setInterval> | null = null;

/** Start periodic lobby persistence (every 30s). */
export function startLobbyPersistence(): void {
  if (persistInterval) return;
  persistInterval = setInterval(() => {
    persistAllLobbies().catch(() => {});
  }, 30_000);
  console.log('[Lobby] Periodic persistence enabled (30s interval)');
}

/** Stop periodic lobby persistence. */
export function stopLobbyPersistence(): void {
  if (persistInterval) {
    clearInterval(persistInterval);
    persistInterval = null;
  }
}
