"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { Timer, Play, Pause, RotateCcw, Shield, ShieldCheck, Wind, BookOpen, ChevronDown } from "lucide-react";
import BoxBreather from "@/app/components/BoxBreather";
import BackText from "@/app/components/BackBtn";

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

function PlantRing({ pct, ringColor, center }: { pct: number; ringColor: string; center: React.ReactNode }) {
  const size = 210;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(128,128,128,0.15)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={ringColor} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{center}</div>
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
  const [shield, setShield] = useState(false);
  const [warmupEnabled, setWarmupEnabled] = useState(false);
  const [showBreather, setShowBreather] = useState(false);
  const [showOpts, setShowOpts] = useState(false);
  const wakeRef = useRef<any>(null);

  /* ---------- wake lock + fullscreen (Focus Shield) ---------- */
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

  const setFullscreen = async (on: boolean) => {
    try {
      if (on) await document.documentElement.requestFullscreen?.();
      else if (document.fullscreenElement) await document.exitFullscreen();
    } catch {}
  };

  useEffect(() => {
    if (running && shield) { setWakeLock(true); setFullscreen(true); }
    else { setWakeLock(false); setFullscreen(false); }
  }, [running, shield]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && running && shield) setWakeLock(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [running, shield]);

  useEffect(() => () => { wakeRef.current?.release?.().catch(() => {}); }, []);

  /* zen mode: hide options while running */
  useEffect(() => { if (running) setShowOpts(false); }, [running]);

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
  const ringColor = isBreak ? "#fbbf24" : "#10b981";

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 pt-6 pb-24 max-w-md mx-auto">
      {/* slim header — no more giant hero card */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-black leading-tight" style={{ whiteSpace: "nowrap" }}>Focus Timer</h1>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            {focusMin}m focus → {breakMin}m break • 🍅 {doneToday} today
          </p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${
          isBreak ? "bg-amber-500/15 border-amber-500/30 text-amber-300" : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
        }`}>
          <Timer size={11} /> {isBreak ? "BREAK" : "FOCUS"}
        </span>
      </div>

      {/* timer FIRST — above the fold, time inside the ring */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 mb-4 text-center">
        <PlantRing
          pct={pct}
          ringColor={ringColor}
          center={
            <>
              <span className="text-4xl drop-shadow-2xl mb-1">{plant}</span>
              <span className="text-5xl font-black tracking-tight tabular-nums">{mm}:{ss}</span>
              <span className={`text-[10px] font-black mt-1 ${isBreak ? "text-amber-400" : "text-emerald-400"}`}>
                {isBreak ? "BREAK TIME — stretch, hydrate ☕" : "FOCUS TIME — stay off phone 📵"}
              </span>
            </>
          }
        />
      </div>

      {/* START immediately under timer — zero scrolling */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            if (!running && warmupEnabled) { setShowBreather(true); return; }
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

      {/* preset chips — one tap */}
      <div className="flex gap-1.5 mb-4">
        {PRESETS.map((m) => (
          <button
            key={m}
            onClick={() => pickPreset(m)}
            disabled={running}
            className={`press flex-1 min-w-[50px] px-2 py-2.5 rounded-xl text-xs font-black border transition-all disabled:opacity-50 ${
              focusMin === m
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
            }`}
          >
            {m}m
          </button>
        ))}
      </div>

      {/* Focus Shield — the honest "do not disturb" we can offer */}
      <button
        onClick={() => setShield(!shield)}
        className={`press w-full mb-4 px-4 py-3 rounded-2xl text-xs font-black border transition-all flex items-center justify-center gap-2 ${
          shield
            ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
            : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
        }`}
      >
        {shield ? <ShieldCheck size={14} /> : <Shield size={14} />}
        {shield ? "Focus Shield ON — screen on + fullscreen zen" : "Focus Shield — block distractions"}
      </button>
      {shield && (
        <p className="-mt-2 mb-4 text-[10px] text-slate-500 font-semibold text-center">
          For calls/SMS silence also enable your phone's Do Not Disturb — web apps can't block calls.
        </p>
      )}

      {/* everything else hidden behind one collapse */}
      <button
        onClick={() => setShowOpts(!showOpts)}
        className="w-full mb-3 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-black text-slate-400 flex items-center justify-center gap-1.5"
      >
        {showOpts ? "Hide options" : "More options"}
        <ChevronDown size={14} className={`transition-transform ${showOpts ? "rotate-180" : ""}`} />
      </button>

      {showOpts && (
        <div className="grid gap-3 mb-4">
          {/* custom minutes: Enter key OR Set button — no more blur trap */}
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="180"
              placeholder="Custom minutes"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  applyCustom();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              disabled={running}
              className="flex-1 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs outline-none focus:border-emerald-500 disabled:opacity-50"
            />
            <button
              onClick={applyCustom}
              disabled={running}
              className="press px-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black disabled:opacity-50"
            >
              Set
            </button>
          </div>

          <div className="relative">
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

          <label className="flex items-center justify-center gap-2 cursor-pointer select-none py-1">
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
        </div>
      )}

      <BackText />

      {showBreather && !running && (
        <BoxBreather
          seconds={60}
          autoStart={false}
          onDone={() => { setShowBreather(false); setRunning(true); }}
          onCancel={() => setShowBreather(false)}
        />
      )}
    </main>
  );
}