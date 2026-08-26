"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LivekitRoom from "@/app/LivekitRoom";
import { RealtimeChannel } from "@supabase/supabase-js";
import { IconTile, GradButton, Chip } from "@/app/components/ui";

type Msg = {
  id: string;
  user_id: string;
  user_name: string;
  text: string;
  created_at: string;
  file_url: string | null;
  file_type: string | null;
};
type Pending = { user_id: string; user_name: string };

const NAME_COLORS = ["#f472b6", "#60a5fa", "#4ade80", "#facc15", "#c084fc", "#fb923c", "#22d3ee"];

function nameColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return NAME_COLORS[h % NAME_COLORS.length];
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function canEdit(iso: string) {
  return new Date(iso).getTime() > Date.now() - 15 * 60 * 1000;
}

export default function CommunityRoomPage() {
  const [community, setCommunity] = useState<{ name: string; room_code: string; owner_id: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const [pending, setPending] = useState<Pending[]>([]);
  const [myStatus, setMyStatus] = useState("");
  const [voiceOn, setVoiceOn] = useState(false);
  const [me, setMe] = useState("");
  const [myName, setMyName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuMsg, setMenuMsg] = useState<Msg | null>(null);
  const pressTimer = useRef<number | null>(null);
  const [voiceUsers, setVoiceUsers] = useState<string[]>([]);
  const [channelJoined, setChannelJoined] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const id = typeof window !== "undefined" ? localStorage.getItem("dg-community") : null;

  const loadMeta = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid || !id) { router.push("/community"); return; }
    setMe(uid);
    const meta = (data.session?.user.user_metadata || {}) as { display_name?: string };
    setMyName(meta.display_name || data.session?.user.email?.split("@")[0] || "member");

    const [c, m, my] = await Promise.all([
      supabase.from("communities").select("name, room_code, owner_id").eq("id", id).single(),
      supabase.from("community_members").select("user_id, status, user_name").eq("community_id", id),
      supabase.from("community_members").select("status").eq("community_id", id).eq("user_id", uid).maybeSingle(),
    ]);
    if (!c.data) { router.push("/community"); return; }
    setCommunity(c.data);
    const rows = m.data || [];
    setMemberCount(rows.filter((r) => r.status === "approved").length);
    setPending(rows.filter((r) => r.status === "pending").map((r) => ({ user_id: r.user_id, user_name: r.user_name || "member" })));
    setMyStatus(uid === c.data?.owner_id ? "approved" : my.data?.status || "");

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    const { data: oldFiles } = await supabase.from("community_messages").select("id, file_url").eq("community_id", id).not("file_url", "is", null).lt("created_at", twoDaysAgo);
    const paths = (oldFiles || []).map((o) => String(o.file_url).split("/community-files/")[1]).filter(Boolean);
    if (paths.length) await supabase.storage.from("community-files").remove(paths);
    await supabase.from("community_messages").delete().eq("community_id", id).not("file_url", "is", null).lt("created_at", twoDaysAgo);
    await supabase.from("community_messages").delete().eq("community_id", id).lt("created_at", weekAgo);

    const { data: msgs } = await supabase.from("community_messages").select("id, user_id, user_name, text, created_at, file_url, file_type").eq("community_id", id).order("created_at", { ascending: false }).limit(50);
    setMessages((msgs || []).reverse());
  };

  useEffect(() => { loadMeta(); }, []);

  useEffect(() => {
    if (!id || !me) return;
    const channel = supabase.channel("cm-" + id, { config: { presence: { key: me } } });
    channelRef.current = channel;
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ voice: boolean }>();
        const active: string[] = [];
        for (const key in state) if (state[key][0]?.voice) active.push(key);
        setVoiceUsers(active);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages", filter: `community_id=eq.${id}` }, (payload) => setMessages((m) => [...m, payload.new as Msg]))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "community_messages", filter: `community_id=eq.${id}` }, (payload) => setMessages((m) => m.map((x) => (x.id === (payload.new as Msg).id ? (payload.new as Msg) : x))))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_messages", filter: `community_id=eq.${id}` }, (payload) => setMessages((m) => m.filter((x) => x.id !== (payload.old as Msg).id)))
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setChannelJoined(true);
          await channel.track({ voice: voiceOn });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [id, me]);

  useEffect(() => {
    if (channelJoined && channelRef.current) channelRef.current.track({ voice: voiceOn });
  }, [voiceOn, channelJoined]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const compressImage = (f: File): Promise<File> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = 1024;
          let { width, height } = img;
          if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } }
          else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(new File([blob || new Blob()], "photo.jpg", { type: "image/jpeg" })), "image/jpeg", 0.7);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(f);
    });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type.startsWith("image/")) {
      if (f.size > 8 * 1024 * 1024) { alert("Image too big! Max 8 MB."); return; }
      const small = await compressImage(f);
      setFile(small);
      setPreview(URL.createObjectURL(small));
    } else if (f.type === "application/pdf") {
      if (f.size > 5 * 1024 * 1024) { alert("PDF too big! Max 5 MB."); return; }
      setFile(f);
      setPreview("");
    } else { alert("Only images or PDF allowed!"); }
  };

  const clearFile = () => {
    setFile(null);
    setPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (editingId) {
      if (!text.trim()) return;
      await supabase.from("community_messages").update({ text: text.trim() }).eq("id", editingId);
      setEditingId(null);
      setText("");
      return;
    }
    if ((!text.trim() && !file) || sending) return;
    setSending(true);
    let fileUrl: string | null = null;
    let fileType: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("community-files").upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from("community-files").getPublicUrl(path);
        fileUrl = urlData.publicUrl;
        fileType = file.type === "application/pdf" ? "pdf" : "image";
      }
      clearFile();
    }
    await supabase.from("community_messages").insert({
      community_id: id, user_id: me, user_name: myName,
      text: text.trim() || (fileType === "pdf" ? "📄 PDF" : "📷 Photo"),
      file_url: fileUrl, file_type: fileType,
    });
    setText("");
    setSending(false);
  };

  const del = async (m: Msg) => {
    if (m.file_url) {
      const p = String(m.file_url).split("/community-files/")[1];
      if (p) await supabase.storage.from("community-files").remove([p]);
    }
    await supabase.from("community_messages").delete().eq("id", m.id);
    setMessages((msgs) => msgs.filter((x) => x.id !== m.id));
  };

  const startEdit = (m: Msg) => { setEditingId(m.id); setText(m.text); };
  const startPress = (m: Msg) => { if (m.user_id !== me) return; pressTimer.current = window.setTimeout(() => setMenuMsg(m), 500); };
  const cancelPress = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } };

  const approve = async (uid: string) => {
    if (!id) return;
    await supabase.from("community_members").update({ status: "approved" }).eq("community_id", id).eq("user_id", uid);
    setPending(pending.filter((p) => p.user_id !== uid));
    setMemberCount(memberCount + 1);
  };
  const reject = async (uid: string) => {
    if (!id) return;
    await supabase.from("community_members").delete().eq("community_id", id).eq("user_id", uid);
    setPending(pending.filter((p) => p.user_id !== uid));
  };

  const leave = async () => {
    if (id) await supabase.from("community_members").delete().eq("community_id", id).eq("user_id", me);
    router.push("/community");
  };

  const invite = async () => {
    const link = window.location.origin + "/community";
    if (navigator.share) {
      try { await navigator.share({ title: community?.name || "Community", text: `Request to join "${community?.name}" on DAILY GOAL! 🎙️`, url: link }); } catch {}
    } else { prompt("Copy this link:", link); }
  };

  if (myStatus === "pending")
    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-6xl mb-4 animate-pulse">⏳</p>
        <p className="font-black text-xl text-white mb-2">Waiting for approval</p>
        <p className="text-sm text-slate-400 mb-6">The admin will approve your request soon</p>
        <Link href="/community" className="press text-sm text-pink-400 font-bold">← Back to Communities</Link>
      </main>
    );

  if (myStatus !== "approved")
    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-slate-400 mb-4">You are not a member of this community.</p>
        <Link href="/community" className="press text-sm text-pink-400 font-bold underline">Go to Communities</Link>
      </main>
    );

  return (
    <main className="fixed inset-0 overflow-hidden bg-slate-950 text-white p-3 md:p-4 flex flex-col z-[100]">
      {/* 🌆 PINK HERO HEADER */}
      <div className="relative mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-pink-600 via-fuchsia-600 to-violet-600 p-4 shadow-xl shadow-pink-900/30 shrink-0">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="w-11 h-11 shrink-0 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-lg">🏘️</span>
              <div className="min-w-0">
                <h1 className="text-lg font-black text-white leading-tight truncate" style={{ whiteSpace: "nowrap" }}>{community?.name || "..."}</h1>
                <p className="text-[10px] text-white/80 font-semibold">
                  👥 {memberCount} members
                  {community && me === community.owner_id && <span className="ml-2">• 👑 Admin</span>}
                </p>
              </div>
            </div>
            {voiceOn && (
              <div className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-[10px] font-black border border-white/20 flex items-center gap-1.5 shrink-0">
                {voiceUsers.length >= 2 ? (
                  <><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> VOICE ON</>
                ) : (
                  <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> WAITING</>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={invite} className="press flex-1 py-2 rounded-xl bg-white/15 border border-white/20 hover:bg-white/25 text-xs font-black text-white backdrop-blur transition-all">
              ➕ Invite
            </button>
            <button onClick={leave} className="press flex-1 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-red-500/30 text-xs font-black text-white/90 backdrop-blur transition-all">
              ← Leave
            </button>
          </div>
        </div>
      </div>

      {/* 🙏 JOIN REQUESTS (OWNER ONLY) */}
      {community && me === community.owner_id && pending.length > 0 && (
        <div className="mb-3 bg-gradient-to-r from-amber-600/15 to-orange-600/15 border-2 border-amber-500/40 rounded-2xl p-3 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <IconTile emoji="🙏" gradient="bg-gradient-to-br from-amber-500 to-orange-600" size="sm" />
            <p className="font-black text-xs text-amber-300">Join Requests ({pending.length})</p>
          </div>
          <div className="grid gap-1.5">
            {pending.map((p) => (
              <div key={p.user_id} className="flex items-center justify-between bg-slate-900/60 rounded-xl p-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-black text-white">
                    {p.user_name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-xs font-bold text-white truncate">{p.user_name}</span>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => approve(p.user_id)} className="press px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-400 text-[10px] font-black text-white">✅</button>
                  <button onClick={() => reject(p.user_id)} className="press px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-[10px] font-black text-white">❌</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 💬 CHAT CONTAINER */}
      <div className="flex-1 min-h-0 relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-lg">
        {voiceOn && voiceUsers.length >= 2 && community && (
          <div className="hidden pointer-events-none">
            <LivekitRoom roomName={community.room_code} identity={myName} onLeave={() => setVoiceOn(false)} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 grid gap-2.5 content-start">
          {messages.map((m) => {
            const own = m.user_id === me;
            return (
              <div key={m.id} className={`flex gap-2 ${own ? "justify-end" : "justify-start"}`}>
                {!own && (
                  <span
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shadow-lg self-end"
                    style={{ backgroundColor: nameColor(m.user_name) }}
                  >
                    {m.user_name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div
                  className={`max-w-[75%] select-none ${own ? "order-2" : ""}`}
                  onTouchStart={() => startPress(m)}
                  onTouchEnd={cancelPress}
                  onTouchMove={cancelPress}
                  onContextMenu={(e) => { e.preventDefault(); if (m.user_id === me) setMenuMsg(m); }}
                >
                  {!own && (
                    <p className="text-[10px] font-black mb-1 px-1" style={{ color: nameColor(m.user_name) }}>
                      {m.user_name}
                    </p>
                  )}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 shadow-md ${
                      own
                        ? "bg-gradient-to-br from-pink-600 to-fuchsia-600 rounded-br-sm"
                        : "bg-slate-800 border border-slate-700 rounded-bl-sm"
                    }`}
                  >
                    {m.file_type === "image" && m.file_url && (
                      <img src={m.file_url} alt="shared" className="rounded-xl max-h-60 mb-2" />
                    )}
                    {m.file_type === "pdf" && m.file_url && (
                      <a href={m.file_url} target="_blank" className="block text-xs font-bold underline text-sky-300 mb-1">
                        📄 Open PDF
                      </a>
                    )}
                    <p className="text-sm whitespace-pre-wrap leading-snug">{m.text}</p>
                    <p className={`text-[9px] font-bold mt-1 text-right ${own ? "text-white/70" : "text-slate-500"}`}>
                      {timeOf(m.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">👋</p>
              <p className="text-slate-500 text-sm font-bold">No messages yet — say hello!</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* 📎 FILE PREVIEW */}
      {file && (
        <div className="mt-2 bg-slate-900 border-2 border-cyan-500/40 rounded-2xl p-3 flex items-center gap-3 shrink-0 shadow-lg">
          {preview ? (
            <img src={preview} alt="preview" className="w-14 h-14 rounded-xl object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl">📄</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-white truncate">{file.name || "photo.jpg"}</p>
            <p className="text-[10px] text-emerald-400 font-bold">
              {(file.size / 1024).toFixed(0)} KB • ready ✅
            </p>
          </div>
          <button type="button" onClick={clearFile} className="press w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-sm font-black hover:bg-red-500/30">✕</button>
        </div>
      )}

      {/* ✏️ EDITING INDICATOR */}
      {editingId && (
        <div className="mt-2 bg-amber-500/15 border-2 border-amber-500/40 rounded-2xl p-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm">✏️</span>
            <span className="text-xs text-amber-300 font-black">Editing message...</span>
          </div>
          <button onClick={() => { setEditingId(null); setText(""); }} className="press text-xs text-red-400 font-bold underline">Cancel</button>
        </div>
      )}

      {/* 💬 INPUT + LEAVE VOICE */}
      <form onSubmit={send} className="flex gap-2 mt-3 items-center shrink-0">
        {voiceOn && (
          <button
            type="button"
            onClick={() => setVoiceOn(false)}
            className="press w-12 h-12 shrink-0 rounded-xl bg-red-500/15 border-2 border-red-500/40 text-red-400 hover:bg-red-500/25 flex items-center justify-center text-xl"
            title="Leave Voice"
          >
            📴
          </button>
        )}

        <input type="file" id="file-upload" className="hidden" accept="image/*,application/pdf" onChange={onFile} ref={fileInputRef} />
        {!editingId && !voiceOn && (
          <label htmlFor="file-upload" className="press cursor-pointer w-12 h-12 shrink-0 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-lg">📎</label>
        )}

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={file ? "Add a message..." : editingId ? "Edit your message..." : "Type a message..."}
          className="flex-1 h-12 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-pink-500 text-sm outline-none transition-all"
          disabled={sending}
        />

        <button
          disabled={sending || (!text.trim() && !file)}
          className="press w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 font-black text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-pink-900/30 flex items-center justify-center text-lg"
        >
          {sending ? "⏳" : (editingId ? "💾" : "➤")}
        </button>
      </form>

      {/* 🎙️ JOIN VOICE BUTTON */}
      {!voiceOn && (
        <button
          onClick={() => alert("🎙 Group calls unlock at Season 2 (self-host era)! 1-on-1 calls are open ✅")}
          className="press w-full shrink-0 mt-3 py-3.5 rounded-2xl font-black text-sm shadow-xl bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-900/30 text-white transition-all"
        >
          🎙️ Join Voice Channel
        </button>
      )}

      {/* 📱 LONG-PRESS / RIGHT-CLICK MENU */}
      {menuMsg && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setMenuMsg(null)}>
          <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-2 w-56 grid gap-1 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {canEdit(menuMsg.created_at) && (
              <button
                onClick={() => { if (menuMsg) { startEdit(menuMsg); setMenuMsg(null); } }}
                className="press text-left px-4 py-3 rounded-xl hover:bg-slate-800 text-sm font-bold flex items-center gap-2"
              >
                <span>✏️</span> Edit
              </button>
            )}
            <button
              onClick={() => { if (menuMsg) { del(menuMsg); setMenuMsg(null); } }}
              className="press text-left px-4 py-3 rounded-xl hover:bg-red-500/20 text-red-400 text-sm font-bold flex items-center gap-2"
            >
              <span>🗑️</span> Delete
            </button>
            <button
              onClick={() => setMenuMsg(null)}
              className="press text-left px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-400 text-sm font-bold mt-1 border-t border-slate-800 flex items-center gap-2"
            >
              <span>✕</span> Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}