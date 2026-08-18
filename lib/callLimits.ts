import { supabase } from "@/lib/supabase";

const USER_DAILY = 15 * 60; // 15 min per user per day
const POOL_DAILY = 300 * 60; // 300 participant-min app-wide per day

export async function callBudget(me: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: mine }, { data: all }] = await Promise.all([
    supabase.from("call_usage").select("seconds").eq("user_id", me).eq("day", today).maybeSingle(),
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
        ? "⏱ You used your 15 min today — back tomorrow!"
        : "🌙 Today's call budget finished — resets midnight!",
  };
}

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