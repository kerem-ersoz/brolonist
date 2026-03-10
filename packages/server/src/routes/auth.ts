import type { FastifyInstance } from 'fastify';
import { generateToken } from '../auth/session.js';
import { v4 as uuidv4 } from 'uuid';

export async function authRoutes(app: FastifyInstance) {
  // Guest login
  app.post<{ Body: { name: string } }>('/api/auth/guest', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 50 },
        },
      },
    },
  }, async (request, reply) => {
    const { name } = request.body;
    const userId = uuidv4();
    const token = generateToken(app, { sub: userId, name });
    return { token, user: { id: userId, name } };
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
