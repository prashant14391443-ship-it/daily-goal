import { supabase } from "@/lib/supabase";

// ── PER-USER DAILY LIMITS (units/day). Tune freely before launch. ──
export const AI_LIMITS: Record<string, number> = {
  ai: 10,            // general AI chat / tips
  "ai-summary": 8,
  summarize: 8,
  blueprint: 6,
  breakdown: 8,
  calorie: 10,
  coach: 6,
  learn: 10,
  quiz: 20,          // question generation (units = weight, see routes)
  vocab: 10,
  test: 10,
  admin: 100, // High limit for admin seeding tools
  "*": 40,           // TOTAL units per user per day across everything
};

// ── WHOLE-APP DAILY BUDGET (your free-tier fuse) ──
export const AI_POOL_DAILY = 1500;
const MIN_GAP_SEC = 2; // anti-spam: min seconds between a user's AI calls

type GateResult = { ok: true; left: number } | { ok: false; reason: string };

export async function aiGate(userId: string, feature: string, weight = 1): Promise<GateResult> {
  const today = new Date().toISOString().slice(0, 10);
  const limit = AI_LIMITS[feature] ?? 6;

  const [{ data: mine }, { data: totRow }, { data: poolRow }] = await Promise.all([
    supabase.from("ai_usage").select("count,last_ts")
      .eq("user_id", userId).eq("day", today).eq("feature", feature).maybeSingle(),
    supabase.from("ai_usage").select("count")
      .eq("user_id", userId).eq("day", today).eq("feature", "*").maybeSingle(),
    supabase.from("ai_pool").select("count").eq("day", today).maybeSingle(),
  ]);

  if (mine?.last_ts) {
    const gap = (Date.now() - new Date(mine.last_ts).getTime()) / 1000;
    if (gap < MIN_GAP_SEC)
      return { ok: false, reason: "⏳ Too fast! Wait a couple of seconds between AI requests." };
  }
  const used = mine?.count || 0;
  if (used + weight > limit)
    return { ok: false, reason: `⏳ Daily "${feature}" limit reached (${limit}/day). Resets midnight — try another feature!` };
  const tot = totRow?.count || 0;
  if (feature !== "*" && tot + weight > AI_LIMITS["*"])
    return { ok: false, reason: `⏳ You've used all ${AI_LIMITS["*"]} AI requests for today. Resets midnight!` };
  const pool = poolRow?.count || 0;
  if (pool + weight > AI_POOL_DAILY)
    return { ok: false, reason: "🌙 Today's app-wide AI budget is finished — first come first serve, resets midnight!" };

  await supabase.from("ai_usage").upsert(
    { user_id: userId, day: today, feature, count: used + weight, last_ts: new Date().toISOString() },
    { onConflict: "user_id,day,feature" }
  );
  if (feature !== "*")
    await supabase.from("ai_usage").upsert(
      { user_id: userId, day: today, feature: "*", count: tot + weight },
      { onConflict: "user_id,day,feature" }
    );
  await supabase.from("ai_pool").upsert({ day: today, count: pool + weight }, { onConflict: "day" });

  return { ok: true, left: limit - used - weight };
}

/** Cache identical AI answers → repeated questions cost ZERO tokens. */
export async function cachedAi<T>(key: string, fn: () => Promise<T>, ttlHours = 24): Promise<T> {
  const { data } = await supabase.from("ai_cache").select("value,created_at").eq("key", key).maybeSingle();
  if (data && Date.now() - new Date(data.created_at).getTime() < ttlHours * 3600e3)
    return JSON.parse(data.value) as T;
  const val = await fn();
  await supabase.from("ai_cache").upsert({ key, value: JSON.stringify(val) });
  return val;
}