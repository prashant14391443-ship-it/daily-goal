"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Profile = { user_id: string; display_name: string; avatar_url: string };
type Post = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  likes: number;
  likedByMe: boolean;
  author?: Profile;
};

const BANNED = ["fuck", "shit", "bitch", "asshole", "dick", "pussy", "nigga", "nigger", "cunt", "whore", "bastard"];
const bad = (t: string) => BANNED.some((w) => t.toLowerCase().includes(w));

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function FeedPage() {
  const [me, setMe] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [tab, setTab] = useState<"all" | "following">("all");
  const [following, setFollowing] = useState<Set<string>>(new Set());

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    setMe(uid);
    const [p, prof, likes, myLikes, fol] = await Promise.all([
      supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("*"),
      supabase.from("post_likes").select("post_id"),
      supabase.from("post_likes").select("post_id").eq("user_id", uid),
      supabase.from("follows").select("following_id").eq("follower_id", uid),
    ]);
    const profMap = new Map<string, Profile>((prof.data || []).map((x) => [x.user_id, x]));
    const likeCount = new Map<string, number>();
    (likes.data || []).forEach((l) => likeCount.set(l.post_id, (likeCount.get(l.post_id) || 0) + 1));
    const mine = new Set((myLikes.data || []).map((l) => l.post_id));
    setFollowing(new Set((fol.data || []).map((f) => f.following_id)));
    setPosts(
      (p.data || []).map((x) => ({
        id: x.id,
        user_id: x.user_id,
        content: x.content,
        created_at: x.created_at,
        likes: likeCount.get(x.id) || 0,
        likedByMe: mine.has(x.id),
        author: profMap.get(x.user_id),
      }))
    );
  };

  useEffect(() => {
    load();
  }, []);

  const publish = async () => {
    if (!text.trim()) return;
    if (bad(text)) {
      alert("🚫 Keep it clean — banned word detected!");
      return;
    }
    await supabase.from("posts").insert({ user_id: me, content: text.trim() });
    setText("");
    load();
  };

  const toggleLike = async (id: string) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    if (post.likedByMe) await supabase.from("post_likes").delete().eq("user_id", me).eq("post_id", id);
    else await supabase.from("post_likes").insert({ user_id: me, post_id: id });
    load();
  };

  const toggleFollow = async (id: string) => {
    if (following.has(id)) await supabase.from("follows").delete().eq("follower_id", me).eq("following_id", id);
    else await supabase.from("follows").insert({ follower_id: me, following_id: id });
    load();
  };

  const shown = tab === "all" ? posts : posts.filter((p) => following.has(p.user_id) || p.user_id === me);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">📰 Friend Feed</h1>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2 rounded-full text-xs font-bold ${tab === "all" ? "bg-violet-600" : "bg-slate-800 text-slate-400"}`}
        >
          🌍 Everyone
        </button>
        <button
          onClick={() => setTab("following")}
          className={`px-4 py-2 rounded-full text-xs font-bold ${tab === "following" ? "bg-violet-600" : "bg-slate-800 text-slate-400"}`}
        >
          👥 Following
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share your win today... 🏆"
          rows={2}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm resize-none"
        />
        <button onClick={publish} className="mt-2 w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 font-bold text-sm">
          🚀 Post
        </button>
      </div>

      <div className="grid gap-3">
        {shown.length === 0 && <p className="text-slate-500 text-sm">No posts yet — be the first! 🌟</p>}
        {shown.map((p) => (
          <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              {p.author?.avatar_url ? (
                <img src={p.author.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
              ) : (
                <span className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center font-bold">
                  {(p.author?.display_name || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <Link href={`/profile?user=${p.user_id}`} className="font-bold text-sm hover:underline block truncate">
                  {p.author?.display_name || "friend"}
                </Link>
                <p className="text-[10px] text-slate-500">{ago(p.created_at)}</p>
              </div>
              {p.user_id !== me && (
                <button
                  onClick={() => toggleFollow(p.user_id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    following.has(p.user_id) ? "bg-slate-800 text-slate-400" : "bg-violet-600"
                  }`}
                >
                  {following.has(p.user_id) ? "Following ✓" : "+ Follow"}
                </button>
              )}
            </div>
            <p className="text-sm whitespace-pre-wrap mb-2">{p.content}</p>
            <button
              onClick={() => toggleLike(p.id)}
              className={`text-xs font-bold ${p.likedByMe ? "text-pink-400" : "text-slate-400"}`}
            >
              {p.likedByMe ? "❤️" : "🤍"} {p.likes}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}