"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { Activity, PersonStanding, Bike, Mountain, Trophy, Ruler, Rocket, TrendingUp, Flag, Footprints, Timer, Radio, Pause, Square, Play, Coins } from "lucide-react";

const MODES = [
  { id: "walk", icon: PersonStanding, label: "Walk", met: 3.5 },
  { id: "run", icon: Activity, label: "Run", met: 9.8 },
  { id: "ride", icon: Bike, label: "Ride", met: 7.5 },
  { id: "hike", icon: Mountain, label: "Hike", met: 6.0 },
];

const MIN_ACCURACY = 25; const MIN_JUMP = 7; const MAX_JUMP = 100; const MIN_SPEED = 1.0;

function hav(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function fmtTime(s: number) { const m = Math.floor(s / 60); const ss = Math.floor(s % 60); return `${m}m ${ss.toString().padStart(2, "0")}s`; }
function fmtPace(s: number) { const m = Math.floor(s / 60); const ss = Math.round(s % 60); return `${m}:${String(ss).padStart(2, "0")}`; }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
type WeekBar = { label: string; speed: number };

export default function MoveTracker() {
  const [mode, setMode] = useState(MODES[0]);
  const [tracking, setTracking] = useState(false);
  const [dist, setDist] = useState(0);
  const [sec, setSec] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [hint, setHint] = useState("");
  const [weight, setWeight] = useState("");
  const [steps, setSteps] = useState(0);
  const [gpsMoving, setGpsMoving] = useState(false);
  const [last, setLast] = useState<null | { dist: number; sec: number; cal: number; label: string; coins: number }>(null);
  const [coachTip, setCoachTip] = useState("");
  const [pbFlash, setPbFlash] = useState("");
  const [pbs, setPbs] = useState<{ pace: number | null; dist: number | null }>({ pace: null, dist: null });
  const [weekChart, setWeekChart] = useState<WeekBar[]>([]);

  const uidRef = useRef("");
  const lastStepRef = useRef(0);
  const watchRef = useRef<number | null>(null);
  const prevRef = useRef<{ lat: number; lon: number } | null>(null);
  const distRef = useRef(0);
  const secRef = useRef(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) return;
      uidRef.current = uid;
      const { data: pb } = await supabase.from("personal_bests").select("*").eq("user_id", uid).maybeSingle();
      setPbs({ pace: pb?.best_pace_sec || null, dist: pb?.best_distance_km || null });
      const from = new Date(Date.now() - 42 * 86400000).toISOString().slice(0, 10);
      const { data: runs } = await supabase.from("gym_logs")
        .select("session_date, duration_minutes, distance_km")
        .eq("user_id", uid).not("activity_type", "is", null).eq("completed", true).gte("session_date", from);
      const buckets = Array.from({ length: 6 }, () => ({ t: 0, d: 0 }));
      (runs || []).forEach((r) => {
        const age = Math.floor((Date.now() - new Date(r.session_date + "T00:00:00").getTime()) / (7 * 86400000));
        if (age >= 0 && age < 6) { buckets[5 - age].t += r.duration_minutes || 0; buckets[5 - age].d += r.distance_km || 0; }
      });
      const labels = ["5w", "4w", "3w", "2w", "Last", "Now"];
      setWeekChart(buckets.map((b, i) => ({ label: labels[i], speed: b.d > 0.05 ? Math.round((b.d / (b.t / 60)) * 10) / 10 : 0 })));
    };
    load();
  }, []);

  useEffect(() => {
    if (!tracking) return;
    const id = setInterval(() => { setSec((s) => s + 1); secRef.current += 1; }, 1000);
    return () => clearInterval(id);
  }, [tracking]);

  useEffect(() => {
    if (!tracking) return;
    const handler = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
      const now = Date.now();
      if (mag > 13.5 && gpsMoving && now - lastStepRef.current > 350) { lastStepRef.current = now; setSteps((s) => s + 1); }
    };
    window.addEventListener("devicemotion", handler);
    return () => window.removeEventListener("devicemotion", handler);
  }, [tracking, gpsMoving]);

  const awardPB = async (uid: string, key: string, label: string) => {
    const { error } = await supabase.from("coin_log").insert({ user_id: uid, action_key: key, coins: 50 });
    if (!error) {
      const { data: cur } = await supabase.from("user_coins").select("coins").eq("user_id", uid).maybeSingle();
      const total = (cur?.coins || 0) + 50;
      await supabase.from("user_coins").upsert({ user_id: uid, coins: total });
      window.dispatchEvent(new CustomEvent("dg-coins", { detail: { total, earned: 50 } }));
      recordNotification("🏆 NEW PERSONAL BEST!", `${label} → +50 🪙`);
    }
  };

  const start = () => {
    if (!navigator.geolocation) { alert("GPS not supported on this device!"); return; }
    distRef.current = 0; secRef.current = 0;
    setDist(0); setSec(0); setSteps(0); setSpeed(0); setGpsMoving(false); setHint(""); setLast(null); setCoachTip("");
    prevRef.current = null; setTracking(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed: gpsSpeed } = pos.coords;
        if (accuracy == null || accuracy > MIN_ACCURACY) return;
        let realJump = 0;
        if (prevRef.current) {
          const d = hav(prevRef.current.lat, prevRef.current.lon, latitude, longitude);
          if (d >= MIN_JUMP && d <= MAX_JUMP) { realJump = d; distRef.current += d; setDist(distRef.current); setGpsMoving(true); }
          else if (d < MIN_JUMP) setGpsMoving(false);
        }
        prevRef.current = { lat: latitude, lon: longitude };
        let kmh = 0;
        if (gpsSpeed != null && gpsSpeed >= 0) { const s = gpsSpeed * 3.6; if (s >= MIN_SPEED && realJump >= MIN_JUMP) kmh = Math.round(s * 10) / 10; }
        setSpeed(kmh);
        if (kmh >= MIN_SPEED) {
          if (mode.id === "walk" && kmh > 14) setHint("🚴 That speed looks like RIDING — switch mode above?");
          else if (mode.id === "run" && kmh < 6) setHint("🚶 Easy pace — maybe WALK mode fits better?");
          else setHint("");
        } else setHint("");
      },
      () => setHint("📡 GPS weak — move near a window or outside!"),
      { enableHighAccuracy: true, maximumAge: 1500, timeout: 10000 }
    );
  };

  const stop = async () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    setTracking(false); setGpsMoving(false);
    const km = distRef.current / 1000;
    const secs = secRef.current;
    const mins = Math.max(1, Math.round(secs / 60));
    const userWeight = Number(weight) || 65;
    const cal = km > 0.01 ? Math.round(((mode.met * 3.5 * userWeight) / 200) * mins) : 0;
    const earnedCoins = Math.floor(km) * 15;
    const uid = uidRef.current;
    if (uid && secs >= 10) {
      await supabase.from("gym_logs").insert({
        user_id: uid, workout_type: `${mode.label} ${km.toFixed(2)} km`, duration_minutes: mins,
        session_date: todayStr(), completed: true, activity_type: mode.id,
        distance_km: Math.round(km * 100) / 100, calories: cal,
        avg_speed: secs > 0 ? Math.round((km / (secs / 3600)) * 10) / 10 : 0,
      });
      setLast({ dist: km, sec: secs, cal, label: mode.label, coins: earnedCoins });
      if (km >= 0.5) {
        const paceSec = Math.round(secs / km);
        const { data: pb } = await supabase.from("personal_bests").select("*").eq("user_id", uid).maybeSingle();
        let flash = "";
        if (!pb) {
          await supabase.from("personal_bests").insert({ user_id: uid, best_pace_sec: km >= 1 ? paceSec : null, best_distance_km: Math.round(km * 100) / 100 });
          setPbs({ pace: km >= 1 ? paceSec : null, dist: km });
          flash = "🚀 First records saved! Chase them next run!";
          await awardPB(uid, `pb-first-${uid}`, "First running record set");
        } else {
          const updates: { best_pace_sec?: number; best_distance_km?: number } = {};
          if (km >= 1 && paceSec < (pb.best_pace_sec || 999999)) { updates.best_pace_sec = paceSec; flash += `🚀 NEW FASTEST PACE ${fmtPace(paceSec)}/km! `; await awardPB(uid, `pb-pace-${uid}-${paceSec}`, `New fastest pace ${fmtPace(paceSec)}/km`); }
          if (km > (pb.best_distance_km || 0)) { updates.best_distance_km = Math.round(km * 100) / 100; flash += `📏 NEW LONGEST RUN ${km.toFixed(2)} km!`; await awardPB(uid, `pb-dist-${uid}-${Math.round(km * 100)}`, `New longest run ${km.toFixed(2)} km`); }
          if (Object.keys(updates).length > 0) { await supabase.from("personal_bests").update(updates).eq("user_id", uid); setPbs({ pace: updates.best_pace_sec ?? pb.best_pace_sec, dist: updates.best_distance_km ?? pb.best_distance_km }); }
        }
        if (flash) setPbFlash(flash + " (+50 🪙)");
      }
      if (km >= 0.3) {
        setCoachTip("🤖 Coach is analyzing your run...");
        try {
          const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "coach", message: `I just ${mode.label.toLowerCase()}ed ${km.toFixed(2)} km in ${fmtTime(secs)} (avg pace ${fmtPace(Math.round(secs / km))}/km, ${earnedCoins} coins). Give me 2 short specific tips to get faster next time. Emojis, under 80 words.`, context: `Activity: ${mode.label}. Weight: ${userWeight} kg.` }) });
          const d = await res.json();
          setCoachTip(d.reply || "Keep going — consistency beats speed! 🏃");
        } catch { setCoachTip(""); }
      }
    } else if (secs < 10) setHint("⏱️ Too short — track at least 10 seconds!");
  };

  const km = dist / 1000;
  const userWeight = Number(weight) || 65;
  let paceStr = "—";
  if (km > 0.01 && sec > 0) {
    const currentPace = sec / 60 / km;
    if (currentPace > 99) paceStr = "99:59+";
    else paceStr = `${Math.floor(currentPace)}:${String(Math.floor((currentPace % 1) * 60)).padStart(2, "0")}`;
  }
  const cal = km > 0.01 ? Math.round(((mode.met * 3.5 * userWeight) / 200) * (sec / 60)) : 0;
  const maxSpeed = Math.max(...weekChart.map((w) => w.speed), 1);

  const ModeIcon = mode.icon;

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 CALM HERO */}
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 p-5 shadow-xl shadow-emerald-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center">
              <ModeIcon size={22} strokeWidth={2.2} className="text-white" />
            </span>
            <span className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-[11px] font-black border border-white/20 flex items-center gap-1.5">
              <Timer size={11} />
              {fmtTime(sec)}
            </span>
          </div>
          <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Auto Tracker</h1>
          <p className="text-[11px] text-white/75 font-semibold mt-0.5">GPS + steps + calories</p>
        </div>
      </div>

      {/* 🏆 PB BAR */}
      <div className="flex justify-center gap-4 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-[11px] font-black">
        <span className="text-amber-300 flex items-center gap-1"><Rocket size={11} /> Best pace: {pbs.pace ? `${fmtPace(pbs.pace)}/km` : "—"}</span>
        <span className="text-orange-300 flex items-center gap-1"><Ruler size={11} /> Longest: {pbs.dist ? `${pbs.dist.toFixed(2)} km` : "—"}</span>
      </div>

      {/* MODES */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <button key={m.id} onClick={() => !tracking && setMode(m)}
              className={`press py-3 rounded-xl text-[10px] font-black border transition-all flex flex-col items-center gap-1 ${mode.id === m.id ? "bg-green-500/15 border-green-500/30 text-green-300" : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"}`}>
              <Icon size={16} strokeWidth={2.2} />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* WEIGHT */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-400">Body Weight (kg)</span>
        <input type="number" min="20" max="300" value={weight} onChange={(e) => setWeight(e.target.value)} disabled={tracking}
          placeholder="kg"
          className="bg-slate-800 border border-slate-700 rounded-xl w-20 text-center text-white py-1.5 text-sm outline-none focus:border-green-500 disabled:opacity-50" />
      </div>

      {/* STATS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid gap-3 mb-4">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-slate-800/60 rounded-xl p-4">
            <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Footprints size={15} strokeWidth={2.2} />
            </div>
            <p className="text-[10px] font-black text-slate-500">TOTAL STEPS</p>
            <p className="text-2xl font-black text-white mt-1">{steps}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-4">
            <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center">
              <Ruler size={15} strokeWidth={2.2} />
            </div>
            <p className="text-[10px] font-black text-slate-500">DISTANCE</p>
            <p className="text-2xl font-black text-white mt-1">{km.toFixed(2)} <span className="text-sm text-slate-500">km</span></p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-800/60 rounded-xl p-3">
            <p className="text-[10px] font-black text-slate-500">SPEED</p>
            <p className="text-xl font-black text-orange-400 mt-1">{speed || "0.0"}</p>
            <p className="text-[10px] text-slate-500 font-bold">km/h</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3">
            <p className="text-[10px] font-black text-slate-500">PACE</p>
            <p className="text-xl font-black text-green-400 mt-1">{paceStr}</p>
            <p className="text-[10px] text-slate-500 font-bold">min/km</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3">
            <p className="text-[10px] font-black text-slate-500">BURNED</p>
            <p className="text-xl font-black text-red-400 mt-1">{cal}</p>
            <p className="text-[10px] text-slate-500 font-bold">kcal</p>
          </div>
        </div>
        {tracking && (
          <div className={`text-center text-[10px] font-black py-2 rounded-lg flex items-center justify-center gap-1.5 ${gpsMoving ? "bg-green-500/15 text-green-400" : "bg-slate-800/50 text-slate-500"}`}>
            {gpsMoving ? <><Radio size={11} /> GPS tracking movement</> : <><Pause size={11} /> Waiting for real movement...</>}
          </div>
        )}
      </div>

      {hint && <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 mb-4 text-center"><p className="text-[11px] text-amber-300 font-bold">{hint}</p></div>}

      {/* START/STOP */}
      <button onClick={tracking ? stop : start}
        className={`press w-full py-4 rounded-xl text-base font-black flex items-center justify-center gap-2 border transition-all ${
          tracking
            ? "bg-red-500/15 border-red-500/30 text-red-300"
            : "bg-green-500/15 border-green-500/30 text-green-300"
        }`}>
        {tracking ? <><Square size={18} /> STOP & SAVE</> : <><Play size={18} fill="currentColor" /> START TRACKING</>}
      </button>

      {/* WEEKLY CHART */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mt-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <TrendingUp size={14} strokeWidth={2.2} />
          </span>
          <p className="text-xs font-black text-slate-400">YOUR SPEED JOURNEY</p>
        </div>
        <div className="flex items-end justify-between gap-2 h-24">
          {weekChart.map((w, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-slate-500 font-black">{w.speed > 0 ? w.speed : ""}</span>
              <div className={`w-full rounded-t-lg ${i === 5 ? "bg-green-500" : "bg-blue-500"}`}
                style={{ height: `${Math.max((w.speed / maxSpeed) * 70, w.speed > 0 ? 8 : 2)}px` }} />
              <span className="text-[9px] text-slate-600 font-bold">{w.label}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-600 mt-2 text-center font-bold">Higher bars = faster you!</p>
      </div>

      {/* LAST RUN */}
      {last && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5">
          <div className="flex justify-between items-center text-sm font-black mb-3">
            <span className="flex items-center gap-2">
              <Flag size={15} className="text-green-400" />
              Run Saved!
            </span>
            <span className="text-slate-500 text-xs">{fmtTime(last.sec)}</span>
          </div>
          {last.coins > 0 ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center text-green-300 text-sm font-black mb-2 flex items-center justify-center gap-1.5">
              <Coins size={15} />
              COMPLETED {last.label} → +{last.coins} coins
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center text-slate-400 text-sm font-bold mb-2">
              Run ≥1 km to earn coins (0 coins)
            </div>
          )}
          {coachTip && <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 text-xs text-violet-200 whitespace-pre-wrap font-semibold">{coachTip}</div>}
        </div>
      )}

      {/* PB MODAL */}
      {pbFlash && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-8 text-center max-w-sm w-full">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Trophy size={40} className="text-amber-400 animate-bounce" />
            </div>
            <p className="text-2xl font-black text-amber-400 mb-2">PERSONAL BEST!</p>
            <p className="text-white font-bold mb-6 text-sm">{pbFlash}</p>
            <button onClick={() => setPbFlash("")} className="press w-full py-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-sm font-black text-amber-300 flex items-center justify-center gap-1.5">
              <Rocket size={16} /> LET&apos;S GO!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}