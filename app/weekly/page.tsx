"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type DayDetail = {
  date: string;
  dayLabel: string;
  study: number;
  gym: number;
  habits: number;
  todos: number;
  activities: string[];
};

export default function WeeklyPage() {
  const [days, setDays] = useState<DayDetail[]>([]);
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

      const today = new Date();
      const weekAgo = new Date(Date.now() - 7 * 86400000);
      const weekAgoStr = weekAgo.toISOString().split("T")[0];

      const [study, gym, habits, todos, habitLogs] = await Promise.all([
        supabase.from("study_sessions").select("*").eq("user_id", uid).gte("session_date", weekAgoStr),
        supabase.from("gym_logs").select("*").eq("user_id", uid).gte("session_date", weekAgoStr),
        supabase.from("habits").select("*").eq("user_id", uid),
        supabase.from("tasks").select("*").eq("user_id", uid).eq("category", "todo").gte("task_date", weekAgoStr),
        supabase.from("habit_logs").select("*").eq("user_id", uid).gte("log_date", weekAgoStr),
      ]);

      const daysData: DayDetail[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dayLabel = d.toLocaleDateString("en", { weekday: "short" });

        const dayStudy = (study.data || []).filter((s) => s.session_date === dateStr);
        const dayGym = (gym.data || []).filter((g) => g.session_date === dateStr);
        const dayTodos = (todos.data || []).filter((t) => t.task_date === dateStr && t.completed);
        const dayHabits = (habitLogs.data || []).filter((h) => h.log_date === dateStr);

        const activities: string[] = [];
        dayStudy.forEach((s) => activities.push(`📚 ${s.subject} (${s.minutes}m)`));
        dayGym.forEach((g) => activities.push(`🏋️ ${g.workout_type} (${g.minutes}m)`));
        dayHabits.forEach((h) => {
          const habit = (habits.data || []).find((x) => x.id === h.habit_id);
          if (habit) activities.push(`✅ ${habit.habit_name}`);
        });
        dayTodos.forEach((t) => activities.push(`📝 ${t.title}`));

        daysData.push({
          date: dateStr,
          dayLabel,
          study: dayStudy.reduce((sum, s) => sum + s.minutes, 0),
          gym: dayGym.reduce((sum, g) => sum + g.minutes, 0),
          habits: dayHabits.length,
          todos: dayTodos.length,
          activities,
        });
      }

      setDays(daysData);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        <p className="text-slate-400">Loading weekly data...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">📊 Last 7 Days</h1>

      <div className="grid gap-4">
        {days.map((d) => (
          <div key={d.date} className="bg-slate-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold">{d.dayLabel}</h3>
                <p className="text-xs text-slate-400">{d.date}</p>
              </div>
              <div className="text-right text-xs">
                <p className="text-blue-400">📚 {d.study}m</p>
                <p className="text-orange-400">🏋️ {d.gym}m</p>
                <p className="text-green-400">✅ {d.habits}</p>
                <p className="text-pink-400">📝 {d.todos}</p>
              </div>
            </div>
            {d.activities.length > 0 ? (
              <div className="grid gap-1">
                {d.activities.map((a, i) => (
                  <p key={i} className="text-sm text-slate-300">
                    {a}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No activity</p>
            )}
          </div>
        ))}
      </div>

      <Link href="/dashboard" className="inline-block mt-6 text-sm text-slate-400 hover:text-white">
        ← Back to Dashboard
      </Link>
    </main>
  );
}