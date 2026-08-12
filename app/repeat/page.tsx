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

type Task = { id: string; title: string; completed: boolean; focus: boolean };

export default function MyDayPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = async () => {
    // 1st change: Renamed to 'sessionData' to avoid conflicts
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    
    if (!userId) {
      router.push("/login");
      return;
    }
    
    // Moved 'today' inside the function to prevent Next.js hydration errors
    const today = toLocalISO(new Date());

    // 2nd change: Renamed to 'tasksData' 
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("id, title, completed, focus")
      .eq("user_id", userId)
      .eq("task_date", today)
      .eq("category", "todo");
      
    // 3rd change: Explicitly tell TypeScript this data is an array of Tasks
    setTasks((tasksData as Task[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleFocus = async (t: Task) => {
    if (!t.focus && tasks.filter((x) => x.focus).length >= 3) {
      alert("Max 3 star tasks! Unstar one first.");
      return;
    }
    await supabase.from("tasks").update({ focus: !t.focus }).eq("id", t.id);
    setTasks(tasks.map((x) => (x.id === t.id ? { ...x, focus: !t.focus } : x)));
  };

  const toggleDone = async (t: Task) => {
    await supabase.from("tasks").update({ completed: !t.completed }).eq("id", t.id);
    setTasks(tasks.map((x) => (x.id === t.id ? { ...x, completed: !t.completed } : x)));
  };

  const stars = tasks.filter((t) => t.focus);
  const rest = tasks.filter((t) => !t.focus);
  const allDone = stars.length > 0 && stars.every((t) => t.completed);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-xl">🌟</span>
          My Day — Top 3
        </h1>
        <p className="text-slate-400">Star max 3 tasks → finish them first</p>
      </div>

      {allDone && (
        <div className="bg-green-600/20 border border-green-500/40 rounded-xl p-6 text-center mb-6">
          <p className="text-4xl mb-2">🎉</p>
          <p className="font-bold">All 3 stars done — YOU WON TODAY!</p>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading today...</p>
      ) : (
        <>
          <div className="grid gap-3 mb-8">
            {stars.map((t) => (
              <div
                key={t.id}
                className="bg-slate-900 border border-amber-500/40 rounded-xl p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleDone(t)}
                    className={`w-6 h-6 rounded border flex items-center justify-center ${
                      t.completed
                        ? "bg-green-500 border-green-500"
                        : "bg-slate-800 border-slate-600"
                    }`}
                  >
                    {t.completed && <span className="text-xs font-bold">✓</span>}
                  </button>
                  <p className={`font-bold ${t.completed ? "line-through text-slate-500" : ""}`}>
                    ⭐ {t.title}
                  </p>
                </div>
                <button
                  onClick={() => toggleFocus(t)}
                  className="text-amber-400 text-sm"
                >
                  Unstar
                </button>
              </div>
            ))}
            {stars.length === 0 && (
              <p className="text-slate-400 text-sm">
                No stars yet — tap ⭐ below on your most important tasks.
              </p>
            )}
          </div>

          <p className="text-sm text-slate-400 mb-2">Other tasks today:</p>
          <div className="grid gap-2">
            {rest.map((t) => (
              <div
                key={t.id}
                className="bg-slate-900 rounded p-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleDone(t)}
                    className={`w-5 h-5 rounded border flex items-center justify-center ${
                      t.completed
                        ? "bg-green-500 border-green-500"
                        : "bg-slate-800 border-slate-600"
                    }`}
                  >
                    {t.completed && <span className="text-xs font-bold">✓</span>}
                  </button>
                  <p className={`text-sm ${t.completed ? "line-through text-slate-500" : ""}`}>
                    {t.title}
                  </p>
                </div>
                <button
                  onClick={() => toggleFocus(t)}
                  className="text-slate-500 hover:text-amber-400"
                >
                  ⭐
                </button>
              </div>
            ))}
            {rest.length === 0 && stars.length === 0 && (
              <p className="text-slate-400 text-sm">
                No tasks today — add some in Task Log!
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