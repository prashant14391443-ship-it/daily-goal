"use client";

import { useState } from "react";
import Link from "next/link";

function fmtTime(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

type Result = {
  distance: string;
  speed: number;
  paceMin: number;
  paceSec: number;
  calories: number;
  steps: number;
  coins: number;
  preds: { label: string; text: string }[];
};

export default function RunningPage() {
  const [distance, setDistance] = useState("");
  const [mins, setMins] = useState("");
  const [secs, setSecs] = useState("");
  const [weight, setWeight] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const calculate = (e: React.FormEvent) => {
    e.preventDefault();
    const d = Number(distance);
    const totalSec = (Number(mins) || 0) * 60 + (Number(secs) || 0);
    const w = Number(weight);

    // Allow calculation if time and weight exist (even if distance is 0)
    if (totalSec <= 0 || w <= 0) return;

    const hours = totalSec / 3600;
    const speed = d > 0 ? d / hours : 0;
    const paceTotal = d > 0 ? totalSec / d : 0;
    const paceMin = d > 0 ? Math.floor(paceTotal / 60) : 0;
    const paceSec = d > 0 ? Math.round(paceTotal % 60) : 0;

    // FIX 1: Accurate Calorie calculation
    // Set MET to 0 if distance is 0, so no fake calories are burned just from time passing
    let met = 0;
    if (speed === 0) met = 0; 
    else if (speed < 4) met = 3; // Walking
    else if (speed < 8) met = 7; // Jogging
    else if (speed < 10) met = 9.8;
    else if (speed < 13) met = 11.5;
    else if (speed < 16) met = 12.8;
    else met = 14.5;

    const calories = d > 0 ? Math.round(met * w * hours) : 0;

    // FIX 2: Estimate steps (assuming average human stride length of ~0.78m)
    const steps = Math.round((d * 1000) / 0.78);

    // FIX 3: Calculate coins (Strictly 15 coins per full km)
    const coins = Math.floor(d) * 15;

    const preds = d > 0 ? [
      { label: "1 km", dist: 1 },
      { label: "5 km", dist: 5 },
      { label: "10 km", dist: 10 },
      { label: "Half Marathon", dist: 21.1 },
    ].map((p) => ({
      label: p.label,
      text: fmtTime(totalSec * Math.pow(p.dist / d, 1.06)),
    })) : [];

    setResult({
      distance: d.toFixed(2),
      speed: Math.round(speed * 10) / 10,
      paceMin,
      paceSec,
      calories,
      steps,
      coins,
      preds,
    });
  };

  const inputCls = "p-3 rounded bg-slate-800 border border-slate-700 w-full text-white";

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-xl">🏃</span>
          Running Calculator
        </h1>
        <p className="text-slate-400">
          Calculate speed, pace, steps & coin rewards from your run
        </p>
      </div>

      <form
        onSubmit={calculate}
        className="bg-slate-900 p-6 rounded-lg mb-8 grid gap-4 md:grid-cols-2"
      >
        <input
          type="number"
          min="0"
          step="0.01"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          placeholder="Distance (km)"
          required
          className={inputCls}
        />
        <input
          type="number"
          min="1"
          max="300"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="Your weight (kg)"
          required
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

      {result && (
        <div className="bg-slate-900 rounded-xl p-6 grid gap-5 border border-slate-800">
          {/* Top Row: Total Steps & Distance Run */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-slate-800 rounded p-4">
              <p className="text-sm font-medium text-slate-400 mb-1">Total Steps</p>
              <p className="text-3xl font-bold text-white">
                {result.steps}
              </p>
            </div>
            <div className="bg-slate-800 rounded p-4">
              <p className="text-sm font-medium text-slate-400 mb-1">Distance Run</p>
              <p className="text-3xl font-bold text-white">
                {result.distance} <span className="text-xl">km</span>
              </p>
            </div>
          </div>

          {/* Bottom Row: Speed, Pace, Burned */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-800 rounded p-4 flex flex-col justify-center">
              <p className="text-xs text-slate-400 mb-1">Speed</p>
              <p className="text-2xl font-extrabold text-orange-400">
                {result.speed}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">km/h</p>
            </div>
            <div className="bg-slate-800 rounded p-4 flex flex-col justify-center">
              <p className="text-xs text-slate-400 mb-1">Pace</p>
              <p className="text-2xl font-extrabold text-green-400">
                {result.paceMin > 0 || result.paceSec > 0 
                  ? `${result.paceMin}:${String(result.paceSec).padStart(2, "0")}` 
                  : "-"}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">min / km</p>
            </div>
            <div className="bg-slate-800 rounded p-4 flex flex-col justify-center">
              <p className="text-xs text-slate-400 mb-1">Burned</p>
              <p className="text-2xl font-extrabold text-red-400">
                {result.calories}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">kcal</p>
            </div>
          </div>

          {/* Coins Tracker */}
          {result.coins > 0 ? (
            <div className="bg-green-900/30 border border-green-800 rounded p-3 text-center text-green-400 text-sm font-medium">
              ✅ Saved as COMPLETED Run → +{result.coins} 🪙
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded p-3 text-center text-slate-400 text-sm font-medium">
              Run at least 1 km to earn coins! (1 km = 15 🪙)
            </div>
          )}

          {/* Predictions Grid (Hidden if distance is 0) */}
          {result.preds.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-bold text-slate-300 mb-3">🏁 Race Predictions</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {result.preds.map((p) => (
                  <div
                    key={p.label}
                    className="bg-slate-800 rounded p-3 text-center"
                  >
                    <p className="text-xs text-slate-400">{p.label}</p>
                    <p className="font-bold text-white mt-1">{p.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
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