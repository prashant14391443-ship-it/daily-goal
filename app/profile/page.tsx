"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function compressAvatar(f: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const max = 256;
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
          (b) => resolve(new File([b || new Blob()], "avatar.jpg", { type: "image/jpeg" })),
          "image/jpeg",
          0.8
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(f);
  });
}

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
  const [posts, setPosts] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<any>(null);
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
      profRow = {
        display_name: md.display_name || md.name || "friend",
        avatar_url: md.avatar_url || "",
        is_private: profRow?.is_private || false,
        bio: md.bio || profRow?.bio || "",
      };
      await supabase.from("profiles").upsert(
        { user_id: uid, display_name: profRow.display_name, avatar_url: profRow.avatar_url },
        { onConflict: "user_id" }
      );
    }

    if (userId === uid && profRow) {
      const md2 = (data.session?.user?.user_metadata || {}) as any;
      profRow.bio = profRow.bio || md2.bio || "";
    }

    setProf(profRow || { display_name: "friend", avatar_url: "", is_private: false, bio: "" });
    setIsFriend((fr.data || []).length > 0);
    setSentReq((sReq.data || []).length > 0);
    setRecvReq((rReq.data || []).length > 0);

    const { data: coinRows } = await supabase
      .from("coin_log")
      .select("coins")
      .eq("user_id", userId);
    const totalCoins = ((coinRows as any[]) || []).reduce(
      (a, r) => a + (Number(r.coins) || 0),
      0
    );
    setCoins(totalCoins);

    setFriendCount((theirFriends.data || []).length);
    const likeCount = new Map<string, number>();
    (likes.data || []).forEach((l) => likeCount.set(l.post_id, (likeCount.get(l.post_id) || 0) + 1));
    setPosts(((p.data as any[]) || []).map((x) => ({ ...x, likes: likeCount.get(x.id) || 0 })));
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
  const onAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    const img = new Image();
    img.onload = () => {
      setEditImg(img);
      setZoom(1);
      setOff({ x: 0, y: 0 });
    };
    img.src = URL.createObjectURL(f);
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("🔗 Profile link copied — share it!");
    } catch {
      alert("Copy the link from the address bar!");
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    let newAvatarUrl = prof?.avatar_url;

    if (editImg) {
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const scale = Math.max(size / editImg.width, size / editImg.height) * zoom;
        const w = editImg.width * scale;
        const h = editImg.height * scale;
        ctx.drawImage(editImg, (size - w) / 2 + off.x * 2, (size - h) / 2 + off.y * 2, w, h);
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.8));

        if (blob) {
          const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
          const { error: upErr } = await supabase.storage.from("avatars").upload(
            `${me}/avatar.jpg`,
            file,
            { upsert: true }
          );
          if (upErr) {
            alert("Photo upload failed: " + upErr.message);
            setSaving(false);
            setEditImg(null);
            return;
          }
          newAvatarUrl =
            supabase.storage.from("avatars").getPublicUrl(`${me}/avatar.jpg`).data.publicUrl +
            "?t=" + Date.now();
        }
      }
      setEditImg(null);
    }

    const finalName = editName.trim() || prof?.display_name || "friend";

    await supabase.auth.updateUser({
      data: { display_name: finalName, avatar_url: newAvatarUrl, bio: editBio },
    });

    const { error: saveErr } = await supabase.from("profiles").upsert(
      {
        user_id: me,
        bio: editBio,
        display_name: finalName,
        avatar_url: newAvatarUrl,
      },
      { onConflict: "user_id" }
    );
    if (saveErr) {
      alert("Save failed: " + saveErr.message);
    }

    setProf((prev: any) => ({
      ...prev,
      display_name: finalName,
      bio: editBio,
      avatar_url: newAvatarUrl,
    }));

    setEditing(false);
    setSaving(false);
    load();
  };

  const LEVELS = [
    { name: "Bronze", icon: "🥉", need: 0 },
    { name: "Silver", icon: "🥈", need: 500 },
    { name: "Platinum", icon: "⚪", need: 1000 },
    { name: "Gold", icon: "🥇", need: 2000 },
    { name: "Diamond", icon: "💎", need: 4000 },
    { name: "Hero", icon: "🦸", need: 8000 },
    { name: "Elite Hero", icon: "⚡", need: 16000 },
    { name: "Master", icon: "🎓", need: 32000 },
    { name: "Legend", icon: "👑", need: 64000 },
    { name: "Dragon", icon: "🐉", need: 128000 },
    { name: "Immortal", icon: "🌌", need: 256000 },
    { name: "BATMAN", icon: "🦇", need: 512000 },
  ];
  const lvlIdx = LEVELS.reduce((acc, l, i) => (coins >= l.need ? i : acc), 0);
  const lvl = LEVELS[lvlIdx];
  const next = LEVELS[lvlIdx + 1];
  const locked = prof?.is_private && userId !== me && !isFriend;

  return (
    <main className="min-h-screen bg-slate-950 text-white flex justify-center">
      {/* 
        Responsive Container:
        Restricts the layout to max-w-xl on desktop so it reads like a mobile app column.
      */}
      <div className="w-full max-w-xl bg-slate-950 min-h-screen md:border-x md:border-slate-800/50 relative pb-24 md:pb-12">
        
        {/* TOP BAR - Sticky */}
        <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur flex items-center justify-between p-4 border-b border-slate-800">
          <Link href="/feed" className="text-xl hover:text-slate-400 transition-colors px-2 py-1 -ml-2 rounded-lg">
            ←
          </Link>
          <p className="font-bold flex items-center gap-1.5 truncate max-w-[60%] text-lg">
            {prof?.is_private ? "🔒" : ""}{" "}
            {userId === me && (!prof?.display_name || prof.display_name === "friend")
              ? "Your profile"
              : prof?.display_name || "..."}
          </p>
          <span className="text-sm text-amber-400 font-bold bg-amber-400/10 px-3 py-1 rounded-full">
            🪙 {coins}
          </span>
        </div>

        {/* PROFILE ROW */}
        <div className="flex items-center gap-5 px-5 my-6">
          <span className="relative inline-block shrink-0">
            {prof?.avatar_url ? (
              <img src={prof.avatar_url} className="w-24 h-24 rounded-full object-cover border-2 border-violet-500 shadow-lg" alt="" />
            ) : (
              <span className="w-24 h-24 rounded-full bg-violet-600 border-2 border-violet-400 flex items-center justify-center text-4xl font-bold shadow-lg">
                {(prof?.display_name || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <div className="flex-1 grid grid-cols-3 text-center gap-2">
            <div className="flex flex-col justify-center">
              <p className="font-black text-xl">{posts.length}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">posts</p>
            </div>
            <Link href={`/friends?user=${userId}`} className="flex flex-col justify-center hover:bg-slate-900 rounded-xl transition-colors py-1 cursor-pointer">
              <p className="font-black text-xl">{friendCount}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">friends</p>
            </Link>
            <div className="flex flex-col justify-center">
              <p className="font-black text-2xl mb-[-2px]">{lvl.icon}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">{lvl.name}</p>
            </div>
          </div>
        </div>

        {/* LEVEL PROGRESS */}
        <div className="px-5 mb-5">
          {next ? (
            <>
              <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
                <span>
                  {lvl.icon} {lvl.name}
                </span>
                <span>
                  {next.need - coins} 🪙 to {next.icon} {next.name}
                </span>
              </div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-fuchsia-500 transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.min(100, ((coins - lvl.need) / (next.need - lvl.need)) * 100)}%`,
                  }}
                />
              </div>
            </>
          ) : (
            <p className="text-xs text-amber-400 font-bold text-center bg-amber-400/10 py-2 rounded-lg">
              🦇 MAX LEVEL — YOU ARE THE BATMAN!
            </p>
          )}
        </div>

        {/* BIO */}
        <div className="px-5 mb-5">
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-slate-200">{prof?.bio || ""}</p>
          {userId === me && (!prof?.display_name || prof.display_name === "friend") && (
            <button
              onClick={() => {
                setEditName("");
                setEditBio(prof?.bio || "");
                setEditing(true);
              }}
              className="mt-2 text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors"
            >
              ✏️ Add your name so friends can find you!
            </button>
          )}
        </div>

        {/* BUTTONS */}
        <div className="flex gap-2 px-5 mb-6">
          {userId === me ? (
            <>
              <button
                onClick={() => {
                  setEditName(prof?.display_name || "");
                  setEditBio(prof?.bio || "");
                  setEditing(!editing);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-bold"
              >
                {editing ? "✖ Close" : "✏️ Edit profile"}
              </button>
              <button onClick={share} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-bold">
                📤 Share profile
              </button>
              <button onClick={togglePrivate} className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-bold" aria-label="Toggle privacy">
                {prof?.is_private ? "🔒" : "🌍"}
              </button>
            </>
          ) : (
            <>
              {isFriend ? (
                <span className="flex-1 py-2.5 rounded-xl bg-slate-800 text-sm font-bold text-center text-green-400">✓ Friends</span>
              ) : recvReq ? (
                <button onClick={accept} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 transition-colors text-sm font-bold">
                  ✅ Accept Request
                </button>
              ) : sentReq ? (
                <span className="flex-1 py-2.5 rounded-xl bg-slate-800 text-sm font-bold text-center text-slate-400">⏳ Requested</span>
              ) : (
                <button onClick={addFriend} className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 transition-colors text-sm font-bold">
                  ➕ Add Friend
                </button>
              )}
              {(!prof?.is_private || isFriend) && (
                <Link
                  href={`/chat?user=${userId}`}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-bold text-center"
                >
                  💬 Message
                </Link>
              )}
            </>
          )}
        </div>

        {/* EDIT PANEL */}
        {editing && userId === me && (
          <div className="px-5 mb-6 grid gap-3 animate-in fade-in slide-in-from-top-2">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Your name"
              className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Write your bio... (like: I AM THE NIGHT 🦇)"
              rows={3}
              className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-sm resize-none focus:outline-none focus:border-violet-500 transition-colors"
            />
            <label className="py-3 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors border border-dashed border-slate-600 text-sm font-bold text-center cursor-pointer">
              📷 Change photo
              <input type="file" accept="image/*" onChange={onAvatar} className="hidden" />
            </label>
            {editImg && (
              <div className="grid gap-3 bg-slate-900 rounded-xl p-4 border border-slate-800">
                <div
                  className="relative w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-violet-500 touch-none cursor-move shadow-inner"
                  onPointerDown={(e) => {
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                    dragRef.current = { x: e.clientX, y: e.clientY };
                  }}
                  onPointerMove={(e) => {
                    if (!dragRef.current) return;
                    setOff({
                      x: off.x + (e.clientX - dragRef.current.x),
                      y: off.y + (e.clientY - dragRef.current.y),
                    });
                    dragRef.current = { x: e.clientX, y: e.clientY };
                  }}
                  onPointerUp={() => (dragRef.current = null)}
                >
                  <img
                    src={editImg.src}
                    className="w-full h-full object-cover"
                    style={{ transform: `translate(${off.x}px, ${off.y}px) scale(${zoom})` }}
                    alt=""
                  />
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="accent-violet-500"
                />
                <p className="text-xs text-slate-500 text-center font-medium">
                  ✋ Drag to move • Slider to zoom
                </p>
              </div>
            )}
            <button
              onClick={saveProfile}
              disabled={saving}
              className="py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 transition-colors text-sm font-bold disabled:opacity-50 mt-1"
            >
              {saving ? "Saving..." : "💾 Save Changes"}
            </button>
          </div>
        )}

        {/* TABS */}
        <div className="flex border-b border-slate-800 mb-1 sticky top-[72px] bg-slate-950 z-10">
          <span className="flex-1 text-center py-3 border-b-2 border-white cursor-pointer hover:bg-slate-900 transition-colors">▦</span>
          <span className="flex-1 text-center py-3 text-slate-600 cursor-not-allowed">▶</span>
          <span className="flex-1 text-center py-3 text-slate-600 cursor-not-allowed">🔁</span>
          <span className="flex-1 text-center py-3 text-slate-600 cursor-not-allowed">👤</span>
        </div>

        {/* CONTENT */}
        {locked ? (
          <div className="text-center py-20 px-6">
            <p className="text-6xl mb-4">🔒</p>
            <p className="text-xl font-bold">This account is private</p>
            <p className="text-[15px] text-slate-400 mt-2">Become a friend to see their posts!</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 px-6">
            <p className="text-6xl mb-4">📸</p>
            <p className="text-xl font-bold">Create your first post</p>
            <p className="text-[15px] text-slate-400 mt-2">Make this space your own.</p>
            {userId === me && (
              <Link href="/newpost" className="inline-block mt-6 px-10 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 transition-colors font-bold text-[15px]">
                Create Post
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 p-1">
            {posts.map((p) => (
              <div
                key={p.id}
                onClick={() => setView(p)}
                className="aspect-square bg-slate-900 relative overflow-hidden cursor-pointer group"
              >
                {p.image_url ? (
                  <img 
                    src={p.image_url} 
                    className="w-full h-full object-cover group-hover:scale-105 group-hover:opacity-90 transition-all duration-300" 
                    alt="" 
                  />
                ) : (
                  <div
                    className={`relative w-full h-full group-hover:opacity-90 transition-opacity ${
                      p.bgc ? "" : `bg-gradient-to-br ${BGS[(p.bg || 0) % BGS.length]}`
                    }`}
                    style={p.bgc ? { background: p.bgc } : undefined}
                  >
                    <p
                      className="absolute text-[11px] md:text-sm font-medium text-center line-clamp-5 px-2 w-full"
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
                {/* Hover overlay for likes */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="text-white font-bold text-lg drop-shadow-md">❤️ {p.likes}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* POST VIEWER MODAL - Centered for Desktop */}
        {view && (
          <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center backdrop-blur-sm" onClick={() => setView(null)}>
            <div
              className="w-full max-w-md h-[100dvh] md:h-auto md:max-h-[90vh] md:rounded-2xl bg-slate-950 flex flex-col relative shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b border-slate-800">
                <p className="font-bold text-sm">Post</p>
                <button onClick={() => setView(null)} className="text-xl text-slate-400 hover:text-white transition-colors">
                  ✖
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center bg-black/50">
                {view.image_url ? (
                  <img src={view.image_url} className="w-full rounded-xl object-contain max-h-[60vh] mx-auto shadow-lg" alt="" />
                ) : (
                  <div
                    className={`relative w-full aspect-square rounded-xl shadow-lg ${
                      view.bgc ? "" : `bg-gradient-to-br ${BGS[(view.bg || 0) % BGS.length]}`
                    }`}
                    style={view.bgc ? { background: view.bgc } : undefined}
                  >
                    <p
                      className="absolute text-2xl font-bold text-center whitespace-pre-wrap px-6 leading-relaxed w-full"
                      style={{
                        left: `${view.tx ?? 50}%`,
                        top: `${view.ty ?? 50}%`,
                        transform: "translate(-50%, -50%)",
                        color: view.tc || "#ffffff",
                      }}
                    >
                      {view.content}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-5 bg-slate-950 border-t border-slate-800">
                <p className="text-sm font-bold text-white mb-4">❤️ {view.likes} likes</p>
                <button
                  onClick={() => setView(null)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>}>
      <Inner />
    </Suspense>
  );
}