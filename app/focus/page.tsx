"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import Link from "next/link";
import { IconTile, GradButton } from "@/app/components/ui";

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function playBeep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
  } catch {}
}

const PRESETS = [15, 25, 40, 60, 90];

// 🎨 Plant ring — progress ring with plant emoji in the center
function PlantRing({ pct, plant, ringColor }: { pct: number; plant: string; ringColor: string }) {
  const size = 220;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={ringColor} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-7xl drop-shadow-2xl">{plant}</span>
      </div>
    </div>
  );
}

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

  useEffect(() => {
    setWakeSupported(typeof navigator !== "undefined" && "wakeLock" in navigator);
  }, []);

  const setWakeLock = async (on: boolean) => {
    try {
      if (on && typeof navigator !== "undefined" && "wakeLock" in navigator) {
        if (!wakeRef.current) {
          wakeRef.current = await (navigator as any).wakeLock.request("screen");
          wakeRef.current.addEventListener("release", () => { wakeRef.current = null; });
        }
      } else if (wakeRef.current) {
        await wakeRef.current.release();
        wakeRef.current = null;
      }
    } catch { wakeRef.current = null; }
  };

  useEffect(() => {
    if (running && awake) setWakeLock(true);
    else setWakeLock(false);
  }, [running, awake]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && running && awake) setWakeLock(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [running, awake]);

  useEffect(() => {
    return () => { wakeRef.current?.release?.().catch(() => {}); };
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) return;
      const { count } = await supabase
        .from("study_sessions").select("id", { count: "exact", head: true })
        .eq("user_id", userId).eq("session_date", toLocalISO(new Date())).eq("topic", "🍅 Pomodoro");
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
    if (!running) { setMode("focus"); setLeft(m * 60); }
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
          user_id: userId, subject: subject || "Focus session", topic: "🍅 Pomodoro",
          duration_minutes: focusMin, session_date: toLocalISO(new Date()), completed: true,
        });
      }
      recordNotification("DAILY GOAL 🍅", `Focus complete! +${focusMin} min logged.`);
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          reg?.showNotification("DAILY GOAL 🍅", { body: `Focus complete! +${focusMin} min logged. Break time ☕` });
        } catch {}
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
  const pct = total ? (elapsed / total) * 100 : 0;
  const plant = mode === "break" ? "☕" : pct < 25 ? "🌱" : pct < 50 ? "🌿" : pct < 75 ? "🌳" : "🌲";

  const mm = String(Math.floor(Math.max(left, 0) / 60)).padStart(2, "0");
  const ss = String(Math.max(left, 0) % 60).padStart(2, "0");

  // Mode-based theming
  const isBreak = mode === "break";
  const heroGrad = isBreak ? "from-amber-500 via-orange-600 to-rose-600" : "from-emerald-500 via-green-600 to-teal-600";
  const ringColor = isBreak ? "#fbbf24" : "#10b981";
  const modeLabel = isBreak ? "☕ BREAK TIME" : "🎯 FOCUS TIME";

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-16 pb-24 max-w-md mx-auto">
      {/* 🌆 HERO */}
      <div className={`relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br ${heroGrad} p-5 shadow-2xl transition-all duration-700`}>
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-lg">🍅</span>
            <span className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-xs font-black border border-white/20">
              {isBreak ? "☕ BREAK" : "🎯 FOCUS"}
            </span>
          </div>
          <h1 className="text-xl font-black text-white leading-tight">Focus Timer</h1>
          <p className="text-[10px] text-white/80 font-semibold mt-1">
            {focusMin}m focus → {breakMin}m break • 🍅 {doneToday} today
          </p>
        </div>
      </div>

      {/* 🌱 PLANT + RING + TIMER */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-5 shadow-lg shadow-black/30 text-center">
        <p className={`text-[10px] font-black mb-4 ${isBreak ? "text-amber-400" : "text-emerald-400"}`}>
          {modeLabel}
        </p>

        <div className="flex justify-center mb-4">
          <PlantRing pct={pct} plant={plant} ringColor={ringColor} />
        </div>

        <p className="text-6xl font-black tracking-tight mb-1 tabular-nums">
          {mm}:{ss}
        </p>
        <p className="text-xs text-slate-400 font-semibold">
          {isBreak ? "Stretch a little, hydrate ☕" : "Stay off your phone! 📵"}
        </p>
      </div>

      {/* 🎛️ PRESETS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 shadow-lg shadow-black/30">
        <p className="text-[10px] font-black text-slate-400 mb-2">⏱ PRESET DURATIONS</p>
        <div className="flex gap-1.5 flex-wrap">
          {PRESETS.map((m) => (
            <button
              key={m}
              onClick={() => pickPreset(m)}
              disabled={running}
              className={`press flex-1 min-w-[50px] px-3 py-2 rounded-xl text-xs font-black border-2 transition-all disabled:opacity-50 ${
                focusMin === m
                  ? "bg-gradient-to-br from-emerald-500 to-green-600 border-transparent text-white shadow-lg"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="number"
            min="1"
            max="180"
            placeholder="Custom (min)"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onBlur={applyCustom}
            disabled={running}
            className="flex-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs outline-none focus:border-emerald-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* 🔆 SCREEN LOCK TOGGLE */}
      {wakeSupported && (
        <button
          onClick={() => setAwake(!awake)}
          className={`press w-full mb-4 px-4 py-3 rounded-2xl text-xs font-black border-2 transition-all ${
            awake
              ? "bg-amber-500/10 border-amber-400/60 text-amber-300 shadow-lg shadow-amber-900/20"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
          }`}
        >
          {awake ? "🔆 Screen stays ON while timer runs" : "😴 Screen can sleep normally"}
          {awake && running && (
            <p className="mt-1 text-[10px] text-amber-300/80 animate-pulse">Active — screen won&apos;t sleep now</p>
          )}
        </button>
      )}

      {/* 📝 SUBJECT */}
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject (e.g. Math) — optional"
        disabled={running}
        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-sm mb-4 outline-none focus:border-emerald-500 disabled:opacity-50"
      />

      {/* ▶️ CONTROLS */}
      <div className="flex gap-2">
        <GradButton
          onClick={() => setRunning(!running)}
          gradient={running ? "from-amber-500 to-orange-600" : "from-emerald-500 to-green-600"}
          className="flex-1 py-4 text-base"
        >
          {running ? "⏸ Pause" : "▶ Start Focus"}
        </GradButton>
        <button
          onClick={reset}
          className="press w-14 py-4 rounded-xl bg-slate-900 border border-slate-800 text-white text-xl font-black hover:bg-slate-800"
          title="Reset"
        >
          ↺
        </button>
      </div>

      <Link href="/study-tracker" className="inline-block mt-6 text-sm text-slate-400 hover:text-white press font-semibold">
        ← Back to Study
      </Link>
    </main>
  );
}