"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Profile = { user_id: string; display_name: string; avatar_url: string; is_private: boolean };
type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string;
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

function compressImage(f: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const max = 900;
        let w = img.width;
        let h = img.height;
        if (w > max || h > max) {
          const r = Math.min(max / w, max / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (b) => resolve(new File([b || new Blob()], "post.jpg", { type: "image/jpeg" })),
          "image/jpeg",
          0.72
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(f);
  });
}

export default function FeedPage() {
  const [me, setMe] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"all" | "friends">("all");
  const [friends, setFriends] = useState<Set<string>>(new Set());
  const [sentReqs, setSentReqs] = useState<Set<string>>(new Set());
  const [incoming, setIncoming] = useState<{ from_id: string; prof?: Profile }[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Profile[]>([]);

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    setMe(uid);
    const [p, prof, likes, myLikes, fr, sent, inc] = await Promise.all([
      supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("*"),
      supabase.from("post_likes").select("post_id"),
      supabase.from("post_likes").select("post_id").eq("user_id", uid),
      supabase.from("friends").select("friend_id").eq("user_id", uid),
      supabase.from("friend_requests").select("to_id").eq("from_id", uid).eq("status", "pending"),
      supabase.from("friend_requests").select("from_id").eq("to_id", uid).eq("status", "pending"),
    ]);
    const profMap = new Map<string, Profile>((prof.data || []).map((x) => [x.user_id, x as Profile]));
    const likeCount = new Map<string, number>();
    (likes.data || []).forEach((l) => likeCount.set(l.post_id, (likeCount.get(l.post_id) || 0) + 1));
    const mine = new Set((myLikes.data || []).map((l) => l.post_id));
    setFriends(new Set((fr.data || []).map((f) => f.friend_id)));
    setSentReqs(new Set((sent.data || []).map((s) => s.to_id)));
    setIncoming((inc.data || []).map((r) => ({ from_id: r.from_id, prof: profMap.get(r.from_id) })));
    setPosts(
      ((p.data as any[]) || []).map((x) => ({
        id: x.id,
        user_id: x.user_id,
        content: x.content,
        image_url: x.image_url || "",
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

  const search = async () => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .ilike("display_name", `%${q.trim()}%`)
      .limit(10);
    setResults(((data as any[]) || []).filter((r) => r.user_id !== me));
  };

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      alert("Images only!");
      return;
    }
    
    // FIX Mistake 2: Revoke previous object URL before creating a new one
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  };

  const publish = async () => {
    if (!text.trim() && !photo) return;
    if (bad(text)) {
      alert("🚫 Keep it clean — banned word detected!");
      return;
    }
    setBusy(true);
    let url = "";
    if (photo) {
      const small = await compressImage(photo);
      const path = `${me}/${Date.now()}.jpg`;
      await supabase.storage.from("posts").upload(path, small);
      url = supabase.storage.from("posts").getPublicUrl(path).data.publicUrl;
    }
    await supabase.from("posts").insert({ user_id: me, content: text.trim(), image_url: url || null });
    setText("");
    setPhoto(null);
    
    // FIX Mistake 2: Revoke object URL after successful post
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    
    setPreview("");
    setBusy(false);
    load();
  };

  const deletePost = async (p: Post) => {
    if (!confirm("Delete this post?")) return;
    if (p.image_url) {
      const path = decodeURIComponent(p.image_url.split("/posts/")[1] || "");
      if (path) await supabase.storage.from("posts").remove([path]);
    }
    await supabase.from("posts").delete().eq("id", p.id);
    load();
  };
  
  // FIX Mistake 1: Duplicate deletePost function definition removed.

  const toggleLike = async (id: string) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    if (post.likedByMe) await supabase.from("post_likes").delete().eq("user_id", me).eq("post_id", id);
    else await supabase.from("post_likes").insert({ user_id: me, post_id: id });
    load();
  };

  const addFriend = async (to: string) => {
    await supabase.from("friend_requests").insert({ from_id: me, to_id: to });
    load();
  };
  const accept = async (from: string) => {
    await supabase.rpc("accept_friend", { req_from: from, req_to: me });
    load();
  };
  const reject = async (from: string) => {
    await supabase.from("friend_requests").delete().eq("from_id", from).eq("to_id", me);
    load();
  };

  const friendBtn = (uid: string) => {
    if (uid === me) return null;
    if (friends.has(uid))
      return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-green-400 shrink-0">✓ Friends</span>;
    if (sentReqs.has(uid))
      return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 shrink-0">⏳ Requested</span>;
    return (
      <button onClick={() => addFriend(uid)} className="px-3 py-1 rounded-full text-xs font-bold bg-violet-600 shrink-0">
        + Add
      </button>
    );
  };

  const visible = posts.filter((p) => !p.author?.is_private || p.user_id === me || friends.has(p.user_id));
  const shown = tab === "all" ? visible : visible.filter((p) => friends.has(p.user_id) || p.user_id === me);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">📰 Friend Feed</h1>

      {/* SEARCH */}
      <div className="flex gap-2 mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Search people..."
          className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm"
        />
        <button onClick={search} className="px-4 rounded-xl bg-violet-600 font-bold text-sm">
          Go
        </button>
      </div>
      {results.length > 0 && (
        <div className="grid gap-2 mb-4">
          {results.map((r) => (
            <div key={r.user_id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-2">
              {r.avatar_url ? (
                <img src={r.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
              ) : (
                <span className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center font-bold">
                  {(r.display_name || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <Link href={`/profile?user=${r.user_id}`} className="flex-1 font-bold text-sm hover:underline truncate">
                {r.display_name || "friend"} {r.is_private ? "🔒" : ""}
              </Link>
              {friendBtn(r.user_id)}
            </div>
          ))}
        </div>
      )}

      {/* INCOMING REQUESTS */}
      {incoming.length > 0 && (
        <div className="bg-violet-600/10 border border-violet-500/40 rounded-xl p-3 mb-4 grid gap-2">
          <p className="text-xs font-bold text-violet-300">🤝 FRIEND REQUESTS</p>
          {incoming.map((r) => (
            <div key={r.from_id} className="flex items-center gap-2">
              <span className="flex-1 text-sm font-bold truncate">{r.prof?.display_name || "Someone"}</span>
              <button onClick={() => accept(r.from_id)} className="px-3 py-1 rounded-full text-xs font-bold bg-green-600">
                ✅ Accept
              </button>
              <button onClick={() => reject(r.from_id)} className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800">
                ✖
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2 rounded-full text-xs font-bold ${tab === "all" ? "bg-violet-600" : "bg-slate-800 text-slate-400"}`}
        >
          🌍 Everyone
        </button>
        <button
          onClick={() => setTab("friends")}
          className={`px-4 py-2 rounded-full text-xs font-bold ${tab === "friends" ? "bg-violet-600" : "bg-slate-800 text-slate-400"}`}
        >
          🤝 Friends
        </button>
      </div>

      {/* COMPOSER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share your win today... 🏆"
          rows={2}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm resize-none"
        />
        {preview && (
          <div className="relative mt-2">
            <img src={preview} className="rounded-xl max-h-64 w-full object-cover" alt="" />
            <button
              onClick={() => {
                setPhoto(null);
                
                // FIX Mistake 2: Revoke object URL on clear
                if (preview) {
                  URL.revokeObjectURL(preview);
                }
                
                setPreview("");
              }}
              className="absolute top-2 right-2 bg-red-600 rounded-full w-7 h-7 text-xs font-bold"
            >
              ✖
            </button>
          </div>
        )}
        <div className="flex gap-2 mt-2">
          <label className="px-4 py-2 rounded-lg bg-slate-800 text-sm font-bold cursor-pointer">
            📷 Photo
            <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
          </label>
          <button
            onClick={publish}
            disabled={busy}
            className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 font-bold text-sm disabled:opacity-50"
          >
            {busy ? "⏳ Posting..." : "🚀 Post"}
          </button>
        </div>
      </div>

      {/* POSTS */}
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
              {friendBtn(p.user_id)}
            </div>
            {p.content && <p className="text-sm whitespace-pre-wrap mb-2">{p.content}</p>}
            {p.image_url && <img src={p.image_url} className="rounded-xl w-full max-h-96 object-cover mb-2" alt="" />}
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleLike(p.id)}
                className={`text-xs font-bold ${p.likedByMe ? "text-pink-400" : "text-slate-400"}`}
              >
                {p.likedByMe ? "❤️" : "🤍"} {p.likes}
              </button>
              {p.user_id === me && (
                <button onClick={() => deletePost(p)} className="text-xs font-bold text-red-400">
                  🗑 Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}