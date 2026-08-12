"use client";

import { useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-xl">📝</span>
          ToDo
        </h1>
        <p className="text-slate-400">Choose your tool</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/tasklog"
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center hover:bg-slate-800"
        >
          <span className="text-4xl">📝</span>
          <h3 className="font-bold mt-3">Task Log</h3>
          <p className="text-xs text-slate-400 mt-1">
            All tasks, reminders & dates
          </p>
        </Link>

        <Link
          href="/myday"
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center hover:bg-slate-800"
        >
          <span className="text-4xl">🌟</span>
          <h3 className="font-bold mt-3">My Day — Top 3</h3>
          <p className="text-xs text-slate-400 mt-1">
            Pick 3 stars → beat overwhelm
          </p>
        </Link>

        <Link
          href="/repeat"
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center hover:bg-slate-800"
        >
          <span className="text-4xl">🔁</span>
          <h3 className="font-bold mt-3">Repeat Tasks</h3>
          <p className="text-xs text-slate-400 mt-1">
            Daily / weekly auto-copies
          </p>
        </Link>

        <Link
          href="/breakdown"
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center hover:bg-slate-800"
        >
          <span className="text-4xl">🤖</span>
          <h3 className="font-bold mt-3">AI Breakdown</h3>
          <p className="text-xs text-slate-400 mt-1">
            Big task → small steps in 3 sec
          </p>
        </Link>
      </div>
    </main>
  );
}