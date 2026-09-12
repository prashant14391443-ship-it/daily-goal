import { Redis } from "@upstash/redis";

// Safe client: if env missing, cache falls back to memory (never crashes)
let redis: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch { redis = null; }

const memCache = new Map<string, string>();

export type AiTask = "quiz" | "notes" | "review" | "extract";

// 🔥 COST ROUTING: cheapest model that can do the job; escalate only on failure
export const MODEL_FOR_TASK: Record<AiTask, string[]> = {
  quiz: ["gemini-3.5-flash-lite"],
  notes: ["gemini-3.5-flash-lite", "gemini-3.5-flash"],
  review: ["gemini-3.5-flash-lite", "gemini-3.5-flash"],
  extract: ["gemini-3.5-flash", "gemini-3.7-flash"],
};

// 🔥 TOKEN CAPS: output tokens = money. Keep them tight per task.
export const TOKENS_FOR_TASK: Record<AiTask, number> = {
  quiz: 900,
  notes: 1000,
  review: 700,
  extract: 1500,
};

const DAILY_FREE_LIMIT = 25; // AI calls per user per day

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export async function getCached(key: string): Promise<string | null> {
  try {
    if (redis) return await redis.get(`ai:${key}`);
  } catch {}
  return memCache.get(key) ?? null;
}

export async function setCache(key: string, val: string, ttlDays = 30) {
  try {
    if (redis) await redis.set(`ai:${key}`, val, { ex: ttlDays * 86400 });
    else memCache.set(key, val);
  } catch {}
}

export async function quotaOk(userId: string): Promise<boolean> {
  try {
    if (!redis) return true; // dev mode: no strict quota
    const day = new Date().toISOString().slice(0, 10);
    const k = `quota:${userId}:${day}`;
    const n = await redis.incr(k);
    if (n === 1) await redis.expire(k, 86400);
    return n <= DAILY_FREE_LIMIT;
  } catch { return true; }
}

// THE ONE DOOR: cache → quota → cheap model → escalate
export async function cheapGenerate(opts: {
  task: AiTask;
  prompt: string;
  cacheKey?: string;
  userId?: string;
}): Promise<{ text: string; source: "cache" | "ai" } | null> {
  const key = opts.cacheKey || hash(opts.task + ":" + opts.prompt);

  const cached = await getCached(key);
  if (cached) return { text: cached, source: "cache" };

  if (opts.userId) {
    const ok = await quotaOk(opts.userId);
    if (!ok) return null;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  for (const model of MODEL_FOR_TASK[opts.task]) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: opts.prompt }] }],
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: TOKENS_FOR_TASK[opts.task],
              responseMimeType: "application/json",
            },
          }),
        }
      );
      if (!r.ok) continue;
      const d = await r.json();
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) continue;
      await setCache(key, text);
      return { text, source: "ai" };
    } catch {}
  }
  return null;
}