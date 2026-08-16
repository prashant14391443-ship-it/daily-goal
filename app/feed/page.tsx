"use client";

import { useEffect, useState } from "react";
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
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
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

function Avatar({ p, size = "w-9 h-9", ring = false }: { p?: Profile; size?: string; ring?: boolean }) {
  const inner = p?.avatar_url ? (
    <img src={p.avatar_url} className={`${size} rounded-full object-cover border-2 border-slate-950`} alt="" />
  ) : (
    <span className={`${size} rounded-full bg-violet-600 border-2 border-slate-950 flex items-center justify-center font-bold`}>
      {(p?.display_name || "?").charAt(0).toUpperCase()}
    </span>
  );
  if (!ring) return inner;
  return (
    <span className="rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-fuchsia-600 p-[2px] inline-block">
      {inner}
    </span>
  );
}

export default function FeedPage() {
  const [me, setMe] = useState("");
  const [myProf, setMyProf] = useState<Profile | undefined>();
  const [stories, setStories] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"all" | "friends">("all");
  const [friends, setFriends] = useState<Set<string>>(new Set());
  const [sentReqs, setSentReqs] = useState<Set<string>>(new Set());
  const [incoming, setIncoming] = useState<{ from_id: string; prof?: Profile }[]>([]);
  const [burst, setBurst] = useState("");
  const [creating, setCreating] = useState(false);
  const [unread, setUnread] = useState(0);

  // FIX Mistake 1, 2, 3: Define state variables q and results
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Profile[]>([]);

  // FIX Mistake 5: loadUnread(uid) was called but is not defined in provided code. Commented out.
  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    setMe(uid);
    // loadUnread(uid);
    const [p, prof, likes, myLikes, fr, sent, inc] = await Promise.all([
      supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("profiles").select("*"),
      supabase.from("post_likes").select("post_id"),
      supabase.from("post_likes").select("post_id").eq("user_id", uid),
      supabase.from("friends").select("friend_id").eq("user_id", uid),
      supabase.from("friend_requests").select("to_id").eq("from_id", uid).eq("status", "pending"),
      supabase.from("friend_requests").select("from_id").eq("to_id", uid).eq("status", "pending"),
    ]);
    const profMap = new Map<string, Profile>(((prof.data as any[]) || []).map((x) => [x.user_id, x]));
    const frSet = new Set((fr.data || []).map((f) => f.friend_id));
    const likeCount = new Map<string, number>();
    (likes.data || []).forEach((l) => likeCount.set(l.post_id, (likeCount.get(l.post_id) || 0) + 1));
    const mine = new Set((myLikes.data || []).map((l) => l.post_id));
    setFriends(frSet);
    setMyProf(profMap.get(uid));
    setStories(((prof.data as any[]) || []).filter((x) => frSet.has(x.user_id)));
    setSentReqs(new Set((sent.data || []).map((s) => s.to_id)));
    setIncoming((inc.data || []).map((r) => ({ from_id: r.from_id, prof: profMap.get(r.from_id) })));

    // FIX Mistake 7: Improved variable type robustness with manual casting and manual mapping validation to match Post type.
    setPosts(
      ((p.data as any[]) || []).map((x) => ({
        id: x.id,
        user_id: x.user_id,
        content: x.content,
        image_url: (x.image_url as string | null) || "",
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
    const { data } = await supabase.from("profiles").select("*").ilike("display_name", `%${q.trim()}%`).limit(10);
    setResults(((data as any[]) || []).filter((r) => r.user_id !== me));
  };

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      alert("Images only!");
      return;
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
    const { data: frs } = await supabase.from("friends").select("friend_id").eq("user_id", me);
    const notifs = (frs || []).map((f) => ({
      user_id: f.friend_id,
      actor_id: me,
      type: "post",
      text: `📸 ${myProf?.display_name || "A friend"} shared a new post`,
    }));
    if (notifs.length > 0) await supabase.from("notifications").insert(notifs);
    setText("");
    setPhoto(null);
    setPreview("");
    setBusy(false);
    load();
  };

  const like = async (id: string) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    if (post.likedByMe) await supabase.from("post_likes").delete().eq("user_id", me).eq("post_id", id);
    else {
      await supabase.from("post_likes").insert({ user_id: me, post_id: id });
      if (post.user_id !== me)
        await supabase.from("notifications").insert({
          user_id: post.user_id,
          actor_id: me,
          type: "like",
          text: `❤️ ${myProf?.display_name || "Someone"} liked your post`,
        });
    }
    load();
  };

  const doubleTap = (p: Post) => {
    setBurst(p.id);
    // FIX Mistake 6: Correct logical error where double tap logic can unlike the post. Moved setTimeout after condition check.
    if (!p.likedByMe) like(p.id);
    setTimeout(() => setBurst(""), 800);
  };

  const sharePost = async (p: Post) => {
    const txt = `${p.author?.display_name || "Friend"} on FriendFeed: ${p.content || "📸 photo"}`;
    try {
      await navigator.share({ text: txt });
    } catch {
      try {
        await navigator.clipboard.writeText(txt);
        alert("📋 Copied!");
      } catch {
        // ignore
      }
    }
  };

  const editPost = async (p: Post) => {
    const t = prompt("Edit your post:", p.content || "");
    if (t === null) return;
    if (bad(t)) {
      alert("🚫 Keep it clean!");
      return;
    }
    await supabase.from("posts").update({ content: t.trim() }).eq("id", p.id);
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
      return <span className="text-[10px] font-bold text-green-400 shrink-0">✓ Friends</span>;
    if (sentReqs.has(uid))
      return <span className="text-[10px] font-bold text-slate-500 shrink-0">⏳ Requested</span>;
    return (
      <button onClick={() => addFriend(uid)} className="text-[10px] font-bold text-violet-400 shrink-0">
        + Follow
      </button>
    );
  };

  const visible = posts.filter((p) => !p.author?.is_private || p.user_id === me || friends.has(p.user_id));
  const shown = tab === "all" ? visible : visible.filter((p) => friends.has(p.user_id) || p.user_id === me);

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-24">
      {/* TOP BAR */}
      <div className="flex items-center justify-between p-4 pr-28 border-b border-slate-800">
        <p className="font-black text-xl tracking-tight">
          📰 Friend<span className="text-fuchsia-400">Feed</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setTab(tab === "all" ? "friends" : "all")}
            className="text-xs font-bold bg-slate-800 px-3 py-1.5 rounded-full"
          >
            {tab === "all" ? "🌍 Public" : "🔒 Private"}
          </button>
          <button
            onClick={() => setCreating(true)}
            className="text-base font-bold bg-slate-800 px-3 py-1 rounded-full"
          >
            ➕
          </button>
          <Link href="/activity" className="relative text-base font-bold bg-slate-800 px-3 py-1 rounded-full">
            ❤️
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5">
                {unread}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* STORIES ROW */}
      <div className="flex gap-3 overflow-x-auto px-4 py-3 border-b border-slate-800">
        <Link href={`/profile?user=${me}`} className="flex flex-col items-center gap-1 shrink-0">
          <span className="relative inline-block">
            <Avatar p={myProf} size="w-14 h-14" />
            <span className="absolute bottom-0 right-0 bg-violet-600 border-2 border-slate-950 rounded-full w-5 h-5 text-[10px] font-bold flex items-center justify-center">
              +
            </span>
          </span>
          <span className="text-[10px] text-slate-400">You</span>
        </Link>
        {stories.map((s) => (
          <Link key={s.user_id} href={`/profile?user=${s.user_id}`} className="flex flex-col items-center gap-1 shrink-0">
            <Avatar p={s} size="w-14 h-14" ring />
            <span className="text-[10px] text-slate-400 max-w-14 truncate">{s.display_name}</span>
          </Link>
        ))}
        {stories.length === 0 && (
          <p className="text-[10px] text-slate-500 self-center">Search people below to add friends → they appear here!</p>
        ) }
      </div>

     

      {/* REQUESTS */}
      {incoming.length > 0 && (
        <div className="mx-4 mb-3 bg-violet-600/10 border border-violet-500/40 rounded-xl p-3 grid gap-2">
          <p className="text-xs font-bold text-violet-300">🤝 FRIEND REQUESTS</p>
          {incoming.map((r) => (
            <div key={r.from_id} className="flex items-center gap-2">
              <Avatar p={r.prof} />
              <span className="flex-1 text-sm font-bold truncate">{r.prof?.display_name || "Someone"}</span>
              <button onClick={() => accept(r.from_id)} className="px-3 py-1 rounded-full text-xs font-bold bg-green-600">
                Accept
              </button>
              <button onClick={() => reject(r.from_id)} className="px-2 py-1 rounded-full text-xs font-bold bg-slate-800">
                ✖
              </button>
            </div>
          ))}
        </div>
      )}

  

      {/* POSTS — INSTA STYLE */}
      {shown.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-10">No posts yet — be the first! 🌟</p>
      )}
      {shown.map((p) => (
        <article key={p.id} className="border-b border-slate-800 pb-3 mb-3">
          {/* header */}
          <div className="flex items-center gap-2 px-4 py-2">
            <Link href={`/profile?user=${p.user_id}`}>
              {/* FIX Mistake 8: Changed Design mismatch where Avatar was using ringgradient incorrectly. */}
              <Avatar p={p.author} ring={false} />
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/profile?user=${p.user_id}`} className="font-bold text-sm block truncate">
                {p.author?.display_name || "friend"}
              </Link>
              <p className="text-[10px] text-slate-500">{ago(p.created_at)}</p>
            </div>
            {friendBtn(p.user_id)}
          </div>

          {/* media */}
          <div className="relative" onDoubleClick={() => doubleTap(p)}>
            {p.image_url ? (
              <img src={p.image_url} className="w-full aspect-square object-cover" alt="" />
            ) : (
              <div className="w-full aspect-square bg-gradient-to-br from-violet-600/30 via-slate-900 to-fuchsia-600/20 flex items-center justify-center p-8">
                <p className="text-center text-lg font-bold whitespace-pre-wrap">{p.content}</p>
              </div>
            )}
            {burst === p.id && (
              <span className="absolute inset-0 flex items-center justify-center text-8xl animate-bounce pointer-events-none">
                ❤️
              </span>
            )}
          </div>

          {/* actions */}
          <div className="flex items-center gap-3 px-4 py-2">
            <button onClick={() => like(p.id)} className="text-2xl">
              {p.likedByMe ? "❤️" : "🤍"}
            </button>
            <button onClick={() => sharePost(p)} className="text-2xl">
              📤
            </button>
            <span className="flex-1" />
            {p.user_id === me && (
              <div className="flex items-center gap-2">
                <button onClick={() => editPost(p)} className="text-sm">
                  ✏️
                </button>
                <button onClick={() => deletePost(p)} className="text-sm">
                  🗑
                </button>
              </div>
            )}
          </div>

          <p className="px-4 text-sm font-bold">{p.likes} likes</p>
          {p.image_url && p.content && (
            <p className="px-4 text-sm mt-1">
              <span className="font-bold">{p.author?.display_name}</span> {p.content}
            </p>
          )}
        </article>
      ))}

      {/* CREATE SHEET */}
      {creating && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={() => setCreating(false)}>
          <div className="w-full bg-slate-900 rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <p className="font-bold">📸 New post</p>
              <button onClick={() => setCreating(false)} className="text-slate-400">✖</button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your win today... 🏆"
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm resize-none"
            />
            {preview && (
              <div className="relative mt-2">
                <img src={preview} className="rounded-xl max-h-64 w-full object-cover" alt="" />
                <button
                  onClick={() => {
                    setPhoto(null);
                    setPreview("");
                  }}
                  className="absolute top-2 right-2 bg-red-600 rounded-full w-7 h-7 text-xs font-bold"
                >
                  ✖
                </button>
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <label className="px-4 py-2 rounded-lg bg-slate-800 text-sm font-bold cursor-pointer">
                📷 Photo
                <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
              </label>
              <button
                onClick={async () => {
                  await publish();
                  setCreating(false);
                }}
                disabled={busy}
                className="flex-1 py-2 rounded-lg bg-violet-600 font-bold text-sm disabled:opacity-50"
              >
                🚀 Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSTA BOTTOM BAR */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-900 border-t border-slate-800 grid grid-cols-4 md:hidden">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex flex-col items-center py-2 text-[10px] text-white"
        >
          <span className="text-lg">🏠</span>
          Feed
        </button>
        <Link href="/search" className="flex flex-col items-center py-2 text-[10px] text-slate-500">
          <span className="text-lg">🔍</span>
          Search
        </Link>
        <Link href="/activity" className="relative flex flex-col items-center py-2 text-[10px] text-slate-500">
          <span className="text-lg">❤️</span>
          Activity
          {unread > 0 && (
            <span className="absolute top-1 left-1/2 ml-2 bg-red-600 text-white text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
              {unread}
            </span>
          )}
        </Link>
        <Link href={`/profile?user=${me}`} className="flex flex-col items-center py-2 text-[10px] text-slate-500">
          <span className="text-lg">👤</span>
          Profile
        </Link>
      </nav>
    </main>
  );
}