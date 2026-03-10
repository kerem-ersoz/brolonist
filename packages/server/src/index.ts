import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { registerAuth } from './auth/session.js';
import { authRoutes } from './routes/auth.js';
import { healthRoutes } from './routes/health.js';
import { lobbyRoutes } from './routes/lobby.js';
import { handleConnection } from './ws/handler.js';

const app = Fastify({ logger: true });

// Register plugins
await app.register(cors, { origin: true, credentials: true });
await registerAuth(app);
await app.register(websocket);

app.get('/ws', { websocket: true }, (socket, request) => {
  try {
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    if (!token) {
      socket.close(4001, 'No auth token');
      return;
    }
    const decoded = app.jwt.verify(token) as { sub: string; name: string };
    handleConnection(socket, decoded.sub, decoded.name);
  } catch {
    socket.close(4001, 'Invalid token');
  }
});

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
