"use client";

import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, Lock, Users, Globe, MessageCircle } from "lucide-react";

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
      <div className="flex items-center gap-3 mb-6">
        <Link 
          href={`/profile?user=${userId}`} 
          className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={18} className="text-slate-300" />
        </Link>
        <div className="flex items-center gap-2">
          <Users size={20} className="text-violet-400" />
          <p className="font-semibold text-lg">Friends</p>
        </div>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search friends..."
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm focus:border-slate-600 focus:outline-none"
        />
      </div>

      {locked ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
            <Lock size={24} className="text-slate-500" />
          </div>
          <p className="text-sm text-slate-400 font-medium">This account is private</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
            <Users size={22} className="text-slate-500" />
          </div>
          <p className="text-sm text-slate-500 font-medium">No friends here yet</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {shown.map((p) => (
            <div key={p.user_id} className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center gap-3 hover:border-slate-600 transition-colors">
              {p.avatar_url ? (
                <img 
                  src={p.avatar_url} 
                  className="w-11 h-11 rounded-full object-cover border-2 border-slate-800 flex-shrink-0" 
                  alt="" 
                />
              ) : (
                <span className="w-11 h-11 rounded-full bg-violet-600 border-2 border-slate-800 flex items-center justify-center font-bold flex-shrink-0">
                  {(p.display_name || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <Link href={`/profile?user=${p.user_id}`} className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{p.display_name || "friend"}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {p.is_private ? (
                    <>
                      <Lock size={10} className="text-slate-500" />
                      <span className="text-[10px] text-slate-500">Private</span>
                    </>
                  ) : (
                    <>
                      <Globe size={10} className="text-slate-500" />
                      <span className="text-[10px] text-slate-500">Public</span>
                    </>
                  )}
                </div>
              </Link>
              {p.user_id !== me && (!p.is_private || myFriends.has(p.user_id)) && (
                <Link
                  href={`/chat?user=${p.user_id}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition-colors"
                >
                  <MessageCircle size={13} />
                  Message
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