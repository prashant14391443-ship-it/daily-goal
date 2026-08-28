"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, BookOpen, Dumbbell, ListChecks, ListTodo, TrendingUp, ArrowLeft, ChevronDown, ChevronRight, Moon } from "lucide-react";

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
  const [overall, setOverall] = useState<{ type: string; icon: any; color: string; pct: number }[]>([]);
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
        { type: "Study", icon: BookOpen, color: "text-blue-400", pct: pctDays((d) => d.studyTotal > 0) },
        { type: "Gym", icon: Dumbbell, color: "text-orange-400", pct: pctDays((d) => d.gymTotal > 0) },
        { type: "Habits", icon: ListChecks, color: "text-green-400", pct: pctDays((d) => d.habitNames.length > 0) },
        { type: "ToDo", icon: ListTodo, color: "text-pink-400", pct: pctDays((d) => d.todoDone.length > 0) },
      ]);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        <p className="text-slate-400 text-sm font-medium">Loading weekly data...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-24 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <BarChart3 size={22} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Last 7 Days</h1>
          <p className="text-xs text-slate-400 font-medium">Tap any day to see its full story</p>
        </div>
      </div>

      {/* Day cards */}
      <div className="grid gap-3 mt-6">
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
              className={`w-full text-left rounded-2xl p-4 border transition-all ${
                open
                  ? "bg-slate-800 border-violet-500/40"
                  : "bg-slate-900 border-slate-700 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div>
                    <h3 className="font-semibold flex items-center gap-1.5">
                      {d.dayLabel}
                      {open ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{d.date}</p>
                  </div>
                </div>
                <div className="text-right text-xs space-y-0.5">
                  <p className="text-blue-400 flex items-center justify-end gap-1.5">
                    <BookOpen size={11} />
                    {d.studyTotal}m
                  </p>
                  <p className="text-orange-400 flex items-center justify-end gap-1.5">
                    <Dumbbell size={11} />
                    {d.gymTotal}m
                  </p>
                  <p className="text-green-400 flex items-center justify-end gap-1.5">
                    <ListChecks size={11} />
                    {d.habitNames.length}
                  </p>
                  <p className="text-pink-400 flex items-center justify-end gap-1.5">
                    <ListTodo size={11} />
                    {d.todoDone.length}
                  </p>
                </div>
              </div>

              {open && (
                <div className="mt-4 grid gap-4 border-t border-slate-700 pt-4">
                  {empty && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Moon size={14} />
                      No activity this day
                    </div>
                  )}

                  {d.studyRows.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 mb-2">
                        <BookOpen size={13} />
                        STUDY — {d.studyTotal} min total • avg {d.studyAvg} min/session
                      </div>
                      {d.studyRows.map((r, i) => (
                        <p key={i} className="text-sm text-slate-300 pl-5 py-0.5">
                          • {r.subject} — {r.minutes} min
                        </p>
                      ))}
                    </div>
                  )}

                  {d.gymRows.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-orange-400 mb-2">
                        <Dumbbell size={13} />
                        WORKOUTS — {d.gymTotal} min total
                      </div>
                      {d.gymRows.map((r, i) => (
                        <p key={i} className="text-sm text-slate-300 pl-5 py-0.5">
                          • {r.workout} — {r.minutes} min
                        </p>
                      ))}
                    </div>
                  )}

                  {d.habitNames.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-green-400 mb-2">
                        <ListChecks size={13} />
                        HABITS DONE
                      </div>
                      {d.habitNames.map((n, i) => (
                        <p key={i} className="text-sm text-slate-300 pl-5 py-0.5">
                          • {n}
                        </p>
                      ))}
                    </div>
                  )}

                  {d.todoTotal > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-pink-400 mb-2">
                        <ListTodo size={13} />
                        TODO — {d.todoDone.length}/{d.todoTotal} done ({Math.round((d.todoDone.length / d.todoTotal) * 100)}%)
                      </div>
                      {d.todoDone.map((t, i) => (
                        <p key={i} className="text-sm text-slate-300 pl-5 py-0.5">
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

      {/* Overall */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-emerald-400" />
          <h2 className="text-base font-semibold text-white">Overall this week</h2>
        </div>
        <div className="grid gap-3">
          {overall.map((o) => {
            const Icon = o.icon;
            return (
              <div key={o.type} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <Icon size={15} className={o.color} />
                  {o.type}
                </span>
                <span className="text-slate-300">
                  {o.pct}% — {verdict(o.pct)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

          <Link
        href="/dashboard"
        scroll={false}
        className="inline-flex items-center gap-1.5 mt-6 text-sm text-slate-400 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>
    </main>
  );
}