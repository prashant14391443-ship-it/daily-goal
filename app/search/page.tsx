"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type P = { user_id: string; display_name: string; avatar_url: string; is_private: boolean };

export default function SearchPage() {
  const [me, setMe] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<P[]>([]);
  const [recents, setRecents] = useState<P[]>([]);
  const [friends, setFriends] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) return;
      setMe(uid);
      const { data: fr } = await supabase.from("friends").select("friend_id").eq("user_id", uid);
      setFriends(new Set((fr || []).map((f) => f.friend_id)));
      try {
        setRecents(JSON.parse(localStorage.getItem("ff_recents") || "[]"));
      } catch {
        setRecents([]);
      }
    };
    load();
  }, []);

  const search = async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .ilike("display_name", `%${term.trim()}%`)
      .limit(20);
    setResults(((data as any[]) || []).filter((r) => r.user_id !== me));
  };

  const open = (p: P) => {
    const list = [p, ...recents.filter((r) => r.user_id !== p.user_id)].slice(0, 8);
    localStorage.setItem("ff_recents", JSON.stringify(list));
  };

  const Row = ({ p }: { p: P }) => (
    <Link
      href={`/profile?user=${p.user_id}`}
      onClick={() => open(p)}
      className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3"
    >
      {p.avatar_url ? (
        <img src={p.avatar_url} className="w-11 h-11 rounded-full object-cover" alt="" />
      ) : (
        <span className="w-11 h-11 rounded-full bg-violet-600 flex items-center justify-center font-bold">
          {(p.display_name || "?").charAt(0).toUpperCase()}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="font-bold text-sm block truncate">{p.display_name || "friend"}</span>
        <span className="text-[10px] text-slate-500">
          {friends.has(p.user_id) ? "✓ Friend" : p.is_private ? "🔒 Private" : "Add friend"}
        </span>
      </span>
    </Link>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
      <div className="flex items-center gap-2 mb-4 pr-24">
        <Link href="/feed" className="text-xl">←</Link>
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            search(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder="🔍 Search people"
          className="flex-1 p-3 rounded-full bg-slate-900 border border-slate-700 text-sm"
        />
      </div>

      {q.trim() === "" && recents.length > 0 && (
        <>
          <div className="flex justify-between items-center mb-2">
            <p className="font-bold text-sm">Recent</p>
            <button
              onClick={() => {
                localStorage.removeItem("ff_recents");
                setRecents([]);
              }}
              className="text-xs text-violet-400 font-bold"
            >
              Clear all
            </button>
          </div>
          <div className="grid gap-2">
            {recents.map((r) => (
              <Row key={r.user_id} p={r} />
            ))}
          </div>
        </>
      )}

      {q.trim() !== "" && (
        <div className="grid gap-2">
          {results.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No people found 🙈</p>}
          {results.map((r) => (
            <Row key={r.user_id} p={r} />
          ))}
        </div>
      )}
    </main>
  );
}