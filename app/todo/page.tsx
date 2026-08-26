"use client";

import { useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { IconTile } from "@/app/components/ui";

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toLocalISO(d);
}

export default function TodoHub() {
  useEffect(() => {
    const materialize = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user.id;
        if (!userId) return;
        const today = toLocalISO(new Date());

        const { data: templates } = await supabase
          .from("tasks")
          .select("id, title, repeat, task_date")
          .eq("user_id", userId)
          .not("repeat", "is", null);

        for (const t of templates || []) {
          const { data: inst } = await supabase
            .from("tasks")
            .select("id, task_date")
            .eq("parent_id", t.id)
            .order("task_date", { ascending: false })
            .limit(1);

          const last = inst?.[0]?.task_date || t.task_date;
          const need =
            t.repeat === "daily" ? last < today : addDays(last, 7) <= today;
          if (!need) continue;

          const { data: todayInst } = await supabase
            .from("tasks")
            .select("id")
            .eq("parent_id", t.id)
            .eq("task_date", today);

          if (!todayInst || todayInst.length === 0) {
            await supabase.from("tasks").insert({
              user_id: userId,
              title: t.title,
              category: "todo",
              task_date: today,
              completed: false,
              parent_id: t.id,
            });
          }
        }
      } catch {
        // ignore
      }
    };
    materialize();
  }, []);

  const tools = [
    {
      href: "/tasklog",
      emoji: "📝",
      title: "Task Log",
      desc: "All tasks, reminders & dates",
      grad: "bg-gradient-to-br from-amber-500 to-orange-600",
      border: "border-amber-500/30",
    },
    {
      href: "/myday",
      emoji: "🌟",
      title: "My Day — Top 3",
      desc: "Pick 3 stars → beat overwhelm",
      grad: "bg-gradient-to-br from-violet-500 to-purple-600",
      border: "border-violet-500/30",
    },
    {
      href: "/repeat",
      emoji: "🔁",
      title: "Repeat Tasks",
      desc: "Daily / weekly auto-copies",
      grad: "bg-gradient-to-br from-blue-500 to-indigo-600",
      border: "border-blue-500/30",
    },
    {
      href: "/breakdown",
      emoji: "🤖",
      title: "AI Breakdown",
      desc: "Big task → small steps in 3 sec",
      grad: "bg-gradient-to-br from-pink-500 to-rose-600",
      border: "border-pink-500/30",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg">📝</span>
          <h1 className="text-2xl font-black text-white" style={{ whiteSpace: "nowrap" }}>ToDo</h1>
        </div>
        <p className="text-[10px] text-slate-400 font-semibold mt-2">Clear mind • clear list • clear wins</p>
      </div>

      {/* tool grid */}
      <div className="grid grid-cols-2 gap-3">
        {tools.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`press bg-slate-900 border ${t.border} rounded-2xl p-4 shadow-lg shadow-black/30 hover:shadow-xl transition-all`}
          >
            <IconTile emoji={t.emoji} gradient={t.grad} />
            <p className="font-black text-sm mt-3 text-white leading-tight">{t.title}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{t.desc}</p>
          </Link>
        ))}
      </div>

      {/* tip card */}
      <div className="mt-6 bg-gradient-to-r from-amber-600/10 to-orange-600/10 border border-amber-500/20 rounded-2xl p-4">
        <p className="text-xs font-black text-amber-300 mb-1">💡 Pro tip</p>
        <p className="text-[11px] text-slate-300 leading-snug">
          Start with <b className="text-white">My Day — Top 3</b>. Picking 3 priorities beats a list of 20. Try it now!
        </p>
      </div>
    </main>
  );
}