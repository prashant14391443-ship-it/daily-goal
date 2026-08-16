"use client";

import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, MoreHorizontal, Bell, Bookmark, Clapperboard, Grid3X3, UserSquare, ChevronDown, UserPlus, Share, Edit2 } from "lucide-react";

// --- EXTERNAL FEED CODE ---
// I am including the specific deletePost logic you provided for the grid.
// This is used for a consistent experience within the same page.
// In a full application, you might want to create a separate Feed page.

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
    setProf(pr || { display_name: "friend", avatar_url: "", is_private: false, bio: "" });
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
    await supabase.from("profiles").update({ bio: editBio }).eq("user_id", me);
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
    <main className="min-h-screen bg-black text-white pb-24">
      {/* 🚀 TOP BAR (Updated for Design similarity) */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <Link href="/feed" className="text-xl">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex items-center gap-1.5 font-bold text-lg truncate max-w-[50%]">
          {prof?.is_private && <Lock size={16} className="text-zinc-500" />}
          <span className="truncate">{prof?.display_name || "..."}</span>
          <ChevronDown size={16} className="text-zinc-500" />
        </div>
        <div className="flex items-center gap-4">
          <Bell size={24} className="text-zinc-300" />
          <MoreHorizontal size={24} className="text-zinc-300" />
        </div>
      </div>

      {/* 🚀 MAIN CONTENT */}
      <div className="max-w-xl mx-auto">
        {/* PROFILE HEADER AREA */}
        <div className="p-4 grid grid-cols-[100px_1fr] items-center gap-x-6 gap-y-4">
          {/* Avatar Area */}
          <div className="relative w-24 h-24 self-start">
            {prof?.avatar_url ? (
              <img
                src={prof.avatar_url}
                className="w-full h-full rounded-full object-cover p-0.5 border-2 border-zinc-700"
                alt="Profile Avatar"
              />
            ) : (
              <span className="w-full h-full rounded-full bg-violet-600 flex items-center justify-center text-5xl font-bold border-2 border-violet-400">
                {(prof?.display_name || "?").charAt(0).toUpperCase()}
              </span>
            )
            }
            {/* Story Note / Plus icon placeholder */}
            <div className="absolute -top-3 -left-3 bg-white text-zinc-900 px-3 py-1.5 rounded-2xl text-[10px] font-medium shadow-md">
              Can't decide...
            </div>
            <div className="absolute bottom-1 right-1 bg-black rounded-full p-0.5">
              <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center font-black text-lg">+</span>
            </div>
          </div>

          {/* Stats to the right */}
          <div className="flex items-center justify-around text-center self-center h-20">
            <div>
              <p className="font-black text-xl">{posts.length}</p>
              <p className="text-xs text-zinc-400">posts</p>
            </div>
            <div>
              <p className="font-black text-xl">{friendCount}</p>
              <p className="text-xs text-zinc-400">friends</p>
            </div>
            <div>
              <p className="font-black text-xl">{rank.split(" ")[0]}</p>
              <p className="text-xs text-zinc-400">{rank.split(" ")[1]}</p>
            </div>
          </div>

          {/* Name and Bio below Avatar */}
          <div className="col-span-2">
            <h2 className="font-bold text-base mb-0.5">{prof?.display_name || "..."}</h2>
            <p className="text-sm whitespace-pre-wrap text-zinc-300 leading-relaxed">{prof?.bio || ""}</p>
          </div>
        </div>

        {/* 🚀 BUTTONS (Edit, Share, suggestions) */}
        <div className="flex gap-2 px-4 mb-6">
          {userId === me ? (
            <>
              <button
                onClick={() => {
                  setEditName(prof?.display_name || "");
                  setEditBio(prof?.bio || "");
                  setEditing(!editing);
                }}
                className="flex-1 py-2 rounded-lg bg-zinc-800 text-sm font-semibold flex items-center justify-center gap-2"
              >
                {editing ? "Close" : "✏️ Edit profile"}
              </button>
              <button onClick={share} className="flex-1 py-2 rounded-lg bg-zinc-800 text-sm font-semibold flex items-center justify-center gap-2">
                📤 Share profile
              </button>
              <button onClick={togglePrivate} className="px-3.5 py-2 rounded-lg bg-zinc-800 text-sm font-semibold">
                {prof?.is_private ? <Lock size={16} /> : <UserSquare size={16} />}
              </button>
            </>
          ) : (
            <>
              {isFriend ? (
                <span className="flex-1 py-2 rounded-lg bg-zinc-800 text-sm font-semibold text-center text-green-400">✓ Friends</span>
              ) : recvReq ? (
                <button onClick={accept} className="flex-1 py-2 rounded-lg bg-green-600 text-sm font-semibold">
                  ✅ Accept Request
                </button>
              ) : sentReq ? (
                <span className="flex-1 py-2 rounded-lg bg-zinc-800 text-sm font-semibold text-center text-zinc-400">⏳ Requested</span>
              ) : (
                <button onClick={addFriend} className="flex-1 py-2 rounded-lg bg-violet-600 text-sm font-semibold flex items-center justify-center gap-2">
                  <UserPlus size={16} /> Add Friend
                </button>
              )}
              <button onClick={share} className="flex-1 py-2 rounded-lg bg-zinc-800 text-sm font-semibold flex items-center justify-center gap-2">
                <Share size={16} /> Share
              </button>
              <button className="px-3.5 py-2 rounded-lg bg-zinc-800 text-sm font-semibold">
                <UserPlus size={16} />
              </button>
            </>
          )}
        </div>

        {/* EDIT PANEL (Conditional) */}
        {editing && userId === me && (
          <div className="px-4 mb-6 grid gap-3 p-4 bg-zinc-900 rounded-2xl border border-zinc-800 mx-4">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Your name"
              className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm outline-none focus:border-violet-500"
            />
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Write your bio... (🏆 Share your win)"
              rows={3}
              className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm resize-none outline-none focus:border-violet-500"
            />
            <button
              onClick={saveProfile}
              disabled={saving}
              className="py-2.5 rounded-xl bg-violet-600 text-sm font-semibold disabled:opacity-50"
            >
              💾 Save
            </button>
          </div>
        )}

        {/* 🚀 TABS (Icons updated to match design) */}
        <div className="flex border-b border-zinc-800 mb-0.5">
          <div className="flex-1 text-center py-2.5 border-b-2 border-white">
            <Grid3X3 size={24} className="mx-auto" />
          </div>
          <div className="flex-1 text-center py-2.5 text-zinc-600">
            <Clapperboard size={24} className="mx-auto" />
          </div>
          <div className="flex-1 text-center py-2.5 text-zinc-600">
            <Share size={24} className="mx-auto" />
          </div>
          <div className="flex-1 text-center py-2.5 text-zinc-600">
            <Bookmark size={24} className="mx-auto" />
          </div>
        </div>

        {/* 🚀 CONTENT SECTION (Locked or Posts) */}
        {locked ? (
          <div className="text-center py-20 px-8 border-t border-zinc-800">
            <Lock size={64} className="mx-auto mb-4 text-zinc-600" />
            <p className="text-xl font-bold">This account is private</p>
            <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">Become a friend to see their posts!</p>
          </div>
        ) : posts.length === 0 ? (
          /* New Empty State Design matching image */
          <div className="text-center py-16 px-10 border-t border-zinc-800">
            <div className="relative w-64 mx-auto mb-6">
                <img
                    src="/static-art-placeholder.png" // Replace with your art placeholder
                    className="w-full h-auto"
                    alt="Empty space graphic"
                />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-full h-full bg-black/60 filter blur-3xl opacity-50"></div>
            </div>
            <p className="text-3xl font-extrabold mb-1.5 tracking-tight">Create your first post</p>
            <p className="text-base text-zinc-300 mt-1 mb-8">Make this space your own.</p>
            {userId === me && (
              <Link href="/feed" className="inline-block px-10 py-3 rounded-xl bg-violet-600 font-bold text-sm tracking-wide">
                Create
              </Link>
            )}
          </div>
        ) : (
          /* Grid matching design */
          <div className="grid grid-cols-3 gap-0.5 p-0.5">
            {posts.map((p) => (
              <div key={p.id} className="aspect-square bg-zinc-900 relative overflow-hidden group">
                {p.image_url ? (
                  <img src={p.image_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <p className="p-3 text-[11px] text-zinc-300 leading-tight line-clamp-6">{p.content}</p>
                )}
                {/* Coin/Likes label */}
                <div className="absolute bottom-1.5 left-1.5 bg-black/70 px-2 py-0.5 rounded-full flex items-center gap-1.5 text-[11px] font-bold">
                    <span className="text-pink-400">❤️</span> {p.likes}
                </div>
                {/* delete button overlay (used from your grid specific deletion logic) */}
                {userId === me && (
                  <button
                    onClick={() => deletePost(p)}
                    className="absolute top-1.5 right-1.5 bg-zinc-900/80 hover:bg-red-950 rounded-full w-7 h-7 text-xs flex items-center justify-center shadow-lg transition-colors"
                  >
                    🗑
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🚀 BOTTOM NAVIGATION (Separate component/file recommended) */}
      <div className="fixed bottom-0 inset-x-0 bg-black border-t border-zinc-800 px-6 py-2 flex items-center justify-around z-50">
        <Link href="/feed" className="p-2 text-white">🏠</Link>
        <Link href="/search" className="p-2 text-zinc-500">🔍</Link>
        <button className="p-2 text-zinc-500 text-3xl">+</button>
        <Link href="/reels" className="p-2 text-zinc-500">▶</Link>
        <Link href="/profile" className="p-2 border-2 border-white rounded-full">
            {prof?.avatar_url ? (
                <img src={prof.avatar_url} className="w-6 h-6 rounded-full" alt="Your profile" />
            ) : (
                <span className="w-6 h-6 rounded-full bg-zinc-600 flex items-center justify-center font-bold text-xs">
                    ?
                </span>
            )}
        </Link>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<p className="text-zinc-400 p-6 text-sm">Loading profile...</p>}>
      <Inner />
    </Suspense>
  );
}