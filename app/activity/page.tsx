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
    setUserId(uid);

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

    // Optimistic UI update
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
  };

  const deleteNotif = async (id: string) => {
    // Optimistic UI update
    setItems((prev) => prev.filter((item) => item.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  };

  const clearAll = async () => {
    if (!userId) return;
    if (!confirm("Delete all notifications?")) return;

    // Optimistic UI update
    setItems([]);
    await supabase.from("notifications").delete().eq("user_id", userId);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* 
        Responsive Wrapper: 
        max-w-2xl & mx-auto centers it on laptops. 
        md:pb-12 & md:pt-8 adjusts spacing specifically for desktop.
      */}
      <div className="max-w-2xl mx-auto p-4 pb-24 md:pb-12 md:pt-8 w-full">
        
        <div className="flex items-center justify-between mb-6">
          <Link href="/feed" className="text-xl hover:text-slate-400 transition-colors">
            ←
          </Link>
          <p className="font-bold text-lg">❤️ Activity</p>
          <div className="flex gap-3 items-center">
            <Link 
              href="/inbox" 
              className="text-xs bg-violet-600 hover:bg-violet-500 transition-colors px-3 py-1.5 rounded-full font-bold"
            >
              💬 Inbox
            </Link>
            <button 
              onClick={markAll} 
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-bold"
            >
              Read all
            </button>
            <button 
              onClick={clearAll} 
              className="text-xs text-red-400 hover:text-red-300 transition-colors font-bold"
            >
              Clear all
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <span className="text-4xl mb-3">🤝</span>
              <p className="text-sm">No activity yet — make some friends!</p>
            </div>
          )}
          
          {items.map((n) => {
            const inner = (
              <>
                <p className="text-sm flex-1 leading-relaxed">{n.text}</p>
                <p className="text-[11px] text-slate-500 mt-1.5 font-medium">{ago(n.created_at)}</p>
              </>
            );

            // Added hover effects (hover:bg-...) and transition for desktop users
            const cls = `p-4 rounded-xl border flex items-start gap-3 transition-colors duration-200 group ${
              n.read 
                ? "bg-slate-900 border-slate-800/80 hover:bg-slate-800/60" 
                : "bg-violet-600/10 border-violet-500/40 hover:bg-violet-600/20"
            }`;

            const wrapper = n.type === "message" && n.actor_id ? (
              <Link href={`/chat?user=${n.actor_id}`} className="flex-1 block outline-none">
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
                  className="text-slate-600 hover:text-red-400 p-1 -mr-1 -mt-1 transition-colors shrink-0"
                  aria-label="Delete notification"
                >
                  ✖
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}