"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Msg = { id: string; user_name: string; text: string; created_at: string };

export default function CommunityRoomPage() {
  const [community, setCommunity] = useState<{ name: string; room_code: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const [voiceOn, setVoiceOn] = useState(false);
  const [me, setMe] = useState("");
  const [myName, setMyName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const id = typeof window !== "undefined" ? localStorage.getItem("dg-community") : null;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid || !id) {
        router.push("/community");
        return;
      }
      setMe(uid);
      setMyName(data.session?.user.email?.split("@")[0] || "member");

      const [c, m, msg] = await Promise.all([
        supabase.from("communities").select("name, room_code").eq("id", id).single(),
        supabase.from("community_members").select("user_id").eq("community_id", id),
        supabase
          .from("community_messages")
          .select("id, user_name, text, created_at")
          .eq("community_id", id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      setCommunity(c.data);
      setMemberCount(m.data?.length || 0);
      setMessages((msg.data || []).reverse());
    };
    load();
  }, []);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel("cm-" + id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_messages",
          filter: `community_id=eq.${id}`,
        },
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

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !id) return;
    await supabase.from("community_messages").insert({
      community_id: id,
      user_id: me,
      user_name: myName,
      text: text.trim(),
    });
    setText("");
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
        await navigator.share({
          title: community?.name || "Community",
          text: `Join "${community?.name}" on DAILY GOAL — chat & talk with us! 🎙️`,
          url: link,
        });
      } catch {
        // cancelled
      }
    } else {
      prompt("Copy this link:", link);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">🏘️ {community?.name || "..."}</h1>
        <p className="text-slate-400 text-sm">👥 {memberCount} members</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setVoiceOn(!voiceOn)}
          className={`flex-1 min-w-[140px] py-3 rounded font-semibold ${
            voiceOn ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"
          }`}
        >
          {voiceOn ? "🔴 Leave Voice Room" : "🎙️ Join Voice Room"}
        </button>
        <button
          onClick={invite}
          className="px-4 py-3 rounded bg-pink-600 hover:bg-pink-500 font-semibold"
        >
          ➕ Invite
        </button>
        <button
          onClick={leave}
          className="px-4 py-3 rounded bg-slate-800 hover:bg-slate-700 text-sm"
        >
          Leave
        </button>
      </div>

      {voiceOn && community && (
        <iframe
          src={`https://meet.jit.si/${community.room_code}#config.prejoinConfig.enabled=false&userInfo.displayName=${encodeURIComponent(myName)}`}
          className="w-full rounded-xl border border-slate-700 mb-4"
          style={{ height: 480 }}
          allow="camera; microphone; fullscreen; autoplay; display-capture"
        />
      )}

      <div className="flex-1 bg-slate-900 rounded-xl p-4 overflow-y-auto grid gap-2" style={{ maxHeight: "45vh" }}>
        {messages.map((m) => (
          <div key={m.id} className="bg-slate-800 rounded p-2">
            <p className="text-xs text-pink-400 font-semibold">{m.user_name}</p>
            <p className="text-sm">{m.text}</p>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-slate-500 text-sm">No messages yet — say hello! 👋</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 mt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-3 rounded bg-slate-800 border border-slate-700"
        />
        <button className="px-5 py-3 rounded bg-pink-600 hover:bg-pink-500 font-semibold">
          ➤
        </button>
      </form>

      <Link href="/community" className="inline-block mt-4 text-sm text-slate-400 hover:text-white">
        ← Back to Communities
      </Link>
    </main>
  );
}