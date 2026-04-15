import redis from './redis';

const DEFAULT_TTL = 300; // 5 minutes

export async function cacheGet<T>(key: string): Promise<T | null> {
  const value = await redis.get(key);
  if (!value) return null;
  return JSON.parse(value) as T;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds = DEFAULT_TTL): Promise<void> {
  await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
}

export async function cacheInvalidate(...keys: string[]): Promise<void> {
  if (keys.length > 0) await redis.del(keys);
}

// ── Key helpers ───────────────────────────────────────────────────────────────

export const cacheKeys = {
  userSessions: (userId: number) => `user:${userId}:sessions`,
  userStats: (userId: number) => `user:${userId}:stats`,
  userCoaching: (userId: number) => `user:${userId}:coaching`,
};
