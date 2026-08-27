"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";

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
      <div className="max-w-2xl mx-auto w-full flex flex-col min-h-screen pb-36 md:pb-24">
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 p-4 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
          <Link 
            href={`/profile?user=${other}`} 
            className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={18} className="text-slate-300" />
          </Link>
          <Link href={`/profile?user=${other}`} className="flex items-center gap-3 group flex-1 min-w-0">
            {otherProf?.avatar_url ? (
              <img
                src={otherProf.avatar_url}
                className="w-10 h-10 rounded-full object-cover border-2 border-slate-800 group-hover:opacity-90 transition-opacity flex-shrink-0"
                alt=""
              />
            ) : (
              <span className="w-10 h-10 rounded-full bg-violet-600 border-2 border-slate-800 flex items-center justify-center font-bold text-lg group-hover:bg-violet-500 transition-colors flex-shrink-0">
                {(otherProf?.display_name || "?").charAt(0).toUpperCase()}
              </span>
            )}
            <p className="font-semibold truncate group-hover:text-slate-200 transition-colors">
              {otherProf?.display_name || "..."}
            </p>
          </Link>
        </div>

        {/* Message Feed */}
        <div className="flex-1 p-4 grid gap-2.5 content-start">
          {msgs.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                <Send size={24} className="text-slate-500" />
              </div>
              <p className="text-slate-500 text-sm font-medium">Say hi!</p>
            </div>
          )}
          {msgs.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] md:max-w-[70%] px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap ${
                m.sender_id === me
                  ? "bg-violet-600 justify-self-end rounded-br-md text-white"
                  : "bg-slate-900 border border-slate-800 justify-self-start rounded-bl-md text-slate-100"
              }`}
            >
              {m.content}
            </div>
          ))}
          <div ref={endRef} className="h-1" />
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-20 md:bottom-0 inset-x-0 p-3 bg-slate-950/95 backdrop-blur border-t border-slate-800 flex justify-center z-20">
        <div className="w-full max-w-2xl flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-full bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:border-violet-500 transition-all placeholder:text-slate-500"
          />
          <button 
            onClick={send} 
            disabled={!text.trim()}
            className="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 transition-all flex items-center justify-center flex-shrink-0"
            aria-label="Send message"
          >
            <Send size={20} className="text-white" />
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