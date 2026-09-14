"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { Activity, PersonStanding, Bike, Mountain, Trophy, Ruler, Rocket, TrendingUp, Flag, Footprints, Timer, Radio, Pause, Square, Play, Coins, Share2, Send, MapPin, Download, Users } from "lucide-react";

const MODES = [
  { id: "walk", icon: PersonStanding, label: "Walk", met: 3.5 },
  { id: "run", icon: Activity, label: "Run", met: 9.8 },
  { id: "ride", icon: Bike, label: "Ride", met: 7.5 },
  { id: "hike", icon: Mountain, label: "Hike", met: 6.0 },
];

const MIN_ACCURACY = 65;
const MAX_JUMP = 150;
const MIN_COMMIT = 5;
const MIN_SPEED = 0.8;
const STEP_MAG = 12;
const STEP_GAP = 300;
const MOVE_GATE = 0.3;
const ROUTE_MIN_SPACING = 6;
const ROUTE_MAX_POINTS = 250;
const ROUTE_KEEP_RECENT = 15;
const GEO_OPTS: PositionOptions = { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 };

function hav(a1: number, o1: number, a2: number, o2: number) {
  const R = 6371000; const dLa = ((a2 - a1) * Math.PI) / 180; const dLo = ((o2 - o1) * Math.PI) / 180;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos((a1 * Math.PI) / 180) * Math.cos((a2 * Math.PI) / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function fmtTime(s: number) { const m = Math.floor(s / 60); const ss = Math.floor(s % 60); return `${m}m ${ss.toString().padStart(2, "0")}s`; }
function fmtPace(s: number) { const m = Math.floor(s / 60); const ss = Math.round(s % 60); return `${m}:${String(ss).padStart(2, "0")}`; }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function isoDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
type WeekBar = { label: string; speed: number };
type RoutePt = { lat: number; lon: number; alt: number | null };

function routePoints(route: RoutePt[] | null): string {
  if (!route || route.length < 2) return "";
  const la = route.map((p) => p.lat), lo = route.map((p) => p.lon);
  const minLa = Math.min(...la), maxLa = Math.max(...la), minLo = Math.min(...lo), maxLo = Math.max(...lo);
  const dLa = maxLa - minLa || 1e-6, dLo = maxLo - minLo || 1e-6;
  return route.map((p) => `${((p.lon - minLo) / dLo) * 100},${100 - ((p.lat - minLa) / dLa) * 100}`).join(" ");
}
function RouteMap({ route, size = 90 }: { route: RoutePt[] | null; size?: number }) {
  const pts = routePoints(route);
  if (!pts) return <div style={{ width: size, height: size }} className="rounded-xl bg-slate-800/60 flex items-center justify-center"><MapPin size={16} className="text-slate-600" /></div>;
  return <svg width={size} height={size} viewBox="0 0 100 100" className="rounded-xl bg-slate-800/60 shrink-0"><polyline points={pts} fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

async function makeShareCard(o: { label: string; km: number; sec: number; pace: string; cal: number; coins: number; route: RoutePt[]; name: string }): Promise<Blob | null> {
  const W = 1080, H = 1080; const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d"); if (!ctx) return null;
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#052e16"); g.addColorStop(0.5, "#0f172a"); g.addColorStop(1, "#020617");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#22c55e"; ctx.font = "900 44px system-ui, sans-serif"; ctx.fillText("DAILYGOAL", 60, 100);
  ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "700 30px system-ui, sans-serif";
  ctx.fillText(`${o.label.toUpperCase()} · ${new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`, 60, 150);
  const bx = 60, by = 200, bw = W - 120, bh = 520;
  ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 2; ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
  if (o.route && o.route.length > 1) {
    const la = o.route.map((p) => p.lat), lo = o.route.map((p) => p.lon);
    const minLa = Math.min(...la), maxLa = Math.max(...la), minLo = Math.min(...lo), maxLo = Math.max(...lo);
    const dLa = maxLa - minLa || 1e-6, dLo = maxLo - minLo || 1e-6, pad = 50;
    const xs = o.route.map((p) => bx + pad + ((p.lon - minLo) / dLo) * (bw - pad * 2));
    const ys = o.route.map((p) => by + bh - pad - ((p.lat - minLa) / dLa) * (bh - pad * 2));
    ctx.strokeStyle = "#fb923c"; ctx.lineWidth = 10; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath(); xs.forEach((x, i) => (i === 0 ? ctx.moveTo(x, ys[i]) : ctx.lineTo(x, ys[i]))); ctx.stroke();
    ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(xs[0], ys[0], 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(xs[xs.length - 1], ys[ys.length - 1], 14, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.font = "700 34px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText("No GPS route captured", W / 2, by + bh / 2); ctx.textAlign = "left";
  }
  ctx.fillStyle = "#ffffff"; ctx.font = "900 120px system-ui, sans-serif"; ctx.fillText(`${o.km.toFixed(2)} km`, 60, 860);
  const t = Math.floor(o.sec / 60), s2 = o.sec % 60;
  const cols = [{ v: `${t}m ${String(s2).padStart(2, "0")}s`, l: "TIME" }, { v: `${o.pace}/km`, l: "PACE" }, { v: `${o.cal}`, l: "KCAL" }];
  let x = 60;
  cols.forEach((col) => { ctx.fillStyle = "#ffffff"; ctx.font = "900 46px system-ui, sans-serif"; ctx.fillText(col.v, x, 950); ctx.fillStyle = "#64748b"; ctx.font = "800 26px system-ui, sans-serif"; ctx.fillText(col.l, x, 990); x += 330; });
  ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "700 28px system-ui, sans-serif"; ctx.fillText(`${o.name} · +${o.coins} coins · DailyGoal`, 60, 1040);
  return await new Promise<Blob | null>((res) => c.toBlob(res, "image/png"));
}

export default function MoveTracker() {
  const router = useRouter();
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
  const [posted, setPosted] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [period, setPeriod] = useState<"week" | "month" | "year">("week");
  const [totals, setTotals] = useState({ km: 0, min: 0, n: 0, cal: 0 });
  const [uidReady, setUidReady] = useState(false);

  const uidRef = useRef("");
  const nameRef = useRef("Athlete");
  const avatarRef = useRef("");
  const lastStepRef = useRef(0);
  const lastMoveRef = useRef(0);
  const watchRef = useRef<number | null>(null);
  const prevRef = useRef<{ lat: number; lon: number } | null>(null);
  const pendingRef = useRef(0);
  const distRef = useRef(0);
  const secRef = useRef(0);
  const speedRef = useRef(0);
  const movingRef = useRef(false);
  const wakeRef = useRef<any>(null);
  const startTsRef = useRef(0);
  const pausedMsRef = useRef(0);
  const pauseStartRef = useRef(0);
  const routeRef = useRef<RoutePt[]>([]);
  const elevRef = useRef(0);
  const maxSpeedRef = useRef(0);
  const shareBlobRef = useRef<Blob | null>(null);

  const requestWake = async () => {
    try { if (typeof navigator !== "undefined" && "wakeLock" in navigator) { wakeRef.current = await (navigator as any).wakeLock.request("screen"); wakeRef.current?.addEventListener?.("release", () => { wakeRef.current = null; }); } } catch {}
  };
  const releaseWake = () => { try { wakeRef.current?.release(); } catch {} wakeRef.current = null; };

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible" && tracking && !paused) requestWake(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [tracking, paused]);

  useEffect(() => { try { (navigator as any).storage?.persist?.(); } catch {} }, []);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) return;
      uidRef.current = uid; setUidReady(true);
      const meta = (data.session?.user.user_metadata as any) || {};
      if (meta.display_name) nameRef.current = meta.display_name;
      avatarRef.current = meta.avatar_url || "";
      if (!avatarRef.current) {
        const { data: pr } = await supabase.from("profiles").select("avatar_url").eq("id", uid).maybeSingle();
        avatarRef.current = pr?.avatar_url || "";
      }
      const { data: pb } = await supabase.from("personal_bests").select("*").eq("user_id", uid).maybeSingle();
      setPbs({ pace: pb?.best_pace_sec || null, dist: pb?.best_distance_km || null });
      const from = new Date(Date.now() - 42 * 86400000).toISOString().slice(0, 10);
      const { data: runs } = await supabase.from("gym_logs").select("session_date, duration_minutes, distance_km").eq("user_id", uid).not("activity_type", "is", null).eq("completed", true).gte("session_date", from);
      const buckets = Array.from({ length: 6 }, () => ({ t: 0, d: 0 }));
      (runs || []).forEach((r) => { const age = Math.floor((Date.now() - new Date(r.session_date + "T00:00:00").getTime()) / (7 * 86400000)); if (age >= 0 && age < 6) { buckets[5 - age].t += r.duration_minutes || 0; buckets[5 - age].d += r.distance_km || 0; } });
      setWeekChart(buckets.map((b, i) => ({ label: ["5w", "4w", "3w", "2w", "Last", "Now"][i], speed: b.d > 0.05 ? Math.round((b.d / (b.t / 60)) * 10) / 10 : 0 })));
      const { data: hist } = await supabase.from("gym_logs").select("id, session_date, workout_type, duration_minutes, distance_km, calories, avg_speed, activity_type, route, elevation_gain_m, max_speed, steps_count").eq("user_id", uid).not("activity_type", "is", null).eq("completed", true).order("session_date", { ascending: false }).limit(8);
      setHistory(hist || []);
    };
    load();
  }, []);

  useEffect(() => {
    const loadTotals = async () => {
      const uid = uidRef.current; if (!uid) return;
      const now = new Date(); let from: string;
      if (period === "week") { const d = new Date(now); d.setDate(d.getDate() - 6); from = isoDate(d); }
      else if (period === "month") from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      else from = `${now.getFullYear()}-01-01`;
      const { data } = await supabase.from("gym_logs").select("distance_km, duration_minutes, calories").eq("user_id", uid).not("activity_type", "is", null).eq("completed", true).gte("session_date", from);
      const rows = data || [];
      setTotals({ km: Math.round(rows.reduce((s, r) => s + (r.distance_km || 0), 0) * 100) / 100, min: rows.reduce((s, r) => s + (r.duration_minutes || 0), 0), n: rows.length, cal: rows.reduce((s, r) => s + (r.calories || 0), 0) });
    };
    if (uidReady) loadTotals();
  }, [period, uidReady]);

  useEffect(() => {
    if (!tracking || paused) return;
    const id = setInterval(() => { const el = Math.max(0, Math.floor((Date.now() - startTsRef.current - pausedMsRef.current) / 1000)); setSec(el); secRef.current = el; }, 1000);
    return () => clearInterval(id);
  }, [tracking, paused]);

  useEffect(() => {
    if (!tracking || paused) return;
    const handler = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity; if (!a || a.x == null || a.y == null || a.z == null) return;
      const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z); const now = Date.now();
      if (mag > STEP_MAG && movingRef.current && now - lastStepRef.current > STEP_GAP) { lastStepRef.current = now; setSteps((s) => s + 1); }
    };
    window.addEventListener("devicemotion", handler);
    return () => window.removeEventListener("devicemotion", handler);
  }, [tracking, paused]);

  const setMoving = (v: boolean) => { movingRef.current = v; setGpsMoving(v); };

  const onPos = (pos: GeolocationPosition) => {
    const { latitude, longitude, accuracy, speed: gpsSpeed, altitude } = pos.coords;
    if (accuracy == null || accuracy > MIN_ACCURACY) return;
    const now = Date.now(); setWarming(false);
    if (prevRef.current) {
      const d = hav(prevRef.current.lat, prevRef.current.lon, latitude, longitude);
      if (d > 1.0 && d <= MAX_JUMP) {
        const coherent = gpsSpeed != null ? gpsSpeed >= MOVE_GATE : d > 3;
        if (coherent) {
          pendingRef.current += d;
          const commit = mode.id === "walk" ? 6 : MIN_COMMIT;
          if (pendingRef.current >= commit) { distRef.current += pendingRef.current; pendingRef.current = 0; }
        }
      }
    }
    prevRef.current = { lat: latitude, lon: longitude };
    const lp = routeRef.current[routeRef.current.length - 1];
    if (routeRef.current.length < ROUTE_MAX_POINTS) {
      if (!lp || hav(lp.lat, lp.lon, latitude, longitude) > ROUTE_MIN_SPACING) routeRef.current.push({ lat: +latitude.toFixed(5), lon: +longitude.toFixed(5), alt: altitude != null ? +altitude.toFixed(1) : null });
    }
    if (lp && altitude != null && lp.alt != null) { const dAlt = altitude - lp.alt; if (dAlt > 1) elevRef.current += dAlt; }
    setDist(distRef.current + pendingRef.current);
    const movingNow = gpsSpeed != null ? gpsSpeed >= MOVE_GATE : pendingRef.current > 3;
    if (movingNow) { setMoving(true); lastMoveRef.current = now; }
    if (now - lastMoveRef.current > 6000) setMoving(false);
    if (gpsSpeed != null && gpsSpeed >= 0) {
      const kmh = gpsSpeed * 3.6;
      if (kmh < 1.0) speedRef.current = speedRef.current * 0.5;
      else speedRef.current = speedRef.current === 0 ? kmh : speedRef.current * 0.6 + kmh * 0.4;
      setSpeed(Math.round(speedRef.current * 10) / 10);
      if (speedRef.current > maxSpeedRef.current) maxSpeedRef.current = speedRef.current;
    }
    const kmhNow = speedRef.current;
    if (warming) setHint("🛰️ GPS locking on — keep moving, accuracy improves...");
    else if (kmhNow >= MIN_SPEED) {
      if (mode.id === "walk" && kmhNow > 14) setHint("🚴 Looks like RIDING — switch mode?");
      else if (mode.id === "run" && kmhNow < 6) setHint("🚶 Easy pace — WALK mode fits better?");
      else setHint("");
    } else setHint("");
  };

  const onErr = () => setHint("📡 GPS weak — move near a window or outside!");
  const startWatch = () => { watchRef.current = navigator.geolocation.watchPosition(onPos, onErr, GEO_OPTS); };

  const pruneOldRoutes = async (uid: string) => {
    const { data: rows } = await supabase.from("gym_logs").select("id").eq("user_id", uid).not("activity_type", "is", null).eq("completed", true).not("route", "is", null).order("session_date", { ascending: false }).limit(60);
    const keep = new Set((rows || []).slice(0, ROUTE_KEEP_RECENT).map((r) => r.id));
    const toNull = (rows || []).filter((r) => !keep.has(r.id)).map((r) => r.id);
    if (toNull.length) await supabase.from("gym_logs").update({ route: null }).in("id", toNull);
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
    if (!navigator.geolocation) { alert("GPS not supported!"); return; }
    const DME = DeviceMotionEvent as any;
    if (typeof DME !== "undefined" && typeof DME.requestPermission === "function") DME.requestPermission().catch(() => {});
    try { navigator.geolocation.getCurrentPosition(() => {}, () => {}, GEO_OPTS); } catch {}
    distRef.current = 0; secRef.current = 0; pendingRef.current = 0; speedRef.current = 0;
    routeRef.current = []; elevRef.current = 0; maxSpeedRef.current = 0;
    startTsRef.current = Date.now(); pausedMsRef.current = 0;
    setDist(0); setSec(0); setSteps(0); setSpeed(0); setMoving(false); setHint(""); setLast(null); setCoachTip(""); setPosted(false);
    setShareUrl((old) => { if (old) URL.revokeObjectURL(old); return null; });
    shareBlobRef.current = null;
    setWarming(true); prevRef.current = null; lastMoveRef.current = Date.now();
    setTracking(true); setPaused(false);
    requestWake(); startWatch();
  };

  const pause = () => {
    if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    pauseStartRef.current = Date.now(); releaseWake();
    setPaused(true); setMoving(false); setSpeed(0); speedRef.current = 0;
    setHint("⏸️ Paused — timer & GPS stopped.");
  };

  const resume = () => {
    pausedMsRef.current += Date.now() - pauseStartRef.current;
    setPaused(false); prevRef.current = null; pendingRef.current = 0; lastMoveRef.current = Date.now(); setHint("");
    requestWake(); startWatch();
  };

  const stop = async () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null; releaseWake();
    setTracking(false); setPaused(false); setMoving(false);
    const now = Date.now();
    const elapsedMs = (paused ? pauseStartRef.current : now) - startTsRef.current - pausedMsRef.current;
    const secs = Math.max(0, Math.floor(elapsedMs / 1000));
    const km = distRef.current / 1000;
    const mins = Math.max(1, Math.round(secs / 60));
    const userWeight = Number(weight) || 65;
    const cal = km > 0.01 ? Math.round(((mode.met * 3.5 * userWeight) / 200) * mins) : 0;
    const earnedCoins = Math.floor(km) * 15;
    const uid = uidRef.current;
    const route = routeRef.current; const elev = Math.round(elevRef.current); const maxSp = Math.round(maxSpeedRef.current * 10) / 10;
    if (uid && secs >= 10) {
      await supabase.from("gym_logs").insert({ user_id: uid, workout_type: `${mode.label} ${km.toFixed(2)} km`, duration_minutes: mins, session_date: todayStr(), completed: true, activity_type: mode.id, distance_km: Math.round(km * 100) / 100, calories: cal, avg_speed: secs > 0 ? Math.round((km / (secs / 3600)) * 10) / 10 : 0, route, elevation_gain_m: elev, max_speed: maxSp, steps_count: steps });
      pruneOldRoutes(uid);
      setLast({ dist: km, sec: secs, cal, label: mode.label, coins: earnedCoins, route, elev, maxSpeed: maxSp, steps });
      const cardBlob = await makeShareCard({ label: mode.label, km, sec: secs, pace: km > 0 ? fmtPace(Math.round(secs / km)) : "—", cal, coins: earnedCoins, route, name: nameRef.current });
      if (cardBlob) { shareBlobRef.current = cardBlob; setShareUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(cardBlob); }); }
      if (km >= 0.5) {
        const paceSec = Math.round(secs / km);
        const { data: pb } = await supabase.from("personal_bests").select("*").eq("user_id", uid).maybeSingle();
        let flash = "";
        if (!pb) { await supabase.from("personal_bests").insert({ user_id: uid, best_pace_sec: km >= 1 ? paceSec : null, best_distance_km: Math.round(km * 100) / 100 }); setPbs({ pace: km >= 1 ? paceSec : null, dist: km }); flash = "🚀 First records saved!"; await awardPB(uid, `pb-first-${uid}`, "First running record set"); }
        else {
          const up: { best_pace_sec?: number; best_distance_km?: number } = {};
          if (km >= 1 && paceSec < (pb.best_pace_sec || 999999)) { up.best_pace_sec = paceSec; flash += `🚀 NEW FASTEST PACE ${fmtPace(paceSec)}/km! `; await awardPB(uid, `pb-pace-${uid}-${paceSec}`, `New fastest pace`); }
          if (km > (pb.best_distance_km || 0)) { up.best_distance_km = Math.round(km * 100) / 100; flash += `📏 NEW LONGEST ${km.toFixed(2)} km!`; await awardPB(uid, `pb-dist-${uid}-${Math.round(km * 100)}`, `New longest run`); }
          if (Object.keys(up).length) { await supabase.from("personal_bests").update(up).eq("user_id", uid); setPbs({ pace: up.best_pace_sec ?? pb.best_pace_sec, dist: up.best_distance_km ?? pb.best_distance_km }); }
        }
        if (flash) setPbFlash(flash + " (+50 🪙)");
      }
      if (km >= 0.3) {
        setCoachTip("🤖 Coach analyzing...");
        try {
          const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "coach", message: `I just ${mode.label.toLowerCase()}ed ${km.toFixed(2)} km in ${fmtTime(secs)} (pace ${fmtPace(Math.round(secs / km))}/km, ${earnedCoins} coins). 2 short tips to get faster. Emojis, <80 words.`, context: `Activity: ${mode.label}. Weight: ${userWeight} kg.` }) });
          const d = await res.json(); setCoachTip(d.reply || "Keep going — consistency beats speed! 🏃");
        } catch { setCoachTip(""); }
      }
      const { data: hist } = await supabase.from("gym_logs").select("id, session_date, workout_type, duration_minutes, distance_km, calories, avg_speed, activity_type, route, elevation_gain_m, max_speed, steps_count").eq("user_id", uid).not("activity_type", "is", null).eq("completed", true).order("session_date", { ascending: false }).limit(8);
      setHistory(hist || []);
    } else if (secs < 10) setHint("⏱️ Too short — track at least 10 seconds!");
  };

  const runText = (l: NonNullable<typeof last>) => {
    const pace = l.dist > 0 ? fmtPace(Math.round(l.sec / l.dist)) : "—";
    return `🏃 I just ${l.label}ed ${l.dist.toFixed(2)} km in ${fmtTime(l.sec)} (pace ${pace}/km) · ${l.cal} kcal · +${l.coins} 🪙 on DailyGoal!`;
  };
  const downloadImage = () => { if (!shareUrl) return; const a = document.createElement("a"); a.href = shareUrl; a.download = "dailygoal-run.png"; a.click(); };
  const shareImage = async () => {
    if (!last) return;
    const blob = shareBlobRef.current; const text = runText(last); const nav: any = navigator;
    if (blob) {
      const file = new File([blob], "dailygoal-run.png", { type: "image/png" });
      if (nav.canShare && nav.canShare({ files: [file] })) { try { await nav.share({ files: [file], title: "My Run", text }); return; } catch { return; } }
      downloadImage(); try { await navigator.clipboard.writeText(text); } catch {}
      alert("🖼️ Image saved + text copied!"); return;
    }
    if (nav.share) { try { await nav.share({ title: "My Run", text }); return; } catch {} }
    try { await navigator.clipboard.writeText(text); } catch {}
  };
  const postRun = async () => {
    const uid = uidRef.current; if (!uid || !last) return;
    await supabase.from("move_posts").insert({ user_id: uid, display_name: nameRef.current, avatar_url: avatarRef.current, mode: last.label, distance_km: Math.round(last.dist * 100) / 100, duration_sec: last.sec, pace_sec: last.dist > 0 ? Math.round(last.sec / last.dist) : null, calories: last.cal, coins: last.coins, route: last.route });
    setPosted(true);
  };

  const km = dist / 1000;
  const userWeight = Number(weight) || 65;
  let paceStr = "—";
  if (km >= 0.05 && sec > 0) { const cp = sec / 60 / km; paceStr = cp > 99 ? "99:59+" : `${Math.floor(cp)}:${String(Math.floor((cp % 1) * 60)).padStart(2, "0")}`; }
  const cal = km > 0.01 ? Math.round(((mode.met * 3.5 * userWeight) / 200) * (sec / 60)) : 0;
  const maxSpeed = Math.max(...weekChart.map((w) => w.speed), 1);
  const ModeIcon = mode.icon;

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 pt-4 pb-44 max-w-4xl mx-auto">
      {/* compact hero with see-others inside */}
      <div className="relative mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 p-4 shadow-lg shadow-emerald-900/20">
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
        <div className="relative flex items-center justify-between mb-2">
          <span className="w-9 h-9 shrink-0 rounded-xl bg-white/15 flex items-center justify-center"><ModeIcon size={18} strokeWidth={2.2} className="text-white" /></span>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/run-feed")} className="flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-full px-3 py-1.5 text-[11px] font-black text-white"><Users size={14} /> Feed</button>
            <span className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-[11px] font-black border border-white/20 flex items-center gap-1.5"><Timer size={11} /> {fmtTime(sec)}</span>
          </div>
        </div>
        <h1 className="text-base font-black text-white leading-tight">Auto Tracker</h1>
        <p className="text-[10px] text-white/75 font-semibold">GPS + steps + calories · screen stays on</p>
      </div>

      <div className="flex justify-center gap-4 mb-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-2.5 text-[11px] font-black">
        <span className="text-amber-300 flex items-center gap-1"><Rocket size={11} /> Best pace: {pbs.pace ? `${fmtPace(pbs.pace)}/km` : "—"}</span>
        <span className="text-orange-300 flex items-center gap-1"><Ruler size={11} /> Longest: {pbs.dist ? `${pbs.dist.toFixed(2)} km` : "—"}</span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        {MODES.map((m) => { const Icon = m.icon; return (
          <button key={m.id} onClick={() => !tracking && setMode(m)} className={`press py-2.5 rounded-xl text-[10px] font-black border transition-all flex flex-col items-center gap-1 ${mode.id === m.id ? "bg-green-500/15 border-green-500/30 text-green-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
            <Icon size={15} strokeWidth={2.2} /> {m.label}
          </button> ); })}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-400">Body Weight (kg)</span>
        <input type="number" min="20" max="300" value={weight} onChange={(e) => setWeight(e.target.value)} disabled={tracking} placeholder="kg" className="bg-slate-800 border border-slate-700 rounded-xl w-20 text-center text-white py-1.5 text-sm outline-none focus:border-green-500 disabled:opacity-50" />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 grid gap-2 mb-3">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[9px] font-black text-slate-500">STEPS</p><p className="text-xl font-black text-white mt-0.5">{steps}</p></div>
          <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[9px] font-black text-slate-500">DISTANCE</p><p className="text-xl font-black text-white mt-0.5">{km.toFixed(2)} <span className="text-xs text-slate-500">km</span></p></div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-800/60 rounded-xl p-2"><p className="text-[9px] font-black text-slate-500">SPEED</p><p className="text-lg font-black text-orange-400">{speed || "0.0"}</p><p className="text-[9px] text-slate-500">km/h</p></div>
          <div className="bg-slate-800/60 rounded-xl p-2"><p className="text-[9px] font-black text-slate-500">PACE</p><p className="text-lg font-black text-green-400">{paceStr}</p><p className="text-[9px] text-slate-500">min/km</p></div>
          <div className="bg-slate-800/60 rounded-xl p-2"><p className="text-[9px] font-black text-slate-500">BURNED</p><p className="text-lg font-black text-red-400">{cal}</p><p className="text-[9px] text-slate-500">kcal</p></div>
        </div>
        {tracking && (paused ? (
          <div className="text-center text-[10px] font-black py-1.5 rounded-lg bg-amber-500/15 text-amber-300">⏸ PAUSED</div>
        ) : gpsMoving ? (
          <div className="text-center text-[10px] font-black py-1.5 rounded-lg bg-green-500/15 text-green-400 flex items-center justify-center gap-1.5"><Radio size={11} /> GPS tracking movement</div>
        ) : (
          <div className="text-center text-[10px] font-black py-1.5 rounded-lg bg-slate-800/50 text-slate-500">Waiting for real movement...</div>
        ))}
      </div>

      {hint && <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2 mb-3 text-center"><p className="text-[11px] text-amber-300 font-bold">{hint}</p></div>}

      {last && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 mb-4">
          <div className="flex justify-between items-center text-sm font-black mb-2"><span className="flex items-center gap-2"><Flag size={15} className="text-green-400" /> Run Saved!</span><span className="text-slate-500 text-xs">{fmtTime(last.sec)}</span></div>
          {shareUrl && <img src={shareUrl} alt="run card" className="w-full rounded-xl border border-slate-700 mb-2" />}
          <div className="flex gap-2 items-center mb-2">
            <RouteMap route={last.route} size={64} />
            <div className="flex-1 grid grid-cols-2 gap-1 text-[10px] font-bold text-slate-300">
              <span>⛰️ {last.elev} m</span><span>⚡ {last.maxSpeed} km/h</span><span>👟 {last.steps}</span><span>🔥 {last.cal} kcal</span>
            </div>
          </div>
          {last.coins > 0 ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-2 text-center text-green-300 text-xs font-black mb-2 flex items-center justify-center gap-1.5"><Coins size={13} /> +{last.coins} coins</div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-2 text-center text-slate-400 text-xs font-bold mb-2">Run ≥1 km to earn coins</div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={shareImage} className="press py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-xs font-black text-green-300 flex items-center justify-center gap-1.5"><Share2 size={13} /> Share</button>
            <button onClick={downloadImage} className="press py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-black text-slate-200 flex items-center justify-center gap-1.5"><Download size={13} /> Save</button>
            <button onClick={postRun} disabled={posted} className="press py-2.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-xs font-black text-violet-300 flex items-center justify-center gap-1.5 disabled:opacity-40"><Send size={13} /> {posted ? "Posted ✓" : "Post"}</button>
          </div>
          {coachTip && <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-2 text-xs text-violet-200 whitespace-pre-wrap font-semibold mt-2">{coachTip}</div>}
        </div>
      )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-black text-slate-400 flex items-center gap-2"><TrendingUp size={14} className="text-green-400" /> TOTALS</p>
          <div className="flex gap-1">
            {(["week", "month", "year"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-[11px] font-black border ${period === p ? "bg-green-500/15 border-green-500/30 text-green-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
                {p === "week" ? "Week" : p === "month" ? "Month" : "Year"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-slate-800/60 rounded-xl p-2"><p className="text-base font-black text-green-400">{totals.km}</p><p className="text-[8px] font-black text-slate-500">KM</p></div>
          <div className="bg-slate-800/60 rounded-xl p-2"><p className="text-base font-black text-blue-400">{Math.floor(totals.min / 60)}h{totals.min % 60}m</p><p className="text-[8px] font-black text-slate-500">TIME</p></div>
          <div className="bg-slate-800/60 rounded-xl p-2"><p className="text-base font-black text-amber-400">{totals.n}</p><p className="text-[8px] font-black text-slate-500">RUNS</p></div>
          <div className="bg-slate-800/60 rounded-xl p-2"><p className="text-base font-black text-red-400">{totals.cal}</p><p className="text-[8px] font-black text-slate-500">KCAL</p></div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 mb-4">
          <p className="text-xs font-black text-slate-400 mb-2 flex items-center gap-2"><TrendingUp size={14} className="text-blue-400" /> RECENT ACTIVITIES</p>
          <div className="grid gap-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-2 bg-slate-800/50 rounded-xl p-2">
                <RouteMap route={h.route} size={44} />
                <div className="flex-1 min-w-0"><p className="text-[11px] font-bold text-white truncate">{h.workout_type}</p><p className="text-[9px] text-slate-500">{h.session_date} · {h.duration_minutes} min</p></div>
                <p className="text-[12px] font-black text-green-400 shrink-0">{(h.distance_km || 0).toFixed(2)} km</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 📌 STICKY CONTROLS — always visible, no scrolling */}
      <div className="fixed bottom-20 left-0 right-0 z-40 px-4">
        <div className="max-w-4xl mx-auto">
          {tracking ? (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={paused ? resume : pause} className={`press w-full py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2 border shadow-lg ${paused ? "bg-green-600 border-green-500 text-white" : "bg-amber-600 border-amber-500 text-white"}`}>
                {paused ? <><Play size={18} fill="currentColor" /> RESUME</> : <><Pause size={18} /> PAUSE</>}
              </button>
              <button onClick={stop} className="press w-full py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2 border shadow-lg bg-red-600 border-red-500 text-white">
                <Square size={18} /> STOP & SAVE
              </button>
            </div>
          ) : (
            <button onClick={start} className="press w-full py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2 border shadow-lg bg-green-600 border-green-500 text-white">
              <Play size={18} fill="currentColor" /> START TRACKING
            </button>
          )}
        </div>
      </div>

      {pbFlash && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-8 text-center max-w-sm w-full">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center"><Trophy size={40} className="text-amber-400 animate-bounce" /></div>
            <p className="text-2xl font-black text-amber-400 mb-2">PERSONAL BEST!</p>
            <p className="text-white font-bold mb-6 text-sm">{pbFlash}</p>
            <button onClick={() => setPbFlash("")} className="press w-full py-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-sm font-black text-amber-300">🚀 LET&apos;S GO!</button>
          </div>
        </div>
      )}
    </div>
  );
}