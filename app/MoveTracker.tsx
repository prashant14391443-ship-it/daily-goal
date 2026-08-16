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
  const [last, setLast] = useState<null | { dist: number; sec: number; cal: number; label: string }>(null);
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
    const cal = Math.round(((mode.met * 3.5 * 65) / 200) * mins);
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
      setLast({ dist: km, sec, cal, label: mode.label });
    } else if (sec < 10) {
      setHint("⏱️ Too short — track at least 10 seconds!");
    }
  };

  const km = Math.max(dist / 1000, (steps * 0.7) / 1000);
  const pace = km > 0 ? sec / 60 / km : 0;
  const paceStr =
    km > 0.05 ? `${Math.floor(pace)}:${String(Math.floor((pace % 1) * 60)).padStart(2, "0")} /km` : "—";
  const cal = Math.round(((mode.met * 3.5 * 65) / 200) * (sec / 60));

  return (
    <div className="bg-slate-900 rounded-2xl p-4">
      <p className="font-bold text-white mb-2">🏃 Auto Tracker — walk, run, ride, hike</p>

      <div className="grid grid-cols-4 gap-2 mb-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => !tracking && setMode(m)}
            className={`py-2 rounded-xl text-xs font-bold border ${
              mode.id === m.id
                ? "bg-green-600 border-green-500 text-white"
                : "bg-slate-800 border-slate-700 text-slate-300"
            }`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* STRAVA-STYLE STATS */}
      <div className="grid grid-cols-4 gap-2 text-center mb-2">
        <div>
          <p className="text-[10px] text-slate-400">Distance</p>
          <p className="font-black text-lg text-white">{km.toFixed(2)} km</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400">Pace</p>
          <p className="font-black text-lg text-white">{paceStr}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400">Time</p>
          <p className="font-black text-lg text-white">{fmtTime(sec)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400">Steps</p>
          <p className="font-black text-lg text-blue-400">{steps}</p>
        </div>
      </div>
      <div className="flex justify-between text-xs text-slate-400 mb-3">
        <span>⚡ {speed} km/h now</span>
        <span>🔥 {cal} kcal</span>
      </div>

      {hint && <p className="text-xs text-amber-400 mb-2">{hint}</p>}

      <button
        onClick={tracking ? stop : start}
        className={`w-full py-3 rounded-xl font-black text-lg ${
          tracking ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"
        }`}
      >
        {tracking ? "⏹ STOP & SAVE" : "▶ START TRACKING"}
      </button>

      {last && (
        <div className="mt-3 bg-slate-950/60 rounded-xl p-3">
          <div className="grid grid-cols-3 text-center">
            <div>
              <p className="text-[10px] text-slate-400">Distance</p>
              <p className="font-bold text-white">{last.dist.toFixed(2)} km</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Time</p>
              <p className="font-bold text-white">{fmtTime(last.sec)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Calories</p>
              <p className="font-bold text-white">{last.cal} kcal</p>
            </div>
          </div>
          <p className="text-[10px] text-green-400 text-center mt-2">
            ✅ Saved as COMPLETED {last.label} → +15 🪙
          </p>
        </div>
      )}
    </div>
  );
}