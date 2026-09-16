import { supabase } from "@/lib/supabase";

// ─── DAILY CALL BUDGET ────────────────────────────────────────────────
// Per-user cap: 20 call-minutes per day (fairness between members).
export const USER_DAILY = 20 * 60; // 1,200 seconds

// App-wide pool: 120,000 participant-seconds/day (= 2,000 participant-min
// = ~1,000 call-min ≈ 16.7 h of 1-on-1 talk). This is ~50% of the LiveKit
// free-tier daily allowance (~37 h), so the month can never be exhausted
// early and no overage is possible. First come, first serve.
// Self-host era (Season 2): raise or remove this constant freely.
export const POOL_DAILY = 120_000;

/**
 * Returns the caller's remaining personal seconds, the remaining app-wide
 * pool seconds, and whether a new call is allowed right now.
 */
export async function callBudget(me: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: mine }, { data: all }] = await Promise.all([
    supabase
      .from("call_usage")
      .select("seconds")
      .eq("user_id", me)
      .eq("day", today)
      .maybeSingle(),
    supabase.from("call_usage").select("seconds").eq("day", today),
  ]);

  const mySec = mine?.seconds || 0;
  const poolSec = ((all as any[]) || []).reduce((a, r) => a + (r.seconds || 0), 0);

  return {
    myLeft: Math.max(0, USER_DAILY - mySec),
    poolLeft: Math.max(0, POOL_DAILY - poolSec),
    ok: mySec < USER_DAILY && poolSec < POOL_DAILY,
    reason:
      mySec >= USER_DAILY
        ? "⏱ You used your 20 min today — back tomorrow!"
        : "🌙 Today's app-wide call pool is finished — first come first serve, resets midnight!",
  };
}

/**
 * Adds `sec` seconds of usage for `me` today.
 * Called every 30s during a call + once on disconnect (LivekitRoom).
 * Applies to EVERY call type: stranger, friend, community.
 */
export async function addCallSeconds(me: string, sec: number) {
  if (sec <= 0) return;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("call_usage")
    .select("seconds")
    .eq("user_id", me)
    .eq("day", today)
    .maybeSingle();

  await supabase.from("call_usage").upsert(
    { user_id: me, day: today, seconds: (data?.seconds || 0) + sec },
    { onConflict: "user_id,day" }
  );
}