"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";

export default function CountdownChip() {
  const [item, setItem] = useState<{ name: string; days: number; emoji: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

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

  const hidden = ["/login", "/signup", "/activity", "/inbox", "/profile", "/feed", "/search", "/leaderboard", "/english", "/ai", "/move", "/speaking", "/evaluate"].includes(pathname);

  if (!mounted || hidden || !item) return null;

  const color =
    item.days <= 3
      ? "bg-red-600/25 border-red-500/60 text-red-300"
      : item.days <= 7
      ? "bg-amber-600/25 border-amber-500/60 text-amber-300"
      : "bg-emerald-600/25 border-emerald-500/60 text-emerald-300";

  // 🔒 Portal to <body> = impossible to move while scrolling!
  return createPortal(
    <div
      style={{ position: "fixed", top: 20, right: 126, zIndex: 55 }}
      className={`${color} border-2 rounded-full px-4 py-2 text-sm font-black flex items-center gap-2 shadow-xl`}
    >
      <span className="text-base">{item.emoji}</span>
      <span className="max-w-[110px] truncate">{item.name}</span>
      <span>• {item.days}d</span>
    </div>,
    document.body
  );
}