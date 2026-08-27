"use client";
import Link from "next/link";
import { ListChecks, BarChart3, Snowflake, Sunrise } from "lucide-react";

export default function HabitsHub() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-16 pb-24 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
            <ListChecks size={22} strokeWidth={2.2} />
          </span>
          <h1 className="text-2xl font-black text-white" style={{ whiteSpace: "nowrap" }}>Habits</h1>
        </div>
        <p className="text-[11px] text-slate-500 font-semibold mt-2">Small daily wins = big life</p>
      </div>

      {/* CALM CARDS */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/habitslog" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center mb-4">
            <ListChecks size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">Habit Log</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Daily habits, reminders & streaks</p>
        </Link>

        <Link href="/habit-stats" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
            <BarChart3 size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">Habit Stats</p>
          <p className="text-[10px] text-slate-500 mt-0.5">14-day heatmap + completion %</p>
        </Link>

        <Link href="/freeze" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
            <Snowflake size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">Streak Freeze</p>
          <p className="text-[10px] text-slate-500 mt-0.5">1 missed day won&apos;t kill your streak</p>
        </Link>

        <Link href="/routines" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
            <Sunrise size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">Routines</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Morning & evening habit chains</p>
        </Link>
      </div>
    </main>
  );
}