import type { FastifyInstance } from 'fastify';
import { authGuard } from '../auth/middleware.js';
import { prisma } from '../store/prisma.js';

export async function profileRoutes(app: FastifyInstance) {
  // Get own profile
  app.get('/api/profile', { preHandler: [authGuard] }, async (request) => {
    const user = request.user as { sub: string };
    const profile = await prisma.user.findUnique({
      where: { id: user.sub },
      include: {
        games: {
          include: { game: true },
          orderBy: { game: { createdAt: 'desc' } },
          take: 20,
        },
      },
    });
    if (!profile) return { user: null, stats: null };
    
    const totalGames = profile.games.length;
    const wins = profile.games.filter(g => g.game.winnerId === user.sub).length;
    
    return {
      user: { id: profile.id, name: profile.displayName, avatar: profile.avatarUrl },
      stats: { totalGames, wins, winRate: totalGames > 0 ? (wins / totalGames * 100).toFixed(1) : '0' },
      recentGames: profile.games.map(g => ({
        gameId: g.gameId,
        date: g.game.createdAt,
        result: g.game.winnerId === user.sub ? 'win' : g.quit ? 'quit' : 'loss',
        vp: g.finalVp,
        placement: g.placement,
      })),
    };
  });
}
