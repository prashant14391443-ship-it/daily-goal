"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, MapPin, Flag } from "lucide-react";

type RoutePt = { lat: number; lon: number; alt: number | null };
function routePoints(route: RoutePt[] | null): string {
  if (!route || route.length < 2) return "";
  const la = route.map((p) => p.lat), lo = route.map((p) => p.lon);
  const minLa = Math.min(...la), maxLa = Math.max(...la), minLo = Math.min(...lo), maxLo = Math.max(...lo);
  const dLa = maxLa - minLa || 1e-6, dLo = maxLo - minLo || 1e-6;
  return route.map((p) => `${((p.lon - minLo) / dLo) * 100},${100 - ((p.lat - minLa) / dLa) * 100}`).join(" ");
}
function RouteMap({ route, size = 48 }: { route: RoutePt[] | null; size?: number }) {
  const pts = routePoints(route);
  if (!pts) return <div style={{ width: size, height: size }} className="rounded-xl bg-slate-800/60 flex items-center justify-center"><MapPin size={14} className="text-slate-600" /></div>;
  return <svg width={size} height={size} viewBox="0 0 100 100" className="rounded-xl bg-slate-800/60 shrink-0"><polyline points={pts} fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function fmtTime(s: number) { const m = Math.floor(s / 60); const ss = Math.floor(s % 60); return `${m}m ${ss.toString().padStart(2, "0")}s`; }

export default function PublicProfile() {
  const params = useParams();
  const id = params.id as string;
  const [info, setInfo] = useState<{ name: string; avatar: string }>({ name: "Athlete", avatar: "" });
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: pr } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      let name = pr?.display_name || pr?.username || "";
      let avatar = pr?.avatar_url || "";
      const { data: posts } = await supabase.from("move_posts").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(50);
      const list = posts || [];
      if (!name && list.length) name = list[0].display_name;
      if (!avatar && list.length) avatar = list[0].avatar_url;
      if (!name) name = "Athlete";
      setInfo({ name, avatar });
      setRuns(list);
    };
    if (id) load();
  }, [id]);

  const totalKm = Math.round(runs.reduce((s, r) => s + (r.distance_km || 0), 0) * 100) / 100;

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/run-feed" className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center"><ArrowLeft size={16} /></Link>
        <h1 className="text-lg font-black truncate">{info.name}&apos;s Profile</h1>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 flex items-center gap-4">
        {info.avatar ? (
          <img src={info.avatar} alt={info.name} className="w-16 h-16 rounded-full object-cover border-2 border-violet-500" />
        ) : (
          <span className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl font-black">{info.name.charAt(0).toUpperCase()}</span>
        )}
        <div className="flex-1 grid grid-cols-2 gap-2 text-center">
          <div className="bg-slate-800/60 rounded-xl p-2"><p className="text-lg font-black text-green-400">{runs.length}</p><p className="text-[9px] font-black text-slate-500">RUNS</p></div>
          <div className="bg-slate-800/60 rounded-xl p-2"><p className="text-lg font-black text-blue-400">{totalKm}</p><p className="text-[9px] font-black text-slate-500">TOTAL KM</p></div>
        </div>
      </div>

      <p className="text-xs font-black text-slate-400 mb-2 flex items-center gap-2"><Flag size={14} className="text-green-400" /> THEIR RUNS</p>
      {runs.length === 0 ? (
        <div className="text-center py-12"><p className="text-3xl mb-2">🏃</p><p className="text-[11px] text-slate-500">No runs posted yet.</p></div>
      ) : (
        <div className="grid gap-2">
          {runs.map((f) => (
            <div key={f.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center gap-3">
              <RouteMap route={f.route} size={48} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-white truncate">{f.mode}</p>
                <p className="text-[10px] text-slate-500">{f.distance_km} km · {fmtTime(f.duration_sec || 0)} · {f.calories} kcal</p>
              </div>
              <span className="text-[10px] font-black text-amber-300 shrink-0">+{f.coins} 🪙</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}