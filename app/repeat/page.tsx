"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Task = { id: string; title: string; repeat: string | null; completed: boolean };

export default function RepeatTasksPage() {
  const [templates, setTemplates] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    
    if (!userId) {
      router.push("/login");
      return;
    }
    
    const today = toLocalISO(new Date());

    // 1. Fetch tasks that are already set to repeat (The Master Templates)
    const { data: repeatingData } = await supabase
      .from("tasks")
      .select("id, title, repeat, completed")
      .eq("user_id", userId)
      .not("repeat", "is", null);

    // 2. Fetch today's regular tasks (so you can pick from them)
    // We filter out parent_id so we don't show auto-generated copies here
    const { data: regularData } = await supabase
      .from("tasks")
      .select("id, title, repeat, completed")
      .eq("user_id", userId)
      .eq("task_date", today)
      .is("repeat", null)
      .is("parent_id", null)
      .eq("category", "todo");
      
    setTemplates((repeatingData as Task[]) || []);
    setTodayTasks((regularData as Task[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Turn a regular task into a repeating daily task
  const makeRepeating = async (t: Task) => {
    await supabase.from("tasks").update({ repeat: "daily" }).eq("id", t.id);
    await load(); // Reload to refresh the lists
  };

  // Stop a task from repeating
  const stopRepeating = async (t: Task) => {
    await supabase.from("tasks").update({ repeat: null }).eq("id", t.id);
    await load(); // Reload to refresh the lists
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-xl">🔁</span>
          Repeat Tasks
        </h1>
        <p className="text-slate-400">Pick tasks from today to automatically copy daily.</p>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading your tasks...</p>
      ) : (
        <>
          {/* SECTION 1: ACTIVELY REPEATING TASKS */}
          <div className="grid gap-3 mb-8">
            {templates.map((t) => (
              <div
                key={t.id}
                className="bg-slate-900 border border-indigo-500/40 rounded-xl p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-indigo-400 text-xl">🔁</span>
                  <p className="font-bold text-white">
                    {t.title}
                  </p>
                </div>
                <button
                  onClick={() => stopRepeating(t)}
                  className="text-indigo-400 text-sm hover:text-indigo-300"
                >
                  Stop Repeating
                </button>
              </div>
            ))}
            {templates.length === 0 && (
              <p className="text-slate-400 text-sm">
                No repeating tasks yet — tap "Repeat Daily" below on the habits you want to build.
              </p>
            )}
          </div>

          {/* SECTION 2: TODAY'S NORMAL TASKS */}
          <p className="text-sm text-slate-400 mb-2">Other tasks today:</p>
          <div className="grid gap-2">
            {todayTasks.map((t) => (
              <div
                key={t.id}
                className="bg-slate-900 rounded p-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border border-slate-600 bg-slate-800"></div>
                  <p className="text-sm text-slate-300">
                    {t.title}
                  </p>
                </div>
                <button
                  onClick={() => makeRepeating(t)}
                  className="text-slate-500 hover:text-indigo-400 font-semibold text-sm"
                >
                  Repeat Daily
                </button>
              </div>
            ))}
            {todayTasks.length === 0 && (
              <p className="text-slate-400 text-sm">
                No regular tasks added today. Go to the Task Log to add some!
              </p>
            )}
          </div>
        </>
      )}

      <Link
        href="/todo"
        className="inline-block mt-6 text-sm text-slate-400 hover:text-white"
      >
        ← Back to ToDo
      </Link>
    </main>
  );
}