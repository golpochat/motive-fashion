import { Logger } from '@nestjs/common';
import IORedis from 'ioredis';

const log = new Logger('LoginLockout');
const LIMIT = Number(process.env.AUTH_LOCKOUT_LIMIT ?? 5);
const WINDOW_SEC = Number(process.env.AUTH_LOCKOUT_WINDOW_SEC ?? 15 * 60);

let client: IORedis | undefined;

function redis() {
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

function key(email: string) {
  return `auth:fail:${email.trim().toLowerCase()}`;
}

async function withRedis<T>(fn: (r: IORedis) => Promise<T>, fallback: T): Promise<T> {
  try {
    const r = redis();
    if (r.status === 'wait') await r.connect();
    return await fn(r);
  } catch (err) {
    log.warn(`Redis unavailable, failing open: ${err instanceof Error ? err.message : err}`);
    return fallback;
  }
}

export async function isLoginLocked(email: string) {
  return withRedis(async (r) => Number(await r.get(key(email))) >= LIMIT, false);
}

export async function recordFailedLogin(email: string) {
  return withRedis(async (r) => {
    const k = key(email);
    const n = await r.incr(k);
    if (n === 1) await r.expire(k, WINDOW_SEC);
    return n >= LIMIT;
  }, false);
}

export async function clearFailedLogins(email: string) {
  await withRedis(async (r) => {
    await r.del(key(email));
    return true;
  }, false);
}
