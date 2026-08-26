"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { SEASON_LEVELS, LIFETIME_LEVELS, levelOf, seasonInfo } from "@/lib/seasons";

type Row = { user_id: string; season: number; life: number; name: string; avatar: string };

const lifeTitle = (life: number) => (life >= LIFETIME_LEVELS[0].need ? levelOf(LIFETIME_LEVELS, life).icon : "");

// 🛡️ avatar with broken-image fallback
function Avatar({ url, name, size = "w-10 h-10", ring = "" }: { url: string; name: string; size?: string; ring?: string }) {
  const [err, setErr] = useState(false);
  if (!url || err)
    return (
      <span className={`${size} ${ring} shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center font-black text-white shadow-lg`}>
        {(name || "?").charAt(0).toUpperCase()}
      </span>
    );
  return <img src={url} onError={() => setErr(true)} className={`${size} ${ring} shrink-0 rounded-full object-cover shadow-lg`} alt="" />;
}

const PLACE: Record<number, { medal: string; ring: string; bar: string; h: string; glow: string }> = {
  1: { medal: "👑", ring: "border-amber-400", bar: "from-amber-600 to-yellow-400", h: "h-28", glow: "shadow-amber-500/40" },
  2: { medal: "🥈", ring: "border-slate-300", bar: "from-slate-600 to-slate-400", h: "h-20", glow: "shadow-slate-400/30" },
  3: { medal: "🥉", ring: "border-orange-400", bar: "from-orange-700 to-amber-600", h: "h-16", glow: "shadow-orange-500/30" },
};

function Podium({ r, place }: { r: Row; place: number }) {
  const s = PLACE[place];
  return (
    <div className="flex flex-col items-center gap-1 w-24">
      <span className={`text-xl ${place === 1 ? "animate-bounce" : ""}`}>{s.medal}</span>
      <Avatar url={r.avatar} name={r.name} size="w-14 h-14" ring={`border-2 ${s.ring}`} />
      <p className="text-[10px] font-black text-white truncate w-full text-center">
        {levelOf(SEASON_LEVELS, r.season).icon} {lifeTitle(r.life)} {r.name}
      </p>
      <p className="text-[10px] text-amber-400 font-black">{r.season} 🪙</p>
      <div className={`w-full ${s.h} rounded-t-xl bg-gradient-to-t ${s.bar} shadow-lg ${s.glow} flex items-start justify-center pt-1.5 text-xs font-black text-white`}>
        #{place}
      </div>
    </div>
  );
}

function RowCard({ r, place, me }: { r: Row; place: number; me: string }) {
  const isMe = r.user_id === me;
  return (
    <div className={`press flex items-center gap-3 p-3 rounded-2xl border shadow-md ${isMe ? "bg-violet-600/15 border-2 border-violet-500/50" : "bg-slate-900 border-slate-800"}`}>
      <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-[10px] font-black ${place <= 10 ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-500"}`}>
        {place}
      </span>
      <Avatar url={r.avatar} name={r.name} />
      <span className="flex-1 min-w-0 font-bold text-sm truncate text-white">
        {levelOf(SEASON_LEVELS, r.season).icon} {lifeTitle(r.life)} {r.name}{" "}
        {isMe && <span className="text-violet-300">(YOU)</span>}
      </span>
      <span className="text-xs font-black text-amber-400 shrink-0">{r.season} 🪙</span>
    </div>
  );
}

const SCOPES = [
  { label: "🌍 Global", soon: false },
  { label: "🇮🇳 India", soon: true },
  { label: "🏙️ State", soon: true },
  { label: "🏘️ District", soon: true },
  { label: "🎓 College", soon: true },
];

export default function LeaderboardPage() {
  const [me, setMe] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonIdx, setSeasonIdx] = useState(1);
  const [daysLeft, setDaysLeft] = useState(0);

  const load = async () => {
    setLoading(true);
    const s = seasonInfo();
    setSeasonIdx(s.index);
    setDaysLeft(s.daysLeft);
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id || "";
    setMe(uid);
    const { data: logs } = await supabase.from("coin_log").select("user_id, coins, created_at");
    const season = new Map<string, number>();
    const life = new Map<string, number>();
    ((logs as any[]) || []).forEach((r) => {
      const c = Number(r.coins) || 0;
      life.set(r.user_id, (life.get(r.user_id) || 0) + c);
      if (r.created_at >= s.startISO) season.set(r.user_id, (season.get(r.user_id) || 0) + c);
    });
    if (uid && !season.has(uid)) season.set(uid, 0);
    const ids = Array.from(new Set([...season.keys(), ...life.keys()]));
    const { data: profs } = await supabase.from("profiles").select("*").in("user_id", ids);
    const pmap = new Map<string, any>(((profs as any[]) || []).map((x) => [x.user_id, x]));
    const list: Row[] = ids.map((id) => ({
      user_id: id, season: season.get(id) || 0, life: life.get(id) || 0,
      name: pmap.get(id)?.display_name || "friend", avatar: pmap.get(id)?.avatar_url || "",
    }));
    list.sort((a, b) => b.season - a.season);
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const myIndex = rows.findIndex((r) => r.user_id === me);
  const myRow = myIndex >= 0 ? rows[myIndex] : null;
  const top10 = rows.slice(0, 10);
  const above = myIndex > 0 ? rows[myIndex - 1] : null;
  const cutoff = rows[9];
  const gapToTop10 = myRow && myIndex >= 10 && cutoff ? Math.max(cutoff.season - myRow.season + 1, 1) : 0;
  const gapAbove = above && myRow ? Math.max(above.season - myRow.season, 1) : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 GOLD HERO */}
      <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 p-5 shadow-2xl shadow-orange-900/40">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-yellow-300/20 rounded-full blur-3xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/feed" className="press w-10 h-10 shrink-0 rounded-xl bg-white/15 border border-white/20 backdrop-blur flex items-center justify-center text-lg">←</Link>
            <div className="min-w-0">
              <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>🏆 Leaderboard</h1>
              <p className="text-[10px] text-white/80 font-semibold">🏁 Season {seasonIdx} • resets in {daysLeft}d</p>
            </div>
          </div>
          <button onClick={load} className="press w-10 h-10 shrink-0 rounded-xl bg-white/15 border border-white/20 backdrop-blur flex items-center justify-center text-lg">🔄</button>
        </div>
        {top10[0] && top10[0].season > 0 && (
          <div className="relative mt-3 bg-black/20 backdrop-blur rounded-xl px-3 py-2 text-center">
            <p className="text-[10px] font-black text-amber-200">🦇 CURRENT BATMAN: {top10[0].name.toUpperCase()}</p>
          </div>
        )}
      </div>

      {/* 🗺️ SCOPE CHIPS — future India/State/District/College */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SCOPES.map((s, i) => (
          <button
            key={s.label}
            onClick={() => { if (s.soon) alert("🔒 Coming soon! India → State → District → College rankings arrive in the next update!"); }}
            className={`press shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black border ${
              i === 0 ? "bg-gradient-to-r from-amber-500 to-orange-600 border-transparent text-white shadow-lg" : "bg-slate-900 border-slate-800 text-slate-500"
            }`}
          >
            {s.soon ? "🔒 " : ""}{s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-2 animate-bounce">🏆</p>
          <p className="text-slate-400 text-sm">Loading ranks...</p>
        </div>
      ) : (
        <>
          {/*  PODIUM */}
          {top10.length > 0 && (
            <div className="flex items-end justify-center gap-3 mb-5 pt-2">
              {top10[1] && <Podium r={top10[1]} place={2} />}
              {top10[0] && <Podium r={top10[0]} place={1} />}
              {top10[2] && <Podium r={top10[2]} place={3} />}
            </div>
          )}

          {/* 🎯 YOUR RACE TO TOP 10 */}
          {myRow && myIndex >= 10 && (
            <div className="mb-4 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border-2 border-violet-500/40 rounded-2xl p-4 shadow-lg">
              <p className="text-[10px] font-black text-violet-300 mb-2">🎯 YOUR RACE TO TOP 10</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-black text-white leading-none">#{myIndex + 1}</p>
                  <p className="text-[9px] font-black text-slate-500 mt-1">YOUR RANK</p>
                </div>
                <div>
                  <p className="text-lg font-black text-amber-400 leading-none">{gapToTop10} 🪙</p>
                  <p className="text-[9px] font-black text-slate-500 mt-1">TO ENTER TOP 10</p>
                </div>
                <div>
                  <p className="text-lg font-black text-fuchsia-400 leading-none">{gapAbove} 🪙</p>
                  <p className="text-[9px] font-black text-slate-500 mt-1">TO PASS {above?.name.split(" ")[0].toUpperCase()}</p>
                </div>
              </div>
            </div>
          )}
          {myRow && myIndex >= 0 && myIndex < 10 && (
            <div className="mb-4 bg-gradient-to-r from-amber-600/20 to-yellow-600/20 border-2 border-amber-500/40 rounded-2xl p-4 text-center shadow-lg">
              <p className="text-xs font-black text-amber-300">
                🔥 You&apos;re IN THE TOP 10 at #{myIndex + 1} — everyone can see you. DEFEND YOUR THRONE!
              </p>
            </div>
          )}

          {/* 4–10 */}
          <div className="grid gap-2">
            {top10.slice(3).map((r, i) => (
              <RowCard key={r.user_id} r={r} place={i + 4} me={me} />
            ))}
          </div>

          {/* pinned YOU row */}
          {myIndex >= 10 && (
            <div className="mt-4">
              <div className="h-px bg-slate-800 mb-2" />
              <RowCard r={rows[myIndex]} place={myIndex + 1} me={me} />
            </div>
          )}

          {rows.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl text-center py-12">
              <p className="text-4xl mb-2">🏆</p>
              <p className="text-sm font-black text-slate-400">No one on the board yet — be #1!</p>
            </div>
          )}
        </>
      )}
    </main>
  );
}