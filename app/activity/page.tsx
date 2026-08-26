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

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}
function isYesterday(iso: string) {
  const d = new Date(iso);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.toDateString() === y.toDateString();
}

// 🎯 Icon + color per notification type
const TYPE_STYLES: Record<string, { emoji: string; grad: string; border: string }> = {
  friend_request: { emoji: "🤝", grad: "from-green-500 to-emerald-600", border: "border-green-500/40" },
  friend_accepted: { emoji: "✅", grad: "from-emerald-500 to-teal-600", border: "border-emerald-500/40" },
  message: { emoji: "💬", grad: "from-blue-500 to-indigo-600", border: "border-blue-500/40" },
  like: { emoji: "❤️", grad: "from-pink-500 to-rose-600", border: "border-pink-500/40" },
  streak: { emoji: "🔥", grad: "from-orange-500 to-red-600", border: "border-orange-500/40" },
  system: { emoji: "🔔", grad: "from-violet-500 to-fuchsia-600", border: "border-violet-500/40" },
  coin: { emoji: "🪙", grad: "from-amber-500 to-orange-600", border: "border-amber-500/40" },
  default: { emoji: "📬", grad: "from-slate-500 to-slate-700", border: "border-slate-500/40" },
};

export default function ActivityPage() {
  const [items, setItems] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) { setLoading(false); return; }
    setUserId(uid);
    const { data: rows } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .not("type", "in", "(like,post)")
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((rows as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markAll = async () => {
    if (!userId) return;
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  };

  const deleteNotif = async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  };

  const clearAll = async () => {
    if (!userId || !confirm("Delete all notifications?")) return;
    setItems([]);
    await supabase.from("notifications").delete().eq("user_id", userId);
  };

  // 📅 Group by Today / Yesterday / Earlier
  const today: any[] = [], yesterday: any[] = [], earlier: any[] = [];
  items.forEach((n) => {
    if (isToday(n.created_at)) today.push(n);
    else if (isYesterday(n.created_at)) yesterday.push(n);
    else earlier.push(n);
  });

  const unreadCount = items.filter((n) => !n.read).length;

  const Section = ({ label, list }: { label: string; list: any[] }) => {
    if (list.length === 0) return null;
    return (
      <div className="mb-5">
        <p className="text-[10px] font-black text-slate-500 mb-2 px-1">{label}</p>
        <div className="grid gap-2">
          {list.map((n) => {
            const style = TYPE_STYLES[n.type] || TYPE_STYLES.default;
            const inner = (
              <>
                <div className={`shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${style.grad} flex items-center justify-center text-lg shadow-lg`}>
                  {style.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${n.read ? "text-slate-300" : "text-white font-semibold"}`}>{n.text}</p>
                  <p className="text-[10px] text-slate-500 mt-1 font-bold">{ago(n.created_at)}</p>
                </div>
              </>
            );

            const wrapper =
              n.type === "message" && n.actor_id ? (
                <Link href={`/chat?user=${n.actor_id}`} className="flex items-start gap-3 flex-1 min-w-0">{inner}</Link>
              ) : (
                <div className="flex items-start gap-3 flex-1 min-w-0">{inner}</div>
              );

            return (
              <div
                key={n.id}
                className={`press relative bg-slate-900 border rounded-2xl p-3 flex items-start gap-3 shadow-md transition-all ${
                  n.read ? "border-slate-800" : `border-l-4 ${style.border} border-slate-800`
                }`}
              >
                {wrapper}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteNotif(n.id); }}
                  className="press shrink-0 w-7 h-7 rounded-lg bg-slate-800 text-slate-500 hover:text-red-400 hover:bg-red-500/20 text-xs font-black flex items-center justify-center -mr-1 -mt-1"
                  aria-label="Delete"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-2xl mx-auto">
      {/* 🌆 HERO */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link href="/feed" className="press w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-lg">←</Link>
          <div>
            <h1 className="text-base font-black text-white leading-tight">Activity</h1>
            <p className="text-[10px] text-slate-400 font-semibold">{unreadCount} unread</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inbox" className="press px-3 py-1.5 rounded-full bg-violet-600/20 border border-violet-500/40 text-violet-300 text-[10px] font-black">
            💬 Inbox
          </Link>
        </div>
      </div>

      {/* 🎯 QUICK ACTIONS (only show if items exist) */}
      {items.length > 0 && (
        <div className="flex gap-2 mb-4">
          <button onClick={markAll} className="press flex-1 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-black text-slate-300 hover:bg-slate-800">
            ✓ Read all
          </button>
          <button onClick={clearAll} className="press flex-1 py-2 rounded-xl bg-slate-900 border border-red-500/30 text-xs font-black text-red-300 hover:bg-red-500/10">
            🗑 Clear all
          </button>
        </div>
      )}

      {/* 📋 CONTENT */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-2 animate-bounce">❤️</p>
          <p className="text-slate-400 text-sm">Loading activity...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-slate-900 border border-dashed border-slate-700 rounded-2xl py-16 text-center">
          <p className="text-5xl mb-3">🤝</p>
          <p className="text-lg font-black text-white mb-1">All quiet here</p>
          <p className="text-xs text-slate-400 mb-4">Make some friends to see activity!</p>
          <Link href="/search" className="press inline-block px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-black shadow-lg shadow-violet-900/30">
            🔍 Find friends
          </Link>
        </div>
      ) : (
        <>
          <Section label="📅 TODAY" list={today} />
          <Section label="⏰ YESTERDAY" list={yesterday} />
          <Section label="📚 EARLIER" list={earlier} />
        </>
      )}
    </main>
  );
}