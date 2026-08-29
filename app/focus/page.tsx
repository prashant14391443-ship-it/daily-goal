"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import Link from "next/link";
import { Timer, Play, Pause, RotateCcw, Sun, Moon, BookOpen, Coffee, Wind } from "lucide-react";
import BoxBreather from "@/app/components/BoxBreather";
import BackBtn from "@/app/components/BackBtn";
function toLocalISO(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${day}`; }

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
  const [warmupEnabled, setWarmupEnabled] = useState(false);
  const [showBreather, setShowBreather] = useState(false);
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

  const isBreak = mode === "break";
  const heroGrad = isBreak ? "from-amber-500 via-orange-600 to-rose-600" : "from-emerald-500 via-green-600 to-teal-600";
  const ringColor = isBreak ? "#fbbf24" : "#10b981";
  const modeLabel = isBreak ? "BREAK TIME" : "FOCUS TIME";

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-md mx-auto">
      <div className={`relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br ${heroGrad} p-5 shadow-xl transition-all duration-700`}>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center">
              <Timer size={22} strokeWidth={2.2} className="text-white" />
            </span>
            <span className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-[10px] font-black border border-white/20 flex items-center gap-1.5">
              {isBreak ? <Coffee size={11} /> : <Timer size={11} />}
              {isBreak ? "BREAK" : "FOCUS"}
            </span>
          </div>
          <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Focus Timer</h1>
          <p className="text-[11px] text-white/75 font-semibold mt-0.5">
            {focusMin}m focus → {breakMin}m break • 🍅 {doneToday} today
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-4 text-center">
        <p className={`text-[10px] font-black mb-4 ${isBreak ? "text-amber-400" : "text-emerald-400"}`}>
          {modeLabel}
        </p>

        <div className="flex justify-center mb-4">
          <PlantRing pct={pct} plant={plant} ringColor={ringColor} />
        </div>

        <p className="text-6xl font-black tracking-tight mb-1 tabular-nums">
          {mm}:{ss}
        </p>
        <p className="text-xs text-slate-500 font-bold">
          {isBreak ? "Stretch a little, hydrate ☕" : "Stay off your phone! 📵"}
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
        <p className="text-[10px] font-black text-slate-500 mb-2">PRESET DURATIONS</p>
        <div className="flex gap-1.5 flex-wrap">
          {PRESETS.map((m) => (
            <button
              key={m}
              onClick={() => pickPreset(m)}
              disabled={running}
              className={`press flex-1 min-w-[50px] px-3 py-2.5 rounded-xl text-xs font-black border transition-all disabled:opacity-50 ${
                focusMin === m
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
        <div className="mt-2">
          <input
            type="number"
            min="1"
            max="180"
            placeholder="Custom (minutes)"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onBlur={applyCustom}
            disabled={running}
            className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs outline-none focus:border-emerald-500 disabled:opacity-50"
          />
        </div>
      </div>

      {wakeSupported && (
        <button
          onClick={() => setAwake(!awake)}
          className={`press w-full mb-4 px-4 py-3 rounded-2xl text-xs font-black border transition-all flex items-center justify-center gap-2 ${
            awake
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
          }`}
        >
          {awake ? <Sun size={14} /> : <Moon size={14} />}
          {awake ? "Screen stays ON while timer runs" : "Screen can sleep normally"}
          {awake && running && (
            <span className="ml-1 text-[10px] text-amber-300/80 animate-pulse">• Active</span>
          )}
        </button>
      )}

      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          <BookOpen size={14} strokeWidth={2} />
        </span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (e.g. Math) — optional"
          disabled={running}
          className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm outline-none focus:border-emerald-500 disabled:opacity-50"
        />
      </div>

      {/* 🧘 CALM WARM-UP TOGGLE */}
      <label className="flex items-center justify-center gap-2 mb-4 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={warmupEnabled}
          onChange={(e) => setWarmupEnabled(e.target.checked)}
          disabled={running}
          className="w-4 h-4 rounded accent-indigo-500"
        />
        <Wind size={14} className="text-indigo-400" />
        <span className="text-xs font-semibold text-slate-400">60-sec calm warm-up before focus</span>
      </label>

      <div className="flex gap-2">
        <button
          onClick={() => {
            if (!running && warmupEnabled) {
              setShowBreather(true);
              return;
            }
            setRunning(!running);
          }}
          className={`press flex-1 py-4 rounded-xl text-base font-black flex items-center justify-center gap-2 transition-all ${
            running
              ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
              : "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
          }`}
        >
          {running ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
          {running ? "Pause" : warmupEnabled ? "Start Calm + Focus" : "Start Focus"}
        </button>
        <button
          onClick={reset}
          className="press w-14 rounded-xl bg-slate-900 border border-slate-800 text-white flex items-center justify-center hover:bg-slate-800"
          title="Reset"
        >
          <RotateCcw size={18} />
        </button>
      </div>

     <BackBtn />

      {/* 🧘 BREATHING WARM-UP MODAL */}
      {showBreather && !running && (
        <BoxBreather
          seconds={60}
          autoStart={false}
          onDone={() => {
            setShowBreather(false);
            setRunning(true);
          }}
          onCancel={() => setShowBreather(false)}
        />
      )}
    </main>
  );
}