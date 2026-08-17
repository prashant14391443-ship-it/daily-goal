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
  bg: number;
  tc: string;
  bgc: string;
  tx: number;
  ty: number;
  created_at: string;
  likes: number;
  likedByMe: boolean;
  author?: Profile;
};

const BANNED = ["fuck", "shit", "bitch", "asshole", "dick", "pussy", "nigga", "nigger", "cunt", "whore", "bastard"];
const bad = (t: string) => BANNED.some((w) => t.toLowerCase().includes(w));

const BGS = [
  "from-violet-600/40 via-slate-900 to-fuchsia-600/30",
  "from-blue-600/40 via-slate-900 to-cyan-500/30",
  "from-green-600/40 via-slate-900 to-emerald-500/30",
  "from-orange-600/40 via-slate-900 to-amber-500/30",
  "from-pink-600/40 via-slate-900 to-rose-500/30",
  "from-red-600/40 via-slate-900 to-orange-500/30",
  "from-teal-600/40 via-slate-900 to-green-500/30",
  "from-indigo-600/40 via-slate-900 to-blue-500/30",
  "from-fuchsia-600/40 via-slate-900 to-pink-500/30",
  "from-slate-700/60 via-slate-900 to-slate-600/40",
];

const LEVELS = [
  { icon: "🥉", need: 0 },
  { icon: "🥈", need: 500 },
  { icon: "⚪", need: 1000 },
  { icon: "🥇", need: 2000 },
  { icon: "💎", need: 4000 },
  { icon: "🦸", need: 8000 },
  { icon: "⚡", need: 16000 },
  { icon: "🎓", need: 32000 },
  { icon: "👑", need: 64000 },
  { icon: "🐉", need: 128000 },
  { icon: "🌌", need: 256000 },
  { icon: "🦇", need: 512000 },
];
const rankOf = (c: number) => {
  let icon = LEVELS[0].icon;
  for (const l of LEVELS) if (c >= l.need) icon = l.icon;
  return icon;
};

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function compressImage(f: File, fileName: string = "image.jpg"): Promise<File> {
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
          (b) => resolve(new File([b || new Blob()], fileName, { type: "image/jpeg" })),
          "image/jpeg",
          0.72
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(f);
  });
}

function burnText(
  file: File,
  text: string,
  pos: { x: number; y: number },
  color: string
): Promise<File> {
  return new Promise((resolve) => {
    if (!text.trim()) return resolve(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0);
      const size = Math.max(16, Math.round(img.width / 20));
      ctx.font = `bold ${size}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const maxW = img.width * 0.9;
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        const t = cur ? cur + " " + w : w;
        if (ctx.measureText(t).width > maxW && cur) {
          lines.push(cur);
          cur = w;
        } else cur = t;
      }
      if (cur) lines.push(cur);
      const cx = (pos.x / 100) * img.width;
      const cy = (pos.y / 100) * img.height;
      const boxH = lines.length * size * 1.4 + size * 0.6;
      const boxW = Math.min(
        maxW,
        Math.max(...lines.map((l) => ctx.measureText(l).width)) + size
      );
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      const x0 = cx - boxW / 2;
      const y0 = cy - boxH / 2;
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === "function") {
        (ctx as any).roundRect(x0, y0, boxW, boxH, size * 0.5);
      } else {
        ctx.rect(x0, y0, boxW, boxH);
      }
      ctx.fill();
      ctx.fillStyle = color;
      lines.forEach((ln, i) => {
        ctx.fillText(ln, cx, cy + (i - (lines.length - 1) / 2) * size * 1.4);
      });
      canvas.toBlob(
        (b) => resolve(new File([b || new Blob()], "story.jpg", { type: "image/jpeg" })),
        "image/jpeg",
        0.72
      );
    };
    img.src = URL.createObjectURL(file);
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
  const [storyMap, setStoryMap] = useState<Map<string, any[]>>(new Map());
  const [profById, setProfById] = useState<Map<string, Profile>>(new Map());
  const [viewStory, setViewStory] = useState<{ user: string; index: number } | null>(null);
  const [creatingStory, setCreatingStory] = useState(false);
  const [sText, setSText] = useState("");
  const [sBg, setSBg] = useState(0);
  const [sBgc, setSBgc] = useState("");
  const [sTc, setSTc] = useState("#ffffff");
  const [sPos, setSPos] = useState({ x: 50, y: 50 });
  const sBoxRef = useRef<HTMLDivElement | null>(null);
  const sDragging = useRef(false);
  const [sPhoto, setSPhoto] = useState<File | null>(null);
  const [sPreview, setSPreview] = useState("");
  const [viewers, setViewers] = useState<string[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<"all" | "friends">("all");
  const [friends, setFriends] = useState<Set<string>>(new Set());
  const [sentReqs, setSentReqs] = useState<Set<string>>(new Set());
  const [incoming, setIncoming] = useState<{ from_id: string; prof?: Profile }[]>([]);
  const [burst, setBurst] = useState("");
  const [unread, setUnread] = useState(0);
  const [commentsMap, setCommentsMap] = useState<Map<string, any[]>>(new Map());
  const [commentOpen, setCommentOpen] = useState("");
  const [coinMap, setCoinMap] = useState<Map<string, number>>(new Map());
  const [commentText, setCommentText] = useState("");
  const [shareOpen, setShareOpen] = useState<Post | null>(null);

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    setMe(uid);

    const [p, prof, likes, myLikes, fr, sent, inc, commentsRes, notifRes] = await Promise.all([
      supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("profiles").select("*"),
      supabase.from("post_likes").select("post_id"),
      supabase.from("post_likes").select("post_id").eq("user_id", uid),
      supabase.from("friends").select("friend_id").eq("user_id", uid),
      supabase.from("friend_requests").select("to_id").eq("from_id", uid).eq("status", "pending"),
      supabase.from("friend_requests").select("from_id").eq("to_id", uid).eq("status", "pending"),
      supabase.from("post_comments").select("*").order("created_at", { ascending: true }),
      supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", uid).eq("read", false),
    ]);

    setUnread(notifRes.count || 0);

    const profMap = new Map<string, Profile>(((prof.data as any[]) || []).map((x) => [x.user_id, x]));
    setProfById(profMap);
    setMyProf(profMap.get(uid));

    const frSet = new Set((fr.data || []).map((f) => f.friend_id));
    const likeCount = new Map<string, number>();
    (likes.data || []).forEach((l) => likeCount.set(l.post_id, (likeCount.get(l.post_id) || 0) + 1));
    const mine = new Set((myLikes.data || []).map((l) => l.post_id));

    const cMap = new Map<string, any[]>();
    ((commentsRes.data as any[]) || []).forEach((c) => {
      const arr = cMap.get(c.post_id) || [];
      arr.push({ ...c, author: profMap.get(c.user_id) });
      cMap.set(c.post_id, arr);
    });
    setCommentsMap(cMap);

    setFriends(frSet);
    setSentReqs(new Set((sent.data || []).map((s) => s.to_id)));
    setIncoming((inc.data || []).map((r) => ({ from_id: r.from_id, prof: profMap.get(r.from_id) })));

    const cutoff = new Date(Date.now() - 24 * 3600000).toISOString();
    const { data: expired } = await supabase
      .from("stories")
      .select("*")
      .eq("user_id", uid)
      .lt("created_at", cutoff);

    const pathsToRemove = (expired || [])
      .map((s) => (s.image_url ? decodeURIComponent(s.image_url.split("/posts/")[1] || "") : ""))
      .filter(Boolean);

    if (pathsToRemove.length > 0) {
      await supabase.storage.from("posts").remove(pathsToRemove);
    }

    if ((expired || []).length > 0) {
      await supabase.from("stories").delete().eq("user_id", uid).lt("created_at", cutoff);
    }

    const { data: st } = await supabase
      .from("stories")
      .select("*")
      .gte("created_at", cutoff)
      .order("created_at");

    const smap = new Map<string, any[]>();
    ((st as any[]) || []).forEach((s) => {
      if (!smap.has(s.user_id)) smap.set(s.user_id, []);
      smap.get(s.user_id)!.push(s);
    });
    setStoryMap(smap);

    setPosts(
      ((p.data as any[]) || []).map((x) => ({
        id: x.id,
        user_id: x.user_id,
        content: x.content,
        image_url: (x.image_url as string | null) || "",
        bg: x.bg || 0,
        tc: x.tc || "#ffffff",
        bgc: x.bgc || "",
        tx: x.tx ?? 50,
        ty: x.ty ?? 50,
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

  useEffect(() => {
    const loadCoins = async () => {
      const { data } = await supabase.from("coin_log").select("user_id, coins");
      const m = new Map<string, number>();
      ((data as any[]) || []).forEach((r) =>
        m.set(r.user_id, (m.get(r.user_id) || 0) + (Number(r.coins) || 0))
      );
      setCoinMap(m);
    };
    loadCoins();
  }, [posts.length]);

  const moveSText = (clientX: number, clientY: number) => {
    const r = sBoxRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.min(95, Math.max(5, ((clientX - r.left) / r.width) * 100));
    const y = Math.min(95, Math.max(5, ((clientY - r.top) / r.height) * 100));
    setSPos({ x, y });
  };

  const deleteStory = async (s: any) => {
    if (!confirm("Delete this story?")) return;
    if (s.image_url) {
      const path = decodeURIComponent(s.image_url.split("/posts/")[1] || "");
      if (path) await supabase.storage.from("posts").remove([path]);
    }
    await supabase.from("stories").delete().eq("id", s.id);
    setViewStory(null);
    load();
  };

  const shareStory = async () => {
    if (!sText.trim() && !sPhoto) return;
    let url = "";
    if (sPhoto) {
      let small = await compressImage(sPhoto, "story.jpg");
      small = await burnText(small, sText, sPos, sTc);
      const path = `${me}/story-${Date.now()}.jpg`;
      await supabase.storage.from("posts").upload(path, small);
      url = supabase.storage.from("posts").getPublicUrl(path).data.publicUrl;
    }
    await supabase.from("stories").insert({
      user_id: me,
      content: sText.trim(),
      image_url: url || null,
      bg: sBg,
      tc: sTc,
      bgc: sBgc,
      tx: Math.round(sPos.x),
      ty: Math.round(sPos.y),
    });
    setCreatingStory(false);
    setSText("");
    setSPhoto(null);
    setSPreview("");
    load();
  };

  useEffect(() => {
    const record = async () => {
      if (!viewStory) return;
      const s = (storyMap.get(viewStory.user) || [])[viewStory.index];
      if (!s) return;
      if (s.user_id !== me) {
        await supabase
          .from("story_views")
          .upsert({ story_id: s.id, user_id: me }, { onConflict: "story_id,user_id" });
      } else {
        const { data: v } = await supabase
          .from("story_views")
          .select("user_id")
          .eq("story_id", s.id);
        const ids = (v || []).map((x) => x.user_id);
        if (ids.length > 0) {
          const { data: pr } = await supabase.from("profiles").select("*").in("user_id", ids);
          setViewers(((pr as any[]) || []).map((p) => p.display_name || "friend"));
        } else setViewers([]);
      }
    };
    record();
  }, [viewStory, storyMap, me]);

  useEffect(() => {
    if (!viewStory) return;
    const t = setTimeout(() => {
      const arr = storyMap.get(viewStory.user) || [];
      if (viewStory.index + 1 < arr.length)
        setViewStory({ user: viewStory.user, index: viewStory.index + 1 });
      else setViewStory(null);
    }, 5000);
    return () => clearTimeout(t);
  }, [viewStory, storyMap]);

  const externalShare = async (p: Post) => {
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

  const sendToFriend = async (fid: string, fname: string) => {
    if (!shareOpen) return;
    const txt = `📤 Shared post: "${shareOpen.content || "📸 photo"}" — by ${
      shareOpen.author?.display_name || "friend"
    }`;
    await supabase.from("messages").insert({ sender_id: me, receiver_id: fid, content: txt });
    await supabase.from("notifications").insert({
      user_id: fid,
      actor_id: me,
      type: "message",
      text: `📤 ${myProf?.display_name || "Someone"} shared a post with you`,
    });
    setShareOpen(null);
    alert(`✅ Sent to ${fname}!`);
  };

  const like = async (id: string) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    if (post.likedByMe) await supabase.from("post_likes").delete().eq("user_id", me).eq("post_id", id);
    else {
      await supabase.from("post_likes").insert({ user_id: me, post_id: id });
    }
    load();
  };

  const doubleTap = (p: Post) => {
    setBurst(p.id);
    if (!p.likedByMe) like(p.id);
    setTimeout(() => setBurst(""), 800);
  };

  const addComment = async (p: Post) => {
    if (!commentText.trim()) return;
    if (bad(commentText)) {
      alert("🚫 Keep it clean!");
      return;
    }
    await supabase.from("post_comments").insert({
      post_id: p.id,
      user_id: me,
      content: commentText.trim(),
    });
    if (p.user_id !== me)
      await supabase.from("notifications").insert({
        user_id: p.user_id,
        actor_id: me,
        type: "comment",
        text: `💬 ${myProf?.display_name || "Someone"} commented on your post`,
      });
    setCommentText("");
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
        <button
          onClick={() => setTab(tab === "all" ? "friends" : "all")}
          className="text-xs font-bold bg-slate-800 px-3 py-1.5 rounded-full"
        >
          {tab === "all" ? "🌍 Public" : "🔒 Private"}
        </button>
      </div>

      {/* STORIES ROW */}
      <div className="flex gap-3 overflow-x-auto px-4 py-3 border-b border-slate-800">
        <div className="flex flex-col items-center gap-1 shrink-0 cursor-pointer">
          <span className="relative inline-block">
            <span
              onClick={() => (storyMap.has(me) ? setViewStory({ user: me, index: 0 }) : setCreatingStory(true))}
              className={
                storyMap.has(me)
                  ? "rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-fuchsia-600 p-[2px] inline-block"
                  : "inline-block"
              }
            >
              <Avatar p={myProf} size="w-14 h-14" />
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCreatingStory(true);
              }}
              className="absolute bottom-0 right-0 bg-violet-600 border-2 border-slate-950 rounded-full w-5 h-5 text-[10px] font-bold flex items-center justify-center"
            >
              +
            </button>
          </span>
          <span className="text-[10px] text-slate-400">Your story</span>
        </div>

        {Array.from(storyMap.keys())
          .filter((u) => u !== me)
          .map((u) => (
            <button
              key={u}
              onClick={() => setViewStory({ user: u, index: 0 })}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <Avatar p={profById.get(u)} size="w-14 h-14" ring />
              <span className="text-[10px] text-slate-400 max-w-14 truncate">
                {rankOf(coinMap.get(u) || 0)} {profById.get(u)?.display_name || "friend"}
              </span>
            </button>
          ))}
        {storyMap.size <= (storyMap.has(me) ? 1 : 0) && (
          <p className="text-[10px] text-slate-500 self-center">
            Tap "Your story" to share a 24h status! 👻
          </p>
        )}
      </div>

      {/* REQUESTS */}
      {incoming.length > 0 && (
        <div className="mx-4 my-3 bg-violet-600/10 border border-violet-500/40 rounded-xl p-3 grid gap-2">
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

      {/* POSTS */}
      {shown.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-10">No posts yet — be the first! 🌟</p>
      )}
      {shown.map((p) => (
        <article key={p.id} className="border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2 px-4 py-2">
            <Link href={`/profile?user=${p.user_id}`}>
              <Avatar p={p.author} ring={false} />
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/profile?user=${p.user_id}`} className="font-bold text-sm block truncate">
                {rankOf(coinMap.get(p.user_id) || 0)} {p.author?.display_name || "friend"}
              </Link>
              <p className="text-[10px] text-slate-500">{ago(p.created_at)}</p>
            </div>
            {friendBtn(p.user_id)}
          </div>

          <div className="relative" onDoubleClick={() => doubleTap(p)}>
            {p.image_url ? (
              <img src={p.image_url} className="w-full aspect-square object-cover" alt="" />
            ) : (
              <div
                className={`relative w-full aspect-square ${
                  p.bgc ? "" : `bg-gradient-to-br ${BGS[(p.bg || 0) % BGS.length]}`
                }`}
                style={p.bgc ? { background: p.bgc } : undefined}
              >
                <p
                  className="absolute text-center text-2xl font-bold whitespace-pre-wrap px-4"
                  style={{
                    left: `${p.tx ?? 50}%`,
                    top: `${p.ty ?? 50}%`,
                    transform: "translate(-50%, -50%)",
                    color: p.tc || "#ffffff",
                  }}
                >
                  {p.content}
                </p>
              </div>
            )}
            {burst === p.id && (
              <span className="absolute inset-0 flex items-center justify-center text-8xl animate-bounce pointer-events-none">
                ❤️
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 px-4 py-2">
            <button onClick={() => like(p.id)} className="text-2xl">
              {p.likedByMe ? "❤️" : "🤍"}
            </button>
            <button
              onClick={() => {
                setCommentOpen(commentOpen === p.id ? "" : p.id);
                setCommentText("");
              }}
              className="text-2xl"
            >
              💬
            </button>
            <button onClick={() => setShareOpen(p)} className="text-2xl">
              📤
            </button>
            <span className="flex-1" />
            {p.user_id === me && (
              <button onClick={() => deletePost(p)} className="text-sm">
                🗑
              </button>
            )}
          </div>

          <p className="px-4 text-sm font-bold">{p.likes} likes</p>
          <p className="px-4 text-[10px] text-slate-500">
            💬 {(commentsMap.get(p.id) || []).length} comments
          </p>
          {commentOpen === p.id && (
            <div className="px-4 mt-2 grid gap-2">
              {(commentsMap.get(p.id) || []).length === 0 && (
                <p className="text-xs text-slate-500">No comments yet — be first!</p>
              )}
              {(commentsMap.get(p.id) || []).map((c) => (
                <div key={c.id} className="text-sm bg-slate-900 rounded-xl px-3 py-2">
                  <span className="font-bold">{c.author?.display_name || "friend"}</span>{" "}
                  <span>{c.content}</span>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 p-2 rounded-full bg-slate-900 border border-slate-700 text-sm"
                />
                <button
                  onClick={() => addComment(p)}
                  className="px-4 rounded-full bg-violet-600 text-xs font-bold"
                >
                  Post
                </button>
              </div>
            </div>
          )}
        </article>
      ))}

      {/* STORY VIEWER */}
      {viewStory && (storyMap.get(viewStory.user) || [])[viewStory.index] && (
        <div className="fixed inset-0 z-[70] bg-black flex flex-col">
          <div className="flex gap-1 p-2">
            {(storyMap.get(viewStory.user) || []).map((s, i) => (
              <div key={s.id} className="flex-1 h-1 bg-slate-700 rounded">
                {i <= viewStory.index && <div className="h-full bg-white rounded" />}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-2">
            <Avatar p={profById.get(viewStory.user)} size="w-8 h-8" />
            <p className="text-xs font-bold flex-1 text-white">
              {profById.get(viewStory.user)?.display_name || "friend"}
            </p>
            {(storyMap.get(viewStory.user) || [])[viewStory.index]?.user_id === me && (
              <button
                onClick={() => deleteStory((storyMap.get(viewStory.user) || [])[viewStory.index])}
                className="text-lg"
              >
                🗑
              </button>
            )}
            <button onClick={() => setViewStory(null)} className="text-xl text-white">
              ✖
            </button>
          </div>
          <div
            className="flex-1 relative flex items-center justify-center"
            onClick={() => {
              const arr = storyMap.get(viewStory.user) || [];
              if (viewStory.index + 1 < arr.length)
                setViewStory({ user: viewStory.user, index: viewStory.index + 1 });
              else setViewStory(null);
            }}
          >
            {(storyMap.get(viewStory.user) || [])[viewStory.index].image_url ? (
              <img
                src={(storyMap.get(viewStory.user) || [])[viewStory.index].image_url}
                className="w-full h-full object-contain"
                alt=""
              />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center p-8 ${
                  (storyMap.get(viewStory.user) || [])[viewStory.index].bgc
                    ? ""
                    : `bg-gradient-to-br ${
                        BGS[((storyMap.get(viewStory.user) || [])[viewStory.index].bg || 0) % BGS.length]
                      }`
                }`}
                style={
                  (storyMap.get(viewStory.user) || [])[viewStory.index].bgc
                    ? { background: (storyMap.get(viewStory.user) || [])[viewStory.index].bgc }
                    : undefined
                }
              >
                <p
                  className="absolute text-center text-2xl font-bold whitespace-pre-wrap px-6"
                  style={{
                    left: `${(storyMap.get(viewStory.user) || [])[viewStory.index].tx ?? 50}%`,
                    top: `${(storyMap.get(viewStory.user) || [])[viewStory.index].ty ?? 50}%`,
                    transform: "translate(-50%, -50%)",
                    color: (storyMap.get(viewStory.user) || [])[viewStory.index].tc || "#ffffff",
                  }}
                >
                  {(storyMap.get(viewStory.user) || [])[viewStory.index].content}
                </p>
              </div>
            )}
          </div>
          <p className="p-3 text-[10px] text-slate-400 text-center">
            {(storyMap.get(viewStory.user) || [])[viewStory.index]?.user_id === me
              ? `👁 Seen by ${viewers.length}: ${viewers.slice(0, 5).join(", ") || "no one yet"}`
              : "⏳ Disappears in 24h • tap to next"}
          </p>
        </div>
      )}

      {/* STORY COMPOSER */}
      {creatingStory && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 flex items-end"
          onClick={() => setCreatingStory(false)}
        >
          <div
            className="w-full bg-slate-900 rounded-t-2xl p-4 grid gap-3 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <p className="font-bold">👻 New story (24h)</p>
              <button onClick={() => setCreatingStory(false)} className="text-slate-400">
                ✖
              </button>
            </div>

            {sPreview ? (
              <div>
                <div
                  ref={sBoxRef}
                  className="relative rounded-xl overflow-hidden touch-none select-none cursor-move"
                  onPointerDown={(e) => {
                    sDragging.current = true;
                    moveSText(e.clientX, e.clientY);
                  }}
                  onPointerMove={(e) => {
                    if (sDragging.current) moveSText(e.clientX, e.clientY);
                  }}
                  onPointerUp={() => (sDragging.current = false)}
                >
                  <img src={sPreview} className="w-full max-h-72 object-cover" alt="" />
                  {sText.trim() && (
                    <p
                      className="absolute font-bold text-center px-3 py-1 rounded-lg pointer-events-none"
                      style={{
                        left: `${sPos.x}%`,
                        top: `${sPos.y}%`,
                        transform: "translate(-50%, -50%)",
                        color: sTc,
                        background: "rgba(0,0,0,0.45)",
                      }}
                    >
                      {sText}
                    </p>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 text-center mt-1">
                  ✋ Drag on photo to place your text
                </p>
                <button
                  onClick={() => {
                    setSPhoto(null);
                    setSPreview("");
                  }}
                  className="mt-1 w-full py-2 rounded-lg bg-red-600/20 text-red-400 text-xs font-bold"
                >
                  ✖ Remove photo
                </button>
              </div>
            ) : (
              <div
                ref={sBoxRef}
                className={`relative rounded-xl overflow-hidden touch-none select-none cursor-move aspect-square ${
                  sBgc ? "" : `bg-gradient-to-br ${BGS[sBg]}`
                }`}
                style={sBgc ? { background: sBgc } : undefined}
                onPointerDown={(e) => {
                  sDragging.current = true;
                  moveSText(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (sDragging.current) moveSText(e.clientX, e.clientY);
                }}
                onPointerUp={() => (sDragging.current = false)}
              >
                <p
                  className="absolute font-bold text-center text-2xl whitespace-pre-wrap px-4 pointer-events-none"
                  style={{
                    left: `${sPos.x}%`,
                    top: `${sPos.y}%`,
                    transform: "translate(-50%, -50%)",
                    color: sTc,
                  }}
                >
                  {sText || "Type below..."}
                </p>
              </div>
            )}

            <div className="relative">
              <textarea
                value={sText}
                onChange={(e) => setSText(e.target.value)}
                rows={2}
                placeholder="Write a status..."
                style={{ color: sTc }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pb-9 text-sm resize-none"
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-3">
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  BG
                  <input
                    type="color"
                    value={sBgc || "#1e293b"}
                    onChange={(e) => setSBgc(e.target.value)}
                    className="w-6 h-6 rounded-md cursor-pointer p-0 border border-slate-600 bg-transparent"
                  />
                </label>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  Text
                  <input
                    type="color"
                    value={sTc}
                    onChange={(e) => setSTc(e.target.value)}
                    className="w-6 h-6 rounded-md cursor-pointer p-0 border border-slate-600 bg-transparent"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {BGS.map((g, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSBg(i);
                    setSBgc("");
                  }}
                  className={`w-8 h-8 shrink-0 rounded-full bg-gradient-to-br ${g} border-2 ${
                    sBg === i && !sBgc ? "border-white" : "border-transparent"
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <label className="px-4 py-2 rounded-lg bg-slate-800 text-sm font-bold cursor-pointer">
                📷
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setSPhoto(f);
                      setSPreview(URL.createObjectURL(f));
                      setSPos({ x: 50, y: 50 });
                    }
                  }}
                  className="hidden"
                />
              </label>
              <button
                onClick={shareStory}
                className="flex-1 py-2 rounded-lg bg-violet-600 font-bold text-sm"
              >
                Share story
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE SHEET */}
      {shareOpen && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-end" onClick={() => setShareOpen(null)}>
          <div
            className="w-full bg-slate-900 rounded-t-2xl p-4 grid gap-2 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <p className="font-bold">📤 Share post</p>
              <button onClick={() => setShareOpen(null)}>✖</button>
            </div>
            <button
              onClick={() => externalShare(shareOpen)}
              className="py-2 rounded-lg bg-slate-800 text-sm font-bold"
            >
              📱 Share outside (WhatsApp etc.)
            </button>
            <p className="text-xs text-slate-500">Send to friend:</p>
            {Array.from(friends)
              .map((id) => profById.get(id))
              .filter((x) => !!x)
              .map((f) => (
                <button
                  key={f!.user_id}
                  onClick={() => sendToFriend(f!.user_id, f!.display_name || "friend")}
                  className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/60 text-left"
                >
                  {f!.avatar_url ? (
                    <img src={f!.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center font-bold text-sm">
                      {(f!.display_name || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="flex-1 text-sm font-bold">{f!.display_name || "friend"}</span>
                  <span>📤</span>
                </button>
              ))}
            {friends.size === 0 && (
              <p className="text-xs text-slate-500 text-center py-2">No friends yet — find some first!</p>
            )}
          </div>
        </div>
      )}

      {/* INSTA BOTTOM BAR */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-900 border-t border-slate-800 grid grid-cols-4 md:hidden">
        <Link
          href="/dashboard"
          className="flex flex-col items-center py-2 text-[10px] text-slate-500"
        >
          <span className="text-lg">🏠</span>
          Home
        </Link>
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