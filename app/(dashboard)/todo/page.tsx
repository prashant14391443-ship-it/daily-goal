"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { queueChange, cacheData, getCachedData } from "@/lib/offlineDB";
import { ListTodo, Star, Repeat, Sparkles, Wifi, WifiOff } from "lucide-react";

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function TodoHub() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [taskCount, setTaskCount] = useState<number | null>(null);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    const loadTasks = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) return;

      const today = toLocalISO(new Date());
      
      // Try to load from cache first (works offline)
      const cached = await getCachedData<{ count: number }>(`tasks-${userId}-${today}`);
      if (cached) {
        setTaskCount(cached.count);
      }

      // If online, fetch fresh data
      if (navigator.onLine) {
        try {
          const { count } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("task_date", today)
            .eq("completed", false);
          
          const newCount = count || 0;
          setTaskCount(newCount);
          await cacheData(`tasks-${userId}-${today}`, { count: newCount });
        } catch (e) {
          console.error("Failed to load tasks:", e);
        }
      }
    };
    loadTasks();
  }, []);

  const tools = [
    { href: "/tasklog", icon: ListTodo, title: "Task Log", desc: "All tasks, reminders & dates", tint: "bg-amber-500/10 text-amber-400" },
    { href: "/myday", icon: Star, title: "My Day — Top 3", desc: "Pick 3 stars → beat overwhelm", tint: "bg-violet-500/10 text-violet-400" },
    { href: "/repeat", icon: Repeat, title: "Repeat Tasks", desc: "Daily / weekly auto-copies", tint: "bg-blue-500/10 text-blue-400" },
    { href: "/breakdown", icon: Sparkles, title: "AI Breakdown", desc: "Big task → small steps in 3 sec", tint: "bg-rose-500/10 text-rose-400" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-16 pb-24 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <ListTodo size={22} strokeWidth={2.2} />
          </span>
          <div>
            <h1 className="text-2xl font-black text-white" style={{ whiteSpace: "nowrap" }}>ToDo</h1>
            <div className="flex items-center gap-2 mt-1">
              {isOnline ? (
                <span className="flex items-center gap-1 text-[10px] text-green-400 font-bold">
                  <Wifi size={10} /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                  <WifiOff size={10} /> Offline Mode
                </span>
              )}
              {taskCount !== null && taskCount > 0 && (
                <span className="text-[10px] text-slate-400 font-bold">
                  • {taskCount} pending
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 font-semibold mt-2">Clear mind • clear list • clear wins</p>
      </div>

      {/* CALM CARDS */}
      <div className="grid grid-cols-2 gap-3">
        {tools.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href} className="press bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className={`w-9 h-9 rounded-lg ${t.tint} flex items-center justify-center mb-4`}>
                <Icon size={18} strokeWidth={2.2} />
              </span>
              <p className="font-black text-sm text-white leading-tight">{t.title}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{t.desc}</p>
            </Link>
          );
        })}
      </div>

      {/* PRO TIP */}
      <div className="mt-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-6 h-6 rounded-md bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <Sparkles size={13} strokeWidth={2.2} />
          </span>
          <p className="text-xs font-black text-amber-300">Pro tip</p>
        </div>
        <p className="text-[11px] text-slate-300 leading-snug">
          Start with <b className="text-white">My Day — Top 3</b>. Picking 3 priorities beats a list of 20. Try it now!
        </p>
      </div>
    </main>
  );
}
