"use client";

import { useState } from "react";
import Link from "next/link";
import { Footprints, Zap, Trophy, Coins } from "lucide-react";

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

    if (totalSec <= 0 || w <= 0) return;

    const hours = totalSec / 3600;
    const speed = d > 0 ? d / hours : 0;
    const paceTotal = d > 0 ? totalSec / d : 0;
    const paceMin = d > 0 ? Math.floor(paceTotal / 60) : 0;
    const paceSec = d > 0 ? Math.round(paceTotal % 60) : 0;

    let met = 0;
    if (speed === 0) met = 0;
    else if (speed < 4) met = 3;
    else if (speed < 8) met = 7;
    else if (speed < 10) met = 9.8;
    else if (speed < 13) met = 11.5;
    else if (speed < 16) met = 12.8;
    else met = 14.5;

    const calories = d > 0 ? Math.round(met * w * hours) : 0;
    const steps = Math.round((d * 1000) / 0.78);
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

  const inputCls = "w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-orange-500 transition-colors";

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 CALM HERO */}
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-red-600 to-rose-600 p-5 shadow-xl shadow-orange-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center">
            <Footprints size={22} strokeWidth={2.2} className="text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Running Calculator</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">
              Calculate speed, pace, steps & coin rewards from your run
            </p>
          </div>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={calculate} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-5 grid gap-3 md:grid-cols-2">
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
        <button className="md:col-span-2 press py-3.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-sm font-black text-orange-300 flex items-center justify-center gap-1.5">
          <Footprints size={15} /> Calculate My Run
        </button>
      </form>

      {result && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 grid gap-4">
          {/* Top Row: Steps & Distance */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-slate-800/60 rounded-xl p-4">
              <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Footprints size={15} strokeWidth={2.2} />
              </div>
              <p className="text-[10px] font-black text-slate-500">TOTAL STEPS</p>
              <p className="text-2xl font-black text-white mt-1">{result.steps}</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-4">
              <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                <Zap size={15} strokeWidth={2.2} />
              </div>
              <p className="text-[10px] font-black text-slate-500">DISTANCE RUN</p>
              <p className="text-2xl font-black text-white mt-1">
                {result.distance} <span className="text-base">km</span>
              </p>
            </div>
          </div>

          {/* Bottom Row: Speed, Pace, Burned */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-800/60 rounded-xl p-3 flex flex-col justify-center">
              <p className="text-[10px] font-black text-slate-500">SPEED</p>
              <p className="text-xl font-black text-orange-400 mt-1">{result.speed}</p>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">km/h</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 flex flex-col justify-center">
              <p className="text-[10px] font-black text-slate-500">PACE</p>
              <p className="text-xl font-black text-green-400 mt-1">
                {result.paceMin > 0 || result.paceSec > 0
                  ? `${result.paceMin}:${String(result.paceSec).padStart(2, "0")}`
                  : "-"}
              </p>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">min/km</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 flex flex-col justify-center">
              <p className="text-[10px] font-black text-slate-500">BURNED</p>
              <p className="text-xl font-black text-red-400 mt-1">{result.calories}</p>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">kcal</p>
            </div>
          </div>

          {/* Coins Tracker */}
          {result.coins > 0 ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center text-green-300 text-sm font-black flex items-center justify-center gap-2">
              <Coins size={15} />
              Saved as COMPLETED Run → +{result.coins} coins
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center text-slate-400 text-sm font-bold">
              Run at least 1 km to earn coins! (1 km = 15 🪙)
            </div>
          )}

          {/* Predictions */}
          {result.preds.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                  <Trophy size={14} strokeWidth={2.2} />
                </span>
                <p className="text-xs font-black text-slate-400">🏁 RACE PREDICTIONS</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {result.preds.map((p) => (
                  <div key={p.label} className="bg-slate-800/60 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-black text-slate-500">{p.label}</p>
                    <p className="font-black text-white text-sm mt-1">{p.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Link href="/gym-log" className="inline-block mt-6 text-sm text-slate-500 hover:text-white press font-bold">
        ← Back to Gym
      </Link>
    </main>
  );
}