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
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
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

    // files die after 2 days
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
    await supabase
      .from("community_messages")
      .delete()
      .eq("community_id", id)
      .not("file_url", "is", null)
      .lt("created_at", twoDaysAgo);

    // text dies after 7 days
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
            (blob) =>
              resolve(new File([blob || new Blob()], "photo.jpg", { type: "image/jpeg" })),
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
      setFile(await compressImage(f));
    } else if (f.type === "application/pdf") {
      if (f.size > 5 * 1024 * 1024) {
        alert("PDF too big! Max 5 MB.");
        return;
      }
      setFile(f);
    } else {
      alert("Only images or PDF allowed!");
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !file) || !id || sending) return;
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
      setFile(null);
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

  const approve = async (uid: string) => {
    await supabase.from("community_members").update({ status: "approved" }).eq("community_id", id).eq("user_id", uid);
    setPending(pending.filter((p) => p.user_id !== uid));
    setMemberCount(memberCount + 1);
  };

  const reject = async (uid: string) => {
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
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">🏘️ {community?.name || "..."}</h1>
        <p className="text-slate-400 text-sm">👥 {memberCount} members</p>
      </div>

      {community && me === community.owner_id && pending.length > 0 && (
        <div className="bg-amber-600/10 border border-amber-500/40 rounded-xl p-4 mb-4">
          <p className="font-bold text-amber-400 mb-2">🙏 Join Requests ({pending.length})</p>
          <div className="grid gap-2">
            {pending.map((p) => (
              <div key={p.user_id} className="flex items-center justify-between bg-slate-900 rounded p-2">
                <span className="text-sm">{p.user_name}</span>
                <div className="flex gap-2">
                  <button onClick={() => approve(p.user_id)} className="px-3 py-1 rounded bg-green-600 hover:bg-green-500 text-xs font-bold">
                    ✅ Approve
                  </button>
                  <button onClick={() => reject(p.user_id)} className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-xs font-bold">
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setVoiceOn(!voiceOn)}
          className={`flex-1 min-w-[140px] py-3 rounded font-semibold ${voiceOn ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"}`}
        >
          {voiceOn ? "🔴 Leave Voice Room" : "🎙️ Join Voice Room"}
        </button>
        <button onClick={invite} className="px-4 py-3 rounded bg-pink-600 hover:bg-pink-500 font-semibold">
          ➕ Invite
        </button>
        <button onClick={leave} className="px-4 py-3 rounded bg-slate-800 hover:bg-slate-700 text-sm">
          Leave
        </button>
      </div>

      {voiceOn && community && (
        <div className="mb-4">
          <LivekitRoom roomName={community.room_code} identity={myName} onLeave={() => setVoiceOn(false)} />
        </div>
      )}

      <div className="flex-1 bg-slate-900 rounded-xl p-4 overflow-y-auto grid gap-2" style={{ maxHeight: "45vh" }}>
        {messages.map((m) => {
          const own = m.user_id === me;
          return (
            <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${own ? "bg-green-700" : "bg-slate-800"}`}>
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
                <p className={`text-[10px] mt-0.5 text-right ${own ? "text-green-200" : "text-slate-400"}`}>
                  {timeOf(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && <p className="text-slate-500 text-sm text-center">No messages yet — say hello! 👋</p>}
        <div ref={bottomRef} />
      </div>

      {file && (
        <p className="text-xs text-sky-300 mt-2">
          📎 {file.name} attached
          <button onClick={() => setFile(null)} className="ml-2 text-red-400">✕ remove</button>
        </p>
      )}

      <form onSubmit={send} className="flex gap-2 mt-2">
        <label className="px-3 py-3 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer text-lg">
          📎
          <input type="file" accept="image/*,application/pdf" onChange={onFile} className="hidden" />
        </label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-3 rounded bg-slate-800 border border-slate-700"
        />
        <button disabled={sending} className="px-5 py-3 rounded bg-pink-600 hover:bg-pink-500 font-semibold disabled:opacity-50">
          ➤
        </button>
      </form>

      <Link href="/community" className="inline-block mt-4 text-sm text-slate-400 hover:text-white">
        ← Back to Communities
      </Link>
    </main>
  );
}