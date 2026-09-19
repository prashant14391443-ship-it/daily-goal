import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToUser } from "@/lib/push";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (key !== process.env.CRON_SECRET) return NextResponse.json({ error: "no" }, { status: 401 });

  const slotParam = url.searchParams.get("slot");
  const slot = slotParam || (new Date().getUTCHours() < 8 ? "morning" : "evening");
  
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: subs } = await admin.from("push_subscriptions").select("user_id");
  
  const ids = [...new Set((subs || []).map((s: any) => s.user_id))] as string[];

  // 🌐 GLOBAL REMINDERS GUARD — skip users who turned ALL 4 chips OFF
  const { data: settings } = await admin.from("user_settings").select("*").in("user_id", ids);
  const silent = new Set(
    ((settings || []) as any[])
      .filter((s) => !(s.remind_study || s.remind_gym || s.remind_todo || s.remind_habits))
      .map((s) => s.user_id)
  );

  let sent = 0;
  for (const id of ids) {
    if (silent.has(id)) continue; // user turned ALL reminders OFF somewhere in the app

    if (slot === "morning") {
      const day = new Date().getDay(); // 0=Sun ... 1=Mon
      if (day === 1) {
        await sendPushToUser(id, "📊 YOUR WEEKLY REPORT", "Your week in numbers is ready — tap to see progress!", "/dashboard");
      } else {
        await sendPushToUser(id, "🌅 GOOD MORNING", "One small goal today. Open your dashboard and pick it!", "/dashboard");
      }
    } else if (slot === "evening") {
      await sendPushToUser(id, "🌙 QUICK CHECK-IN", "Did you finish today's goal? 30 seconds to log it 🔥", "/dashboard");
    } else {
      await sendPushToUser(id, "🔔 TEST PUSH", "Notifications work even with the app closed!", "/dashboard");
    }
    sent++;
  }
  return NextResponse.json({ ok: true, users: ids.length, sent, skipped: silent.size });
}