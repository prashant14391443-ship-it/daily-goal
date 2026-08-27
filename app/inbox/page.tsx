"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";

type Thread = {
  userId: string;
  name: string;
  avatar: string;
  lastMsg: string;
  lastTime: string;
  unread: number;
};

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function InboxPage() {
  const [me, setMe] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    setMe(uid);
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order("created_at", { ascending: false })
      .limit(300);

    const map = new Map<string, Thread>();
    ((msgs as any[]) || []).forEach((m) => {
      const other = m.sender_id === uid ? m.receiver_id : m.sender_id;
      if (!map.has(other)) {
        map.set(other, {
          userId: other,
          name: "...",
          avatar: "",
          lastMsg: m.content,
          lastTime: m.created_at,
          unread: 0,
        });
      }
      if (m.receiver_id === uid && !m.read) map.get(other)!.unread += 1;
    });

    const list = Array.from(map.values());
    const ids = list.map((t) => t.userId);
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("*").in("user_id", ids);
      const pmap = new Map<string, any>(((profs as any[]) || []).map((x) => [x.user_id, x]));
      list.forEach((t) => {
        const p = pmap.get(t.userId);
        t.name = p?.display_name || "friend";
        t.avatar = p?.avatar_url || "";
      });
    }
    list.sort((a, b) => (b.lastTime > a.lastTime ? 1 : -1));
    setThreads(list);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const totalUnread = threads.reduce((a, t) => a + t.unread, 0);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link 
          href="/feed" 
          className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={18} className="text-slate-300" />
        </Link>
        <div className="flex items-center gap-2">
          <MessageCircle size={20} className="text-violet-400" />
          <p className="font-semibold text-lg">Inbox</p>
        </div>
        {totalUnread > 0 && (
          <span className="bg-red-500/20 border border-red-500/30 text-red-300 text-[10px] font-semibold rounded-full px-2.5 py-1">
            {totalUnread} new
          </span>
        )}
      </div>

      {threads.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
            <MessageCircle size={28} className="text-slate-500" />
          </div>
          <p className="text-sm text-slate-400 font-medium mb-1">No conversations yet</p>
          <p className="text-xs text-slate-500">Message a friend from their profile!</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {threads.map((t) => (
            <Link
              key={t.userId}
              href={`/chat?user=${t.userId}`}
              className={`rounded-xl p-4 flex items-center gap-3 border transition-colors ${
                t.unread > 0 
                  ? "bg-violet-500/5 border-violet-500/30 hover:border-violet-500/50" 
                  : "bg-slate-900 border-slate-700 hover:border-slate-600"
              }`}
            >
              {t.avatar ? (
                <img 
                  src={t.avatar} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-slate-800 flex-shrink-0" 
                  alt="" 
                />
              ) : (
                <span className="w-12 h-12 rounded-full bg-violet-600 border-2 border-slate-800 flex items-center justify-center font-bold flex-shrink-0">
                  {t.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="flex-1 min-w-0">
                <span className="font-semibold text-sm block truncate">{t.name}</span>
                <span className={`text-xs block truncate mt-0.5 ${
                  t.unread > 0 ? "text-white font-medium" : "text-slate-500"
                }`}>
                  {t.lastMsg}
                </span>
              </span>
              <span className="text-right shrink-0">
                <span className="text-[10px] text-slate-500 block mb-1">{ago(t.lastTime)}</span>
                {t.unread > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                    {t.unread}
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}