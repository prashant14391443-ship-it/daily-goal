"use client";
import Link from "next/link";
import { BookOpen, Timer, Layers, Brain, Bot, RefreshCw } from "lucide-react";

export default function StudyHub() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-16 pb-24 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <BookOpen size={22} strokeWidth={2.2} />
          </span>
          <h1 className="text-2xl font-black text-white" style={{ whiteSpace: "nowrap" }}>Study</h1>
        </div>
        <p className="text-[11px] text-slate-500 font-semibold mt-2">Choose your tool</p>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/studylog" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
            <BookOpen size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">Study Log</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Sessions, streaks & reminders</p>
        </Link>

        <Link href="/focus" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="w-9 h-9 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
            <Timer size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">Focus Timer</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Pomodoro + growing plant</p>
        </Link>

        <Link href="/flashcards" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center mb-4">
            <Layers size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">Flashcards</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Memorize anything</p>
        </Link>

        <Link href="/summarize" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="w-9 h-9 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center mb-4">
            <Brain size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">Summarize</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Points + mind-map</p>
        </Link>

        {/* 🧠 REVIEW (SRS) — wide flagship card */}
        <Link href="/review" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors col-span-2">
          <div className="w-11 h-11 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-6">
            <RefreshCw size={20} />
          </div>
          <p className="font-bold text-white text-sm leading-tight">Review (SRS)</p>
          <p className="text-xs text-slate-400 mt-1">Spaced repetition — never forget again</p>
        </Link>

        <Link href="/quiz" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors col-span-2">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-6">
            <Bot size={20} />
          </div>
          <p className="font-bold text-white text-sm leading-tight">AI Quiz</p>
          <p className="text-xs text-slate-400 mt-1">Any topic → instant test with score</p>
        </Link>
      </div>
    </main>
  );
}