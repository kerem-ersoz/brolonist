import type { FastifyInstance } from 'fastify';
import { authGuard } from '../auth/middleware.js';
import { lobbyGames, createLobbyGame, getLobbyGame } from '../lobby/lobbyStore.js';

export async function lobbyRoutes(app: FastifyInstance) {
  // List games
  app.get('/api/games', async (_request, _reply) => {
    const gameList = Array.from(lobbyGames.values())
      .filter(g => g.status === 'lobby')
      .map(g => ({
        id: g.id,
        name: g.name,
        host: g.hostName,
        playerCount: g.players.length,
        mapType: g.config.mapType,
        isPrivate: g.config.isPrivate,
      }));
    return gameList;
  });

  // Create game
  app.post<{
    Body: { isPrivate?: boolean }
  }>('/api/games', { preHandler: [authGuard] }, async (request, _reply) => {
    const user = request.user as { sub: string; name: string };
    const { isPrivate } = request.body;

    const game = createLobbyGame(user.sub, user.name, {
      isPrivate,
    });
    return game;
  });

  // Get game details
  app.get<{ Params: { id: string } }>('/api/games/:id', async (request, reply) => {
    const game = getLobbyGame(request.params.id);
    if (!game) {
      reply.code(404).send({ error: 'Game not found' });
      return;
    }
    return game;
  });
}
