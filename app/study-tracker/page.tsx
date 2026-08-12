"use client";

import Link from "next/link";

export default function StudyHub() {
  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-xl">📚</span>
          Study
        </h1>
        <p className="text-slate-400">Choose your tool</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/studylog"
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center hover:bg-slate-800"
        >
          <span className="text-4xl">📚</span>
          <h3 className="font-bold mt-3">Study Log</h3>
          <p className="text-xs text-slate-400 mt-1">
            Sessions, streaks & reminders
          </p>
        </Link>

        <Link
          href="/focus"
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center hover:bg-slate-800"
        >
          <span className="text-4xl">🍅</span>
          <h3 className="font-bold mt-3">Focus Timer</h3>
          <p className="text-xs text-slate-400 mt-1">
            Pomodoro + growing plant, auto-logs 25 min
          </p>
        </Link>

        <Link
          href="/flashcards"
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center hover:bg-slate-800"
        >
          <span className="text-4xl">🃏</span>
          <h3 className="font-bold mt-3">Flashcards</h3>
          <p className="text-xs text-slate-400 mt-1">
            Memorize anything, forgot cards repeat
          </p>
        </Link>

        <Link
          href="/quiz"
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center hover:bg-slate-800"
        >
          <span className="text-4xl">🤖</span>
          <h3 className="font-bold mt-3">AI Quiz</h3>
          <p className="text-xs text-slate-400 mt-1">
            Any topic → instant test with score
          </p>
        </Link>
      </div>
    </main>
  );
}