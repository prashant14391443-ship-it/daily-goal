"use client";

import Link from "next/link";

export default function HabitsHub() {
  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-xl">✅</span>
          Habits
        </h1>
        <p className="text-slate-400">Choose your tool</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/habitslog"
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center hover:bg-slate-800"
        >
          <span className="text-4xl">✅</span>
          <h3 className="font-bold mt-3">Habit Log</h3>
          <p className="text-xs text-slate-400 mt-1">
            Daily habits, reminders & streaks
          </p>
        </Link>

        <Link
          href="/habit-stats"
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center hover:bg-slate-800"
        >
          <span className="text-4xl">📊</span>
          <h3 className="font-bold mt-3">Habit Stats</h3>
          <p className="text-xs text-slate-400 mt-1">
            14-day heatmap + completion %
          </p>
        </Link>

        <Link
          href="/freeze"
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center hover:bg-slate-800"
        >
          <span className="text-4xl">🧊</span>
          <h3 className="font-bold mt-3">Streak Freeze</h3>
          <p className="text-xs text-slate-400 mt-1">
            1 missed day won't kill your streak
          </p>
        </Link>

        <Link
          href="/routines"
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center hover:bg-slate-800"
        >
          <span className="text-4xl">🌅</span>
          <h3 className="font-bold mt-3">Routines</h3>
          <p className="text-xs text-slate-400 mt-1">
            Morning & evening habit chains
          </p>
        </Link>
      </div>
    </main>
  );
}