import type { FastifyInstance } from 'fastify';
import { generateToken } from '../auth/session.js';
import { v4 as uuidv4 } from 'uuid';
import { authGuard } from '../auth/middleware.js';
import { prisma } from '../store/prisma.js';

// 2-20 chars, alphanumeric + underscores only
const USERNAME_REGEX = /^[a-zA-Z0-9_]{2,20}$/;

export async function authRoutes(app: FastifyInstance) {
  // Guest login — creates/updates user in DB
  app.post<{ Body: { name: string } }>('/api/auth/guest', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 20 },
        },
      },
    },
  }, async (request, reply) => {
    const { name } = request.body;

    if (!USERNAME_REGEX.test(name)) {
      return reply.code(400).send({ error: 'Name must be 2-20 characters, alphanumeric and underscores only' });
    }

    const userId = uuidv4();

    // Persist guest user to DB (best-effort — works without DB)
    try {
      await prisma.user.create({
        data: { id: userId, displayName: name, provider: 'guest' },
      });
    } catch {
      // DB not available — continue with stateless JWT
    }

    const token = generateToken(app, { sub: userId, name });
    return { token, user: { id: userId, name } };
  });

  // Validate current token + return user info
  app.get('/api/auth/me', { preHandler: authGuard }, async (request) => {
    const user = request.user as { sub: string; name: string };

    // Update lastLogin in DB (best-effort)
    try {
      await prisma.user.update({
        where: { id: user.sub },
        data: { lastLogin: new Date() },
      });
    } catch {
      // Guest might not be in DB
    }

    return { user: { id: user.sub, name: user.name } };
  });

  // Refresh token — issues a new JWT with extended expiry
  app.post('/api/auth/refresh', { preHandler: authGuard }, async (request) => {
    const user = request.user as { sub: string; name: string };
    const token = generateToken(app, { sub: user.sub, name: user.name });
    return { token, user: { id: user.sub, name: user.name } };
  });

  // OAuth placeholders (will be fully implemented later)
  app.get('/api/auth/google', async (_req, reply) => {
    reply.code(501).send({ error: 'OAuth not configured yet' });
  });
  app.get('/api/auth/discord', async (_req, reply) => {
    reply.code(501).send({ error: 'OAuth not configured yet' });
  });
  app.get('/api/auth/github', async (_req, reply) => {
    reply.code(501).send({ error: 'OAuth not configured yet' });
  });
}
