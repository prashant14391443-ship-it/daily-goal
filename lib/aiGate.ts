import { createClient } from "@supabase/supabase-js";

// Server-side bookkeeping client (bypasses RLS, never exposed to browser)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ── PER-USER DAILY LIMITS (units/day) ──
export const AI_LIMITS: Record<string, number> = {
  ai: 10,
  "ai-summary": 8,
  summarize: 8,
  blueprint: 6,
  breakdown: 8,
  calorie: 10,
  coach: 6,
  learn: 10,
  quiz: 20,
  vocab: 10,
  test: 10,
  admin: 100,
  "*": 40,
};

export const AI_POOL_DAILY = 1500;
const MIN_GAP_SEC = 2;

type GateResult = { ok: true; left: number } | { ok: false; reason: string };

export async function aiGate(userId: string, feature: string, weight = 1): Promise<GateResult> {
  const today = new Date().toISOString().slice(0, 10);
  const limit = AI_LIMITS[feature] ?? 6;

  // 📖 Read current state
  const [{ data: mine }, { data: totRow }, { data: poolRow }] = await Promise.all([
    supabase.from("ai_usage").select("count,last_ts")
      .eq("user_id", userId).eq("day", today).eq("feature", feature).maybeSingle(),
    supabase.from("ai_usage").select("count")
      .eq("user_id", userId).eq("day", today).eq("feature", "*").maybeSingle(),
    supabase.from("ai_pool").select("count").eq("day", today).maybeSingle(),
  ]);

  // ⏱ Anti-spam
  if (mine?.last_ts) {
    const gap = (Date.now() - new Date(mine.last_ts).getTime()) / 1000;
    if (gap < MIN_GAP_SEC)
      return { ok: false, reason: "⏳ Too fast! Wait a couple of seconds between AI requests." };
  }

  const used = mine?.count || 0;
  const tot = totRow?.count || 0;
  const pool = poolRow?.count || 0;

  // 🚦 Limit checks
  if (used + weight > limit)
    return { ok: false, reason: `⏳ Daily "${feature}" limit reached (${limit}/day). Resets midnight — try another feature!` };
  if (feature !== "*" && tot + weight > AI_LIMITS["*"])
    return { ok: false, reason: `⏳ You've used all ${AI_LIMITS["*"]} AI requests for today. Resets midnight!` };
  if (pool + weight > AI_POOL_DAILY)
    return { ok: false, reason: "🌙 Today's app-wide AI budget is finished — first come first serve, resets midnight!" };

  // 💾 WRITE with full error handling (this is what fixes the silent failure)
  const now = new Date().toISOString();

  // 1) Per-feature counter
  const write1 = mine
    ? await supabase.from("ai_usage").update({ count: used + weight, last_ts: now })
        .eq("user_id", userId).eq("day", today).eq("feature", feature)
    : await supabase.from("ai_usage").insert({ user_id: userId, day: today, feature, count: weight, last_ts: now });
  if (write1.error) {
    console.error("[aiGate] write feature failed:", write1.error.message);
    // Still allow the request — but log the failure for debugging
  }

  // 2) Total "*" counter
  if (feature !== "*") {
    const write2 = totRow
      ? await supabase.from("ai_usage").update({ count: tot + weight, last_ts: now })
          .eq("user_id", userId).eq("day", today).eq("feature", "*")
      : await supabase.from("ai_usage").insert({ user_id: userId, day: today, feature: "*", count: weight, last_ts: now });
    if (write2.error) {
      console.error("[aiGate] write * failed:", write2.error.message);
    }
  }

  // 3) App-wide pool counter
  const write3 = poolRow
    ? await supabase.from("ai_pool").update({ count: pool + weight }).eq("day", today)
    : await supabase.from("ai_pool").insert({ day: today, count: weight });
  if (write3.error) {
    console.error("[aiGate] write pool failed:", write3.error.message);
  }

  return { ok: true, left: limit - used - weight };
}

/** Cache identical AI answers → repeated questions cost ZERO tokens. */
export async function cachedAi<T>(key: string, fn: () => Promise<T>, ttlHours = 720): Promise<T> {
  const { data } = await supabase.from("ai_cache").select("value,created_at").eq("key", key).maybeSingle();
  if (data && Date.now() - new Date(data.created_at).getTime() < ttlHours * 3600e3)
    return JSON.parse(data.value) as T;
  const val = await fn();
  await supabase.from("ai_cache").upsert({ key, value: JSON.stringify(val) });
  return val;
}