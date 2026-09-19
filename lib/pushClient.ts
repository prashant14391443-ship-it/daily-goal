import { supabase } from "@/lib/supabase";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(b64: string) {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = window.atob(b64.replace(/-/g, "+").replace(/_/g, "/") + padding);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export async function ensurePushSubscription() {
  try {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return; // logged out → never ask permission

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID) });
    }
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(sub.toJSON()),
    });
  } catch {}
}