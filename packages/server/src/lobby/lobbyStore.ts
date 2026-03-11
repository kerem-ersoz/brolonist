import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  ready: boolean;
  isBot: boolean;
  botStrategy?: string;
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
    players: [{ id: hostId, name: hostName, ready: true, isBot: false }],
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
  if (game.players.some((p) => p.id === playerId)) return game; // already in
  if (game.spectators.some((s) => s.id === playerId)) return game; // already spectating
  if (game.players.length >= MAX_PLAYERS) {
    // Join as spectator
    game.spectators.push({ id: playerId, name: playerName });
    return game;
  }
  game.players.push({ id: playerId, name: playerName, ready: false, isBot: false });
  return game;
}

export function removePlayerFromLobby(
  gameId: string,
  playerId: string,
): GameLobby | null {
  const game = lobbyGames.get(gameId);
  if (!game) return null;
  game.players = game.players.filter((p) => p.id !== playerId);
  game.spectators = game.spectators.filter((s) => s.id !== playerId);
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
    ready: true,
    isBot: true,
    botStrategy: strategy,
  });
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
    const validMaps = ['standard', 'random', 'pangaea', 'archipelago', 'rich_coast', 'desert_ring'];
    if (validMaps.includes(updates.mapType)) {
      game.config.mapType = updates.mapType;
    }
  }
  return game;
}

export function canStartGame(gameId: string): { ok: boolean; reason?: string } {
  const game = lobbyGames.get(gameId);
  if (!game) return { ok: false, reason: 'Game not found' };
  if (game.players.length < 2) return { ok: false, reason: 'Need at least 2 players' };
  if (!game.players.every((p) => p.ready)) return { ok: false, reason: 'Not all players are ready' };
  return { ok: true };
}
