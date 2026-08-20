import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getRedis() {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL!,
      token: process.env.UPSTASH_REDIS_TOKEN!,
    });
  }
  return redis;
}

export async function getCached(key: string): Promise<string | null> {
  try {
    const r = getRedis();
    const val = await r.get<string>(key);
    return val || null;
  } catch {
    return null;
  }
}

export async function setCached(key: string, value: string, ttlSeconds: number = 3600) {
  try {
    const r = getRedis();
    await r.set(key, value, { ex: ttlSeconds });
  } catch {}
}
// 🛡️ Simple rate limiter using same Redis
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  try {
    const r = getRedis();
    const n = await r.incr(key);
    if (n === 1) await r.expire(key, windowSec);
    return n <= limit;
  } catch {
    return true; // Redis down = allow (never break the app)
  }
}