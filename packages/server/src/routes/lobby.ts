import type { FastifyInstance } from 'fastify';
import { authGuard } from '../auth/middleware.js';
import { v4 as uuidv4 } from 'uuid';

interface GameLobby {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  players: Array<{ id: string; name: string; ready: boolean; isBot: boolean; botStrategy?: string }>;
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

// In-memory store (will be replaced with Redis later)
const games = new Map<string, GameLobby>();

export async function lobbyRoutes(app: FastifyInstance) {
  // List games
  app.get('/api/games', async (request, reply) => {
    const gameList = Array.from(games.values())
      .filter(g => g.status === 'lobby')
      .map(g => ({
        id: g.id,
        name: g.name,
        host: g.hostName,
        playerCount: g.players.length,
        maxPlayers: g.config.maxPlayers,
        mapType: g.config.mapType,
        isPrivate: g.config.isPrivate,
      }));
    return gameList;
  });

  // Create game
  app.post<{
    Body: { name: string; maxPlayers?: number; victoryPoints?: number; mapType?: string; isPrivate?: boolean }
  }>('/api/games', { preHandler: [authGuard] }, async (request, reply) => {
    const user = request.user as { sub: string; name: string };
    const { name, maxPlayers = 4, victoryPoints, mapType = 'standard', isPrivate = false } = request.body;

    const defaultVP = maxPlayers <= 4 ? 10 : maxPlayers <= 6 ? 12 : 14;
    const game: GameLobby = {
      id: uuidv4(),
      name: name || `${user.name}'s Game`,
      hostId: user.sub,
      hostName: user.name,
      players: [{ id: user.sub, name: user.name, ready: false, isBot: false }],
      config: {
        maxPlayers,
        victoryPoints: victoryPoints || defaultVP,
        mapType,
        turnTimerSeconds: 120,
        isPrivate,
      },
      status: 'lobby',
      createdAt: new Date().toISOString(),
    };

    games.set(game.id, game);
    return game;
  });

  // Get game details
  app.get<{ Params: { id: string } }>('/api/games/:id', async (request, reply) => {
    const game = games.get(request.params.id);
    if (!game) {
      reply.code(404).send({ error: 'Game not found' });
      return;
    }
    return game;
  });
}
