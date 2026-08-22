"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function CountdownChip() {
  const [item, setItem] = useState<{ name: string; days: number; emoji: string } | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) return;
      const { data: rows } = await supabase.from("countdowns").select("*").eq("user_id", uid);
      if (!rows || rows.length === 0) return;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const future = rows
        .map((r: any) => {
          const d = new Date(r.target_date || r.date || r.event_date);
          const days = Math.ceil((d.getTime() - today.getTime()) / 86400000);
          return { name: r.name || r.title || "Event", emoji: r.emoji || "⏳", days };
        })
        .filter((x) => !isNaN(x.days) && x.days >= 0)
        .sort((a, b) => a.days - b.days);
      setItem(future[0] || null);
    };
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  // Hide on same pages where bell/profile are hidden
  if (["/login", "/signup", "/activity", "/inbox", "/profile", "/feed", "/search", "/leaderboard", "/english", "/ai", "/move", "/speaking", "/evaluate"].includes(pathname)) return null;
  if (!item) return null;

  const color =
    item.days <= 3
      ? "bg-red-600/20 border-red-500/50 text-red-300"
      : item.days <= 7
      ? "bg-amber-600/20 border-amber-500/50 text-amber-300"
      : "bg-emerald-600/20 border-emerald-500/50 text-emerald-300";

  return (
    <div
      style={{ position: "fixed", top: 22, right: 122, zIndex: 55 }}
      className={`${color} border rounded-full px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md`}
    >
      <span>{item.emoji}</span>
      <span className="max-w-[90px] truncate">{item.name}</span>
      <span>• {item.days}d</span>
    </div>
  );
}