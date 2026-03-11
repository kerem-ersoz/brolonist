import { v4 as uuidv4 } from 'uuid';

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
  config: {
    maxPlayers: number;
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
    name?: string;
    maxPlayers?: number;
    victoryPoints?: number;
    mapType?: string;
    turnTimerSeconds?: number;
    isPrivate?: boolean;
  },
): GameLobby {
  const maxPlayers = opts.maxPlayers ?? 4;
  const defaultVP = maxPlayers <= 4 ? 10 : maxPlayers <= 6 ? 12 : 14;

  const game: GameLobby = {
    id: uuidv4(),
    name: opts.name || `${hostName}'s Game`,
    hostId,
    hostName,
    players: [{ id: hostId, name: hostName, ready: false, isBot: false }],
    config: {
      maxPlayers,
      victoryPoints: opts.victoryPoints ?? defaultVP,
      mapType: opts.mapType ?? 'standard',
      turnTimerSeconds: opts.turnTimerSeconds ?? 120,
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

export function addPlayerToLobby(
  gameId: string,
  playerId: string,
  playerName: string,
): GameLobby | null {
  const game = lobbyGames.get(gameId);
  if (!game || game.status !== 'lobby') return null;
  if (game.players.length >= game.config.maxPlayers) return null;
  if (game.players.some((p) => p.id === playerId)) return game; // already in
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
  if (game.players.length >= game.config.maxPlayers) return null;

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

export function canStartGame(gameId: string): { ok: boolean; reason?: string } {
  const game = lobbyGames.get(gameId);
  if (!game) return { ok: false, reason: 'Game not found' };
  if (game.players.length < 2) return { ok: false, reason: 'Need at least 2 players' };
  if (!game.players.every((p) => p.ready)) return { ok: false, reason: 'Not all players are ready' };
  return { ok: true };
}
