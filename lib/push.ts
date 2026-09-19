import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

let configured = false;
function ensureVapid() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@dailygoal.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    process.env.VAPID_PRIVATE_KEY || ""
  );
  configured = true;
}

const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function sendPushToUser(userId: string, title: string, body: string, url = "/dashboard") {
  try {
    ensureVapid();
    const { data: subs } = await admin().from("push_subscriptions").select("*").eq("user_id", userId);
    if (!subs?.length) return 0;
    let sent = 0;
    await Promise.all(subs.map(async (s: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title, body, url, tag: title })
        );
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await admin().from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    }));
    return sent;
  } catch {
    return 0;
  }
}