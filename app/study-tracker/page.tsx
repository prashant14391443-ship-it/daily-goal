"use client";
import Link from "next/link";
import { BookOpen, Timer, Layers, Brain, Bot, RefreshCw, GraduationCap, Target, ClipboardList } from "lucide-react";
import { ALL_EXAMS } from "@/lib/examPatterns";

export default function StudyHub() {
  const examCount = ALL_EXAMS.length;

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

      {/* ═══════════ SECTION 1: EXAM PREPARATION ═══════════ */}
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 mb-2.5">Exam Preparation</p>
      <div className="grid gap-3 mb-7">
        {/* ⭐ FEATURED: Mock Tests & PYQ Papers (all exams) */}
        <Link href="/test" className="press bg-slate-900 border-2 border-orange-500/40 rounded-2xl p-5 hover:border-orange-500/60 transition-all shadow-lg shadow-orange-500/10">
          <div className="flex items-center gap-4">
            <span className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center">
              <Target size={24} strokeWidth={2.2} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-black text-base text-white">Mock Tests & PYQ Papers</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{examCount} exams • AI pattern papers • real PYQs • sectionals</p>
            </div>
            <span className="text-[10px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-1 rounded-lg">NEW</span>
          </div>
        </Link>

      </div>

      {/* ═══════════ SECTION 2: STUDY TOOLS ═══════════ */}
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 mb-2.5">Study Tools</p>
      <div className="grid grid-cols-2 gap-3">
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