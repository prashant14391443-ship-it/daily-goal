"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

function fmtTime(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

type Result = {
  speed: number;
  paceMin: number;
  paceSec: number;
  calories: number;
  preds: { label: string; text: string }[];
};

export default function RunningPage() {
  const [mode, setMode] = useState<"manual" | "live">("manual");

  // Manual inputs
  const [distance, setDistance] = useState("");
  const [mins, setMins] = useState("");
  const [secs, setSecs] = useState("");
  
  // Live tracker inputs & states
  const [liveDistance, setLiveDistance] = useState("");
  const [weight, setWeight] = useState("70");
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [result, setResult] = useState<Result | null>(null);

  // Handle live stopwatch ticker
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const computeResults = (dNum: number, totalSec: number, userWeight: number) => {
    if (dNum <= 0 || totalSec <= 0) return;

    const hours = totalSec / 3600;
    const speed = dNum / hours;
    const paceTotal = totalSec / dNum;
    const paceMin = Math.floor(paceTotal / 60);
    const paceSec = Math.round(paceTotal % 60);

    const met =
      speed < 8 ? 7 : speed < 10 ? 9.8 : speed < 13 ? 11.5 : speed < 16 ? 12.8 : 14.5;
    const calories = Math.round(met * userWeight * hours);

    const preds = [
      { label: "1 km", dist: 1 },
      { label: "5 km", dist: 5 },
      { label: "10 km", dist: 10 },
      { label: "Half Marathon", dist: 21.1 },
    ].map((p) => ({
      label: p.label,
      text: fmtTime(totalSec * Math.pow(p.dist / dNum, 1.06)),
    }));

    setResult({
      speed: Math.round(speed * 10) / 10,
      paceMin,
      paceSec,
      calories,
      preds,
    });
  };

  const calculateManual = (e: React.FormEvent) => {
    e.preventDefault();
    const d = Number(distance);
    const totalSec = (Number(mins) || 0) * 60 + (Number(secs) || 0);
    computeResults(d, totalSec, Number(weight) || 70);
  };

  const handleStartLive = () => {
    const d = Number(liveDistance);
    if (d <= 0) {
      alert("Please enter a valid distance before starting!");
      return;
    }
    setElapsedSeconds(0);
    setIsRunning(true);
    setResult(null);
  };

  const handleStopLive = () => {
    setIsRunning(false);
    const d = Number(liveDistance);
    computeResults(d, elapsedSeconds, Number(weight) || 70);
  };

  const inputCls = "p-3 rounded bg-slate-800 border border-slate-700 w-full text-white";

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-xl">🏃</span>
          Running Speed Calculator
        </h1>
        <p className="text-slate-400">
          Calculate speed, pace, calories & race predictions manually or via live tracker
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-900 p-1.5 rounded-lg w-fit border border-slate-800">
        <button
          onClick={() => { setMode("manual"); setIsRunning(false); }}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
            mode === "manual" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          📝 Manual Entry
        </button>
        <button
          onClick={() => { setMode("live"); setResult(null); }}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
            mode === "live" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          ⏱️ Live Stopwatch
        </button>
      </div>

      {/* MANUAL MODE FORM */}
      {mode === "manual" && (
        <form
          onSubmit={calculateManual}
          className="bg-slate-900 p-6 rounded-lg mb-8 grid gap-4 md:grid-cols-2"
        >
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="Distance (km)"
            required
            className={inputCls}
          />
          <input
            type="number"
            min="0"
            max="200"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Your weight (kg)"
            className={inputCls}
          />
          <input
            type="number"
            min="0"
            value={mins}
            onChange={(e) => setMins(e.target.value)}
            placeholder="Time — minutes"
            required
            className={inputCls}
          />
          <input
            type="number"
            min="0"
            max="59"
            value={secs}
            onChange={(e) => setSecs(e.target.value)}
            placeholder="Time — seconds"
            className={inputCls}
          />
          <button className="md:col-span-2 py-3 rounded bg-orange-600 hover:bg-orange-500 font-semibold transition-colors">
            🏃 Calculate My Run
          </button>
        </form>
      )}

      {/* LIVE STOPWATCH MODE FORM */}
      {mode === "live" && (
        <div className="bg-slate-900 p-6 rounded-lg mb-8 grid gap-4 md:grid-cols-2">
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={liveDistance}
            disabled={isRunning}
            onChange={(e) => setLiveDistance(e.target.value)}
            placeholder="Target/Planned Distance (km)"
            required
            className={`${inputCls} ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
          />
          <input
            type="number"
            min="0"
            max="200"
            value={weight}
            disabled={isRunning}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Your weight (kg)"
            className={`${inputCls} ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
          />

          <div className="md:col-span-2 bg-slate-800 p-6 rounded-lg text-center flex flex-col items-center justify-center gap-2 border border-slate-700">
            <span className="text-xs uppercase tracking-wider text-slate-400">Live Elapsed Time</span>
            <span className="text-4xl md:text-5xl font-mono font-extrabold text-orange-400">
              {fmtTime(elapsedSeconds)}
            </span>
          </div>

          {!isRunning ? (
            <button
              type="button"
              onClick={handleStartLive}
              className="md:col-span-2 py-3 rounded bg-green-600 hover:bg-green-500 font-semibold transition-colors"
            >
              🟢 Start Run
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopLive}
              className="md:col-span-2 py-3 rounded bg-red-600 hover:bg-red-500 font-semibold transition-colors animate-pulse"
            >
              🛑 Stop & Calculate Run
            </button>
          )}
        </div>
      )}

      {/* RESULTS DISPLAY */}
      {result && (
        <div className="bg-slate-900 rounded-xl p-6 grid gap-5 border border-slate-800">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-800 rounded p-4">
              <p className="text-xs text-slate-400">Speed</p>
              <p className="text-2xl font-extrabold text-orange-400">
                {result.speed}
              </p>
              <p className="text-[10px] text-slate-400">km/h</p>
            </div>
            <div className="bg-slate-800 rounded p-4">
              <p className="text-xs text-slate-400">Pace</p>
              <p className="text-2xl font-extrabold text-green-400">
                {result.paceMin}:{String(result.paceSec).padStart(2, "0")}
              </p>
              <p className="text-[10px] text-slate-400">min / km</p>
            </div>
            <div className="bg-slate-800 rounded p-4">
              <p className="text-xs text-slate-400">Burned</p>
              <p className="text-2xl font-extrabold text-red-400">
                {result.calories}
              </p>
              <p className="text-[10px] text-slate-400">kcal</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-400 mb-2">
              🔮 Predicted race times (Riegel formula)
            </p>
            <div className="grid grid-cols-2 gap-3">
              {result.preds.map((p) => (
                <div
                  key={p.label}
                  className="bg-slate-800 rounded p-3 flex justify-between text-sm"
                >
                  <span className="text-slate-400">{p.label}</span>
                  <span className="font-bold">{p.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Link
        href="/gym-log"
        className="inline-block mt-6 text-sm text-slate-400 hover:text-white"
      >
        ← Back to Gym
      </Link>
    </main>
  );
}