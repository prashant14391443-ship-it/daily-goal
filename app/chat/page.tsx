"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function Inner() {
  const params = useSearchParams();
  const other = params.get("user") || "";
  const [me, setMe] = useState("");
  const [otherProf, setOtherProf] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid || !other) return;
    setMe(uid);
    const { data: rows } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${uid},receiver_id.eq.${other}),and(sender_id.eq.${other},receiver_id.eq.${uid})`
      )
      .order("created_at");
    setMsgs((rows as any[]) || []);
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("receiver_id", uid)
      .eq("sender_id", other)
      .eq("read", false);
  };

  useEffect(() => {
    const loadProf = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", other)
        .maybeSingle();
      setOtherProf(data || { display_name: "friend" });
    };
    loadProf();
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [other]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  const send = async () => {
    if (!text.trim()) return;
    
    // Optimistic UI update for a snappier feel
    const tempMsg = {
      id: Date.now().toString(),
      sender_id: me,
      receiver_id: other,
      content: text.trim(),
    };
    setMsgs((prev) => [...prev, tempMsg]);
    setText("");

    await supabase
      .from("messages")
      .insert({ sender_id: me, receiver_id: other, content: tempMsg.content });

    // Create notification for the receiver
    const { data: sess } = await supabase.auth.getSession();
    const myName =
      ((sess?.session?.user?.user_metadata as any)?.display_name as string) ||
      "Someone";
    await supabase.from("notifications").insert({
      user_id: other,
      actor_id: me,
      type: "message",
      text: `💬 ${myName} sent you a message`,
    });

    load();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* 
        Responsive Container:
        Limits width on desktop, centers it, and adds padding at the bottom 
        so the last message isn't hidden behind the fixed input field.
      */}
      <div className="max-w-2xl mx-auto w-full flex flex-col min-h-screen pb-36 md:pb-24">
        
        {/* Header - Sticky so it stays at the top when scrolling */}
        <div className="sticky top-0 z-10 flex items-center gap-3 p-4 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
          <Link 
            href={`/profile?user=${other}`} 
            className="text-xl hover:text-slate-400 transition-colors px-1"
          >
            ←
          </Link>
          <Link href={`/profile?user=${other}`} className="flex items-center gap-3 group">
            {otherProf?.avatar_url ? (
              <img
                src={otherProf.avatar_url}
                className="w-10 h-10 rounded-full object-cover group-hover:opacity-80 transition-opacity"
                alt=""
              />
            ) : (
              <span className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center font-bold text-lg group-hover:bg-violet-500 transition-colors">
                {(otherProf?.display_name || "?").charAt(0).toUpperCase()}
              </span>
            )}
            <p className="font-bold truncate group-hover:text-slate-300 transition-colors">
              {otherProf?.display_name || "..."}
            </p>
          </Link>
        </div>

        {/* Message Feed */}
        <div className="flex-1 p-4 grid gap-3 content-start">
          {msgs.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-20 flex flex-col items-center gap-2">
              <span className="text-3xl">👋</span>
              Say hi!
            </p>
          )}
          {msgs.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] md:max-w-[70%] px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap shadow-sm ${
                m.sender_id === me
                  ? "bg-violet-600 justify-self-end rounded-br-sm text-white"
                  : "bg-slate-800 justify-self-start rounded-bl-sm text-slate-100"
              }`}
            >
              {m.content}
            </div>
          ))}
          <div ref={endRef} className="h-1" />
        </div>
      </div>

      {/* 
        Input Area:
        Mobile: bottom-20 (above nav bar)
        Desktop (md:): bottom-0 (snaps to bottom of screen)
        Flex & max-w-2xl aligns it perfectly with the chat container above.
      */}
      <div className="fixed bottom-20 md:bottom-0 inset-x-0 p-3 bg-slate-950/95 backdrop-blur border-t border-slate-800 flex justify-center z-20">
        <div className="w-full max-w-2xl flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-full bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder:text-slate-500"
          />
          <button 
            onClick={send} 
            disabled={!text.trim()}
            className="px-5 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:hover:bg-violet-600 transition-all font-bold text-lg flex items-center justify-center"
            aria-label="Send message"
          >
            📤
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>}>
      <Inner />
    </Suspense>
  );
}