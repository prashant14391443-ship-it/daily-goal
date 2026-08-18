"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { SEASON_LEVELS, levelOf, seasonInfo } from "@/lib/seasons";
import InstallApp from "@/app/components/InstallApp";


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

const rankOf = (c: number) => levelOf(SEASON_LEVELS, c).icon;

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
    <span className="rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-fuchsia-600 p-[2px] inline-block hover:scale-105 transition-transform cursor-pointer">
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
    const claim = async () => {
      if (!me) return;
      const inv = localStorage.getItem("ff-inv");
      if (!inv || inv === me) return;
      const { error } = await supabase
        .from("invites")
        .insert({ inviter_id: inv, invitee_id: me });
      if (!error) {
        await supabase.from("coin_log").insert([
          { user_id: me, action_key: `inv-${me}`, coins: 5 },
          { user_id: inv, action_key: `inv-${me}`, coins: 10 },
        ]);
        await supabase.from("notifications").insert({
          user_id: inv,
          actor_id: me,
          type: "friend",
          text: `🎉 A friend joined via your invite! +10 🪙`,
        });
        localStorage.removeItem("ff-inv");
        load();
      }
    };
    claim();
  }, [me]);

  useEffect(() => {
    const loadCoins = async () => {
      const s = seasonInfo();
      const { data } = await supabase
        .from("coin_log")
        .select("user_id, coins, created_at");
      const m = new Map<string, number>();
      ((data as any[]) || [])
        .filter((r) => r.created_at >= s.startISO)
        .forEach((r) =>
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
      <button onClick={() => addFriend(uid)} className="text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors shrink-0">
        + Follow
      </button>
    );
  };

  const visible = posts.filter((p) => !p.author?.is_private || p.user_id === me || friends.has(p.user_id));
  const shown = tab === "all" ? visible : visible.filter((p) => friends.has(p.user_id) || p.user_id === me);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex justify-center pb-[70px]">
      {/* 
        Responsive Container: 
        max-w-xl limits the width to look like a standard phone/feed width on a desktop.
        border-x gives it a nice column layout feel on large screens. 
      */}
      <div className="w-full max-w-xl bg-slate-950 min-h-screen md:border-x md:border-slate-800/50 relative">
        
        {/* TOP BAR */}
        <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur flex items-center justify-between p-4 border-b border-slate-800">
          <p className="font-black text-xl tracking-tight cursor-pointer hover:opacity-80 transition-opacity">
            📰 Friend<span className="text-fuchsia-400">Feed</span>
          </p>
          <div className="flex items-center gap-3">
            <Link href="/leaderboard" className="text-lg hover:scale-110 transition-transform">
              🏆
            </Link>
            <button
              onClick={() => setTab(tab === "all" ? "friends" : "all")}
              className="text-xs font-bold bg-slate-800 hover:bg-slate-700 transition-colors px-3 py-1.5 rounded-full"
            >
              {tab === "all" ? "🌍 Public" : "🔒 Private"}
            </button>
          </div>
        </div>

        <InstallApp />

        {/* STORIES ROW */}
        <div className="flex gap-4 overflow-x-auto px-4 py-4 border-b border-slate-800 scrollbar-hide">
          <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group">
            <span className="relative inline-block">
              <span
                onClick={() => (storyMap.has(me) ? setViewStory({ user: me, index: 0 }) : setCreatingStory(true))}
                className={
                  storyMap.has(me)
                    ? "rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-fuchsia-600 p-[2px] inline-block hover:scale-105 transition-transform"
                    : "inline-block group-hover:scale-105 transition-transform"
                }
              >
                <Avatar p={myProf} size="w-16 h-16" />
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCreatingStory(true);
                }}
                className="absolute bottom-0 right-0 bg-violet-600 hover:bg-violet-500 transition-colors border-2 border-slate-950 rounded-full w-6 h-6 text-[12px] font-bold flex items-center justify-center"
              >
                +
              </button>
            </span>
            <span className="text-[11px] text-slate-400">Your story</span>
          </div>

          {Array.from(storyMap.keys())
            .filter((u) => u !== me)
            .map((u) => (
              <button
                key={u}
                onClick={() => setViewStory({ user: u, index: 0 })}
                className="flex flex-col items-center gap-1.5 shrink-0 group"
              >
                <Avatar p={profById.get(u)} size="w-16 h-16" ring />
                <span className="text-[11px] text-slate-400 max-w-[64px] truncate group-hover:text-slate-300 transition-colors">
                  {rankOf(coinMap.get(u) || 0)} {profById.get(u)?.display_name || "friend"}
                </span>
              </button>
            ))}
          {storyMap.size <= (storyMap.has(me) ? 1 : 0) && (
            <p className="text-xs text-slate-500 self-center ml-2">
              Tap "Your story" to share a 24h status! 👻
            </p>
          )}
        </div>

        {/* REQUESTS */}
        {incoming.length > 0 && (
          <div className="mx-4 my-4 bg-violet-600/10 border border-violet-500/40 rounded-xl p-3 grid gap-3">
            <p className="text-xs font-bold text-violet-300">🤝 FRIEND REQUESTS</p>
            {incoming.map((r) => (
              <div key={r.from_id} className="flex items-center gap-3">
                <Avatar p={r.prof} />
                <span className="flex-1 text-sm font-bold truncate">{r.prof?.display_name || "Someone"}</span>
                <button onClick={() => accept(r.from_id)} className="px-4 py-1.5 rounded-full text-xs font-bold bg-green-600 hover:bg-green-500 transition-colors">
                  Accept
                </button>
                <button onClick={() => reject(r.from_id)} className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-800 hover:bg-slate-700 transition-colors">
                  ✖
                </button>
              </div>
            ))}
          </div>
        )}

        {/* POSTS */}
        {shown.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <span className="text-4xl mb-3">🌟</span>
            <p className="text-sm">No posts yet — be the first!</p>
          </div>
        )}
        {shown.map((p) => (
          <article key={p.id} className="border-b border-slate-800 pb-4 mb-2">
            <div className="flex items-center gap-3 px-4 py-3">
              <Link href={`/profile?user=${p.user_id}`}>
                <Avatar p={p.author} ring={false} />
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/profile?user=${p.user_id}`} className="font-bold text-[15px] hover:underline block truncate">
                  {rankOf(coinMap.get(p.user_id) || 0)} {p.author?.display_name || "friend"}
                </Link>
                <p className="text-xs text-slate-500">{ago(p.created_at)}</p>
              </div>
              {friendBtn(p.user_id)}
            </div>

            <div className="relative cursor-pointer" onDoubleClick={() => doubleTap(p)}>
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
                    className="absolute text-center text-3xl font-bold whitespace-pre-wrap px-6 leading-snug w-full"
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
                <span className="absolute inset-0 flex items-center justify-center text-9xl animate-bounce pointer-events-none drop-shadow-2xl">
                  ❤️
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 px-4 py-3">
              <button onClick={() => like(p.id)} className="text-2xl hover:scale-110 transition-transform">
                {p.likedByMe ? "❤️" : "🤍"}
              </button>
              <button
                onClick={() => {
                  setCommentOpen(commentOpen === p.id ? "" : p.id);
                  setCommentText("");
                }}
                className="text-2xl hover:scale-110 transition-transform grayscale hover:grayscale-0"
              >
                💬
              </button>
              <button onClick={() => setShareOpen(p)} className="text-2xl hover:scale-110 transition-transform grayscale hover:grayscale-0">
                📤
              </button>
              <span className="flex-1" />
              {p.user_id === me && (
                <button onClick={() => deletePost(p)} className="text-lg opacity-50 hover:opacity-100 hover:text-red-400 transition-all">
                  🗑
                </button>
              )}
            </div>

            <p className="px-4 text-[15px] font-bold">{p.likes} likes</p>
            <p className="px-4 text-xs text-slate-500 mt-1 cursor-pointer hover:underline" onClick={() => setCommentOpen(commentOpen === p.id ? "" : p.id)}>
              View all {(commentsMap.get(p.id) || []).length} comments
            </p>

            {commentOpen === p.id && (
              <div className="px-4 mt-3 grid gap-3 animate-in fade-in slide-in-from-top-2">
                {(commentsMap.get(p.id) || []).length === 0 && (
                  <p className="text-xs text-slate-500 italic">No comments yet — be first!</p>
                )}
                {(commentsMap.get(p.id) || []).map((c) => (
                  <div key={c.id} className="text-[14px] bg-slate-900 rounded-xl px-3 py-2 leading-relaxed">
                    <span className="font-bold mr-2">{c.author?.display_name || "friend"}</span>
                    <span className="text-slate-200">{c.content}</span>
                  </div>
                ))}
                <div className="flex gap-2 mt-1">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter') addComment(p) }}
                    placeholder="Add a comment..."
                    className="flex-1 px-4 py-2 rounded-full bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:border-violet-500"
                  />
                  <button
                    onClick={() => addComment(p)}
                    disabled={!commentText.trim()}
                    className="px-5 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-xs font-bold transition-colors"
                  >
                    Post
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      {/* STORY VIEWER MODAL - Centered for Desktop */}
      {viewStory && (storyMap.get(viewStory.user) || [])[viewStory.index] && (
        <div className="fixed inset-0 z-[70] bg-black flex justify-center items-center backdrop-blur-sm">
          <div className="w-full max-w-md h-[100dvh] md:h-[90vh] md:rounded-2xl md:overflow-hidden bg-slate-950 flex flex-col relative shadow-2xl">
            <div className="flex gap-1 p-2 absolute top-0 inset-x-0 z-10 bg-gradient-to-b from-black/60 to-transparent">
              {(storyMap.get(viewStory.user) || []).map((s, i) => (
                <div key={s.id} className="flex-1 h-1 bg-slate-700/50 rounded overflow-hidden">
                  {i <= viewStory.index && <div className="h-full bg-white rounded" />}
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-3 px-4 py-3 absolute top-4 inset-x-0 z-10">
              <Avatar p={profById.get(viewStory.user)} size="w-9 h-9" />
              <p className="text-sm font-bold flex-1 text-white drop-shadow-md">
                {profById.get(viewStory.user)?.display_name || "friend"}
              </p>
              {(storyMap.get(viewStory.user) || [])[viewStory.index]?.user_id === me && (
                <button
                  onClick={() => deleteStory((storyMap.get(viewStory.user) || [])[viewStory.index])}
                  className="text-xl opacity-80 hover:opacity-100 hover:text-red-400 drop-shadow-md"
                >
                  🗑
                </button>
              )}
              <button onClick={() => setViewStory(null)} className="text-2xl text-white opacity-80 hover:opacity-100 ml-2 drop-shadow-md">
                ✖
              </button>
            </div>

            <div
              className="flex-1 relative flex items-center justify-center cursor-pointer"
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
                    className="absolute text-center text-3xl font-bold whitespace-pre-wrap px-6 leading-snug w-full"
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
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-center">
              <p className="text-xs text-slate-300 font-medium">
                {(storyMap.get(viewStory.user) || [])[viewStory.index]?.user_id === me
                  ? `👁 Seen by ${viewers.length}: ${viewers.slice(0, 5).join(", ") || "no one yet"}`
                  : "⏳ Disappears in 24h • tap to next"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STORY COMPOSER MODAL - Centered for Desktop */}
      {creatingStory && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 flex items-end md:items-center md:justify-center backdrop-blur-sm"
          onClick={() => setCreatingStory(false)}
        >
          <div
            className="w-full md:max-w-md bg-slate-900 rounded-t-2xl md:rounded-2xl p-5 grid gap-4 max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <p className="font-bold text-lg">👻 New story (24h)</p>
              <button onClick={() => setCreatingStory(false)} className="text-slate-400 hover:text-white text-xl">
                ✖
              </button>
            </div>

            {sPreview ? (
              <div>
                <div
                  ref={sBoxRef}
                  className="relative rounded-xl overflow-hidden touch-none select-none cursor-move border border-slate-700"
                  onPointerDown={(e) => {
                    sDragging.current = true;
                    moveSText(e.clientX, e.clientY);
                  }}
                  onPointerMove={(e) => {
                    if (sDragging.current) moveSText(e.clientX, e.clientY);
                  }}
                  onPointerUp={() => (sDragging.current = false)}
                >
                  <img src={sPreview} className="w-full max-h-80 object-cover" alt="" />
                  {sText.trim() && (
                    <p
                      className="absolute font-bold text-center px-4 py-2 rounded-lg pointer-events-none text-lg shadow-lg"
                      style={{
                        left: `${sPos.x}%`,
                        top: `${sPos.y}%`,
                        transform: "translate(-50%, -50%)",
                        color: sTc,
                        background: "rgba(0,0,0,0.55)",
                        backdropFilter: "blur(4px)"
                      }}
                    >
                      {sText}
                    </p>
                  )}
                </div>
                <p className="text-xs text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
                  👆 Drag on photo to place your text
                </p>
                <button
                  onClick={() => {
                    setSPhoto(null);
                    setSPreview("");
                  }}
                  className="mt-3 w-full py-2.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 text-sm font-bold transition-colors"
                >
                  ✖ Remove photo
                </button>
              </div>
            ) : (
              <div
                ref={sBoxRef}
                className={`relative rounded-xl overflow-hidden touch-none select-none cursor-move aspect-square shadow-inner ${
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
                  className="absolute font-bold text-center text-3xl whitespace-pre-wrap px-6 pointer-events-none w-full"
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
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 pb-10 text-[15px] resize-none focus:outline-none focus:border-violet-500 transition-colors"
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 cursor-pointer hover:text-slate-200">
                  BG
                  <input
                    type="color"
                    value={sBgc || "#1e293b"}
                    onChange={(e) => setSBgc(e.target.value)}
                    className="w-7 h-7 rounded-md cursor-pointer p-0 border border-slate-600 bg-transparent"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 cursor-pointer hover:text-slate-200">
                  Text
                  <input
                    type="color"
                    value={sTc}
                    onChange={(e) => setSTc(e.target.value)}
                    className="w-7 h-7 rounded-md cursor-pointer p-0 border border-slate-600 bg-transparent"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto py-1 scrollbar-hide">
              {BGS.map((g, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSBg(i);
                    setSBgc("");
                  }}
                  className={`w-10 h-10 shrink-0 rounded-full bg-gradient-to-br ${g} border-2 transition-transform ${
                    sBg === i && !sBgc ? "border-white scale-110 shadow-lg" : "border-transparent hover:scale-105"
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3 pt-2 border-t border-slate-800">
              <label className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-lg font-bold cursor-pointer flex items-center justify-center">
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
                className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 transition-colors font-bold text-[15px]"
              >
                Share story
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE SHEET MODAL - Centered for Desktop */}
      {shareOpen && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-end md:items-center md:justify-center backdrop-blur-sm" onClick={() => setShareOpen(null)}>
          <div
            className="w-full md:max-w-sm bg-slate-900 rounded-t-2xl md:rounded-2xl p-5 grid gap-3 max-h-[70vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-1">
              <p className="font-bold text-lg">📤 Share post</p>
              <button onClick={() => setShareOpen(null)} className="text-slate-400 hover:text-white text-xl">✖</button>
            </div>
            
            <button
              onClick={() => externalShare(shareOpen)}
              className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-[15px] font-bold"
            >
              📱 Share outside (WhatsApp etc.)
            </button>

            <div className="w-full h-px bg-slate-800 my-2" />

            <p className="text-xs text-slate-400 font-bold tracking-wide uppercase">Send to friend:</p>
            <div className="grid gap-2">
              {Array.from(friends)
                .map((id) => profById.get(id))
                .filter((x) => !!x)
                .map((f) => (
                  <button
                    key={f!.user_id}
                    onClick={() => sendToFriend(f!.user_id, f!.display_name || "friend")}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 hover:bg-slate-800 transition-colors text-left group"
                  >
                    {f!.avatar_url ? (
                      <img src={f!.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                    ) : (
                      <span className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center font-bold text-sm">
                        {(f!.display_name || "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="flex-1 text-[15px] font-bold group-hover:text-violet-300 transition-colors">{f!.display_name || "friend"}</span>
                    <span className="text-xl group-hover:scale-110 transition-transform">📤</span>
                  </button>
                ))}
              {friends.size === 0 && (
                <p className="text-sm text-slate-500 text-center py-6 bg-slate-950/30 rounded-xl">No friends yet — find some first!</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* INSTA BOTTOM BAR */}
      {/* 
        Aligning fixed bottom bar to exactly match the max-w-xl column.
        left-1/2 & -translate-x-1/2 perfectly centers it on big screens.
      */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-xl z-40 bg-slate-950/95 backdrop-blur border-t border-slate-800 grid grid-cols-4 md:border-x md:border-slate-800/50">
        <Link href="/dashboard" className="flex flex-col items-center py-3 text-xs text-slate-500 hover:text-white transition-colors">
          <span className="text-2xl mb-1">🏠</span>
          Home
        </Link>
        <Link href="/search" className="flex flex-col items-center py-3 text-xs text-slate-500 hover:text-white transition-colors">
          <span className="text-2xl mb-1">🔍</span>
          Search
        </Link>
        <Link href="/activity" className="relative flex flex-col items-center py-3 text-xs text-slate-500 hover:text-white transition-colors">
          <span className="text-2xl mb-1">❤️</span>
          Activity
          {unread > 0 && (
            <span className="absolute top-2 left-1/2 ml-2 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 shadow-md">
              {unread}
            </span>
          )}
        </Link>
        <Link href={`/profile?user=${me}`} className="flex flex-col items-center py-3 text-xs text-slate-500 hover:text-white transition-colors">
          <span className="text-2xl mb-1">👤</span>
          Profile
        </Link>
      </nav>
    </main>
  );
}