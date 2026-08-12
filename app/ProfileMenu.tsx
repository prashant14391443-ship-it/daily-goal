"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

function playBeep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    ctx.resume();
    const note = (freq: number, start: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + start;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.45);
    };
    note(880, 0);
    note(1175, 0.25);
  } catch {
    // audio not available
  }
}

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [light, setLight] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname === "/login" || pathname === "/signup") return;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user.email || "friend");
    };
    load();
    if (localStorage.getItem("dg-theme") === "light") {
      setLight(true);
      document.documentElement.classList.add("light");
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (pathname === "/login" || pathname === "/signup") return;
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (!isAndroid || !("serviceWorker" in navigator)) return;

    const notified = new Set<string>();

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) return;

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const nowHM = `${hh}:${mm}`;
      const todayStr = toLocalISO(now);

      const [s, g, h, t, hl] = await Promise.all([
        supabase
          .from("study_sessions")
          .select("id, subject, reminder_time")
          .eq("user_id", userId)
          .eq("session_date", todayStr),
        supabase
          .from("gym_logs")
          .select("id, workout_type, reminder_time")
          .eq("user_id", userId)
          .eq("session_date", todayStr),
        supabase
          .from("habits")
          .select("id, habit_name, reminder_time")
          .eq("user_id", userId),
        supabase
          .from("tasks")
          .select("id, title, reminder_time, completed")
          .eq("user_id", userId)
          .eq("category", "todo")
          .eq("task_date", todayStr),
        supabase
          .from("habit_logs")
          .select("habit_id")
          .eq("user_id", userId)
          .eq("log_date", todayStr)
          .eq("completed", true),
      ]);

      const items: { key: string; label: string; time: string }[] = [];
      (s.data || []).forEach((r) => {
        if (r.reminder_time)
          items.push({ key: `s${r.id}-${r.reminder_time.slice(0, 5)}`, label: r.subject, time: r.reminder_time.slice(0, 5) });
      });
      (g.data || []).forEach((r) => {
        if (r.reminder_time)
          items.push({ key: `g${r.id}-${r.reminder_time.slice(0, 5)}`, label: r.workout_type, time: r.reminder_time.slice(0, 5) });
      });
      const doneHabits = new Set((hl.data || []).map((x) => x.habit_id));
      (h.data || []).forEach((r) => {
        if (r.reminder_time && !doneHabits.has(r.id))
          items.push({ key: `h${r.id}-${r.reminder_time.slice(0, 5)}`, label: r.habit_name, time: r.reminder_time.slice(0, 5) });
      });
      (t.data || []).forEach((r) => {
        if (r.reminder_time && !r.completed)
          items.push({ key: `t${r.id}-${r.reminder_time.slice(0, 5)}`, label: r.title, time: r.reminder_time.slice(0, 5) });
      });

      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;
        items.forEach((it) => {
          if (it.time === nowHM && !notified.has(it.key)) {
            notified.add(it.key);
            playBeep();
            recordNotification("DAILY GOAL ⏰", `Time to: ${it.label}`);
            reg.showNotification("DAILY GOAL ⏰", { body: `Time to: ${it.label}` });
          }
        });
      } catch {
        // notifications not allowed yet
      }
    };

    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [pathname]);

  if (pathname === "/login" || pathname === "/signup") return null;

  const name = email ? email.split("@")[0] : "friend";
  const initial = name.charAt(0).toUpperCase();

  const toggleTheme = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("dg-theme", next ? "light" : "dark");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="fixed top-3 right-3 z-50" ref={boxRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl p-4 grid gap-3 shadow-xl">
          <div>
            <p className="font-bold text-white capitalize">{name}</p>
            <p className="text-xs text-slate-400 break-all">{email}</p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex justify-between items-center text-sm bg-slate-800 hover:bg-slate-700 p-2 rounded text-white"
          >
            <span>Theme</span>
            <span>{light ? "☀️ Light" : "🌙 Dark"}</span>
          </button>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="text-sm bg-slate-800 hover:bg-slate-700 p-2 rounded text-white"
          >
            🎯 Settings / Goals
          </Link>
          <Link
            href="/badges"
            onClick={() => setOpen(false)}
            className="text-sm bg-slate-800 hover:bg-slate-700 p-2 rounded text-white"
          >
            🏆 Badges
          </Link>
          <Link
            href="/report"
            onClick={() => setOpen(false)}
            className="text-sm bg-slate-800 hover:bg-slate-700 p-2 rounded text-white"
          >
            📊 Weekly Report
          </Link>
          <button
            onClick={logout}
            className="text-sm bg-red-600 hover:bg-red-500 p-2 rounded font-semibold text-white"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}