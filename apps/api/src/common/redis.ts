import { Logger } from '@nestjs/common';
import IORedis from 'ioredis';
import { isProduction } from './security-config';

const log = new Logger('Redis');

let client: IORedis | undefined;

export function redisClient() {
  if (!client) {
    client = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    client.on('error', (err) => log.warn(err.message));
  }
  return client;
}

export async function withRedis<T>(fn: (r: IORedis) => Promise<T>, fallback: T): Promise<T> {
  try {
    const r = redisClient();
    if (r.status === 'wait') await r.connect();
    return await fn(r);
  } catch (err) {
    log.warn(`Redis unavailable: ${err instanceof Error ? err.message : err}`);
    return fallback;
  }
}

/** Increment a sliding window counter. Returns the count after increment, or null if Redis is down. */
export async function redisIncrWindow(key: string, windowSec: number): Promise<number | null> {
  return withRedis(async (r) => {
    const n = await r.incr(key);
    if (n === 1) await r.expire(key, windowSec);
    return n;
  }, null);
}

export function redisFailClosed() {
  return isProduction();
}
