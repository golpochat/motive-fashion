import { Logger } from '@nestjs/common';
import { redisIncrWindow, withRedis } from '../../common/redis';

const log = new Logger('LoginLockout');
const LIMIT = Number(process.env.AUTH_LOCKOUT_LIMIT ?? 5);
const WINDOW_SEC = Number(process.env.AUTH_LOCKOUT_WINDOW_SEC ?? 15 * 60);

function key(email: string) {
  return `auth:fail:${email.trim().toLowerCase()}`;
}

export async function isLoginLocked(email: string) {
  const count = await withRedis(async (r) => Number(await r.get(key(email))), 0);
  if (count >= LIMIT) log.debug(`locked ${email}`);
  return count >= LIMIT;
}

export async function recordFailedLogin(email: string) {
  const n = await redisIncrWindow(key(email), WINDOW_SEC);
  return (n ?? 0) >= LIMIT;
}

export async function clearFailedLogins(email: string) {
  await withRedis(async (r) => {
    await r.del(key(email));
    return true;
  }, false);
}
