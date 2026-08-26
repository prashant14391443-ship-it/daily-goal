"use client";
import Link from "next/link";
import { IconTile } from "@/app/components/ui";

export default function StudyHub() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-16 pb-24 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl shadow-lg">📚</span>
          <h1 className="text-2xl font-black text-white" style={{ whiteSpace: "nowrap" }}>Study</h1>
        </div>
        <p className="text-[10px] text-slate-400 font-semibold mt-2">Choose your tool</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/studylog" className="press bg-slate-900 border border-blue-500/30 rounded-2xl p-4 text-center shadow-lg shadow-black/30">
          <IconTile emoji="📖" gradient="bg-gradient-to-br from-blue-500 to-indigo-600" />
          <p className="font-black text-sm mt-3 text-white">Study Log</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Sessions, streaks & reminders</p>
        </Link>
        <Link href="/focus" className="press bg-slate-900 border border-red-500/30 rounded-2xl p-4 text-center shadow-lg shadow-black/30">
          <IconTile emoji="🍅" gradient="bg-gradient-to-br from-red-500 to-orange-600" />
          <p className="font-black text-sm mt-3 text-white">Focus Timer</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Pomodoro + growing plant</p>
        </Link>
        <Link href="/flashcards" className="press bg-slate-900 border border-violet-500/30 rounded-2xl p-4 text-center shadow-lg shadow-black/30">
          <IconTile emoji="🃏" gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
          <p className="font-black text-sm mt-3 text-white">Flashcards</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Memorize anything</p>
        </Link>
        <Link href="/summarize" className="press bg-slate-900 border border-pink-500/30 rounded-2xl p-4 text-center shadow-lg shadow-black/30">
          <IconTile emoji="🧠" gradient="bg-gradient-to-br from-pink-500 to-rose-600" />
          <p className="font-black text-sm mt-3 text-white">Summarize</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Points + mind-map</p>
        </Link>
        <Link href="/quiz" className="press col-span-2 bg-slate-900 border border-cyan-500/30 rounded-2xl p-4 text-center shadow-lg shadow-black/30">
          <IconTile emoji="🤖" gradient="bg-gradient-to-br from-cyan-500 to-teal-600" />
          <p className="font-black text-sm mt-3 text-white">AI Quiz</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Any topic → instant test with score</p>
        </Link>
      </div>
    </main>
  );
}