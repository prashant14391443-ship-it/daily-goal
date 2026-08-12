"use client";

import { useEffect, useRef, useState } from "react";
import LivekitRoom from "@/app/LivekitRoom";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Msg = { id: string; user_name: string; text: string; created_at: string };

export default function CommunityRoomPage() {
  // 1. ADDED: Store the ID in state instead of a floating constant
  const [id, setId] = useState<string | null>(null); 
  const [community, setCommunity] = useState<{ name: string; room_code: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const [voiceOn, setVoiceOn] = useState(false);
  const [me, setMe] = useState("");
  const [myName, setMyName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      // 2. FIXED: Read localStorage safely inside useEffect with the correct key name
      const storedId = localStorage.getItem("dg-community-id") || localStorage.getItem("dg-community");
      
      if (!storedId) {
        router.push("/community");
        return;
      }
      setId(storedId); // Save it to state for the other functions to use

      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      
      if (!uid) {
        router.push("/login");
        return;
      }
      
      setMe(uid);
      setMyName(data.session?.user.email?.split("@")[0] || "member");

      const [c, m, msg] = await Promise.all([
        supabase.from("communities").select("name, room_code").eq("id", storedId).single(),
        supabase.from("community_members").select("user_id").eq("community_id", storedId),
        supabase
          .from("community_messages")
          .select("id, user_name, text, created_at")
          .eq("community_id", storedId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      
      setCommunity(c.data);
      setMemberCount(m.data?.length || 0);
      setMessages((msg.data || []).reverse());
    };
    
    load();
  }, [router]);

  // This will naturally wait until 'id' is found in the first useEffect
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
          className={`flex-1 min-w-[140px] py-3 rounded font-semibold transition-colors ${
            voiceOn ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"
          }`}
        >
          {voiceOn ? "🔴 Leave Voice Room" : "🎙️ Join Voice Room"}
        </button>
        <button
          onClick={invite}
          className="px-4 py-3 rounded bg-pink-600 hover:bg-pink-500 font-semibold transition-colors"
        >
          ➕ Invite
        </button>
        <button
          onClick={leave}
          className="px-4 py-3 rounded bg-slate-800 hover:bg-slate-700 text-sm transition-colors"
        >
          Leave
        </button>
      </div>

      {voiceOn && community && (
        <div className="mb-4">
          <LivekitRoom 
            roomName={community.room_code} 
            identity={myName} 
            onLeave={() => setVoiceOn(false)} 
          />
        </div>
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
          className="flex-1 p-3 rounded bg-slate-800 border border-slate-700 text-white"
        />
        <button className="px-5 py-3 rounded bg-pink-600 hover:bg-pink-500 font-semibold transition-colors">
          ➤
        </button>
      </form>

      <Link href="/community" className="inline-block mt-4 text-sm text-slate-400 hover:text-white transition-colors">
        ← Back to Communities
      </Link>
    </main>
  );
}