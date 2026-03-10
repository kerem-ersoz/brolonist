import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerAuth } from './auth/session.js';
import { authRoutes } from './routes/auth.js';
import { healthRoutes } from './routes/health.js';
import { lobbyRoutes } from './routes/lobby.js';

const app = Fastify({ logger: true });

// Register plugins
await app.register(cors, { origin: true, credentials: true });
await registerAuth(app);

// Register routes
await app.register(healthRoutes);
await app.register(authRoutes);
await app.register(lobbyRoutes);

const port = Number(process.env.PORT) || 8080;
const host = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port, host });
  app.log.info(`Server listening on ${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
