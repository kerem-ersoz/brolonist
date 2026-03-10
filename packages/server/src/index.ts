import Fastify from 'fastify';

const app = Fastify({ logger: true });

// Health check
app.get('/health', async () => ({ status: 'ok' }));

const port = Number(process.env.PORT) || 8080;
const host = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port, host });
  app.log.info(`Server listening on ${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
