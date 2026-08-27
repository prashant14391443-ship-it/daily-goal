"use client";
import Link from "next/link";
import { Mic, Globe, Users, ArrowRight, Bot, MessageSquare, Gamepad2, BookOpen, Lightbulb, BarChart3 } from "lucide-react";

export default function EnglishHub() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 HERO */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-600 p-5 shadow-xl shadow-cyan-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center">
            <Mic size={22} strokeWidth={2.2} className="text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>English Club</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">Speak • Play • Learn with AI & friends</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {/* 1️⃣ PRACTICE SPEAKING */}
        <Link href="/speaking" className="group bg-slate-900 border border-slate-700 hover:border-teal-500/40 rounded-2xl p-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
              <Mic size={20} className="text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white">Practice Speaking</p>
              <p className="text-xs text-slate-400 mt-0.5">AI coach • score • full report</p>
            </div>
            <ArrowRight size={18} className="text-slate-500 group-hover:text-teal-400 transition-colors shrink-0" />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg"><Bot size={10} /> Talk AI Topic</span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg"><MessageSquare size={10} /> Free Call</span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg"><Gamepad2 size={10} /> Games</span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg"><BookOpen size={10} /> Vocab</span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg"><Lightbulb size={10} /> Tips</span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg"><BarChart3 size={10} /> Report</span>
          </div>
        </Link>

        {/* 2️⃣ TALK TO A STRANGER */}
        <Link href="/random-talk" className="group bg-slate-900 border border-slate-700 hover:border-pink-500/40 rounded-2xl p-4 flex items-center gap-3 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0">
            <Globe size={20} className="text-pink-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white">Talk to a Stranger</p>
            <p className="text-xs text-slate-400 mt-0.5">1-on-1 voice • practice with real people</p>
          </div>
          <ArrowRight size={18} className="text-slate-500 group-hover:text-pink-400 transition-colors shrink-0" />
        </Link>

        {/* 3️⃣ COMMUNITY */}
        <Link href="/community" className="group bg-slate-900 border border-slate-700 hover:border-amber-500/40 rounded-2xl p-4 flex items-center gap-3 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Users size={20} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white">Community</p>
            <p className="text-xs text-slate-400 mt-0.5">Create & join spaces • chat & talk</p>
          </div>
          <ArrowRight size={18} className="text-slate-500 group-hover:text-amber-400 transition-colors shrink-0" />
        </Link>
      </div>
    </main>
  );
}