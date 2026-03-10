import jwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest } from 'fastify';

export async function registerAuth(app: FastifyInstance) {
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    sign: { expiresIn: '7d' },
  });

  // Decorator to require auth on routes
  app.decorate('authenticate', async function (request: FastifyRequest) {
    await request.jwtVerify();
  });
}

export function generateToken(app: FastifyInstance, payload: { sub: string; name: string; game?: string }): string {
  return app.jwt.sign(payload);
}
