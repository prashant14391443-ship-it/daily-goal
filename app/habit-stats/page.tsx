"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, Calendar, Trophy, Flame, Check } from "lucide-react";
import { ProgressRing, EmptyState } from "@/app/components/ui";

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
      if (!userId) { router.push("/login"); return; }
      const [h, l] = await Promise.all([
        supabase.from("habits").select("id, habit_name").eq("user_id", userId),
        supabase.from("habit_logs").select("habit_id, log_date").eq("user_id", userId).eq("completed", true).gte("log_date", addDays(today, -29)),
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

  const best = stats.reduce((b, s) => (s.pct > (b?.pct || 0) ? s : b), stats[0] || null);

  const totalCells = stats.length * 14;
  const doneCells = stats.reduce((a, s) => a + s.done14, 0);
  const consistency = totalCells ? Math.round((doneCells / totalCells) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 CALM HERO */}
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 p-5 shadow-xl shadow-indigo-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center">
            <BarChart3 size={22} strokeWidth={2.2} className="text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Habit Stats</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">Last 14 days • last 30 days %</p>
          </div>
          <ProgressRing pct={consistency} size={64} stroke={7} color="#fbbf24" track="rgba(0,0,0,0.25)" />
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm font-bold">Reading your habits...</p>
      ) : stats.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl">
          <EmptyState emoji="📈" text="No habits yet — create some in Habit Log!" />
        </div>
      ) : (
        <>
          {/* 🏆 STATS GRID */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
                  <Calendar size={16} strokeWidth={2.2} />
                </span>
                <p className="text-[10px] font-black text-slate-500">14-DAY CONSISTENCY</p>
              </div>
              <p className="text-3xl font-black text-white">{consistency}%</p>
              <p className="text-[10px] text-slate-500 font-bold mt-1">{doneCells}/{totalCells} cells filled</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Trophy size={16} strokeWidth={2.2} />
                </span>
                <p className="text-[10px] font-black text-slate-500">BEST HABIT</p>
              </div>
              <p className="text-base font-black text-white truncate">{best ? best.habit_name : "—"}</p>
              <p className="text-[10px] text-slate-500 font-bold mt-1">{best ? `${best.pct}% this month` : "—"}</p>
            </div>
          </div>

          {/* 📋 PER-HABIT HEATMAP */}
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Flame size={14} strokeWidth={2.2} />
            </span>
            <p className="text-xs font-black text-slate-400">YOUR HEATMAP</p>
          </div>

          <div className="grid gap-3">
            {stats.map((s) => (
              <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center">
                      <Check size={14} strokeWidth={2.2} />
                    </span>
                    <p className="font-black text-sm truncate">{s.habit_name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-500 font-bold">{s.done14}/14</span>
                    <span className="text-sm font-black text-violet-400">{s.pct}%</span>
                  </div>
                </div>

                {/* 🔥 HEATMAP GRID */}
                <div className="flex gap-1 flex-wrap mb-3">
                  {days14.map((d) => (
                    <div
                      key={d}
                      title={d}
                      className={`w-5 h-5 rounded-md transition-all ${
                        s.done.has(d)
                          ? "bg-gradient-to-br from-emerald-400 to-green-600 shadow-sm shadow-green-500/30"
                          : "bg-slate-800/60"
                      }`}
                    />
                  ))}
                </div>

                {/* 📈 PROGRESS BAR */}
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 💡 LEGEND */}
          <div className="mt-5 bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-slate-800/60" />
              <span className="text-[10px] text-slate-500 font-bold">missed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-gradient-to-br from-emerald-400 to-green-600" />
              <span className="text-[10px] text-slate-500 font-bold">done</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 font-bold">14 days ago →</span>
              <span className="text-[10px] text-slate-500 font-bold">today</span>
            </div>
          </div>
        </>
      )}

      <Link href="/routine-habits" className="inline-block mt-6 text-sm text-slate-500 hover:text-white press font-bold">
        ← Back to Habits
      </Link>
    </main>
  );
}