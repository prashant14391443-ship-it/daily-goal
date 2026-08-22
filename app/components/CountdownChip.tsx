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

  // ✅ ONLY on dashboard
  const show = pathname === "/" || pathname === "/dashboard";
  if (!mounted || !show || !item) return null;

  const dayColor =
    item.days <= 3 ? "text-red-400" : item.days <= 7 ? "text-amber-400" : "text-emerald-400";

  // 📌 absolute (like bell & profile) = lives in the header, scrolls WITH the page
  return createPortal(
    <div
      style={{ position: "absolute", top: 18, left: 16, right: 126, zIndex: 55 }}
      className="h-11 rounded-full bg-slate-800/90 border border-slate-700 backdrop-blur-md flex items-center justify-center gap-2 px-3 shadow-lg"
    >
      <span className="text-lg">{item.emoji}</span>
      <span className="text-sm font-bold text-white truncate">{item.name}</span>
      <span className={`text-xs font-black whitespace-nowrap ${dayColor}`}>• {item.days}d left</span>
    </div>,
    document.body
  );
}