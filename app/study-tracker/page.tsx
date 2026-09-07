"use client";
import Link from "next/link";
import { BookOpen, Timer, Layers, Brain, Bot, RefreshCw, GraduationCap, Target } from "lucide-react";

export default function StudyHub() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-16 pb-24 max-w-4xl mx-auto">
      {/* 🌆 CALM HERO */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <BookOpen size={22} strokeWidth={2.2} />
          </span>
          <h1 className="text-2xl font-black text-white" style={{ whiteSpace: "nowrap" }}>Study</h1>
        </div>
        <p className="text-[11px] text-slate-500 font-semibold mt-2">Choose your tool</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Row 1 */}
        <Link href="/studylog" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">
          <span className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
            <BookOpen size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">Study Log</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Sessions, streaks & reminders</p>
        </Link>

        <Link href="/focus" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">
          <span className="w-9 h-9 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
            <Timer size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">Focus Timer</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Pomodoro + growing plant</p>
        </Link>

        {/* Row 2 */}
        <Link href="/flashcards" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">
          <span className="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center mb-4">
            <Layers size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">Flashcards</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Memorize anything</p>
        </Link>

        <Link href="/review" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">
          <span className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4">
            <RefreshCw size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">Review (SRS)</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Spaced repetition</p>
        </Link>

        {/* Row 3 */}
        <Link href="/quiz" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">
          <span className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
            <Bot size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">AI Quiz</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Any topic → instant test</p>
        </Link>

        <Link href="/summarize" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">
          <span className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4">
            <Brain size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">AI Study Brain</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Summarize → map + cards + quiz</p>
        </Link>

        {/* Row 4 — ⭐ PYQ (matches grid style, keeps violet identity) */}
        <Link href="/pyq" className="press relative bg-slate-900 border border-violet-500/30 rounded-2xl p-4 hover:border-violet-500/60 transition-colors overflow-hidden">
          <span className="absolute top-3 right-3 text-[8px] font-black text-violet-300 bg-violet-500/15 border border-violet-500/30 px-1.5 py-0.5 rounded-md">NEW</span>
          <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-violet-900/40">
            <Target size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">PYQ Practice</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Exam questions + AI explanations</p>
        </Link>

        <Link href="/learn" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">
          <span className="w-9 h-9 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 flex items-center justify-center mb-4">
            <GraduationCap size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">Learn Anything</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Full blueprint to master any skill</p>
        </Link>
      </div>
    </main>
  );
}