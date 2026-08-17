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
  const [userId, setUserId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    
    if (!uid) return;
    setUserId(uid); // Store the user ID for other functions to use

    const { data: rows } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .not("type", "in", "(like,post)")
      .order("created_at", { ascending: false })
      .limit(50);
      
    setItems((rows as any[]) || []);
  };

  useEffect(() => {
    load();
  }, []);

  const markAll = async () => {
    if (!userId) return;
    
    // Optimistic UI update: instantly update UI without waiting for DB
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
  };

  const deleteNotif = async (id: string) => {
    // Optimistic UI update: instantly remove from screen
    setItems((prev) => prev.filter((item) => item.id !== id));
    
    await supabase.from("notifications").delete().eq("id", id);
  };

  const clearAll = async () => {
    if (!userId) return;
    if (!confirm("Delete all notifications?")) return;
    
    // Optimistic UI update: instantly clear screen
    setItems([]);

    await supabase.from("notifications").delete().eq("user_id", userId);
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
          <button onClick={clearAll} className="text-xs text-red-400 font-bold">
            Clear all
          </button>
        </div>
      </div>
      <div className="grid gap-2">
        {items.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-10">
            No activity yet — make some friends! 🤝
          </p>
        )}
        {items.map((n) => {
          const inner = (
            <>
              <p className="text-sm flex-1">{n.text}</p>
              <p className="text-[10px] text-slate-500 mt-1">{ago(n.created_at)}</p>
            </>
          );
          
          const cls = `p-3 rounded-xl border flex items-start gap-2 ${
            n.read 
              ? "bg-slate-900 border-slate-800" 
              : "bg-violet-600/10 border-violet-500/40"
          }`;
          
          const wrapper = n.type === "message" && n.actor_id ? (
            <Link href={`/chat?user=${n.actor_id}`} className="flex-1 block">
              {inner}
            </Link>
          ) : (
            <div className="flex-1">{inner}</div>
          );
          
          return (
            <div key={n.id} className={cls}>
              {wrapper}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deleteNotif(n.id);
                }}
                className="text-slate-500 hover:text-red-400 text-sm shrink-0"
              >
                ✖
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}