"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Goal = {
  id: string;
  type: string;
  icon: string;
  title: string;
  detail: string;
  completed: boolean;
  time?: string;
};

export default function DailyGoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) {
        router.push("/login");
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      const [study, gym, habits, todos, habitLogs] = await Promise.all([
        supabase.from("study_sessions").select("*").eq("user_id", uid).eq("session_date", today),
        supabase.from("gym_logs").select("*").eq("user_id", uid).eq("session_date", today),
        supabase.from("habits").select("*").eq("user_id", uid),
        supabase.from("tasks").select("*").eq("user_id", uid).eq("task_date", today),
        supabase.from("habit_logs").select("*").eq("user_id", uid).eq("log_date", today),
      ]);

      const doneHabits = new Set((habitLogs.data || []).map((h) => h.habit_id));

      const all: Goal[] = [
        ...(study.data || []).map((s) => ({
          id: s.id,
          type: "Study",
          icon: "📚",
          title: s.subject,
          detail: `${s.minutes} minutes`,
          completed: true,
          time: s.reminder_time,
        })),
        ...(gym.data || []).map((g) => ({
          id: g.id,
          type: "Gym",
          icon: "🏋️",
          title: g.workout_type,
          detail: `${g.minutes} minutes`,
          completed: true,
          time: g.reminder_time,
        })),
        ...(habits.data || []).map((h) => ({
          id: h.id,
          type: "Habit",
          icon: "✅",
          title: h.habit_name,
          detail: doneHabits.has(h.id) ? "Completed today" : "Not done yet",
          completed: doneHabits.has(h.id),
          time: h.reminder_time,
        })),
        ...(todos.data || []).map((t) => ({
          id: t.id,
          type: t.category === "todo" ? "ToDo" : t.category,
          icon: t.category === "todo" ? "📝" : "🎯",
          title: t.title,
          detail: t.description || "",
          completed: t.completed,
          time: t.reminder_time,
        })),
      ];

      setGoals(all.sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1)));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        <p className="text-slate-400">Loading daily goals...</p>
      </main>
    );
  }

  const completed = goals.filter((g) => g.completed).length;
  const total = goals.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <h1 className="text-2xl font-bold mb-2">🎯 Today's Goals</h1>
      <p className="text-slate-400 mb-6">
        {completed}/{total} completed ({pct}%)
      </p>

      <div className="grid gap-3">
        {goals.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No goals for today yet!</p>
        ) : (
          goals.map((g) => (
            <div
              key={g.id}
              className={`bg-slate-900 rounded-xl p-4 flex items-start gap-3 ${
                g.completed ? "opacity-60" : ""
              }`}
            >
              <span className="text-3xl">{g.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold">{g.title}</h3>
                  {g.time && <span className="text-xs text-slate-400">{g.time}</span>}
                </div>
                <p className="text-sm text-slate-300">{g.detail}</p>
                <p className="text-xs text-slate-500 mt-1">{g.type}</p>
              </div>
              <span className="text-2xl">{g.completed ? "✅" : "⏳"}</span>
            </div>
          ))
        )}
      </div>

      <div className="bg-slate-900 rounded-xl p-5 mt-6">
        <h2 className="text-lg font-bold mb-2">📈 Today's score</h2>
        <p className="text-sm text-slate-300">
          {pct}% — {pct >= 80 ? "excellent! 🔥" : pct >= 50 ? "good & improving 💪" : pct >= 20 ? "keep going 🌱" : "start today! 🚀"}
        </p>
      </div>

      <Link href="/dashboard" className="inline-block mt-6 text-sm text-slate-400 hover:text-white">
        ← Back to Dashboard
      </Link>
    </main>
  );
}