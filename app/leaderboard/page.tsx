"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const LEVELS = [
  { icon: "🥉", need: 0 },
  { icon: "🥈", need: 500 },
  { icon: "⚪", need: 1000 },
  { icon: "🥇", need: 2000 },
  { icon: "💎", need: 4000 },
  { icon: "🦸", need: 8000 },
  { icon: "⚡", need: 16000 },
  { icon: "🎓", need: 32000 },
  { icon: "👑", need: 64000 },
  { icon: "🐉", need: 128000 },
  { icon: "🌌", need: 256000 },
  { icon: "🦇", need: 512000 },
];
const rankOf = (c: number) => {
  let icon = LEVELS[0].icon;
  for (const l of LEVELS) if (c >= l.need) icon = l.icon;
  return icon;
};

type Row = { user_id: string; total: number; name: string; avatar: string };

function Podium({ r, place, medal, h }: { r: Row; place: number; medal: string; h: string }) {
  return (
    <div className="flex flex-col items-center gap-1 w-24">
      <span className="text-xl">{medal}</span>
      {r.avatar ? (
        <img src={r.avatar} className="w-12 h-12 rounded-full object-cover border-2 border-amber-400" alt="" />
      ) : (
        <span className="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center font-bold border-2 border-amber-400">
          {r.name.charAt(0).toUpperCase()}
        </span>
      )}
      <p className="text-xs font-bold truncate w-full text-center">
        {rankOf(r.total)} {r.name}
      </p>
      <p className="text-[10px] text-amber-400 font-bold">{r.total} 🪙</p>
      <div
        className={`w-full ${h} rounded-t-xl bg-gradient-to-t from-violet-900 to-violet-600 flex items-start justify-center pt-1 text-[10px] font-black`}
      >
        #{place}
      </div>
    </div>
  );
}

function RowCard({ r, place, me }: { r: Row; place: number; me: string }) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border ${
        r.user_id === me ? "bg-violet-600/10 border-violet-500/40" : "bg-slate-900 border-slate-800"
      }`}
    >
      <span className="w-6 text-center font-black text-slate-400">{place}</span>
      {r.avatar ? (
        <img src={r.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
      ) : (
        <span className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center font-bold text-sm">
          {r.name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="flex-1 min-w-0 font-bold text-sm truncate">
        {rankOf(r.total)} {r.name} {r.user_id === me && "(YOU)"}
      </span>
      <span className="text-xs font-bold text-amber-400">{r.total} 🪙</span>
    </div>
  );
}

export default function LeaderboardPage() {
  const [me, setMe] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id || "";
    setMe(uid);
    const { data: logs } = await supabase.from("coin_log").select("user_id, coins");
    const sums = new Map<string, number>();
    ((logs as any[]) || []).forEach((r) =>
      sums.set(r.user_id, (sums.get(r.user_id) || 0) + (Number(r.coins) || 0))
    );
    if (uid && !sums.has(uid)) sums.set(uid, 0);
    const ids = Array.from(sums.keys());
    const { data: profs } = await supabase.from("profiles").select("*").in("user_id", ids);
    const pmap = new Map<string, any>(((profs as any[]) || []).map((x) => [x.user_id, x]));
    const list: Row[] = ids.map((id) => ({
      user_id: id,
      total: sums.get(id) || 0,
      name: pmap.get(id)?.display_name || "friend",
      avatar: pmap.get(id)?.avatar_url || "",
    }));
    list.sort((a, b) => b.total - a.total);
    setRows(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const myIndex = rows.findIndex((r) => r.user_id === me);
  const top10 = rows.slice(0, 10);
  const above = myIndex > 0 ? rows[myIndex - 1] : null;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
      <div className="flex items-center justify-between mb-4 pr-24">
        <Link href="/feed" className="text-xl">←</Link>
        <p className="font-black text-lg">🏆 LEADERBOARD</p>
        <button onClick={load} className="text-lg">🔄</button>
      </div>

      {loading ? (
        <p className="text-center text-slate-500 text-sm py-10">Loading ranks...</p>
      ) : (
        <>
          {top10.length > 0 && (
            <div className="flex items-end justify-center gap-3 mb-4">
              {top10[1] && <Podium r={top10[1]} place={2} medal="🥈" h="h-20" />}
              {top10[0] && <Podium r={top10[0]} place={1} medal="👑" h="h-28" />}
              {top10[2] && <Podium r={top10[2]} place={3} medal="🥉" h="h-16" />}
            </div>
          )}

          <div className="grid gap-2">
            {top10.slice(3).map((r, i) => (
              <RowCard key={r.user_id} r={r} place={i + 4} me={me} />
            ))}
          </div>

          {myIndex >= 10 && (
            <div className="mt-4">
              <div className="h-px bg-slate-800 mb-2" />
              <RowCard r={rows[myIndex]} place={myIndex + 1} me={me} />
            </div>
          )}
          {above && (
            <p className="text-[10px] text-amber-400 font-bold text-center mt-3">
              ⚡ {above.total - rows[myIndex].total} 🪙 to pass {above.name}!
            </p>
          )}
          {myIndex === 0 && rows.length > 1 && (
            <p className="text-[10px] text-amber-400 font-bold text-center mt-3">
              👑 You are the BATMAN of this app! Defend your throne!
            </p>
          )}
        </>
      )}
    </main>
  );
}