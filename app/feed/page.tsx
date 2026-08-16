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
  bg: number;
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

const rankOf = (c: number) => (c >= 1000 ? "🦸" : c >= 500 ? "🥇" : c >= 100 ? "🥈" : "🥉");

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// FIX 1: Merged duplicate compressImage functions and added dynamic filename
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

  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    setMe(uid);
    
    const [p, prof, likes, myLikes, fr, sent, inc, commentsRes] = await Promise.all([
      supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("profiles").select("*"),
      supabase.from("post_likes").select("post_id"),
      supabase.from("post_likes").select("post_id").eq("user_id", uid),
      supabase.from("friends").select("friend_id").eq("user_id", uid),
      supabase.from("friend_requests").select("to_id").eq("from_id", uid).eq("status", "pending"),
      supabase.from("friend_requests").select("from_id").eq("to_id", uid).eq("status", "pending"),
      supabase.from("post_comments").select("*").order("created_at", { ascending: true }),
    ]);

    const profMap = new Map<string, Profile>(((prof.data as any[]) || []).map((x) => [x.user_id, x]));
    
    // FIX 2: Set the profile map so stories and avatars render correctly
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
      
    for (const s of expired || []) {
      if (s.image_url) {
        const path = decodeURIComponent(s.image_url.split("/posts/")[1] || "");
        if (path) await supabase.storage.from("posts").remove([path]);
      }
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
      const small = await compressImage(photo, "post.jpg");
      const path = `${me}/${Date.now()}.jpg`;
      await supabase.storage.from("posts").upload(path, small);
      url = supabase.storage.from("posts").getPublicUrl(path).data.publicUrl;
    }
    await supabase.from("posts").insert({ 
      user_id: me, 
      content: text.trim(), 
      image_url: url || null, 
      bg: Math.floor(Math.random() * BGS.length) 
    });
    
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
      const small = await compressImage(sPhoto, "story.jpg");
      const path = `${me}/story-${Date.now()}.jpg`;
      await supabase.storage.from("posts").upload(path, small);
      url = supabase.storage.from("posts").getPublicUrl(path).data.publicUrl;
    }
    await supabase.from("stories").insert({
      user_id: me,
      content: sText.trim(),
      image_url: url || null, // FIX 5: Fallback to null instead of empty string
      bg: sBg,
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
        <button
          onClick={() => setTab(tab === "all" ? "friends" : "all")}
          className="text-xs font-bold bg-slate-800 px-3 py-1.5 rounded-full"
        >
          {tab === "all" ? "🌍 Public" : "🔒 Private"}
        </button>
      </div>

      

      {/* STORIES ROW */}
      <div className="flex gap-3 overflow-x-auto px-4 py-3 border-b border-slate-800">
        {/* FIX 4: Split viewing logic vs creating logic for personal stories */}
        <div className="flex flex-col items-center gap-1 shrink-0 cursor-pointer">
          <span className="relative inline-block">
            <span 
              onClick={() => storyMap.has(me) ? setViewStory({ user: me, index: 0 }) : setCreatingStory(true)}
              className={storyMap.has(me) ? "rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-fuchsia-600 p-[2px] inline-block" : "inline-block"}
            >
              <Avatar p={myProf} size="w-14 h-14" />
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); setCreatingStory(true); }}
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
                className={`w-full aspect-square bg-gradient-to-br ${BGS[(p.bg || 0) % BGS.length]} flex items-center justify-center p-8`}
              >
                <p className="text-center text-lg font-bold whitespace-pre-wrap">{p.content}</p>
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
              onClick={() => setCommentOpen(commentOpen === p.id ? "" : p.id)}
              className="text-2xl"
            >
              💬
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
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
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
            <button onClick={() => setViewStory(null)} className="text-xl text-white">✖</button>
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
                className={`w-full h-full bg-gradient-to-br ${
                  BGS[((storyMap.get(viewStory.user) || [])[viewStory.index].bg || 0) % BGS.length]
                } flex items-center justify-center p-8`}
              >
                <p className="text-center text-2xl font-bold whitespace-pre-wrap text-white">
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
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end" onClick={() => setCreatingStory(false)}>
          <div className="w-full bg-slate-900 rounded-t-2xl p-4 grid gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <p className="font-bold">👻 New story (24h)</p>
              <button onClick={() => setCreatingStory(false)} className="text-slate-400">✖</button>
            </div>
            <div className={`rounded-xl bg-gradient-to-br ${BGS[sBg]} min-h-[140px] flex items-center justify-center p-4`}>
              {sPreview ? (
                <img src={sPreview} className="rounded-xl max-h-56 w-full object-cover" alt="" />
              ) : (
                <p className="text-center font-bold">{sText || "Type below..."}</p>
              )}
            </div>
            <textarea
              value={sText}
              onChange={(e) => setSText(e.target.value)}
              rows={2}
              placeholder="Write a status..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm resize-none"
            />
            <div className="flex gap-2 overflow-x-auto">
              {BGS.map((g, i) => (
                <button
                  key={i}
                  onClick={() => setSBg(i)}
                  className={`w-8 h-8 shrink-0 rounded-full bg-gradient-to-br ${g} border-2 ${
                    sBg === i ? "border-white" : "border-transparent"
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
                    }
                  }}
                  className="hidden"
                />
              </label>
              <button onClick={shareStory} className="flex-1 py-2 rounded-lg bg-violet-600 font-bold text-sm">
                Share story
              </button>
            </div>
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
