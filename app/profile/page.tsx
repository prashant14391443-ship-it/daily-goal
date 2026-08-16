"use client";

import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function Inner() {
  const params = useSearchParams();
  const userId = params.get("user") || "";
  const [me, setMe] = useState("");
  const [prof, setProf] = useState<any>(null);
  const [followers, setFollowers] = useState(0);
  const [friendCount, setFriendCount] = useState(0);
  const [isFriend, setIsFriend] = useState(false);
  const [sentReq, setSentReq] = useState(false);
  const [recvReq, setRecvReq] = useState(false);
  const [coins, setCoins] = useState(0);
  const [posts, setPosts] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid || !userId) return;
    setMe(uid);
    const [pr, fr, sReq, rReq, cn, p, likes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("friends").select("friend_id").eq("user_id", uid).eq("friend_id", userId),
      supabase.from("friend_requests").select("from_id").eq("from_id", uid).eq("to_id", userId).eq("status", "pending"),
      supabase.from("friend_requests").select("from_id").eq("from_id", userId).eq("to_id", uid).eq("status", "pending"),
      supabase.from("user_coins").select("coins").eq("user_id", userId).maybeSingle(),
      supabase.from("posts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("post_likes").select("post_id"),
    ]);
    setProf(pr || { display_name: "friend", avatar_url: "", is_private: false });
    setIsFriend((fr.data || []).length > 0);
    setSentReq((sReq.data || []).length > 0);
    setRecvReq((rReq.data || []).length > 0);
    setCoins(Number((cn as any)?.coins || 0));
    const likeCount = new Map<string, number>();
    (likes.data || []).forEach((l) => likeCount.set(l.post_id, (likeCount.get(l.post_id) || 0) + 1));
    setPosts(((p.data as any[]) || []).map((x) => ({ ...x, likes: likeCount.get(x.id) || 0 })));
    const { data: theirFriends } = await supabase.from("friends").select("friend_id").eq("user_id", userId);
    setFriendCount((theirFriends || []).length);
    setFollowers(friendCount);
  };

  useEffect(() => {
    load();
  }, [userId]);

  const addFriend = async () => {
    await supabase.from("friend_requests").insert({ from_id: me, to_id: userId });
    load();
  };
  const accept = async () => {
    await supabase.rpc("accept_friend", { req_from: userId, req_to: me });
    load();
  };
  const togglePrivate = async () => {
    const next = !prof?.is_private;
    await supabase.from("profiles").update({ is_private: next }).eq("user_id", me);
    setProf({ ...prof, is_private: next });
  };

  const rank = coins >= 1000 ? "🦸 Hero" : coins >= 500 ? "🥇 Gold" : coins >= 100 ? "🥈 Silver" : "🥉 Bronze";
  const locked = prof?.is_private && userId !== me && !isFriend;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-3">
          {prof?.avatar_url ? (
            <img src={prof.avatar_url} className="w-16 h-16 rounded-full object-cover" alt="" />
          ) : (
            <span className="w-16 h-16 rounded-full bg-violet-600 flex items-center justify-center text-2xl font-bold">
              {(prof?.display_name || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">
              {prof?.display_name || "..."} {prof?.is_private ? "🔒" : ""}
            </h1>
            <p className="text-xs text-slate-400">
              {friendCount} friends • 🪙 {coins} {rank}
            </p>
          </div>
        </div>
        <div className="mt-3">
          {userId === me ? (
            <button
              onClick={togglePrivate}
              className={`w-full py-2 rounded-full text-xs font-bold ${
                prof?.is_private ? "bg-slate-800 text-slate-300" : "bg-green-600/20 text-green-300"
              }`}
            >
              {prof?.is_private ? "🔒 Private — only friends see my posts" : "🌍 Public — everyone sees my posts"}
            </button>
          ) : isFriend ? (
            <span className="block text-center py-2 rounded-full text-xs font-bold bg-slate-800 text-green-400">✓ Friends</span>
          ) : recvReq ? (
            <button onClick={accept} className="w-full py-2 rounded-full text-xs font-bold bg-green-600">
              ✅ Accept Request
            </button>
          ) : sentReq ? (
            <span className="block text-center py-2 rounded-full text-xs font-bold bg-slate-800 text-slate-400">⏳ Requested</span>
          ) : (
            <button onClick={addFriend} className="w-full py-2 rounded-full text-xs font-bold bg-violet-600">
              ➕ Add Friend
            </button>
          )}
        </div>
      </div>

      <h2 className="font-bold mb-2">📝 Posts</h2>
      {locked ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <p className="text-4xl mb-2">🔒</p>
          <p className="text-sm text-slate-400">This account is private.</p>
          <p className="text-xs text-slate-500">Become a friend to see their posts!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {posts.length === 0 && <p className="text-slate-500 text-sm">No posts yet.</p>}
          {posts.map((p) => (
            <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              {p.content && <p className="text-sm whitespace-pre-wrap">{p.content}</p>}
              {p.image_url && <img src={p.image_url} className="rounded-xl w-full max-h-96 object-cover mt-2" alt="" />}
              <p className="text-[10px] text-slate-500 mt-2">
                {ago(p.created_at)} • ❤️ {p.likes}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<p className="text-slate-400">Loading...</p>}>
      <Inner />
    </Suspense>
  );
}