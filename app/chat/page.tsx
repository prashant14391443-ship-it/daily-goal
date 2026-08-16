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
      const { data } = await supabase.from("profiles").select("*").eq("user_id", other).maybeSingle();
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
    await supabase.from("messages").insert({ sender_id: me, receiver_id: other, content: text.trim() });
    
    // Create notification for the receiver
    const { data: sess } = await supabase.auth.getSession();
    const myName = ((sess?.session?.user?.user_metadata as any)?.display_name as string) || "Someone";
    await supabase.from("notifications").insert({
      user_id: other,
      actor_id: me,
      type: "message",
      text: `💬 ${myName} sent you a message`,
    });
    
    setText("");
    load();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col pb-24">
      <div className="flex items-center gap-2 p-4 border-b border-slate-800">
        <Link href={`/profile?user=${other}`} className="text-xl">←</Link>
        {otherProf?.avatar_url ? (
          <img src={otherProf.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
        ) : (
          <span className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center font-bold">
            {(otherProf?.display_name || "?").charAt(0).toUpperCase()}
          </span>
        )}
        <p className="font-bold truncate">{otherProf?.display_name || "..."}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 grid gap-2 content-start">
        {msgs.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-10">Say hi! 👋</p>
        )}
        {msgs.map((m) => (
          <div
            key={m.id}
            className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
              m.sender_id === me
                ? "bg-violet-600 justify-self-end rounded-br-sm"
                : "bg-slate-800 justify-self-start rounded-bl-sm"
            }`}
          >
            {m.content}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="fixed bottom-20 inset-x-0 p-3 bg-slate-950 border-t border-slate-800">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Type a message..."
            className="flex-1 p-3 rounded-full bg-slate-900 border border-slate-700 text-sm"
          />
          <button onClick={send} className="px-5 rounded-full bg-violet-600 font-bold text-sm">
            📤
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<p className="text-slate-400 p-4">Loading...</p>}>
      <Inner />
    </Suspense>
  );
}