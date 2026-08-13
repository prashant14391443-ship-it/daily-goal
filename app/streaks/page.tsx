"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type StreakDetail = {
  type: string;
  icon: string;
  current: number;
  longest: number;
  breakdown: { date: string; detail: string }[];
};

export default function StreaksPage() {
  const [streaks, setStreaks] = useState<StreakDetail[]>([]);
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
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

      const [studySessions, gymLogs, habits, habitLogs, todos] = await Promise.all([
        supabase.from("study_sessions").select("*").eq("user_id", uid).gte("session_date", weekAgo),
        supabase.from("gym_logs").select("*").eq("user_id", uid).gte("session_date", weekAgo),
        supabase.from("habits").select("*").eq("user_id", uid),
        supabase.from("habit_logs").select("*").eq("user_id", uid).gte("log_date", weekAgo),
        supabase.from("tasks").select("*").eq("user_id", uid).eq("category", "todo").gte("task_date", weekAgo),
      ]);

      const calcStreak = (dates: Set<string>) => {
        if (!dates.has(today)) return 0;
        let len = 1;
        let cursor = new Date(today);
        while (true) {
          cursor.setDate(cursor.getDate() - 1);
          const d = cursor.toISOString().split("T")[0];
          if (dates.has(d)) len++;
          else break;
        }
        return len;
      };

      const studyDates = new Set((studySessions.data || []).map((s) => s.session_date));
      const gymDates = new Set((gymLogs.data || []).map((g) => g.session_date));
      const habitDates = new Set((habitLogs.data || []).map((h) => h.log_date));
      const todoDates = new Set((todos.data || []).filter((t) => t.completed).map((t) => t.task_date));

      const studyBreakdown = (studySessions.data || []).map((s) => ({
        date: s.session_date,
        detail: `${s.subject} - ${s.minutes} min`,
      }));

      const gymBreakdown = (gymLogs.data || []).map((g) => ({
        date: g.session_date,
        detail: `${g.workout_type} - ${g.minutes} min`,
      }));

      const habitBreakdown = (habitLogs.data || []).map((h) => {
        const habit = (habits.data || []).find((x) => x.id === h.habit_id);
        return {
          date: h.log_date,
          detail: habit?.habit_name || "Habit",
        };
      });

      const todoBreakdown = (todos.data || [])
        .filter((t) => t.completed)
        .map((t) => ({
          date: t.task_date,
          detail: t.title,
        }));

      setStreaks([
        {
          type: "Study",
          icon: "📚",
          current: calcStreak(studyDates),
          longest: 0, // TODO: calculate longest
          breakdown: studyBreakdown,
        },
        {
          type: "Gym",
          icon: "🏋️",
          current: calcStreak(gymDates),
          longest: 0,
          breakdown: gymBreakdown,
        },
        {
          type: "Habits",
          icon: "✅",
          current: calcStreak(habitDates),
          longest: 0,
          breakdown: habitBreakdown,
        },
        {
          type: "ToDo",
          icon: "📝",
          current: calcStreak(todoDates),
          longest: 0,
          breakdown: todoBreakdown,
        },
      ]);

      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        <p className="text-slate-400">Loading streaks...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">🔥 Your Streaks</h1>
      <div className="grid gap-6">
        {streaks.map((s) => (
          <div key={s.type} className="bg-slate-900 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{s.icon}</span>
                <div>
                  <h2 className="text-xl font-bold">{s.type}</h2>
                  <p className="text-sm text-slate-400">Current: {s.current} days 🔥</p>
                </div>
              </div>
            </div>
            <div className="grid gap-2 max-h-60 overflow-y-auto">
              {s.breakdown.length === 0 ? (
                <p className="text-xs text-slate-500">No activity yet</p>
              ) : (
                s.breakdown
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((b, i) => (
                    <div key={i} className="bg-slate-800 rounded p-2 text-sm">
                      <span className="text-slate-400">{b.date}</span>
                      <span className="ml-2">{b.detail}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        ))}
      </div>
      <Link href="/dashboard" className="inline-block mt-6 text-sm text-slate-400 hover:text-white">
        ← Back to Dashboard
      </Link>
    </main>
  );
}