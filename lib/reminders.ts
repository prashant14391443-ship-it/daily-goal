import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ensurePushSubscription } from "@/lib/pushClient";

export type RemindKey = "study" | "gym" | "todo" | "habits";
const KEYS: RemindKey[] = ["study", "gym", "todo", "habits"];
const lsKey = (k: RemindKey) => "dg-remind-" + k;

export function remindOn(k: RemindKey): boolean {
  if (typeof window === "undefined") return true;
  try { return localStorage.getItem(lsKey(k)) !== "0"; } catch { return true; }
}

export function anyRemindOn(): boolean {
  return KEYS.some((k) => remindOn(k));
}

function syncServer(payload: Record<string, boolean>) {
  try {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id;
      if (!uid) return;
      supabase.from("user_settings").upsert({ user_id: uid, ...payload }, { onConflict: "user_id" });
    });
  } catch {}
}

export function turnOnAll() {
  KEYS.forEach((k) => localStorage.setItem(lsKey(k), "1"));
  window.dispatchEvent(new Event("dg-reminders-change"));
  syncServer({ remind_study: true, remind_gym: true, remind_todo: true, remind_habits: true });
}

export function turnOffOne(k: RemindKey) {
  localStorage.setItem(lsKey(k), "0");
  window.dispatchEvent(new Event("dg-reminders-change"));
  syncServer({ ["remind_" + k]: false });
}

const DENIED_MSG = "🔕 Notifications blocked. Long-press app icon → App info → Notifications → Allow, then tap ON again.";
const GRANTED_MSG = "✅ Notifications enabled!";
const NO_SUPPORT_MSG = "⚠️ Your browser doesn't support notifications.";

function showToast(msg: string) {
  window.dispatchEvent(new CustomEvent("dg-toast", { detail: msg }));
}

async function handlePermissionOn() {
  // Browser doesn't support notifications at all
  if (typeof window === "undefined" || !("Notification" in window)) {
    showToast(NO_SUPPORT_MSG);
    return;
  }

  const perm = Notification.permission;

  // Already granted → subscribe for push and confirm
  if (perm === "granted") {
    await ensurePushSubscription();
    showToast(GRANTED_MSG);
    return;
  }

  // Previously denied → browser will never prompt again → tell user to fix in settings
  if (perm === "denied") {
    showToast(DENIED_MSG);
    return;
  }

  // Never asked (default) → show the browser prompt
  try {
    const result = await Notification.requestPermission();
    if (result === "granted") {
      await ensurePushSubscription();
      showToast(GRANTED_MSG);
    } else if (result === "denied") {
      showToast(DENIED_MSG);
    } else {
      showToast("⚠️ Permission dismissed. Tap ON again to try.");
    }
  } catch (e) {
    showToast("⚠️ Could not request permission: " + (e as Error).message);
  }
}

export function useRemindChip(k: RemindKey) {
  const [on, setOn] = useState(() => remindOn(k));
  useEffect(() => {
    const sync = () => setOn(remindOn(k));
    window.addEventListener("dg-reminders-change", sync);
    return () => window.removeEventListener("dg-reminders-change", sync);
  }, [k]);
  const toggle = async () => {
    if (remindOn(k)) {
      turnOffOne(k);
    } else {
      turnOnAll();
      await handlePermissionOn();
    }
  };
  return { on, toggle };
}