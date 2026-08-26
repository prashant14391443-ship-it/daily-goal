"use client";
import Link from "next/link";
import { IconTile } from "@/app/components/ui";

export default function HabitsHub() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-16 pb-24 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg">✅</span>
          <h1 className="text-2xl font-black text-white" style={{ whiteSpace: "nowrap" }}>Habits</h1>
        </div>
        <p className="text-[10px] text-slate-400 font-semibold mt-2">Small daily wins = big life</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/habitslog" className="press bg-slate-900 border border-violet-500/30 rounded-2xl p-4 text-center shadow-lg shadow-black/30">
          <IconTile emoji="✅" gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
          <p className="font-black text-sm mt-3 text-white">Habit Log</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Daily habits, reminders & streaks</p>
        </Link>
        <Link href="/habit-stats" className="press bg-slate-900 border border-blue-500/30 rounded-2xl p-4 text-center shadow-lg shadow-black/30">
          <IconTile emoji="📊" gradient="bg-gradient-to-br from-blue-500 to-indigo-600" />
          <p className="font-black text-sm mt-3 text-white">Habit Stats</p>
          <p className="text-[10px] text-slate-400 mt-0.5">14-day heatmap + completion %</p>
        </Link>
        <Link href="/freeze" className="press bg-slate-900 border border-cyan-500/30 rounded-2xl p-4 text-center shadow-lg shadow-black/30">
          <IconTile emoji="🧊" gradient="bg-gradient-to-br from-cyan-500 to-sky-600" />
          <p className="font-black text-sm mt-3 text-white">Streak Freeze</p>
          <p className="text-[10px] text-slate-400 mt-0.5">1 missed day won&apos;t kill your streak</p>
        </Link>
        <Link href="/routines" className="press bg-slate-900 border border-amber-500/30 rounded-2xl p-4 text-center shadow-lg shadow-black/30">
          <IconTile emoji="🌅" gradient="bg-gradient-to-br from-amber-500 to-orange-600" />
          <p className="font-black text-sm mt-3 text-white">Routines</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Morning & evening habit chains</p>
        </Link>
      </div>
    </main>
  );
}