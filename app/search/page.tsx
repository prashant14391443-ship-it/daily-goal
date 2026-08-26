"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type P = { user_id: string; display_name: string; avatar_url: string; is_private: boolean };

const GRADS = [
  "from-violet-500 to-fuchsia-600", "from-blue-500 to-indigo-600", "from-green-500 to-emerald-600",
  "from-amber-500 to-orange-600", "from-pink-500 to-rose-600", "from-cyan-500 to-teal-600",
];
function gradFor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return GRADS[h % GRADS.length];
}

// 🛡️ Avatar with broken-image fallback → letter avatar
function Avatar({ p, size = "w-12 h-12" }: { p: P; size?: string }) {
  const [err, setErr] = useState(false);
  const letter = (p.display_name || "?").charAt(0).toUpperCase();
  if (!p.avatar_url || err) {
    return (
      <span className={`${size} shrink-0 rounded-full bg-gradient-to-br ${gradFor(p.display_name || p.user_id)} flex items-center justify-center font-black text-white shadow-lg`}>
        {letter}
      </span>
    );
  }
  return <img src={p.avatar_url} onError={() => setErr(true)} className={`${size} shrink-0 rounded-full object-cover shadow-lg`} alt="" />;
}

export default function SearchPage() {
  const [me, setMe] = useState("");
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<P[]>([]);
  const [recents, setRecents] = useState<P[]>([]);
  const [friends, setFriends] = useState<Set<string>>(new Set());
  const [sentReqs, setSentReqs] = useState<Set<string>>(new Set());

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    setMe(uid);
    const [prof, fr, sent] = await Promise.all([
      supabase.from("profiles").select("*").limit(100),
      supabase.from("friends").select("friend_id").eq("user_id", uid),
      supabase.from("friend_requests").select("to_id").eq("from_id", uid).eq("status", "pending"),
    ]);
    setPeople(((prof.data as any[]) || []).filter((x) => x.user_id !== uid).sort((a, b) => (b.display_name ? 1 : 0) - (a.display_name ? 1 : 0)));
    setFriends(new Set((fr.data || []).map((f) => f.friend_id)));
    setSentReqs(new Set((sent.data || []).map((s) => s.to_id)));
    try { setRecents(JSON.parse(localStorage.getItem("ff_recents") || "[]")); } catch { setRecents([]); }
  };

  useEffect(() => { load(); }, []);

  const addFriend = async (to: string) => {
    await supabase.from("friend_requests").insert({ from_id: me, to_id: to });
    load();
  };

  const open = (p: P) => {
    const list = [p, ...recents.filter((r) => r.user_id !== p.user_id)].slice(0, 8);
    localStorage.setItem("ff_recents", JSON.stringify(list));
  };

  const btn = (uid: string) => {
    if (friends.has(uid))
      return <span className="shrink-0 px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/40 text-[10px] font-black text-green-300">✓ Friends</span>;
    if (sentReqs.has(uid))
      return <span className="shrink-0 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-black text-slate-400">⏳ Sent</span>;
    return (
      <button onClick={() => addFriend(uid)} className="press shrink-0 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-[10px] font-black text-white shadow-lg shadow-violet-900/30">
        + Add
      </button>
    );
  };

  const term = q.trim().toLowerCase();
  const clean = people.filter((p) => p.display_name || p.avatar_url || friends.has(p.user_id));
  // ⚡ LIVE SEARCH — "starts with" matches rank first
  const shown =
    term === ""
      ? clean
      : people
          .filter((p) => (p.display_name || "").toLowerCase().includes(term))
          .sort((a, b) => {
            const aw = (a.display_name || "").toLowerCase().startsWith(term) ? 0 : 1;
            const bw = (b.display_name || "").toLowerCase().startsWith(term) ? 0 : 1;
            return aw - bw;
          });
  const friendRows = shown.filter((p) => friends.has(p.user_id));
  const otherRows = shown.filter((p) => !friends.has(p.user_id));

  const Row = ({ p }: { p: P }) => (
    <div className="press bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center gap-3 shadow-md hover:border-violet-500/40 transition-colors">
      <Link href={`/profile?user=${p.user_id}`} onClick={() => open(p)} className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar p={p} />
        <span className="min-w-0">
          <span className="font-black text-sm text-white block truncate">{p.display_name || `User-${p.user_id.slice(0, 4)}`}</span>
          <span className={`text-[10px] font-bold ${p.is_private ? "text-amber-400" : "text-slate-500"}`}>
            {p.is_private ? "🔒 Private" : "🌍 Public"}
          </span>
        </span>
      </Link>
      {btn(p.user_id)}
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🔍 SEARCH BAR */}
      <div className="flex items-center gap-2 mb-5">
        <Link href="/feed" className="press w-11 h-11 shrink-0 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-lg">←</Link>
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people by name..."
            className="w-full pl-11 pr-10 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 focus:border-violet-500 outline-none text-sm transition-colors"
          />
          {q && (
            <button onClick={() => setQ("")} className="press absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs font-black flex items-center justify-center">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ⭐ RECENTS (only when not searching) */}
      {term === "" && recents.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-slate-400">⭐ RECENT</p>
            <button
              onClick={() => { localStorage.removeItem("ff_recents"); setRecents([]); }}
              className="press text-[10px] font-black text-violet-400"
            >
              Clear all
            </button>
          </div>
          <div className="grid gap-2">
            {recents.map((r) => (
              <div key={r.user_id} className="relative pr-9">
                <Row p={r} />
                <button
                  onClick={() => {
                    const list = recents.filter((x) => x.user_id !== r.user_id);
                    setRecents(list);
                    localStorage.setItem("ff_recents", JSON.stringify(list));
                  }}
                  className="press absolute top-1/2 -translate-y-1/2 right-2 w-6 h-6 rounded-full bg-slate-800 text-slate-500 text-[10px] font-black flex items-center justify-center"
                >
                  ✖
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESULTS */}
      {term !== "" && (
        <p className="text-xs font-black text-slate-400 mb-2">
          {shown.length > 0 ? `✅ ${shown.length} ${shown.length === 1 ? "person" : "people"} found` : ""}
        </p>
      )}

      {term === "" && friendRows.length > 0 && (
        <>
          <p className="text-xs font-black text-slate-400 mb-2">💚 YOUR FRIENDS</p>
          <div className="grid gap-2 mb-5">{friendRows.map((r) => <Row key={r.user_id} p={r} />)}</div>
          <p className="text-xs font-black text-slate-400 mb-2">🌟 PEOPLE YOU MAY KNOW</p>
        </>
      )}
      {term !== "" && friendRows.length > 0 && (
        <div className="grid gap-2 mb-5">{friendRows.map((r) => <Row key={r.user_id} p={r} />)}</div>
      )}

      {term === "" && friendRows.length === 0 && (
        <p className="text-xs font-black text-slate-400 mb-2">🌟 PEOPLE YOU MAY KNOW</p>
      )}

      <div className="grid gap-2">
        {otherRows.map((r) => <Row key={r.user_id} p={r} />)}
        {shown.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl text-center py-12">
            <p className="text-4xl mb-2">🙈</p>
            <p className="text-sm font-bold text-slate-400">No one named &ldquo;{q}&rdquo;</p>
            <p className="text-[10px] text-slate-500 mt-1">Try a different spelling</p>
          </div>
        )}
      </div>
    </main>
  );
}