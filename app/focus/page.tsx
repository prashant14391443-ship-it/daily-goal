"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import Link from "next/link";

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

const PRESETS = [15, 25, 40, 60, 90];

export default function FocusPage() {
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [focusMin, setFocusMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [subject, setSubject] = useState("");
  const [custom, setCustom] = useState("");
  const [doneToday, setDoneToday] = useState(0);
  const [awake, setAwake] = useState(false);
  const [wakeSupported, setWakeSupported] = useState(false);
  const wakeRef = useRef<any>(null);

  // 🔆 Detect browser support
  useEffect(() => {
    setWakeSupported(typeof navigator !== "undefined" && "wakeLock" in navigator);
  }, []);

  // 🔆 Request / release screen lock
  const setWakeLock = async (on: boolean) => {
    try {
      if (on && typeof navigator !== "undefined" && "wakeLock" in navigator) {
        if (!wakeRef.current) {
          wakeRef.current = await (navigator as any).wakeLock.request("screen");
          wakeRef.current.addEventListener("release", () => {
            wakeRef.current = null;
          });
        }
      } else if (wakeRef.current) {
        await wakeRef.current.release();
        wakeRef.current = null;
      }
    } catch {
      wakeRef.current = null;
    }
  };

  // 🔆 Lock while running + awake enabled
  useEffect(() => {
    if (running && awake) setWakeLock(true);
    else setWakeLock(false);
  }, [running, awake]);

  // 🔆 Re-lock when user returns to the tab
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && running && awake) setWakeLock(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [running, awake]);

  // 🔆 Safety: release on page unmount
  useEffect(() => {
    return () => {
      wakeRef.current?.release?.().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) return;
      const { count } = await supabase
        .from("study_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("session_date", toLocalISO(new Date()))
        .eq("topic", "🍅 Pomodoro");
      setDoneToday(count || 0);
    };
    load();
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (left > 0 || !running) return;
    setRunning(false);
    complete();
  }, [left, running]);

  const pickPreset = (m: number) => {
    setFocusMin(m);
    const b = m >= 40 ? 10 : 5;
    setBreakMin(b);
    if (!running) {
      setMode("focus");
      setLeft(m * 60);
    }
  };

  const applyCustom = () => {
    const m = Number(custom);
    if (m > 0) pickPreset(m);
  };

  const complete = async () => {
    playBeep();
    if (mode === "focus") {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (userId) {
        await supabase.from("study_sessions").insert({
          user_id: userId,
          subject: subject || "Focus session",
          topic: "🍅 Pomodoro",
          duration_minutes: focusMin,
          session_date: toLocalISO(new Date()),
          completed: true,
        });
      }
      recordNotification("DAILY GOAL 🍅", `Focus complete! +${focusMin} min logged.`);
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          reg?.showNotification("DAILY GOAL 🍅", {
            body: `Focus complete! +${focusMin} min logged. Break time ☕`,
          });
        } catch {
          // ignore
        }
      }
      setDoneToday((d) => d + 1);
      setMode("break");
      setLeft(breakMin * 60);
    } else {
      setMode("focus");
      setLeft(focusMin * 60);
    }
  };

  const reset = () => {
    setRunning(false);
    setLeft(mode === "focus" ? focusMin * 60 : breakMin * 60);
  };

  const total = (mode === "focus" ? focusMin : breakMin) * 60;
  const elapsed = total - left;
  const pct = total ? elapsed / total : 0;
  const plant =
    mode === "break" ? "☕" : pct < 0.25 ? "🌱" : pct < 0.5 ? "🌿" : pct < 0.75 ? "🌳" : "🌲";

  const mm = String(Math.floor(Math.max(left, 0) / 60)).padStart(2, "0");
  const ss = String(Math.max(left, 0) % 60).padStart(2, "0");

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-xl">🍅</span>
          Focus Timer
        </h1>
        <p className="text-slate-400">
          {focusMin} min focus → {breakMin} min break • 🍅 today: {doneToday}
        </p>
      </div>

      <div className="bg-slate-900 rounded-xl p-8 text-center max-w-md mx-auto">
        <div className="flex gap-2 justify-center flex-wrap mb-4">
          {PRESETS.map((m) => (
            <button
              key={m}
              onClick={() => pickPreset(m)}
              className={`px-3 py-1.5 rounded text-sm font-semibold ${
                focusMin === m ? "bg-green-600" : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              {m}m
            </button>
          ))}
          <input
            type="number"
            min="1"
            max="180"
            placeholder="Custom"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onBlur={applyCustom}
            className="w-20 px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-sm"
          />
        </div>

        {/* 🔆 SCREEN ON TOGGLE */}
        {wakeSupported && (
          <div className="flex flex-col items-center gap-1 mb-4">
            <button
              onClick={() => setAwake(!awake)}
              className={`px-4 py-2 rounded-full text-xs font-black border-2 transition-all ${
                awake
                  ? "bg-amber-500/20 border-amber-400/60 text-amber-300 shadow-lg shadow-amber-900/30"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              {awake ? "🔆 Screen stays ON" : "😴 Screen auto-sleep"}
            </button>
            {awake && running && (
              <p className="text-[10px] text-amber-300 animate-pulse">Screen will NOT sleep while timer runs</p>
            )}
          </div>
        )}

        <p className="text-7xl mb-4">{plant}</p>
        <p className="text-6xl font-extrabold mb-2">
          {mm}:{ss}
        </p>
        <p className="text-sm text-slate-400 mb-6">
          {mode === "focus"
            ? " Focus time — stay off your phone!"
            : "☕ Break — stretch a little"}
        </p>

        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (e.g. Math) — optional"
          className="w-full p-3 rounded bg-slate-800 border border-slate-700 mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={() => setRunning(!running)}
            className={`flex-1 py-3 rounded font-semibold ${
              running
                ? "bg-yellow-600 hover:bg-yellow-500"
                : "bg-green-600 hover:bg-green-500"
            }`}
          >
            {running ? "⏸ Pause" : "▶ Start"}
          </button>
          <button
            onClick={reset}
            className="px-4 py-3 rounded bg-slate-800 hover:bg-slate-700"
          >
            ↺
          </button>
        </div>

        <div className="h-2 bg-slate-800 rounded-full mt-6 overflow-hidden">
          <div
            className="h-full bg-green-600 transition-all"
            style={{ width: `${Math.round(pct * 100)}%` }}
          />
        </div>
      </div>

      <Link
        href="/study-tracker"
        className="inline-block mt-6 text-sm text-slate-400 hover:text-white"
      >
        ← Back to Study
      </Link>
    </main>
  );
}