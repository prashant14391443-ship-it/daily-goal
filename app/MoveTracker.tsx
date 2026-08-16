"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const MODES = [
  { id: "walk", icon: "🚶", label: "Walk", met: 3.5 },
  { id: "run", icon: "🏃", label: "Run", met: 9.8 },
  { id: "ride", icon: "🚴", label: "Ride", met: 7.5 },
  { id: "hike", icon: "🥾", label: "Hike", met: 6.0 },
];

function hav(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}m ${ss.toString().padStart(2, "0")}s`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function MoveTracker() {
  const [mode, setMode] = useState(MODES[0]);
  const [tracking, setTracking] = useState(false);
  const [dist, setDist] = useState(0);
  const [sec, setSec] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [hint, setHint] = useState("");
  const [last, setLast] = useState<null | { dist: number; sec: number; cal: number; label: string; coins: number }>(null);
  const [steps, setSteps] = useState(0);
  const lastStepRef = useRef(0);
  const watchRef = useRef<number | null>(null);
  const prevRef = useRef<{ lat: number; lon: number } | null>(null);
  const distRef = useRef(0);

  useEffect(() => {
    if (!tracking) return;
    const id = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [tracking]);

  useEffect(() => {
    if (!tracking) return;
    const handler = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
      const now = Date.now();
      if (mag > 13 && now - lastStepRef.current > 350) {
        lastStepRef.current = now;
        setSteps((s) => s + 1);
      }
    };
    window.addEventListener("devicemotion", handler);
    return () => window.removeEventListener("devicemotion", handler);
  }, [tracking]);

  const start = () => {
    if (!navigator.geolocation) {
      alert("GPS not supported on this device!");
      return;
    }
    distRef.current = 0;
    setDist(0);
    setSec(0);
    setSteps(0);
    setHint("");
    setLast(null); // FIX: This wipes out the ghost state from old runs when you start a new one
    prevRef.current = null;
    setTracking(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed: gpsSpeed } = pos.coords;
        if (accuracy > 30) return;
        if (prevRef.current) {
          const d = hav(prevRef.current.lat, prevRef.current.lon, latitude, longitude);
          if (d < 100) {
            distRef.current += d;
            setDist(distRef.current);
          }
        }
        prevRef.current = { lat: latitude, lon: longitude };
        const kmh = gpsSpeed != null && gpsSpeed >= 0 ? Math.round(gpsSpeed * 3.6 * 10) / 10 : 0;
        setSpeed(kmh);
        if (mode.id === "walk" && kmh > 14)
          setHint("🚴 That speed looks like RIDING — switch mode above?");
        else if (mode.id === "run" && kmh > 0 && kmh < 6)
          setHint("🚶 Easy pace — maybe WALK mode fits better?");
        else setHint("");
      },
      () => setHint("📡 GPS weak — move near a window or outside!"),
      { enableHighAccuracy: true, maximumAge: 2000 }
    );
  };

  const stop = async () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    setTracking(false);
    
    const km = Math.max(distRef.current / 1000, (steps * 0.7) / 1000);
    const mins = Math.max(1, Math.round(sec / 60));
    
    // FIX: Strictly 0 calories if distance is 0
    const cal = km > 0 ? Math.round(((mode.met * 3.5 * 65) / 200) * mins) : 0;
    const earnedCoins = Math.floor(km) * 15;

    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    
    if (uid && sec >= 10) {
      await supabase.from("gym_logs").insert({
        user_id: uid,
        workout_type: `${mode.icon} ${mode.label} ${km.toFixed(2)} km`,
        duration_minutes: mins,
        session_date: todayStr(),
        completed: true,
        activity_type: mode.id,
        distance_km: Math.round(km * 100) / 100,
        calories: cal,
        avg_speed: sec > 0 ? Math.round((km / (sec / 3600)) * 10) / 10 : 0,
      });
      
      setLast({ dist: km, sec, cal, label: mode.label, coins: earnedCoins });
    } else if (sec < 10) {
      setHint("⏱️ Too short — track at least 10 seconds!");
    }
  };

  // LIVE CALCULATIONS
  const km = Math.max(dist / 1000, (steps * 0.7) / 1000);
  const pace = km > 0 ? sec / 60 / km : 0;
  const paceStr = km > 0 ? `${Math.floor(pace)}:${String(Math.floor((pace % 1) * 60)).padStart(2, "0")}` : "—";
  const cal = km > 0 ? Math.round(((mode.met * 3.5 * 65) / 200) * (sec / 60)) : 0;

  return (
    <div className="bg-slate-950 p-4 min-h-screen text-white">
      <div className="bg-slate-900 rounded-2xl p-4 shadow-lg border border-slate-800">
        
        {/* Header & Timer */}
        <div className="flex justify-between items-center mb-4">
          <p className="font-bold text-white text-lg flex items-center gap-2">
            🏃 Auto Tracker
          </p>
          <div className="bg-slate-800 px-3 py-1 rounded-full text-slate-300 text-sm font-medium">
            ⏱️ {fmtTime(sec)}
          </div>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => !tracking && setMode(m)}
              className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                mode.id === m.id
                  ? "bg-green-600 border-green-500 text-white shadow-md shadow-green-900/20"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* 🚀 NEW UI: EXACT MATCH TO IMAGE 2 🚀 */}
        <div className="bg-slate-800/50 rounded-xl p-4 grid gap-4 mb-6 border border-slate-700">
          
          {/* Top Row: Total Steps & Distance Run */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-slate-800 rounded-xl p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-400 mb-1">Total Steps</p>
              <p className="text-3xl font-bold text-white">{steps}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-400 mb-1">Distance Run</p>
              <p className="text-3xl font-bold text-white">
                {km.toFixed(2)} <span className="text-lg text-slate-300">km</span>
              </p>
            </div>
          </div>

          {/* Bottom Row: Speed, Pace, Burned */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-800 rounded-xl p-3 flex flex-col justify-center shadow-sm">
              <p className="text-xs font-medium text-slate-400 mb-1">Speed</p>
              <p className="text-2xl font-black text-orange-400">{speed || "0.0"}</p>
              <p className="text-[10px] text-slate-500 mt-1">km/h</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 flex flex-col justify-center shadow-sm">
              <p className="text-xs font-medium text-slate-400 mb-1">Pace</p>
              <p className="text-2xl font-black text-green-400">{paceStr}</p>
              <p className="text-[10px] text-slate-500 mt-1">min / km</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 flex flex-col justify-center shadow-sm">
              <p className="text-xs font-medium text-slate-400 mb-1">Burned</p>
              <p className="text-2xl font-black text-red-400">{cal}</p>
              <p className="text-[10px] text-slate-500 mt-1">kcal</p>
            </div>
          </div>
        </div>

        {hint && (
          <div className="bg-amber-900/20 border border-amber-900/50 rounded-lg p-2 mb-4 text-center">
            <p className="text-xs text-amber-400">{hint}</p>
          </div>
        )}

        <button
          onClick={tracking ? stop : start}
          className={`w-full py-4 rounded-xl font-black text-lg tracking-wide transition-all ${
            tracking 
              ? "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20" 
              : "bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900/20"
          }`}
        >
          {tracking ? "⏹ STOP & SAVE" : "▶ START TRACKING"}
        </button>

        {/* Post-Run summary message */}
        {last && (
          <div className="mt-4 bg-slate-950/80 rounded-xl p-4 border border-slate-800">
            <div className="flex justify-between items-center text-sm font-bold text-white mb-2">
              <span>🏁 Run Saved!</span>
              <span className="text-slate-400">{fmtTime(last.sec)}</span>
            </div>
            {last.coins > 0 ? (
              <div className="bg-green-900/30 border border-green-800 rounded-lg p-3 text-center text-green-400 text-sm font-medium">
                ✅ COMPLETED {last.label} → Earned +{last.coins} 🪙
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center text-slate-400 text-sm font-medium">
                ⚠️ Run at least 1 km to earn coins! (0 🪙 earned)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}