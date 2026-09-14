"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Trash2, Flag, MapPin } from "lucide-react";

// 👉 change this if your public profile route is different (e.g. /friend?id= or /u/[id])
const profileHref = (id: string) => `/profile?id=${id}`;

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

export default function RunFeedPage() {
  const router = useRouter();
  const [uid, setUid] = useState("");
  const [posts, setPosts] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id || "";
    setUid(id);
    const { data: rows } = await supabase.from("move_posts").select("*").order("created_at", { ascending: false }).limit(50);
    setPosts(rows || []);
  };
  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    await supabase.from("move_posts").delete().eq("id", id).eq("user_id", uid);
    setPosts((p) => p.filter((x) => x.id !== id));
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/workout" className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center"><ArrowLeft size={16} /></Link>
        <h1 className="text-lg font-black flex items-center gap-2"><Flag size={18} className="text-green-400" /> Community Runs</h1>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏃</p>
          <p className="text-sm font-bold text-slate-300">No runs posted yet</p>
          <p className="text-[11px] text-slate-500 mt-1">Finish a track & tap "Post" to appear here.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {posts.map((f) => (
            <div key={f.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center gap-3">
              {/* clickable profile (photo + name + data) */}
              <button onClick={() => router.push(profileHref(f.user_id))} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                {f.avatar_url ? (
                  <img src={f.avatar_url} alt={f.display_name} className="w-11 h-11 rounded-full object-cover border-2 border-slate-700 shrink-0" />
                ) : (
                  <span className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-base font-black shrink-0">{(f.display_name || "?").charAt(0).toUpperCase()}</span>
                )}
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-bold text-white truncate">{f.display_name} · {f.mode}</span>
                  <span className="block text-[10px] text-slate-500">{f.distance_km} km · {fmtTime(f.duration_sec || 0)} · {f.calories} kcal</span>
                  <span className="block text-[9px] text-slate-600 mt-0.5">{new Date(f.created_at).toLocaleDateString()}</span>
                </span>
              </button>
              <RouteMap route={f.route} size={48} />
              <div className="shrink-0 text-right flex flex-col items-end gap-1">
                <span className="text-[11px] font-black text-amber-300">+{f.coins} 🪙</span>
                {f.user_id === uid && (
                  <button onClick={() => del(f.id)} className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-center"><Trash2 size={13} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}