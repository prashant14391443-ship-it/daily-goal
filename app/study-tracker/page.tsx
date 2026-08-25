"use client";

import Link from "next/link";
import { IconTile } from "@/app/components/ui";

export default function StudyHub() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* header */}
      <div className="flex items-center gap-3 mb-6">
        <IconTile emoji="📚" gradient="bg-gradient-to-br from-blue-500 to-indigo-600" size="lg" />
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Study</h1>
          <p className="text-[10px] text-slate-400 font-semibold">Choose your tool</p>
        </div>
      </div>

      <div className="grid gap-3">
        {/* Study Log — highlighted */}
        <Link
          href="/studylog"
          className="press flex items-center gap-3 rounded-2xl border border-blue-500/40 bg-gradient-to-r from-blue-600/20 to-transparent p-4 shadow-lg shadow-black/30"
        >
          <IconTile emoji="📖" gradient="bg-gradient-to-br from-blue-500 to-indigo-600" />
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm text-white">Study Log</p>
            <p className="text-[10px] text-slate-400">Sessions, streaks & reminders</p>
          </div>
          <span className="text-slate-500 text-lg">→</span>
        </Link>

        {/* Focus Timer */}
        <Link
          href="/focus"
          className="press flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg shadow-black/30 hover:border-red-500/40 transition-colors"
        >
          <IconTile emoji="🍅" gradient="bg-gradient-to-br from-red-500 to-orange-600" />
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm text-white">Focus Timer</p>
            <p className="text-[10px] text-slate-400">Pomodoro + growing plant, auto-logs 25 min</p>
          </div>
          <span className="text-slate-500 text-lg">→</span>
        </Link>

        {/* Flashcards + Summarize */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/flashcards"
            className="press bg-slate-900 border border-violet-500/30 rounded-2xl p-4 text-center shadow-lg shadow-black/30"
          >
            <IconTile emoji="🃏" gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
            <p className="font-black text-sm mt-3 text-white">Flashcards</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Memorize anything</p>
          </Link>
          <Link
            href="/summarize"
            className="press bg-slate-900 border border-pink-500/30 rounded-2xl p-4 text-center shadow-lg shadow-black/30"
          >
            <IconTile emoji="🧠" gradient="bg-gradient-to-br from-pink-500 to-rose-600" />
            <p className="font-black text-sm mt-3 text-white">Summarize</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Points + mind-map</p>
          </Link>
        </div>

        {/* AI Quiz */}
        <Link
          href="/quiz"
          className="press flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg shadow-black/30 hover:border-cyan-500/40 transition-colors"
        >
          <IconTile emoji="🤖" gradient="bg-gradient-to-br from-cyan-500 to-teal-600" />
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm text-white">AI Quiz</p>
            <p className="text-[10px] text-slate-400">Any topic → instant test with score</p>
          </div>
          <span className="text-slate-500 text-lg">→</span>
        </Link>
      </div>
    </main>
  );
}