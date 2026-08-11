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
  distance: number;
  steps: number;
  preds: { label: string; text: string }[];
};

export default function RunningPage() {
  const [mode, setMode] = useState<"manual" | "live">("manual");

  // Manual inputs (Untouched)
  const [distance, setDistance] = useState("");
  const [mins, setMins] = useState("");
  const [secs, setSecs] = useState("");
  
  // Live Auto-Tracker states
  const [weight, setWeight] = useState("70");
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [liveSteps, setLiveSteps] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [result, setResult] = useState<Result | null>(null);

  // 1. Timer Effect
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

  // 2. Motion Sensor Effect (Pedometer)
  useEffect(() => {
    let lastStepTime = 0;

    const handleMotion = (event: DeviceMotionEvent) => {
      if (!event.accelerationIncludingGravity) return;

      const { x, y, z } = event.accelerationIncludingGravity;
      if (x === null || y === null || z === null) return;

      // Calculate the magnitude of the 3D acceleration vector
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      // Gravity is 9.8. A spike above 12 typically means a running/walking step impact.
      if (magnitude > 12) {
        const now = Date.now();
        // Prevent double counting (minimum 330ms between steps)
        if (now - lastStepTime > 330) {
          setLiveSteps((prev) => prev + 1);
          lastStepTime = now;
        }
      }
    };

    if (isRunning) {
      window.addEventListener("devicemotion", handleMotion);
    }

    return () => {
      window.removeEventListener("devicemotion", handleMotion);
    };
  }, [isRunning]);

  // Math calculation logic
  const computeResults = (dNum: number, totalSec: number, userWeight: number, steps: number) => {
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
      distance: Math.round(dNum * 100) / 100, // Round to 2 decimals
      steps,
      preds,
    });
  };

  const calculateManual = (e: React.FormEvent) => {
    e.preventDefault();
    const d = Number(distance);
    const totalSec = (Number(mins) || 0) * 60 + (Number(secs) || 0);
    computeResults(d, totalSec, Number(weight) || 70, 0); // 0 steps for manual
  };

  // Start the tracker and ask for sensor permissions
  const handleStartLive = async () => {
    // iOS Safari requires explicit permission to use the accelerometer
    if (typeof window !== "undefined" && typeof (DeviceMotionEvent as any).requestPermission === "function") {
      try {
        const permissionState = await (DeviceMotionEvent as any).requestPermission();
        if (permissionState !== "granted") {
          alert("We need motion access to count your steps automatically!");
          return;
        }
      } catch (error) {
        console.error(error);
        alert("Error requesting motion permission.");
        return;
      }
    }

    setElapsedSeconds(0);
    setLiveSteps(0);
    setIsRunning(true);
    setResult(null);
  };

  const handleStopLive = () => {
    setIsRunning(false);
    
    // Average stride length is roughly 0.762 meters per step
    const estimatedDistanceKm = (liveSteps * 0.762) / 1000;
    
    computeResults(estimatedDistanceKm, elapsedSeconds, Number(weight) || 70, liveSteps);
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
          Calculate speed, pace, calories manually or use the auto-pedometer tracker
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
          📱 Auto Step Tracker
        </button>
      </div>

      {/* MANUAL MODE FORM (Untouched) */}
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

      {/* LIVE Auto-Tracker MODE */}
      {mode === "live" && (
        <div className="bg-slate-900 p-6 rounded-lg mb-8 grid gap-4 md:grid-cols-2">
          <input
            type="number"
            min="0"
            max="200"
            value={weight}
            disabled={isRunning}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Your weight (kg) - helps calculate calories"
            className={`${inputCls} md:col-span-2 ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
          />

          <div className="bg-slate-800 p-6 rounded-lg text-center flex flex-col items-center justify-center gap-2 border border-slate-700">
            <span className="text-xs uppercase tracking-wider text-slate-400">Time Elapsed</span>
            <span className="text-4xl md:text-5xl font-mono font-extrabold text-orange-400">
              {fmtTime(elapsedSeconds)}
            </span>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg text-center flex flex-col items-center justify-center gap-2 border border-slate-700">
            <span className="text-xs uppercase tracking-wider text-slate-400">Auto Steps</span>
            <span className="text-4xl md:text-5xl font-mono font-extrabold text-blue-400">
              {liveSteps} 👟
            </span>
          </div>

          {!isRunning ? (
            <button
              type="button"
              onClick={handleStartLive}
              className="md:col-span-2 py-3 rounded bg-green-600 hover:bg-green-500 font-semibold transition-colors"
            >
              🟢 Start Tracking Run
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopLive}
              className="md:col-span-2 py-3 rounded bg-red-600 hover:bg-red-500 font-semibold transition-colors animate-pulse"
            >
              🛑 Stop & Calculate Stats
            </button>
          )}
        </div>
      )}

      {/* RESULTS DISPLAY */}
      {result && (
        <div className="bg-slate-900 rounded-xl p-6 grid gap-5 border border-slate-800 animate-in fade-in zoom-in duration-300">
          
          {mode === "live" && (
            <div className="grid grid-cols-2 gap-3 text-center mb-2">
               <div className="bg-slate-800 p-4 rounded border border-slate-700">
                 <p className="text-xs text-slate-400">Total Steps</p>
                 <p className="text-2xl font-bold text-white">{result.steps}</p>
               </div>
               <div className="bg-slate-800 p-4 rounded border border-slate-700">
                 <p className="text-xs text-slate-400">Distance Run</p>
                 <p className="text-2xl font-bold text-white">{result.distance} km</p>
               </div>
            </div>
          )}

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