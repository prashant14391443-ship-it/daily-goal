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

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toLocalISO(d);
}

type Habit = { id: string; habit_name: string };
type Log = { habit_id: string; log_date: string };

export default function HabitStatsPage() {
  const today = toLocalISO(new Date());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) {
        router.push("/login");
        return;
      }
      const [h, l] = await Promise.all([
        supabase.from("habits").select("id, habit_name").eq("user_id", userId),
        supabase
          .from("habit_logs")
          .select("habit_id, log_date")
          .eq("user_id", userId)
          .eq("completed", true)
          .gte("log_date", addDays(today, -29)),
      ]);
      setHabits(h.data || []);
      setLogs(l.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const days14 = Array.from({ length: 14 }, (_, i) => addDays(today, -(13 - i)));

  const stats = habits.map((h) => {
    const mine = logs.filter((l) => l.habit_id === h.id);
    const done = new Set(mine.map((l) => l.log_date));
    const pct = Math.round((mine.length / 30) * 100);
    const done14 = days14.filter((d) => done.has(d)).length;
    return { ...h, done, pct, done14 };
  });

  const best = stats.reduce(
    (b, s) => (s.pct > (b?.pct || 0) ? s : b),
    stats[0] || null
  );

  const totalCells = stats.length * 14;
  const doneCells = stats.reduce((a, s) => a + s.done14, 0);
  const consistency = totalCells ? Math.round((doneCells / totalCells) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-xl">📊</span>
          Habit Stats
        </h1>
        <p className="text-slate-400">Last 14 days • last 30 days %</p>
      </div>

      {loading ? (
        <p className="text-slate-400">Reading your habits...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-900 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400">14-day consistency</p>
              <p className="text-3xl font-extrabold text-purple-400">{consistency}%</p>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400">🏆 Best habit</p>
              <p className="font-bold truncate">{best ? best.habit_name : "—"}</p>
            </div>
          </div>

          <div className="grid gap-4">
            {stats.map((s) => (
              <div key={s.id} className="bg-slate-900 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="font-semibold">{s.habit_name}</p>
                  <span className="text-sm text-purple-400 font-bold">{s.pct}%</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {days14.map((d) => (
                    <div
                      key={d}
                      title={d}
                      className={`w-5 h-5 rounded ${
                        s.done.has(d) ? "bg-green-500" : "bg-slate-800"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  {s.done14}/14 days this period
                </p>
              </div>
            ))}
            {stats.length === 0 && (
              <p className="text-slate-400">No habits yet — create some in Habit Log!</p>
            )}
          </div>
        </>
      )}

      <Link
        href="/routine-habits"
        className="inline-block mt-6 text-sm text-slate-400 hover:text-white"
      >
        ← Back to Habits
      </Link>
    </main>
  );
}