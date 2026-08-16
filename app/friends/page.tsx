"use client";

import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type P = { user_id: string; display_name: string; avatar_url: string; is_private: boolean };

function Inner() {
  const params = useSearchParams();
  const userId = params.get("user") || "";
  const [me, setMe] = useState("");
  const [list, setList] = useState<P[]>([]);
  const [q, setQ] = useState("");
  const [locked, setLocked] = useState(false);
  const [myFriends, setMyFriends] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid || !userId) return;
      setMe(uid);
      const [owner, fr, myFr] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("friends").select("friend_id").eq("user_id", userId),
        supabase.from("friends").select("friend_id").eq("user_id", uid),
      ]);
      const mine = new Set((myFr.data || []).map((f) => f.friend_id));
      setMyFriends(mine);
      const isPrivate = (owner as any)?.is_private;
      if (isPrivate && userId !== uid && !mine.has(userId)) {
        setLocked(true);
        return;
      }
      const ids = (fr.data || []).map((f) => f.friend_id);
      if (ids.length === 0) {
        setList([]);
        return;
      }
      const { data: profs } = await supabase.from("profiles").select("*").in("user_id", ids);
      setList((profs as any[]) || []);
    };
    load();
  }, [userId]);

  const shown = list.filter((p) => (p.display_name || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <Link href={`/profile?user=${userId}`} className="text-xl">←</Link>
        <p className="font-bold">🤝 Friends</p>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔍 Search friends..."
        className="w-full p-3 mb-4 rounded-full bg-slate-900 border border-slate-700 text-sm"
      />

      {locked ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-3">🔒</p>
          <p className="text-sm text-slate-400">This account is private.</p>
        </div>
      ) : shown.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-10">No friends here yet 🌱</p>
      ) : (
        <div className="grid gap-2">
          {shown.map((p) => (
            <div key={p.user_id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
              {p.avatar_url ? (
                <img src={p.avatar_url} className="w-11 h-11 rounded-full object-cover" alt="" />
              ) : (
                <span className="w-11 h-11 rounded-full bg-violet-600 flex items-center justify-center font-bold">
                  {(p.display_name || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <Link href={`/profile?user=${p.user_id}`} className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{p.display_name || "friend"}</p>
                <p className="text-[10px] text-slate-500">{p.is_private ? "🔒 Private" : "🌍 Public"}</p>
              </Link>
              {p.user_id !== me && (!p.is_private || myFriends.has(p.user_id)) && (
                <Link
                  href={`/chat?user=${p.user_id}`}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-bold"
                >
                  💬 Message
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default function FriendsPage() {
  return (
    <Suspense fallback={<p className="text-slate-400 p-4">Loading...</p>}>
      <Inner />
    </Suspense>
  );
}