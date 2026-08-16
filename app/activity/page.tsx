"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function ActivityPage() {
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    const { data: rows } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((rows as any[]) || []);
  };

  useEffect(() => {
    load();
  }, []);

  const markAll = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", uid);
    load();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <Link href="/feed" className="text-xl">←</Link>
        <p className="font-bold">❤️ Activity</p>
        <div className="flex gap-2">
          <Link href="/inbox" className="text-xs bg-violet-600 px-3 py-1 rounded-full font-bold">
            💬 Inbox
          </Link>
          <button onClick={markAll} className="text-xs text-violet-400 font-bold">
            Read all
          </button>
        </div>
      </div>
      <div className="grid gap-2">
        {items.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-10">No activity yet — make some friends! 🤝</p>
        )}
        {items.map((n) => {
          const inner = (
            <>
              <p className="text-sm">{n.text}</p>
              <p className="text-[10px] text-slate-500 mt-1">{ago(n.created_at)}</p>
            </>
          );
          const cls = `p-3 rounded-xl border block ${
            n.read ? "bg-slate-900 border-slate-800" : "bg-violet-600/10 border-violet-500/40"
          }`;
          return n.type === "message" && n.actor_id ? (
            <Link key={n.id} href={`/chat?user=${n.actor_id}`} className={cls}>
              {inner}
            </Link>
          ) : (
            <div key={n.id} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>
    </main>
  );
}