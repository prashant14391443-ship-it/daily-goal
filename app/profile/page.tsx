"use client";

import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

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
      supabase.from("user_coins").select("coins").eq("user_id", userId).maybeSingle(),
      supabase.from("posts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("post_likes").select("post_id"),
      supabase.from("friends").select("friend_id").eq("user_id", userId),
    ]);
    let profRow = (pr as any) || null;
    if (userId === uid && (!profRow || !profRow.display_name)) {
      const md = (data.session?.user?.user_metadata || {}) as any;
      profRow = {
        display_name: md.display_name || "friend",
        avatar_url: md.avatar_url || "",
        is_private: profRow?.is_private || false,
        bio: profRow?.bio || "",
      };
      await supabase.from("profiles").upsert(
        { user_id: uid, display_name: profRow.display_name, avatar_url: profRow.avatar_url },
        { onConflict: "user_id" }
      );
    }
    setProf(profRow || { display_name: "friend", avatar_url: "", is_private: false, bio: "" });
    setIsFriend((fr.data || []).length > 0);
    setSentReq((sReq.data || []).length > 0);
    setRecvReq((rReq.data || []).length > 0);
    setCoins(Number((cn as any)?.coins || 0));
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
    await supabase.from("profiles").upsert(
      {
        user_id: me,
        bio: editBio,
        display_name: editName.trim() || prof?.display_name || "friend",
      },
      { onConflict: "user_id" }
    );
    if (editName.trim()) await supabase.auth.updateUser({ data: { display_name: editName.trim() } });
    setEditing(false);
    setSaving(false);
    load();
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

  const rank =
    coins >= 1000 ? "🦸 Hero" : coins >= 500 ? "🥇 Gold" : coins >= 100 ? "🥈 Silver" : "🥉 Bronze";
  const locked = prof?.is_private && userId !== me && !isFriend;

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-24">
      {/* TOP BAR */}
      <div className="flex items-center justify-between p-4">
        <Link href="/feed" className="text-xl">←</Link>
        <p className="font-bold flex items-center gap-1 truncate max-w-[60%]">
          {prof?.is_private ? "🔒" : ""} {prof?.display_name || "..."}
        </p>
        <span className="text-xs text-amber-400 font-bold">🪙 {coins}</span>
      </div>

      {/* PROFILE ROW */}
      <div className="flex items-center gap-4 px-4 mb-3">
        {prof?.avatar_url ? (
          <img src={prof.avatar_url} className="w-20 h-20 rounded-full object-cover border-2 border-violet-500" alt="" />
        ) : (
          <span className="w-20 h-20 rounded-full bg-violet-600 border-2 border-violet-400 flex items-center justify-center text-3xl font-bold">
            {(prof?.display_name || "?").charAt(0).toUpperCase()}
          </span>
        )}
        <div className="flex-1 grid grid-cols-3 text-center">
          <div>
            <p className="font-black text-lg">{posts.length}</p>
            <p className="text-xs text-slate-400">posts</p>
          </div>
          <div>
            <p className="font-black text-lg">{friendCount}</p>
            <p className="text-xs text-slate-400">friends</p>
          </div>
          <div>
            <p className="font-black text-lg">{rank.split(" ")[0]}</p>
            <p className="text-xs text-slate-400">{rank.split(" ")[1]}</p>
          </div>
        </div>
      </div>

      {/* BIO */}
      <div className="px-4 mb-3">
        <p className="text-sm whitespace-pre-wrap text-slate-200">{prof?.bio || ""}</p>
      </div>

      {/* BUTTONS */}
      <div className="flex gap-2 px-4 mb-4">
        {userId === me ? (
          <>
            <button
              onClick={() => {
                setEditName(prof?.display_name || "");
                setEditBio(prof?.bio || "");
                setEditing(!editing);
              }}
              className="flex-1 py-2 rounded-lg bg-slate-800 text-xs font-bold"
            >
              {editing ? "✖ Close" : "✏️ Edit profile"}
            </button>
            <button onClick={share} className="flex-1 py-2 rounded-lg bg-slate-800 text-xs font-bold">
              📤 Share profile
            </button>
            <button onClick={togglePrivate} className="px-3 py-2 rounded-lg bg-slate-800 text-xs font-bold">
              {prof?.is_private ? "🔒" : "🌍"}
            </button>
          </>
        ) : (
          <>
            {isFriend ? (
              <span className="flex-1 py-2 rounded-lg bg-slate-800 text-xs font-bold text-center text-green-400">✓ Friends</span>
            ) : recvReq ? (
              <button onClick={accept} className="flex-1 py-2 rounded-lg bg-green-600 text-xs font-bold">
                ✅ Accept Request
              </button>
            ) : sentReq ? (
              <span className="flex-1 py-2 rounded-lg bg-slate-800 text-xs font-bold text-center text-slate-400">⏳ Requested</span>
            ) : (
              <button onClick={addFriend} className="flex-1 py-2 rounded-lg bg-violet-600 text-xs font-bold">
                ➕ Add Friend
              </button>
            )}
            <button onClick={share} className="flex-1 py-2 rounded-lg bg-slate-800 text-xs font-bold">
              📤 Share
            </button>
          </>
        )}
      </div>

      {/* EDIT PANEL */}
      {editing && userId === me && (
        <div className="px-4 mb-4 grid gap-2">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Your name"
            className="p-3 rounded-lg bg-slate-800 border border-slate-700 text-sm"
          />
          <textarea
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
            placeholder="Write your bio... (like: I AM THE NIGHT 🦇)"
            rows={2}
            className="p-3 rounded-lg bg-slate-800 border border-slate-700 text-sm resize-none"
          />
          <button
            onClick={saveProfile}
            disabled={saving}
            className="py-2 rounded-lg bg-violet-600 text-xs font-bold disabled:opacity-50"
          >
            💾 Save
          </button>
        </div>
      )}

      {/* TABS */}
      <div className="flex border-b border-slate-800 mb-1">
        <span className="flex-1 text-center py-2 border-b-2 border-white">▦</span>
        <span className="flex-1 text-center py-2 text-slate-600">▶</span>
        <span className="flex-1 text-center py-2 text-slate-600">🔁</span>
        <span className="flex-1 text-center py-2 text-slate-600">👤</span>
      </div>

      {/* CONTENT */}
      {locked ? (
        <div className="text-center py-16 px-6">
          <p className="text-5xl mb-3">🔒</p>
          <p className="text-xl font-bold">This account is private</p>
          <p className="text-sm text-slate-400 mt-1">Become a friend to see their posts!</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 px-6">
          <p className="text-5xl mb-3">📸</p>
          <p className="text-xl font-bold">Create your first post</p>
          <p className="text-sm text-slate-400 mt-1">Make this space your own.</p>
          {userId === me && (
            <Link href="/feed" className="inline-block mt-4 px-8 py-3 rounded-lg bg-violet-600 font-bold text-sm">
              Create
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {posts.map((p) => (
            <div key={p.id} className="aspect-square bg-slate-900 relative overflow-hidden">
              {p.image_url ? (
                <img src={p.image_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <p className="p-2 text-[10px] text-slate-300 line-clamp-6">{p.content}</p>
              )}
              <span className="absolute bottom-1 left-1 text-[10px] font-bold drop-shadow">❤️ {p.likes}</span>
            </div>
          ))}
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