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
  const [prof, setProf] = useState<{ display_name: string; avatar_url: string } | null>(null);
  const [followers, setFollowers] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [iFollow, setIFollow] = useState(false);
  const [coins, setCoins] = useState(0);
  const [posts, setPosts] = useState<{ id: string; content: string; created_at: string; likes: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid || !userId) return;
      setMe(uid);
      const [pr, fol, foling, myFol, cn, p, likes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("follows").select("follower_id").eq("following_id", userId),
        supabase.from("follows").select("following_id").eq("follower_id", userId),
        supabase.from("follows").select("follower_id").eq("follower_id", uid).eq("following_id", userId),
        supabase.from("user_coins").select("coins").eq("user_id", userId).maybeSingle(),
        supabase.from("posts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("post_likes").select("post_id"),
      ]);
      const profRow = pr as any;
      setProf(
        profRow
          ? { display_name: profRow.display_name || "friend", avatar_url: profRow.avatar_url || "" }
          : { display_name: "friend", avatar_url: "" }
      );
      setFollowers((fol.data || []).length);
      setFollowingCount((foling.data || []).length);
      setIFollow((myFol.data || []).length > 0);
      const coinRow = cn as any;
      setCoins(Number(coinRow?.coins || 0));
      const likeCount = new Map<string, number>();
      (likes.data || []).forEach((l) => likeCount.set(l.post_id, (likeCount.get(l.post_id) || 0) + 1));
      setPosts((p.data || []).map((x) => ({ id: x.id, content: x.content, created_at: x.created_at, likes: likeCount.get(x.id) || 0 })));
    };
    load();
  }, [userId]);

  const toggleFollow = async () => {
    if (iFollow) await supabase.from("follows").delete().eq("follower_id", me).eq("following_id", userId);
    else await supabase.from("follows").insert({ follower_id: me, following_id: userId });
    setIFollow(!iFollow);
    setFollowers(followers + (iFollow ? -1 : 1));
  };

  const rank = coins >= 1000 ? "🦸 Hero" : coins >= 500 ? "🥇 Gold" : coins >= 100 ? "🥈 Silver" : "🥉 Bronze";

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
            <h1 className="text-xl font-bold truncate">{prof?.display_name || "..."}</h1>
            <p className="text-xs text-slate-400">
              {followers} followers • {followingCount} following • 🪙 {coins} {rank}
            </p>
          </div>
          {userId !== me && (
            <button
              onClick={toggleFollow}
              className={`px-4 py-2 rounded-full text-xs font-bold ${iFollow ? "bg-slate-800 text-slate-400" : "bg-violet-600"}`}
            >
              {iFollow ? "Following ✓" : "+ Follow"}
            </button>
          )}
        </div>
      </div>

      <h2 className="font-bold mb-2">📝 Posts</h2>
      <div className="grid gap-3">
        {posts.length === 0 && <p className="text-slate-500 text-sm">No posts yet.</p>}
        {posts.map((p) => (
          <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-sm whitespace-pre-wrap">{p.content}</p>
            <p className="text-[10px] text-slate-500 mt-2">
              {ago(p.created_at)} • ❤️ {p.likes}
            </p>
          </div>
        ))}
      </div>
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