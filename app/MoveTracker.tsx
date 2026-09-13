"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { Activity, PersonStanding, Bike, Mountain, Trophy, Ruler, Rocket, TrendingUp, Flag, Footprints, Timer, Radio, Pause, Square, Play, Coins, Share2, Send, MapPin } from "lucide-react";

const MODES = [
  { id: "walk", icon: PersonStanding, label: "Walk", met: 3.5 },
  { id: "run", icon: Activity, label: "Run", met: 9.8 },
  { id: "ride", icon: Bike, label: "Ride", met: 7.5 },
  { id: "hike", icon: Mountain, label: "Hike", met: 6.0 },
];

const MIN_ACCURACY = 65;
const NOISE_FLOOR = 1;
const MIN_COMMIT = 5;
const MAX_JUMP = 150;
const MIN_SPEED = 0.8;
const STEP_MAG = 12;
const STEP_GAP = 300;

const GEO_OPTS: PositionOptions = { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 };

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
type RoutePt = { lat: number; lon: number; alt: number | null };

function routePoints(route: RoutePt[] | null): string {
  if (!route || route.length < 2) return "";
  const lats = route.map((p) => p.lat), lons = route.map((p) => p.lon);
  const minLa = Math.min(...lats), maxLa = Math.max(...lats), minLo = Math.min(...lons), maxLo = Math.max(...lons);
  const dLa = maxLa - minLa || 1e-6, dLo = maxLo - minLo || 1e-6;
  return route.map((p) => `${((p.lon - minLo) / dLo) * 100},${100 - ((p.lat - minLa) / dLa) * 100}`).join(" ");
}

function RouteMap({ route, size = 90 }: { route: RoutePt[] | null; size?: number }) {
  const pts = routePoints(route);
  if (!pts) return <div style={{ width: size, height: size }} className="rounded-xl bg-slate-800/60 flex items-center justify-center"><MapPin size={16} className="text-slate-600" /></div>;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="rounded-xl bg-slate-800/60 shrink-0">
      <polyline points={pts} fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MoveTracker() {
  const [mode, setMode] = useState(MODES[0]);
  const [tracking, setTracking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [dist, setDist] = useState(0);
  const [sec, setSec] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [hint, setHint] = useState("");
  const [warming, setWarming] = useState(true);
  const [weight, setWeight] = useState("");
  const [steps, setSteps] = useState(0);
  const [gpsMoving, setGpsMoving] = useState(false);
  const [last, setLast] = useState<null | { dist: number; sec: number; cal: number; label: string; coins: number; route: RoutePt[]; elev: number; maxSpeed: number; steps: number }>(null);
  const [coachTip, setCoachTip] = useState("");
  const [pbFlash, setPbFlash] = useState("");
  const [pbs, setPbs] = useState<{ pace: number | null; dist: number | null }>({ pace: null, dist: null });
  const [weekChart, setWeekChart] = useState<WeekBar[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [posted, setPosted] = useState(false);

  const uidRef = useRef("");
  const lastStepRef = useRef(0);
  const lastMoveRef = useRef(0);
  const watchRef = useRef<number | null>(null);
  const prevRef = useRef<{ lat: number; lon: number } | null>(null);
  const pendingRef = useRef(0);
  const distRef = useRef(0);
  const secRef = useRef(0);
  const speedRef = useRef(0);
  const movingRef = useRef(false);

  // ✅ NEW refs for wake-lock, timestamp timing, route/elev/max
  const wakeRef = useRef<any>(null);
  const startTsRef = useRef(0);
  const pausedMsRef = useRef(0);
  const pauseStartRef = useRef(0);
  const routeRef = useRef<RoutePt[]>([]);
  const elevRef = useRef(0);
  const maxSpeedRef = useRef(0);

  // ✅ Screen Wake Lock helpers
  const requestWake = async () => {
    try {
      if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
        wakeRef.current = await (navigator as any).wakeLock.request("screen");
      }
    } catch {}
  };
  const releaseWake = () => { try { wakeRef.current?.release(); } catch {} wakeRef.current = null; };

  // ✅ re-acquire wake lock when tab becomes visible again
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible" && tracking && !paused) requestWake(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [tracking, paused]);

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

      // ✅ history + community feed
      const { data: hist } = await supabase.from("gym_logs")
        .select("id, session_date, workout_type, duration_minutes, distance_km, calories, avg_speed, activity_type, route, elevation_gain_m, max_speed, steps_count")
        .eq("user_id", uid).not("activity_type", "is", null).eq("completed", true)
        .order("session_date", { ascending: false }).limit(8);
      setHistory(hist || []);
      const { data: fd } = await supabase.from("move_posts").select("*").order("created_at", { ascending: false }).limit(10);
      setFeed(fd || []);
    };
    load();
  }, []);

  // ✅ timestamp-based timer (accurate even if OS throttles)
  useEffect(() => {
    if (!tracking || paused) return;
    const id = setInterval(() => {
      const el = Math.max(0, Math.floor((Date.now() - startTsRef.current - pausedMsRef.current) / 1000));
      setSec(el); secRef.current = el;
    }, 1000);
    return () => clearInterval(id);
  }, [tracking, paused]);

  useEffect(() => {
    if (!tracking || paused) return;
    const handler = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
      const now = Date.now();
      if (mag > STEP_MAG && movingRef.current && now - lastStepRef.current > STEP_GAP) {
        lastStepRef.current = now;
        setSteps((s) => s + 1);
      }
    };
    window.addEventListener("devicemotion", handler);
    return () => window.removeEventListener("devicemotion", handler);
  }, [tracking, paused]);

  const setMoving = (v: boolean) => { movingRef.current = v; setGpsMoving(v); };

  const onPos = (pos: GeolocationPosition) => {
    const { latitude, longitude, accuracy, speed: gpsSpeed, altitude } = pos.coords;
    if (accuracy == null || accuracy > MIN_ACCURACY) return;
    const now = Date.now();
    setWarming(false);

    if (prevRef.current) {
      const d = hav(prevRef.current.lat, prevRef.current.lon, latitude, longitude);
      if (d > NOISE_FLOOR && d <= MAX_JUMP) {
        pendingRef.current += d;
        if (pendingRef.current >= MIN_COMMIT) {
          distRef.current += pendingRef.current;
          pendingRef.current = 0;
        }
      }
    }
    prevRef.current = { lat: latitude, lon: longitude };

    // ✅ capture route + elevation
    const lp = routeRef.current[routeRef.current.length - 1];
    if (!lp || hav(lp.lat, lp.lon, latitude, longitude) > 4) routeRef.current.push({ lat: latitude, lon: longitude, alt: altitude ?? null });
    if (lp && altitude != null && lp.alt != null) {
      const dAlt = altitude - lp.alt;
      if (dAlt > 1) elevRef.current += dAlt;
    }

    setDist(distRef.current + pendingRef.current);

    if (pendingRef.current > 2 || (gpsSpeed != null && gpsSpeed >= 1)) { setMoving(true); lastMoveRef.current = now; }
    if (now - lastMoveRef.current > 6000) setMoving(false);

    if (gpsSpeed != null && gpsSpeed >= 0) {
      const kmh = gpsSpeed * 3.6;
      speedRef.current = speedRef.current === 0 ? kmh : speedRef.current * 0.6 + kmh * 0.4;
      setSpeed(Math.round(speedRef.current * 10) / 10);
      if (speedRef.current > maxSpeedRef.current) maxSpeedRef.current = speedRef.current;
    }

    const kmhNow = speedRef.current;
    if (warming) setHint("🛰️ GPS warming up — few seconds, stay near sky/window...");
    else if (kmhNow >= MIN_SPEED) {
      if (mode.id === "walk" && kmhNow > 14) setHint("🚴 That speed looks like RIDING — switch mode above?");
      else if (mode.id === "run" && kmhNow < 6) setHint("🚶 Easy pace — maybe WALK mode fits better?");
      else setHint("");
    } else setHint("");
  };

  const onErr = () => setHint("📡 GPS weak — move near a window or outside!");

  const startWatch = () => {
    watchRef.current = navigator.geolocation.watchPosition(onPos, onErr, GEO_OPTS);
  };

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
    const DME = DeviceMotionEvent as any;
    if (typeof DME !== "undefined" && typeof DME.requestPermission === "function") {
      DME.requestPermission().catch(() => {});
    }
    distRef.current = 0; secRef.current = 0; pendingRef.current = 0; speedRef.current = 0;
    routeRef.current = []; elevRef.current = 0; maxSpeedRef.current = 0;
    startTsRef.current = Date.now(); pausedMsRef.current = 0;
    setDist(0); setSec(0); setSteps(0); setSpeed(0); setMoving(false); setHint(""); setLast(null); setCoachTip(""); setPosted(false);
    setWarming(true);
    prevRef.current = null; lastMoveRef.current = Date.now();
    setTracking(true); setPaused(false);
    requestWake(); // ✅ keep screen on
    startWatch();
  };

  const pause = () => {
    if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    pauseStartRef.current = Date.now();
    releaseWake();
    setPaused(true); setMoving(false); setSpeed(0); speedRef.current = 0;
    setHint("⏸️ Paused — timer & GPS stopped. Resume when ready!");
  };

  const resume = () => {
    pausedMsRef.current += Date.now() - pauseStartRef.current;
    setPaused(false);
    prevRef.current = null; pendingRef.current = 0; lastMoveRef.current = Date.now();
    setHint("");
    requestWake(); // ✅ keep screen on again
    startWatch();
  };

  const stop = async () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    releaseWake();
    setTracking(false); setPaused(false); setMoving(false);

    // ✅ accurate elapsed from timestamps
    const now = Date.now();
    const elapsedMs = (paused ? pauseStartRef.current : now) - startTsRef.current - pausedMsRef.current;
    const secs = Math.max(0, Math.floor(elapsedMs / 1000));

    const km = distRef.current / 1000;
    const mins = Math.max(1, Math.round(secs / 60));
    const userWeight = Number(weight) || 65;
    const cal = km > 0.01 ? Math.round(((mode.met * 3.5 * userWeight) / 200) * mins) : 0;
    const earnedCoins = Math.floor(km) * 15;
    const uid = uidRef.current;
    const route = routeRef.current;
    const elev = Math.round(elevRef.current);
    const maxSp = Math.round(maxSpeedRef.current * 10) / 10;

    if (uid && secs >= 10) {
      await supabase.from("gym_logs").insert({
        user_id: uid, workout_type: `${mode.label} ${km.toFixed(2)} km`, duration_minutes: mins,
        session_date: todayStr(), completed: true, activity_type: mode.id,
        distance_km: Math.round(km * 100) / 100, calories: cal,
        avg_speed: secs > 0 ? Math.round((km / (secs / 3600)) * 10) / 10 : 0,
        route, elevation_gain_m: elev, max_speed: maxSp, steps_count: steps,
      });
      setLast({ dist: km, sec: secs, cal, label: mode.label, coins: earnedCoins, route, elev, maxSpeed: maxSp, steps });
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
      // refresh history
      const { data: hist } = await supabase.from("gym_logs")
        .select("id, session_date, workout_type, duration_minutes, distance_km, calories, avg_speed, activity_type, route, elevation_gain_m, max_speed, steps_count")
        .eq("user_id", uid).not("activity_type", "is", null).eq("completed", true)
        .order("session_date", { ascending: false }).limit(8);
      setHistory(hist || []);
    } else if (secs < 10) setHint("⏱️ Too short — track at least 10 seconds!");
  };

  // ✅ Share via native share sheet / clipboard fallback
  const shareRun = async () => {
    if (!last) return;
    const pace = last.dist > 0 ? fmtPace(Math.round(last.sec / last.dist)) : "—";
    const text = `🏃 I just ${last.label}ed ${last.dist.toFixed(2)} km in ${fmtTime(last.sec)} (pace ${pace}/km) · ${last.cal} kcal · +${last.coins} 🪙 on DailyGoal!`;
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share({ title: "My Run", text }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(text); alert("Copied! Paste it anywhere 📋"); } catch {}
  };

  // ✅ Post to community Run Feed
  const postRun = async () => {
    const uid = uidRef.current; if (!uid || !last) return;
    const { data: sess } = await supabase.auth.getSession();
    const name = (sess.session?.user.user_metadata as any)?.display_name || "Athlete";
    await supabase.from("move_posts").insert({
      user_id: uid, display_name: name, mode: last.label,
      distance_km: Math.round(last.dist * 100) / 100, duration_sec: last.sec,
      pace_sec: last.dist > 0 ? Math.round(last.sec / last.dist) : null,
      calories: last.cal, coins: last.coins, route: last.route,
    });
    const { data: fd } = await supabase.from("move_posts").select("*").order("created_at", { ascending: false }).limit(10);
    setFeed(fd || []);
    setPosted(true);
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
    <div className="min-h-screen bg-slate-950 text-white px-4 pt-4 pb-24 max-w-4xl mx-auto">
      <div className="relative mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 p-5 shadow-xl shadow-emerald-900/20">
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
          <p className="text-[11px] text-white/75 font-semibold mt-0.5">GPS + steps + calories · screen stays on</p>
        </div>
      </div>

      <div className="flex justify-center gap-4 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-[11px] font-black">
        <span className="text-amber-300 flex items-center gap-1"><Rocket size={11} /> Best pace: {pbs.pace ? `${fmtPace(pbs.pace)}/km` : "—"}</span>
        <span className="text-orange-300 flex items-center gap-1"><Ruler size={11} /> Longest: {pbs.dist ? `${pbs.dist.toFixed(2)} km` : "—"}</span>
      </div>

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

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-400">Body Weight (kg)</span>
        <input type="number" min="20" max="300" value={weight} onChange={(e) => setWeight(e.target.value)} disabled={tracking}
          placeholder="kg"
          className="bg-slate-800 border border-slate-700 rounded-xl w-20 text-center text-white py-1.5 text-sm outline-none focus:border-green-500 disabled:opacity-50" />
      </div>

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
          paused ? (
            <div className="text-center text-[10px] font-black py-2 rounded-lg flex items-center justify-center gap-1.5 bg-amber-500/15 text-amber-300">
              <Pause size={11} /> PAUSED — timer & GPS stopped
            </div>
          ) : gpsMoving ? (
            <div className="text-center text-[10px] font-black py-2 rounded-lg flex items-center justify-center gap-1.5 bg-green-500/15 text-green-400">
              <Radio size={11} /> GPS tracking movement
            </div>
          ) : (
            <div className="text-center text-[10px] font-black py-2 rounded-lg flex items-center justify-center gap-1.5 bg-slate-800/50 text-slate-500">
              <Pause size={11} /> Waiting for real movement...
            </div>
          )
        )}
      </div>

      {hint && <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 mb-4 text-center"><p className="text-[11px] text-amber-300 font-bold">{hint}</p></div>}

      {tracking ? (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={paused ? resume : pause}
            className={`press w-full py-4 rounded-xl text-base font-black flex items-center justify-center gap-2 border transition-all ${
              paused ? "bg-green-500/15 border-green-500/30 text-green-300" : "bg-amber-500/15 border-amber-500/30 text-amber-300"
            }`}>
            {paused ? <><Play size={18} fill="currentColor" /> RESUME</> : <><Pause size={18} /> PAUSE</>}
          </button>
          <button onClick={stop}
            className="press w-full py-4 rounded-xl text-base font-black flex items-center justify-center gap-2 border transition-all bg-red-500/15 border-red-500/30 text-red-300">
            <Square size={18} /> STOP & SAVE
          </button>
        </div>
      ) : (
        <button onClick={start}
          className="press w-full py-4 rounded-xl text-base font-black flex items-center justify-center gap-2 border transition-all bg-green-500/15 border-green-500/30 text-green-300">
          <Play size={18} fill="currentColor" /> START TRACKING
        </button>
      )}

      {/* LAST RUN + share/post */}
      {last && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 mt-5">
          <div className="flex justify-between items-center text-sm font-black mb-3">
            <span className="flex items-center gap-2"><Flag size={15} className="text-green-400" /> Run Saved!</span>
            <span className="text-slate-500 text-xs">{fmtTime(last.sec)}</span>
          </div>
          <div className="flex gap-3 items-center mb-3">
            <RouteMap route={last.route} size={80} />
            <div className="flex-1 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-300">
              <span>⛰️ Elev: {last.elev} m</span>
              <span>⚡ Max: {last.maxSpeed} km/h</span>
              <span>👟 Steps: {last.steps}</span>
              <span>🔥 {last.cal} kcal</span>
            </div>
          </div>
          {last.coins > 0 ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center text-green-300 text-sm font-black mb-2 flex items-center justify-center gap-1.5">
              <Coins size={15} /> COMPLETED {last.label} → +{last.coins} coins
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center text-slate-400 text-sm font-bold mb-2">Run ≥1 km to earn coins (0 coins)</div>
          )}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button onClick={shareRun} className="press py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-black text-slate-200 flex items-center justify-center gap-1.5">
              <Share2 size={14} /> Share
            </button>
            <button onClick={postRun} disabled={posted} className="press py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-xs font-black text-green-300 flex items-center justify-center gap-1.5 disabled:opacity-50">
              <Send size={14} /> {posted ? "Posted ✓" : "Post to Feed"}
            </button>
          </div>
          {coachTip && <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 text-xs text-violet-200 whitespace-pre-wrap font-semibold">{coachTip}</div>}
        </div>
      )}

      {/* HISTORY */}
      {history.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5">
          <p className="text-xs font-black text-slate-400 mb-3 flex items-center gap-2"><TrendingUp size={14} className="text-blue-400" /> YOUR RECENT ACTIVITIES</p>
          <div className="grid gap-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-2.5">
                <RouteMap route={h.route} size={52} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-white truncate">{h.workout_type}</p>
                  <p className="text-[10px] text-slate-500">{h.session_date} · {h.duration_minutes} min · {h.calories} kcal</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-black text-green-400">{(h.distance_km || 0).toFixed(2)} km</p>
                  <p className="text-[9px] text-slate-500">{h.avg_speed ? `${h.avg_speed} km/h` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMMUNITY RUN FEED */}
      {feed.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5">
          <p className="text-xs font-black text-slate-400 mb-3 flex items-center gap-2"><Flag size={14} className="text-green-400" /> COMMUNITY RUN FEED</p>
          <div className="grid gap-2">
            {feed.map((f) => (
              <div key={f.id} className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-2.5">
                <RouteMap route={f.route} size={48} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-white truncate">{f.display_name} · {f.mode}</p>
                  <p className="text-[10px] text-slate-500">{f.distance_km} km · {fmtTime(f.duration_sec || 0)} · {f.calories} kcal</p>
                </div>
                <span className="text-[10px] font-black text-amber-300 shrink-0">+{f.coins} 🪙</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WEEKLY CHART */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mt-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center"><TrendingUp size={14} strokeWidth={2.2} /></span>
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