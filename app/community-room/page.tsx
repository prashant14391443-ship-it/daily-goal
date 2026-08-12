"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LivekitRoom from "@/app/LivekitRoom";

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
  const [community, setCommunity] = useState<{
    name: string;
    room_code: string;
    owner_id: string;
  } | null>(null);
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
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const id = typeof window !== "undefined" ? localStorage.getItem("dg-community") : null;

  const loadMeta = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid || !id) {
      router.push("/community");
      return;
    }
    setMe(uid);
    setMyName(data.session?.user.email?.split("@")[0] || "member");

    const [c, m, my] = await Promise.all([
      supabase.from("communities").select("name, room_code, owner_id").eq("id", id).single(),
      supabase.from("community_members").select("user_id, status, user_name").eq("community_id", id),
      supabase.from("community_members").select("status").eq("community_id", id).eq("user_id", uid).maybeSingle(),
    ]);
    
    if (!c.data) {
      router.push("/community");
      return;
    }
    
    setCommunity(c.data);
    const rows = m.data || [];
    setMemberCount(rows.filter((r) => r.status === "approved").length);
    setPending(
      rows.filter((r) => r.status === "pending").map((r) => ({ user_id: r.user_id, user_name: r.user_name || "member" }))
    );
    
    setMyStatus(uid === c.data?.owner_id ? "approved" : my.data?.status || "");

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    
    const { data: oldFiles } = await supabase
      .from("community_messages")
      .select("id, file_url")
      .eq("community_id", id)
      .not("file_url", "is", null)
      .lt("created_at", twoDaysAgo);
      
    const paths = (oldFiles || [])
      .map((o) => String(o.file_url).split("/community-files/")[1])
      .filter(Boolean);
      
    if (paths.length) {
      await supabase.storage.from("community-files").remove(paths);
    }
    
    await supabase.from("community_messages").delete().eq("community_id", id).not("file_url", "is", null).lt("created_at", twoDaysAgo);
    await supabase.from("community_messages").delete().eq("community_id", id).lt("created_at", weekAgo);

    const { data: msgs } = await supabase
      .from("community_messages")
      .select("id, user_id, user_name, text, created_at, file_url, file_type")
      .eq("community_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    setMessages((msgs || []).reverse());
  };

  useEffect(() => {
    loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel("cm-" + id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages", filter: `community_id=eq.${id}` },
        (payload) => setMessages((m) => [...m, payload.new as Msg])
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "community_messages", filter: `community_id=eq.${id}` },
        (payload) =>
          setMessages((m) => m.map((x) => (x.id === (payload.new as Msg).id ? (payload.new as Msg) : x)))
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "community_messages", filter: `community_id=eq.${id}` },
        (payload) => setMessages((m) => m.filter((x) => x.id !== (payload.old as Msg).id))
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const compressImage = (f: File): Promise<File> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = 1024;
          let { width, height } = img;
          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => resolve(new File([blob || new Blob()], "photo.jpg", { type: "image/jpeg" })),
            "image/jpeg",
            0.7
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(f);
    });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type.startsWith("image/")) {
      if (f.size > 8 * 1024 * 1024) {
        alert("Image too big! Max 8 MB.");
        return;
      }
      const small = await compressImage(f);
      setFile(small);
      setPreview(URL.createObjectURL(small));
    } else if (f.type === "application/pdf") {
      if (f.size > 5 * 1024 * 1024) {
        alert("PDF too big! Max 5 MB.");
        return;
      }
      setFile(f);
      setPreview("");
    } else {
      alert("Only images or PDF allowed!");
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
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
      community_id: id,
      user_id: me,
      user_name: myName,
      text: text.trim() || (fileType === "pdf" ? "📄 PDF" : "📷 Photo"),
      file_url: fileUrl,
      file_type: fileType,
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

  const startEdit = (m: Msg) => {
    setEditingId(m.id);
    setText(m.text);
  };

  // FIXED #1 & #2: Removed the duplicated startPress and cancelPress declarations
  const startPress = (m: Msg) => {
    if (m.user_id !== me) return;
    pressTimer.current = window.setTimeout(() => setMenuMsg(m), 500);
  };

  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  // FIXED #3: Added missing ID null-check
  const approve = async (uid: string) => {
    if (!id) return;
    await supabase.from("community_members").update({ status: "approved" }).eq("community_id", id).eq("user_id", uid);
    setPending(pending.filter((p) => p.user_id !== uid));
    setMemberCount(memberCount + 1);
  };

  // FIXED #4: Added missing ID null-check
  const reject = async (uid: string) => {
    if (!id) return;
    await supabase.from("community_members").delete().eq("community_id", id).eq("user_id", uid);
    setPending(pending.filter((p) => p.user_id !== uid));
  };

  const leave = async () => {
    if (id) {
      await supabase.from("community_members").delete().eq("community_id", id).eq("user_id", me);
    }
    router.push("/community");
  };

  const invite = async () => {
    const link = window.location.origin + "/community";
    if (navigator.share) {
      try {
        await navigator.share({ title: community?.name || "Community", text: `Request to join "${community?.name}" on DAILY GOAL! 🎙️`, url: link });
      } catch {
        // cancelled
      }
    } else {
      prompt("Copy this link:", link);
    }
  };

  if (myStatus === "pending")
    return (
      <main className="min-h-screen bg-slate-950 text-white p-8 text-center">
        <p className="text-5xl mb-4">⏳</p>
        <p className="font-bold text-xl">Waiting for admin approval...</p>
        <Link href="/community" className="inline-block mt-6 text-sm text-slate-400 hover:text-white">
          ← Back to Communities
        </Link>
      </main>
    );

  if (myStatus !== "approved")
    return (
      <main className="min-h-screen bg-slate-950 text-white p-8 text-center">
        <p className="text-slate-400">You are not a member of this community.</p>
        <Link href="/community" className="inline-block mt-4 text-pink-400 underline">
          Go to Communities
        </Link>
      </main>
    );

  return (
    <main className="h-screen bg-slate-950 text-white p-3 md:p-6 flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">🏘️ {community?.name || "..."}</h1>
          <p className="text-slate-400 text-xs">👥 {memberCount} members • v4</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setVoiceOn(!voiceOn)}
            className={`px-3 py-2 rounded font-semibold text-sm ${voiceOn ? "bg-red-600" : "bg-green-600"}`}
          >
            {voiceOn ? "🔴 Voice" : "🎙️ Voice"}
          </button>
          <button onClick={invite} className="px-3 py-2 rounded bg-pink-600 text-sm font-semibold">
            ➕
          </button>
          <button onClick={leave} className="px-3 py-2 rounded bg-slate-800 text-sm">
            ←
          </button>
        </div>
      </div>

      {community && me === community.owner_id && pending.length > 0 && (
        <div className="bg-amber-600/10 border border-amber-500/40 rounded-xl p-3 mb-3">
          <p className="font-bold text-amber-400 mb-2 text-sm">🙏 Join Requests ({pending.length})</p>
          <div className="grid gap-2">
            {pending.map((p) => (
              <div key={p.user_id} className="flex items-center justify-between bg-slate-900 rounded p-2">
                <span className="text-sm">{p.user_name}</span>
                <div className="flex gap-2">
                  <button onClick={() => approve(p.user_id)} className="px-3 py-1 rounded bg-green-600 text-xs font-bold">
                    ✅
                  </button>
                  <button onClick={() => reject(p.user_id)} className="px-3 py-1 rounded bg-red-600 text-xs font-bold">
                    ❌
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {voiceOn && community && (
        <div className="mb-3">
          <LivekitRoom roomName={community.room_code} identity={myName} onLeave={() => setVoiceOn(false)} />
        </div>
      )}

      <div className="flex-1 min-h-0 bg-slate-900 rounded-xl p-3 overflow-y-auto grid gap-2 content-start">
        {messages.map((m) => {
          const own = m.user_id === me;
          return (
            <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 select-none ${own ? "bg-green-700" : "bg-slate-800"}`}
                onTouchStart={() => startPress(m)}
                onTouchEnd={cancelPress}
                onTouchMove={cancelPress}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (m.user_id === me) setMenuMsg(m);
                }}
              >
                {!own && (
                  <p className="text-xs font-bold mb-0.5" style={{ color: nameColor(m.user_name) }}>
                    {m.user_name}
                  </p>
                )}
                {m.file_type === "image" && m.file_url && (
                  <img src={m.file_url} alt="shared" className="rounded-lg max-h-60 mb-1" />
                )}
                {m.file_type === "pdf" && m.file_url && (
                  <a href={m.file_url} target="_blank" className="block text-sm underline text-sky-300 mb-1">
                    📄 Open PDF
                  </a>
                )}
                <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                <div className="flex items-center justify-end gap-2 mt-0.5">
                  <span className={`text-[10px] ${own ? "text-green-200" : "text-slate-400"}`}>{timeOf(m.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && <p className="text-slate-500 text-sm text-center">No messages yet — say hello! 👋</p>}
        <div ref={bottomRef} />
      </div>

      {file && (
        <div className="mt-2 bg-slate-900 border border-sky-500/40 rounded-xl p-3 flex items-center gap-3">
          {preview ? (
            <img src={preview} alt="preview" className="w-16 h-16 rounded-lg object-cover" />
          ) : (
            <span className="text-4xl">📄</span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{file.name || "photo.jpg"}</p>
            <p className="text-xs text-green-400">
              {(file.size / 1024).toFixed(0)} KB — attached ✅ ready to send
            </p>
          </div>
          <button type="button" onClick={clearFile} className="text-red-400 text-xl px-2">
            ✕
          </button>
        </div>
      )}

      {editingId && (
        <div className="mt-2 bg-slate-900 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between">
          <span className="text-sm text-amber-400 font-semibold">✏️ Editing message...</span>
          <button 
            onClick={() => { setEditingId(null); setText(""); }} 
            className="text-xs text-red-400 underline"
          >
            Cancel
          </button>
        </div>
      )}

      <form onSubmit={send} className="flex gap-2 mt-3 items-center">
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept="image/*,application/pdf"
          onChange={onFile}
          ref={fileInputRef} 
        />
        
        {!editingId && (
          <label
            htmlFor="file-upload"
            className="cursor-pointer p-3 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xl"
            title="Attach File"
          >
            📎
          </label>
        )}
        
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={file ? "Add a message (optional)..." : "Type a message..."}
          className="flex-1 p-3 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-pink-500"
          disabled={sending}
        />
        
        <button
          disabled={sending || (!text.trim() && !file)}
          className="px-5 py-3 rounded bg-pink-600 hover:bg-pink-500 font-semibold disabled:opacity-50"
        >
          {sending ? "⏳" : (editingId ? "💾" : "➤")}
        </button>
      </form>

      {/* Bonus Fix: Corrected Strict null-checks when handling the menuMsg */}
      {menuMsg && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
          onClick={() => setMenuMsg(null)}
        >
          <div
            className="bg-slate-800 rounded-xl p-2 w-52 grid gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {canEdit(menuMsg.created_at) && (
              <button
                onClick={() => {
                  if (menuMsg) {
                    startEdit(menuMsg);
                    setMenuMsg(null);
                  }
                }}
                className="text-left px-4 py-3 rounded-lg hover:bg-slate-700"
              >
                ✏️ Edit
              </button>
            )}
            <button
              onClick={() => {
                if (menuMsg) {
                  del(menuMsg);
                  setMenuMsg(null);
                }
              }}
              className="text-left px-4 py-3 rounded-lg hover:bg-slate-700 text-red-400"
            >
              🗑️ Delete
            </button>
            <button
              onClick={() => setMenuMsg(null)}
              className="text-left px-4 py-3 rounded-lg hover:bg-slate-700 text-slate-400"
            >
              ✖ Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}