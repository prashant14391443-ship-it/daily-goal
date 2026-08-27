"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Target, BookOpen, Dumbbell, ListChecks, ListTodo, Check, Clock, TrendingUp, ArrowLeft } from "lucide-react";

type Goal = {
  id: string;
  type: string;
  icon: string;
  title: string;
  detail: string;
  completed: boolean;
  time?: string;
};

const typeStyle: Record<string, { icon: any; color: string; tint: string }> = {
  Study: { icon: BookOpen, color: "text-blue-400", tint: "bg-blue-500/10 border-blue-500/20" },
  Gym: { icon: Dumbbell, color: "text-orange-400", tint: "bg-orange-500/10 border-orange-500/20" },
  Habit: { icon: ListChecks, color: "text-green-400", tint: "bg-green-500/10 border-green-500/20" },
  ToDo: { icon: ListTodo, color: "text-pink-400", tint: "bg-pink-500/10 border-pink-500/20" },
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
        <p className="text-slate-400 text-sm font-medium">Loading daily goals...</p>
      </main>
    );
  }

  const completed = goals.filter((g) => g.completed).length;
  const total = goals.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-24 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Target size={22} className="text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Today's Goals</h1>
          <p className="text-xs text-slate-400 font-medium">
            {completed}/{total} completed ({pct}%)
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 mt-4 mb-6">
        <div className="flex justify-between text-xs mb-2">
          <span className="font-semibold text-slate-400">Daily progress</span>
          <span className="font-semibold text-violet-400">{pct}%</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Goal list */}
      <div className="grid gap-3">
        {goals.length === 0 ? (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center">
              <Target size={24} className="text-slate-500" />
            </div>
            <p className="text-sm text-slate-500 font-medium">No goals for today yet!</p>
          </div>
        ) : (
          goals.map((g) => {
            const st = typeStyle[g.type] || typeStyle.ToDo;
            const Icon = st.icon;
            return (
              <div
                key={g.id}
                className={`bg-slate-900 border border-slate-700 rounded-2xl p-4 flex items-start gap-3 transition-opacity ${
                  g.completed ? "opacity-60" : ""
                }`}
              >
                <div className={`w-11 h-11 rounded-xl ${st.tint} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className={st.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <h3 className={`font-semibold text-sm truncate ${g.completed ? "line-through text-slate-500" : "text-white"}`}>
                      {g.title}
                    </h3>
                    {g.time && <span className="text-xs text-slate-500 flex-shrink-0">{g.time}</span>}
                  </div>
                  <p className="text-sm text-slate-400">{g.detail}</p>
                  <p className="text-xs text-slate-500 mt-1">{g.type}</p>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  g.completed ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-slate-800 border border-slate-700"
                }`}>
                  {g.completed ? (
                    <Check size={15} className="text-emerald-400" />
                  ) : (
                    <Clock size={15} className="text-slate-500" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Score */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mt-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={18} className="text-emerald-400" />
          <h2 className="text-base font-semibold text-white">Today's score</h2>
        </div>
        <p className="text-sm text-slate-300">
          {pct}% — {pct >= 80 ? "excellent! 🔥" : pct >= 50 ? "good & improving 💪" : pct >= 20 ? "keep going 🌱" : "start today! 🚀"}
        </p>
      </div>

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 mt-6 text-sm text-slate-400 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>
    </main>
  );
}