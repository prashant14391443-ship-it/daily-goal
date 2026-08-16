"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type DayDetail = {
  date: string;
  dayLabel: string;
  studyTotal: number;
  studyAvg: number;
  studyRows: { subject: string; minutes: number }[];
  gymTotal: number;
  gymRows: { workout: string; minutes: number }[];
  habitNames: string[];
  todoDone: string[];
  todoTotal: number;
};

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function verdict(pct: number) {
  if (pct >= 80) return "excellent! 🔥";
  if (pct >= 50) return "good & improving 💪";
  if (pct >= 20) return "keep going 🌱";
  return "start today! 🚀";
}

export default function WeeklyPage() {
  const [days, setDays] = useState<DayDetail[]>([]);
  const [overall, setOverall] = useState<
    { type: string; icon: string; pct: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) {
        router.push("/login");
        return;
      }

      const weekAgoStr = toLocalISO(new Date(Date.now() - 7 * 86400000));

      const [study, gym, habits, todos, habitLogs] = await Promise.all([
        supabase.from("study_sessions").select("*").eq("user_id", uid).gte("session_date", weekAgoStr),
        supabase.from("gym_logs").select("*").eq("user_id", uid).gte("session_date", weekAgoStr),
        supabase.from("habits").select("*").eq("user_id", uid),
        supabase.from("tasks").select("*").eq("user_id", uid).eq("category", "todo").gte("task_date", weekAgoStr),
        supabase.from("habit_logs").select("*").eq("user_id", uid).gte("log_date", weekAgoStr),
      ]);

      const daysData: DayDetail[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = toLocalISO(d);
        const dayLabel = d.toLocaleDateString("en", { weekday: "short" });

        const dayStudy = (study.data || []).filter((s) => s.session_date === dateStr);
        const dayGym = (gym.data || []).filter((g) => g.session_date === dateStr);
        const dayHabits = (habitLogs.data || []).filter((h) => h.log_date === dateStr && h.completed);
        const dayTodosAll = (todos.data || []).filter((t) => t.task_date === dateStr);
        const dayTodosDone = dayTodosAll.filter((t) => t.completed);

        const studyTotal = dayStudy.reduce((a, s) => a + (s.duration_minutes || 0), 0);
        const gymTotal = dayGym.reduce((a, g) => a + (g.duration_minutes || 0), 0);

        daysData.push({
          date: dateStr,
          dayLabel,
          studyTotal,
          studyAvg: dayStudy.length ? Math.round(studyTotal / dayStudy.length) : 0,
          studyRows: dayStudy.map((s) => ({ subject: s.subject, minutes: s.duration_minutes || 0 })),
          gymTotal,
          gymRows: dayGym.map((g) => ({ workout: g.workout_type, minutes: g.duration_minutes || 0 })),
          habitNames: dayHabits
            .map((h) => (habits.data || []).find((x) => x.id === h.habit_id)?.habit_name)
            .filter(Boolean) as string[],
          todoDone: dayTodosDone.map((t) => t.title),
          todoTotal: dayTodosAll.length,
        });
      }

      setDays(daysData);
      const pctDays = (fn: (d: DayDetail) => boolean) =>
        Math.round((daysData.filter(fn).length / 7) * 100);
      setOverall([
        { type: "Study", icon: "📚", pct: pctDays((d) => d.studyTotal > 0) },
        { type: "Gym", icon: "🏋️", pct: pctDays((d) => d.gymTotal > 0) },
        { type: "Habits", icon: "✅", pct: pctDays((d) => d.habitNames.length > 0) },
        { type: "ToDo", icon: "📝", pct: pctDays((d) => d.todoDone.length > 0) },
      ]);
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
      <h1 className="text-2xl font-bold mb-2">📊 Last 7 Days</h1>
      <p className="text-xs text-slate-500 mb-6">👆 Tap any day to see its full story</p>

      <div className="grid gap-3">
        {days.map((d) => {
          const open = openDay === d.date;
          const empty =
            d.studyRows.length === 0 &&
            d.gymRows.length === 0 &&
            d.habitNames.length === 0 &&
            d.todoDone.length === 0;
          return (
            <button
              key={d.date}
              onClick={() => setOpenDay(open ? null : d.date)}
              className={`w-full text-left rounded-xl p-4 border transition-all ${
                open
                  ? "bg-slate-800 border-violet-500/50"
                  : "bg-slate-900 border-slate-800 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">
                    {d.dayLabel} <span className="text-xs text-slate-500">{open ? "▾" : "▸"}</span>
                  </h3>
                  <p className="text-xs text-slate-400">{d.date}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="text-blue-400">📚 {d.studyTotal}m</p>
                  <p className="text-orange-400">🏋️ {d.gymTotal}m</p>
                  <p className="text-green-400">✅ {d.habitNames.length}</p>
                  <p className="text-pink-400">📝 {d.todoDone.length}</p>
                </div>
              </div>

              {open && (
                <div className="mt-3 grid gap-3 border-t border-slate-700 pt-3">
                  {empty && <p className="text-xs text-slate-500">No activity this day 😴</p>}

                  {d.studyRows.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-blue-400 mb-1">
                        📚 STUDY — {d.studyTotal} min total • avg {d.studyAvg} min/session
                      </p>
                      {d.studyRows.map((r, i) => (
                        <p key={i} className="text-sm text-slate-300">
                          • {r.subject} — {r.minutes} min
                        </p>
                      ))}
                    </div>
                  )}

                  {d.gymRows.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-orange-400 mb-1">
                        🏋️ WORKOUTS — {d.gymTotal} min total
                      </p>
                      {d.gymRows.map((r, i) => (
                        <p key={i} className="text-sm text-slate-300">
                          • {r.workout} — {r.minutes} min
                        </p>
                      ))}
                    </div>
                  )}

                  {d.habitNames.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-green-400 mb-1">✅ HABITS DONE</p>
                      {d.habitNames.map((n, i) => (
                        <p key={i} className="text-sm text-slate-300">
                          • {n}
                        </p>
                      ))}
                    </div>
                  )}

                  {d.todoTotal > 0 && (
                    <div>
                      <p className="text-xs font-bold text-pink-400 mb-1">
                        📝 TODO — {d.todoDone.length}/{d.todoTotal} done (
                        {Math.round((d.todoDone.length / d.todoTotal) * 100)}%)
                      </p>
                      {d.todoDone.map((t, i) => (
                        <p key={i} className="text-sm text-slate-300">
                          • {t}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-slate-900 rounded-xl p-5 mt-6">
        <h2 className="text-lg font-bold mb-3">📈 Overall this week</h2>
        {overall.map((o) => (
          <div key={o.type} className="flex justify-between text-sm py-1">
            <span>
              {o.icon} {o.type}
            </span>
            <span className="text-slate-300">
              {o.pct}% — {verdict(o.pct)}
            </span>
          </div>
        ))}
      </div>

      <Link href="/dashboard" className="inline-block mt-6 text-sm text-slate-400 hover:text-white">
        ← Back to Dashboard
      </Link>
    </main>
  );
}