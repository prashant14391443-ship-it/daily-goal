"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type P = { user_id: string; display_name: string; avatar_url: string; is_private: boolean };

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
    setPeople(((prof.data as any[]) || []).filter((x) => x.user_id !== uid));
    setFriends(new Set((fr.data || []).map((f) => f.friend_id)));
    setSentReqs(new Set((sent.data || []).map((s) => s.to_id)));
    try {
      setRecents(JSON.parse(localStorage.getItem("ff_recents") || "[]"));
    } catch {
      setRecents([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
      return <span className="text-[10px] font-bold text-green-400 shrink-0">✓ Friends</span>;
    if (sentReqs.has(uid))
      return <span className="text-[10px] font-bold text-slate-500 shrink-0">⏳ Requested</span>;
    return (
      <button
        onClick={() => addFriend(uid)}
        className="px-3 py-1 rounded-full text-xs font-bold bg-violet-600 shrink-0"
      >
        + Add
      </button>
    );
  };

  const term = q.trim().toLowerCase();
  const shown = term === "" ? people : people.filter((p) => (p.display_name || "").toLowerCase().includes(term));

  const Row = ({ p }: { p: P }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
      <Link
        href={`/profile?user=${p.user_id}`}
        onClick={() => open(p)}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        {p.avatar_url ? (
          <img src={p.avatar_url} className="w-11 h-11 rounded-full object-cover" alt="" />
        ) : (
          <span className="w-11 h-11 rounded-full bg-violet-600 flex items-center justify-center font-bold">
            {(p.display_name || "?").charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0">
          <span className="font-bold text-sm block truncate">{p.display_name || "friend"}</span>
          <span className="text-[10px] text-slate-500">{p.is_private ? "🔒 Private" : "🌍 Public"}</span>
        </span>
      </Link>
      {btn(p.user_id)}
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
      <div className="flex items-center gap-2 mb-4 pr-24">
        <Link href="/feed" className="text-xl">←</Link>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder="🔍 Search people"
          className="flex-1 p-3 rounded-full bg-slate-900 border border-slate-700 text-sm"
        />
      </div>

      {term === "" && recents.length > 0 && (
        <>
          <p className="font-bold text-sm mb-2">⭐ Recent</p>
          <div className="grid gap-2 mb-4">
            {recents.map((r) => (
              <Row key={r.user_id} p={r} />
            ))}
          </div>
        </>
      )}

      <p className="font-bold text-sm mb-2">🌟 People you may know</p>
      <div className="grid gap-2">
        {shown.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-8">No people found 🙈</p>
        )}
        {shown.map((r) => (
          <Row key={r.user_id} p={r} />
        ))}
      </div>
    </main>
  );
}