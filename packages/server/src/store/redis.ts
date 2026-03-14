import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 10) return null; // stop retrying after 10 attempts
        return Math.min(times * 200, 5000);
      },
      lazyConnect: true,
    });
    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });
    redis.on('connect', () => {
      console.log('[Redis] Connected');
    });
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  try {
    const r = getRedis();
    await r.connect();
  } catch (err) {
    console.warn('[Redis] Failed to connect, lobby persistence disabled:', (err as Error).message);
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
