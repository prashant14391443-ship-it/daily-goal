import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type RemindKey = "study" | "gym" | "todo" | "habits";
const KEYS: RemindKey[] = ["study", "gym", "todo", "habits"];
const lsKey = (k: RemindKey) => "dg-remind-" + k;

export function remindOn(k: RemindKey): boolean {
  if (typeof window === "undefined") return true;
  try { return localStorage.getItem(lsKey(k)) !== "0"; } catch { return true; }
}

// global senders (rescue / weekly / push) use this:
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

// ON anywhere = turn EVERYTHING on
export function turnOnAll() {
  KEYS.forEach((k) => localStorage.setItem(lsKey(k), "1"));
  window.dispatchEvent(new Event("dg-reminders-change"));
  syncServer({ remind_study: true, remind_gym: true, remind_todo: true, remind_habits: true });
}

// OFF = only this page goes quiet
export function turnOffOne(k: RemindKey) {
  localStorage.setItem(lsKey(k), "0");
  window.dispatchEvent(new Event("dg-reminders-change"));
  syncServer({ ["remind_" + k]: false });
}

// drop-in hook for each page's chip
export function useRemindChip(k: RemindKey) {
  const [on, setOn] = useState(() => remindOn(k));
  useEffect(() => {
    const sync = () => setOn(remindOn(k));
    window.addEventListener("dg-reminders-change", sync);
    return () => window.removeEventListener("dg-reminders-change", sync);
  }, [k]);
  return {
    on,
    toggle: () => {
      if (remindOn(k)) turnOffOne(k);
      else turnOnAll();
    },
  };
}