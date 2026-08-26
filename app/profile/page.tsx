"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SEASON_LEVELS, LIFETIME_LEVELS, SEASON_EPOCH, SEASON_MS, levelOf, seasonInfo } from "@/lib/seasons";

function compressAvatar(f: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const max = 256;
        let w = img.width, h = img.height;
        if (w > max || h > max) { const r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r); }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        canvas.toBlob((b) => resolve(new File([b || new Blob()], "avatar.jpg", { type: "image/jpeg" })), "image/jpeg", 0.8);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(f);
  });
}

const BGS = [
  "from-violet-600/40 via-slate-900 to-fuchsia-600/30", "from-blue-600/40 via-slate-900 to-cyan-500/30",
  "from-green-600/40 via-slate-900 to-emerald-500/30", "from-orange-600/40 via-slate-900 to-amber-500/30",
  "from-pink-600/40 via-slate-900 to-rose-500/30", "from-red-600/40 via-slate-900 to-orange-500/30",
  "from-teal-600/40 via-slate-900 to-green-500/30", "from-indigo-600/40 via-slate-900 to-blue-500/30",
  "from-fuchsia-600/40 via-slate-900 to-pink-500/30", "from-slate-700/60 via-slate-900 to-slate-600/40",
];

const EARN = [
  { icon: "📅", name: "Open app daily", coins: "20" },
  { icon: "📚", name: "Study session", coins: "10" },
  { icon: "🏃", name: "Running", coins: "10 / km" },
  { icon: "💪", name: "Gym exercise", coins: "5 / session" },
  { icon: "✅", name: "Habit done", coins: "5" },
  { icon: "📝", name: "Task done", coins: "5" },
  { icon: "🍽", name: "Meal logged", coins: "3" },
];

function Inner() {
  const params = useSearchParams();
  const userId = params.get("user") || "";
  const [me, setMe] = useState("");
  const [prof, setProf] = useState<any>(null);
  const [friendCount, setFriendCount] = useState(0);
  const [isFriend, setIsFriend] = useState(false);
  const [sentReq, setSentReq] = useState(false);
  const [recvReq, setRecvReq] = useState(false);
  const [coins, setCoins] = useState(0);
  const [life, setLife] = useState(0);
  const [trophies, setTrophies] = useState<string[]>([]);
  const [daysLeft, setDaysLeft] = useState(0);
  const [seasonIdx, setSeasonIdx] = useState(1);
  const [posts, setPosts] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<any>(null);
  const [rankOpen, setRankOpen] = useState(false);
  const [coinOpen, setCoinOpen] = useState(false);
  const [tab, setTab] = useState<"posts" | "wins" | "earn" | "about">("posts");
  const [editImg, setEditImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid || !userId) return;
    setMe(uid);
    const [pr, fr, sReq, rReq, cn, p, likes, theirFriends] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("friends").select("friend_id").eq("user_id", uid).eq("friend_id", userId),
      supabase.from("friend_requests").select("from_id").eq("from_id", uid).eq("to_id", userId).eq("status", "pending"),
      supabase.from("friend_requests").select("from_id").eq("from_id", userId).eq("to_id", uid).eq("status", "pending"),
      supabase.from("user_coins").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("posts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("post_likes").select("post_id"),
      supabase.from("friends").select("friend_id").eq("user_id", userId),
    ]);
    let profRow = ((pr as any)?.data as any) || null;
    if (userId === uid && (!profRow || !profRow.display_name)) {
      const md = (data.session?.user?.user_metadata || {}) as any;
      profRow = { display_name: md.display_name || md.name || "friend", avatar_url: md.avatar_url || "", is_private: profRow?.is_private || false, bio: md.bio || profRow?.bio || "" };
      await supabase.from("profiles").upsert({ user_id: uid, display_name: profRow.display_name, avatar_url: profRow.avatar_url }, { onConflict: "user_id" });
    }
    if (userId === uid && profRow) { const md2 = (data.session?.user?.user_metadata || {}) as any; profRow.bio = profRow.bio || md2.bio || ""; }
    setProf(profRow || { display_name: "friend", avatar_url: "", is_private: false, bio: "" });
    setIsFriend((fr.data || []).length > 0);
    setSentReq((sReq.data || []).length > 0);
    setRecvReq((rReq.data || []).length > 0);
    const s = seasonInfo();
    setSeasonIdx(s.index);
    const { data: coinRows } = await supabase.from("coin_log").select("coins, created_at").eq("user_id", userId);
    let seasonCoins = 0, lifeCoins = 0;
    const past = new Map<number, number>();
    ((coinRows as any[]) || []).forEach((r) => {
      const c = Number(r.coins) || 0;
      lifeCoins += c;
      if (r.created_at >= s.startISO) seasonCoins += c;
      const si = Math.floor((new Date(r.created_at).getTime() - SEASON_EPOCH) / SEASON_MS) + 1;
      if (si < s.index && c > 0) past.set(si, (past.get(si) || 0) + c);
    });
    setCoins(seasonCoins); setLife(lifeCoins); setDaysLeft(s.daysLeft);
    setTrophies(Array.from(past.entries()).sort((a, b) => a[0] - b[0]).map(([i, c]) => `S${i} ${levelOf(SEASON_LEVELS, c).icon}`));
    setFriendCount((theirFriends.data || []).length);
    const likeCount = new Map<string, number>();
    (likes.data || []).forEach((l) => likeCount.set(l.post_id, (likeCount.get(l.post_id) || 0) + 1));
    setPosts(((p.data as any[]) || []).map((x) => ({ ...x, likes: likeCount.get(x.id) || 0 })));
  };

  useEffect(() => { load(); }, [userId]);

  const addFriend = async () => { await supabase.from("friend_requests").insert({ from_id: me, to_id: userId }); load(); };
  const accept = async () => { await supabase.rpc("accept_friend", { req_from: userId, req_to: me }); load(); };
  const togglePrivate = async () => {
    const next = !prof?.is_private;
    await supabase.from("profiles").update({ is_private: next }).eq("user_id", me);
    setProf({ ...prof, is_private: next });
  };
  const onAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    const img = new Image();
    img.onload = () => { setEditImg(img); setZoom(1); setOff({ x: 0, y: 0 }); };
    img.src = URL.createObjectURL(f);
  };

  const share = async () => {
    const url = window.location.href;
    const nav = navigator as Navigator & { canShare?: (d: { title: string; url: string }) => boolean };
    if (nav.share) {
      try { await nav.share({ title: `${prof?.display_name} on DAILY GOAL`, url }); return; } catch { return; }
    }
    try { await navigator.clipboard.writeText(url); alert("🔗 Profile link copied — share it!"); }
    catch { alert("Copy the link from the address bar!"); }
  };

  const saveProfile = async () => {
    setSaving(true);
    let newAvatarUrl = prof?.avatar_url;
    if (editImg) {
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const scale = Math.max(size / editImg.width, size / editImg.height) * zoom;
        const w = editImg.width * scale, h = editImg.height * scale;
        ctx.drawImage(editImg, (size - w) / 2 + off.x * 2, (size - h) / 2 + off.y * 2, w, h);
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.8));
        if (blob) {
          const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
          const { error: upErr } = await supabase.storage.from("avatars").upload(`${me}/avatar.jpg`, file, { upsert: true });
          if (upErr) { alert("Photo upload failed: " + upErr.message); setSaving(false); setEditImg(null); return; }
          newAvatarUrl = supabase.storage.from("avatars").getPublicUrl(`${me}/avatar.jpg`).data.publicUrl + "?t=" + Date.now();
        }
      }
      setEditImg(null);
    }
    const finalName = editName.trim() || prof?.display_name || "friend";
    await supabase.auth.updateUser({ data: { display_name: finalName, avatar_url: newAvatarUrl, bio: editBio } });
    const { error: saveErr } = await supabase.from("profiles").upsert({ user_id: me, bio: editBio, display_name: finalName, avatar_url: newAvatarUrl }, { onConflict: "user_id" });
    if (saveErr) alert("Save failed: " + saveErr.message);
    setProf((prev: any) => ({ ...prev, display_name: finalName, bio: editBio, avatar_url: newAvatarUrl }));
    setEditing(false); setSaving(false); load();
  };

  const deletePost = async (p: any) => {
    if (!confirm("Delete this post?")) return;
    if (p.image_url) {
      const path = decodeURIComponent(p.image_url.split("/posts/")[1] || "");
      if (path) await supabase.storage.from("posts").remove([path]);
    }
    await supabase.from("posts").delete().eq("id", p.id);
    load();
  };

  const lvl = levelOf(SEASON_LEVELS, coins);
  const lifeLvl = levelOf(LIFETIME_LEVELS, life);
  const locked = prof?.is_private && userId !== me && !isFriend;
  const displayName = userId === me && (!prof?.display_name || prof.display_name === "friend") ? "Your profile" : prof?.display_name || "...";

  const TABS = [
    { id: "posts" as const, icon: "▦", label: "Posts" },
    { id: "wins" as const, icon: "🏆", label: "Achievements" },
    { id: "earn" as const, icon: "💪", label: "Earn" },
    { id: "about" as const, icon: "👤", label: "About" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-24">
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <Link href="/feed" className="press w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-lg">←</Link>
        <p className="font-black text-base text-white truncate max-w-[50%]" style={{ whiteSpace: "nowrap" }}>
          {prof?.is_private ? "🔒 " : ""}{displayName}
        </p>
        <button onClick={() => setCoinOpen(true)} className="press px-3 py-2 rounded-xl bg-amber-400/10 border border-amber-400/40 text-amber-300 text-xs font-black">🪙 {coins}</button>
      </div>

      {/* 🌆 HERO CARD */}
      <div className="mx-4 rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-lg shadow-black/30">
        <div className="h-20 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 relative">
          <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
        </div>
        <div className="px-4 pb-4">
          <div className="flex items-end justify-between -mt-9 mb-3">
            <span className="rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-fuchsia-600 p-[3px] shrink-0 shadow-xl">
              {prof?.avatar_url ? (
                <img src={prof.avatar_url} className="w-20 h-20 rounded-full object-cover border-4 border-slate-900" alt="" />
              ) : (
                <span className="w-20 h-20 rounded-full bg-violet-600 border-4 border-slate-900 flex items-center justify-center text-3xl font-black">
                  {(prof?.display_name || "?").charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            {userId === me ? (
              <button onClick={togglePrivate} className="press px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-black text-slate-200">
                {prof?.is_private ? "🔒 Private" : "🌍 Public"}
              </button>
            ) : isFriend ? (
              <span className="px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/40 text-[10px] font-black text-green-300">✓ Friends</span>
            ) : null}
          </div>

          <p className="font-black text-lg text-white leading-tight mb-1">{displayName}</p>
          {prof?.bio && <p className="text-xs text-slate-300 whitespace-pre-wrap mb-3">{prof.bio}</p>}

          {/* STATS */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-slate-800/60 rounded-xl p-2.5 text-center">
              <p className="font-black text-lg text-white leading-none">{posts.length}</p>
              <p className="text-[9px] font-black text-slate-500 mt-1">POSTS</p>
            </div>
            <Link href={`/friends?user=${userId}`} className="press bg-slate-800/60 rounded-xl p-2.5 text-center">
              <p className="font-black text-lg text-white leading-none">{friendCount}</p>
              <p className="text-[9px] font-black text-slate-500 mt-1">FRIENDS</p>
            </Link>
            <button onClick={() => setRankOpen(true)} className="press bg-slate-800/60 rounded-xl p-2.5 text-center">
              <p className="font-black text-lg leading-none">{lvl.icon}</p>
              <p className="text-[9px] font-black text-slate-500 mt-1">{lvl.name.toUpperCase()}</p>
            </button>
          </div>

          {/* SEASON PROGRESS */}
          <button onClick={() => setRankOpen(true)} className="press w-full text-left mt-3 bg-slate-800/60 rounded-xl p-3">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
              <span>🏁 {lvl.icon} {lvl.name}</span>
              <span>{lvl.next ? `${lvl.next.need - coins} 🪙 to ${lvl.next.icon} ${lvl.next.name}` : "🎓 CHAMPION"} • ⏳ {daysLeft}d</span>
            </div>
            <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-fuchsia-500 rounded-full" style={{ width: `${lvl.next ? Math.min(100, ((coins - lvl.need) / (lvl.next.need - lvl.need)) * 100) : 100}%` }} />
            </div>
          </button>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex gap-2 px-4 mt-4">
        {userId === me ? (
          <>
            <button onClick={() => { setEditName(prof?.display_name || ""); setEditBio(prof?.bio || ""); setEditing(!editing); }}
              className="press flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-black shadow-lg shadow-violet-900/30">
              {editing ? "✖ Close" : "✏️ Edit profile"}
            </button>
            <button onClick={share} className="press flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-black hover:bg-slate-800">
              📤 Share profile
            </button>
          </>
        ) : (
          <>
            {isFriend ? (
              <span className="flex-1 py-3 rounded-xl bg-green-500/15 border border-green-500/40 text-xs font-black text-center text-green-300">✓ Friends</span>
            ) : recvReq ? (
              <button onClick={accept} className="press flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-xs font-black">✅ Accept Request</button>
            ) : sentReq ? (
              <span className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-black text-center text-slate-400">⏳ Requested</span>
            ) : (
              <button onClick={addFriend} className="press flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-black">➕ Add Friend</button>
            )}
            {(!prof?.is_private || isFriend) && (
              <Link href={`/chat?user=${userId}`} className="press flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-black text-center hover:bg-slate-800">💬 Message</Link>
            )}
          </>
        )}
      </div>

      {/* EDIT PANEL */}
      {editing && userId === me && (
        <div className="mx-4 mt-3 bg-slate-900 border border-violet-500/30 rounded-2xl p-4 grid gap-2 shadow-lg">
          <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Your name"
            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500" />
          <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Write your bio... (like: I AM THE NIGHT 🦇)" rows={2}
            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm resize-none outline-none focus:border-violet-500" />
          <label className="press py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-black text-center cursor-pointer hover:bg-slate-700">
            📷 Change photo
            <input type="file" accept="image/*" onChange={onAvatar} className="hidden" />
          </label>
          {editImg && (
            <div className="grid gap-2 bg-slate-800/50 rounded-xl p-3">
              <div className="relative w-40 h-40 mx-auto rounded-full overflow-hidden border-2 border-violet-500 touch-none cursor-move"
                onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); dragRef.current = { x: e.clientX, y: e.clientY }; }}
                onPointerMove={(e) => { if (!dragRef.current) return; setOff({ x: off.x + (e.clientX - dragRef.current.x), y: off.y + (e.clientY - dragRef.current.y) }); dragRef.current = { x: e.clientX, y: e.clientY }; }}
                onPointerUp={() => (dragRef.current = null)}>
                <img src={editImg.src} className="w-full h-full object-cover" style={{ transform: `translate(${off.x}px, ${off.y}px) scale(${zoom})` }} alt="" />
              </div>
              <input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
              <p className="text-[10px] text-slate-500 text-center">✋ Drag to move • slider to zoom</p>
            </div>
          )}
          <button onClick={saveProfile} disabled={saving} className="press py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-xs font-black disabled:opacity-50">
            {saving ? "Saving..." : "💾 Save"}
          </button>
        </div>
      )}

      {/* ✅ WORKING TABS */}
      <div className="flex gap-1 px-4 mt-5 mb-3">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`press flex-1 py-2.5 rounded-xl text-[10px] font-black flex flex-col items-center gap-0.5 transition-all ${
              tab === t.id ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg" : "bg-slate-900 border border-slate-800 text-slate-500"
            }`}>
            <span className="text-sm">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: POSTS */}
      {tab === "posts" && (locked ? (
        <div className="text-center py-16 px-6">
          <p className="text-5xl mb-3">🔒</p>
          <p className="text-xl font-black">This account is private</p>
          <p className="text-sm text-slate-400 mt-1">Become a friend to see their posts!</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 px-6">
          <p className="text-5xl mb-3">📸</p>
          <p className="text-xl font-black">Create your first post</p>
          <p className="text-sm text-slate-400 mt-1">Make this space your own.</p>
          {userId === me && (
            <Link href="/newpost" className="press inline-block mt-4 px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-black text-sm">Create</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 px-1">
          {posts.map((p) => (
            <div key={p.id} onClick={() => setView(p)} className="aspect-square bg-slate-900 relative overflow-hidden cursor-pointer rounded-lg">
              {p.image_url ? (
                <img src={p.image_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className={`relative w-full h-full ${p.bgc ? "" : `bg-gradient-to-br ${BGS[(p.bg || 0) % BGS.length]}`}`} style={p.bgc ? { background: p.bgc } : undefined}>
                  <p className="absolute text-[10px] text-center line-clamp-6 px-1" style={{ left: `${p.tx ?? 50}%`, top: `${p.ty ?? 50}%`, transform: "translate(-50%, -50%)", color: p.tc || "#ffffff" }}>
                    {p.content}
                  </p>
                </div>
              )}
              <span className="absolute bottom-1 left-1 text-[10px] font-black drop-shadow">❤️ {p.likes}</span>
            </div>
          ))}
        </div>
      ))}

      {/* TAB: ACHIEVEMENTS */}
      {tab === "wins" && (
        <div className="px-4 grid gap-3">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4">
            <p className="text-[10px] font-black text-amber-300 mb-2">🏁 SEASON {seasonIdx}</p>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{lvl.icon}</span>
              <div>
                <p className="font-black">{lvl.name}</p>
                <p className="text-xs text-slate-400">{coins} 🪙 this season</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 border border-fuchsia-500/30 rounded-2xl p-4">
            <p className="text-[10px] font-black text-fuchsia-300 mb-2">🌟 LIFETIME</p>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{life >= LIFETIME_LEVELS[0].need ? lifeLvl.icon : "🌱"}</span>
              <div>
                <p className="font-black">{life >= LIFETIME_LEVELS[0].need ? lifeLvl.name : "Rookie"}</p>
                <p className="text-xs text-slate-400">{life.toLocaleString()} 🪙 all-time</p>
              </div>
            </div>
          </div>
          {trophies.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-[10px] font-black text-slate-400 mb-2">🏆 PAST SEASONS</p>
              <p className="text-sm text-amber-400 font-bold">{trophies.join(" • ")}</p>
            </div>
          )}
        </div>
      )}

      {/* TAB: EARN */}
      {tab === "earn" && (
        <div className="px-4 bg-slate-900 border border-slate-800 mx-4 rounded-2xl p-4 grid gap-2.5">
          <p className="text-[10px] font-black text-slate-400">💪 EARN COINS EVERY DAY</p>
          {EARN.map((e) => (
            <div key={e.name} className="flex items-center justify-between bg-slate-800/60 rounded-xl px-3 py-2.5">
              <span className="text-sm font-bold">{e.icon} {e.name}</span>
              <span className="text-xs font-black text-amber-400">+{e.coins}</span>
            </div>
          ))}
        </div>
      )}

      {/* TAB: ABOUT */}
      {tab === "about" && (
        <div className="px-4 grid gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-[10px] font-black text-slate-400 mb-2">👤 BIO</p>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{prof?.bio || "No bio yet."}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid gap-2">
            <div className="flex justify-between text-sm"><span className="text-slate-400">🔒 Privacy</span><span className="font-black">{prof?.is_private ? "Private" : "Public"}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">👥 Friends</span><span className="font-black">{friendCount}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">📸 Posts</span><span className="font-black">{posts.length}</span></div>
          </div>
        </div>
      )}

      {/* POST VIEWER */}
      {view && (
        <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col" onClick={() => setView(null)}>
          <div className="flex justify-end p-4"><span className="text-2xl">✖</span></div>
          <div className="flex-1 overflow-y-auto px-4 pb-8" onClick={(e) => e.stopPropagation()}>
            {view.image_url && <img src={view.image_url} className="w-full rounded-xl object-contain max-h-[70vh]" alt="" />}
            {!view.image_url && (
              <div className={`relative w-full aspect-square rounded-xl ${view.bgc ? "" : `bg-gradient-to-br ${BGS[(view.bg || 0) % BGS.length]}`}`} style={view.bgc ? { background: view.bgc } : undefined}>
                <p className="absolute text-xl font-bold text-center whitespace-pre-wrap px-4" style={{ left: `${view.tx ?? 50}%`, top: `${view.ty ?? 50}%`, transform: "translate(-50%, -50%)", color: view.tc || "#ffffff" }}>
                  {view.content}
                </p>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-3">❤️ {view.likes} likes</p>
            {view.user_id === me && (
              <button onClick={() => { deletePost(view); setView(null); }} className="press mt-3 w-full py-2.5 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 text-xs font-black">🗑 Delete post</button>
            )}
            <button onClick={() => setView(null)} className="press mt-2 w-full py-2.5 rounded-xl bg-slate-800 text-xs font-black">Close</button>
          </div>
        </div>
      )}

      {/* RANK MODAL */}
      {rankOpen && (
        <div className="fixed inset-0 z-[80] bg-black/80 flex items-end sm:items-center sm:justify-center" onClick={() => setRankOpen(false)}>
          <div className="w-full max-w-md bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 grid gap-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <p className="font-black">🎖 Ranks</p>
              <button onClick={() => setRankOpen(false)} className="text-slate-400 text-xl">✖</button>
            </div>
            <div className="rounded-2xl bg-slate-950 border border-amber-500/30 p-4 grid gap-2">
              <p className="text-[10px] font-black text-slate-400">🏁 SEASON {seasonIdx}</p>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{lvl.icon}</span>
                <div><p className="font-black">{lvl.name}</p><p className="text-xs text-slate-400">{coins} 🪙 this season</p></div>
              </div>
              {lvl.next ? (
                <>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-fuchsia-500" style={{ width: `${Math.min(100, ((coins - lvl.need) / (lvl.next.need - lvl.need)) * 100)}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-500">{lvl.next.need - coins} 🪙 to {lvl.next.icon} {lvl.next.name} • ⏳ resets in {daysLeft}d</p>
                </>
              ) : (<p className="text-[10px] text-amber-400 font-black">🎓 SEASON CHAMPION!</p>)}
            </div>
            <div className="rounded-2xl bg-slate-950 border border-fuchsia-500/30 p-4 grid gap-2">
              <p className="text-[10px] font-black text-slate-400">🌟 LIFETIME (never resets)</p>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{life >= LIFETIME_LEVELS[0].need ? lifeLvl.icon : "🌱"}</span>
                <div><p className="font-black">{life >= LIFETIME_LEVELS[0].need ? lifeLvl.name : "Rookie"}</p><p className="text-xs text-slate-400">{life.toLocaleString()} 🪙 all-time</p></div>
              </div>
            </div>
            {trophies.length > 0 && <p className="text-xs text-amber-400 text-center font-bold">🏆 {trophies.join(" • ")}</p>}
          </div>
        </div>
      )}

      {/* COIN MODAL */}
      {coinOpen && (
        <div className="fixed inset-0 z-[80] bg-black/80 flex items-end sm:items-center sm:justify-center" onClick={() => setCoinOpen(false)}>
          <div className="w-full max-w-md bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 grid gap-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <p className="font-black">🪙 Coins</p>
              <button onClick={() => setCoinOpen(false)} className="text-slate-400 text-xl">✖</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-slate-950 border border-amber-500/30 p-3 text-center">
                <p className="text-lg font-black text-amber-400">{coins}</p>
                <p className="text-[10px] text-slate-400">🏁 this season</p>
              </div>
              <div className="rounded-2xl bg-slate-950 border border-fuchsia-500/30 p-3 text-center">
                <p className="text-lg font-black text-fuchsia-400">{life.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">🌟 lifetime</p>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 grid gap-2">
              <p className="text-[10px] font-black text-slate-400">💪 EARN EVERY DAY</p>
              {EARN.map((e) => (
                <div key={e.name} className="flex items-center justify-between text-sm">
                  <span>{e.icon} {e.name}</span>
                  <span className="font-black text-amber-400">+{e.coins}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 grid gap-1.5">
              <p className="text-[10px] font-black text-slate-400">🏁 SEASON TITLES (reset every 90d)</p>
              {SEASON_LEVELS.map((l) => (
                <div key={l.name} className={`flex items-center justify-between text-sm rounded-lg px-2 py-1 ${lvl.name === l.name ? "bg-violet-600/20 border border-violet-500/40" : ""}`}>
                  <span>{l.icon} {l.name}</span>
                  <span className="text-xs text-slate-400">{l.need.toLocaleString()} 🪙</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 grid gap-1.5">
              <p className="text-[10px] font-black text-slate-400">🌟 LIFETIME TITLES (forever)</p>
              {LIFETIME_LEVELS.map((l) => (
                <div key={l.name} className={`flex items-center justify-between text-sm rounded-lg px-2 py-1 ${life >= LIFETIME_LEVELS[0].need && lifeLvl.name === l.name ? "bg-fuchsia-600/20 border border-fuchsia-500/40" : ""}`}>
                  <span>{l.icon} {l.name}</span>
                  <span className="text-xs text-slate-400">{l.need.toLocaleString()} 🪙</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<p className="text-slate-400 p-4">Loading...</p>}>
      <Inner />
    </Suspense>
  );
}