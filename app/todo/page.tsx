"use client";

import { useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ListTodo, Star, Repeat, Sparkles } from "lucide-react";

function toLocalISO(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${day}`; }
function addDays(dateStr: string, days: number) { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + days); return toLocalISO(d); }

export default function TodoHub() {
  useEffect(() => {
    const materialize = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user.id;
        if (!userId) return;
        const today = toLocalISO(new Date());
        const { data: templates } = await supabase
          .from("tasks").select("id, title, repeat, task_date")
          .eq("user_id", userId).not("repeat", "is", null);
        for (const t of templates || []) {
          const { data: inst } = await supabase
            .from("tasks").select("id, task_date")
            .eq("parent_id", t.id).order("task_date", { ascending: false }).limit(1);
          const last = inst?.[0]?.task_date || t.task_date;
          const need = t.repeat === "daily" ? last < today : addDays(last, 7) <= today;
          if (!need) continue;
          const { data: todayInst } = await supabase
            .from("tasks").select("id").eq("parent_id", t.id).eq("task_date", today);
          if (!todayInst || todayInst.length === 0) {
            await supabase.from("tasks").insert({
              user_id: userId, title: t.title, category: "todo",
              task_date: today, completed: false, parent_id: t.id,
            });
          }
        }
      } catch {}
    };
    materialize();
  }, []);

  const tools = [
    { href: "/tasklog", icon: ListTodo, title: "Task Log", desc: "All tasks, reminders & dates", tint: "bg-amber-500/10 text-amber-400" },
    { href: "/myday", icon: Star, title: "My Day — Top 3", desc: "Pick 3 stars → beat overwhelm", tint: "bg-violet-500/10 text-violet-400" },
    { href: "/repeat", icon: Repeat, title: "Repeat Tasks", desc: "Daily / weekly auto-copies", tint: "bg-blue-500/10 text-blue-400" },
    { href: "/breakdown", icon: Sparkles, title: "AI Breakdown", desc: "Big task → small steps in 3 sec", tint: "bg-pink-500/10 text-pink-400" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-16 pb-24 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <ListTodo size={22} strokeWidth={2.2} />
          </span>
          <h1 className="text-2xl font-black text-white" style={{ whiteSpace: "nowrap" }}>ToDo</h1>
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