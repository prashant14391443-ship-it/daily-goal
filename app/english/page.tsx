"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconTile } from "@/app/components/ui";

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function SpeakingPage() {
  const [left, setLeft] = useState(16);

  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem("dg-speak-count") || "null");
      if (c && c.date === toLocalISO(new Date())) setLeft(Math.max(0, 16 - c.n));
    } catch {}
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-16 pb-24 max-w-4xl mx-auto">
      {/* 🌆 TEAL HERO */}
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-600 to-cyan-600 p-5 shadow-2xl shadow-teal-900/30">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="w-12 h-12 shrink-0 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-lg">🗣️</span>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-xs font-black text-white border border-white/20">
                {left}/16 free
              </span>
              <Link href="/dashboard" className="text-[10px] text-white/70 font-bold hover:text-white press">← Back</Link>
            </div>
          </div>
          <h1 className="text-xl font-black text-white" style={{ whiteSpace: "nowrap" }}>Practice Speaking</h1>
          <p className="text-[10px] text-white/80 font-semibold mt-1">Speak English with AI coach</p>
        </div>
      </div>

      {/* 🎯 ALL TOOLS GRID */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/talk-topic" className="press bg-slate-900 border border-green-500/30 rounded-2xl p-4 shadow-lg shadow-black/30">
          <IconTile emoji="🗣️" gradient="bg-gradient-to-br from-green-500 to-emerald-600" />
          <p className="font-black text-sm mt-3 text-white">Talk AI — Topic</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Pick a topic & call</p>
        </Link>

        <Link href="/talk-free" className="press bg-slate-900 border border-blue-500/30 rounded-2xl p-4 shadow-lg shadow-black/30">
          <IconTile emoji="💬" gradient="bg-gradient-to-br from-blue-500 to-indigo-600" />
          <p className="font-black text-sm mt-3 text-white">Talk AI — Anything</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Free conversation call</p>
        </Link>

        <Link href="/record" className="press bg-slate-900 border border-violet-500/30 rounded-2xl p-4 shadow-lg shadow-black/30">
          <IconTile emoji="📊" gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
          <p className="font-black text-sm mt-3 text-white">Record & Analyse</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Score + full report</p>
        </Link>

        <Link href="/sentence" className="press bg-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-lg shadow-black/30">
          <IconTile emoji="🎯" gradient="bg-gradient-to-br from-amber-500 to-orange-600" />
          <p className="font-black text-sm mt-3 text-white">Sentence Practice</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Fix mistakes + say & score</p>
        </Link>

        <Link href="/vocab" className="press bg-slate-900 border border-teal-500/30 rounded-2xl p-4 shadow-lg shadow-black/30">
          <IconTile emoji="📚" gradient="bg-gradient-to-br from-teal-500 to-emerald-600" />
          <p className="font-black text-sm mt-3 text-white">Vocabulary</p>
          <p className="text-[10px] text-slate-400 mt-0.5">5 words/day + Hindi meanings</p>
        </Link>

        <Link href="/tips" className="press bg-slate-900 border border-yellow-500/30 rounded-2xl p-4 shadow-lg shadow-black/30">
          <IconTile emoji="💡" gradient="bg-gradient-to-br from-yellow-500 to-amber-600" />
          <p className="font-black text-sm mt-3 text-white">Daily Tips</p>
          <p className="text-[10px] text-slate-400 mt-0.5">1 tip a day to sound better</p>
        </Link>

        <Link href="/games" className="press bg-slate-900 border border-pink-500/30 rounded-2xl p-4 shadow-lg shadow-black/30">
          <IconTile emoji="🎮" gradient="bg-gradient-to-br from-pink-500 to-rose-600" />
          <p className="font-black text-sm mt-3 text-white">Game Zone</p>
          <p className="text-[10px] text-slate-400 mt-0.5">4 games • beat your best</p>
        </Link>

        <Link href="/random-talk" className="press bg-slate-900 border-2 border-rose-500/40 rounded-2xl p-4 shadow-lg shadow-black/30">
          <IconTile emoji="🌍" gradient="bg-gradient-to-br from-pink-500 to-rose-600" />
          <p className="font-black text-sm mt-3 text-white">Talk to a Stranger</p>
          <p className="text-[10px] text-slate-400 mt-0.5">1-on-1 voice • practice English</p>
        </Link>
      </div>

      {/* ✨ CREATE COMMUNITY — full width gold */}
      <Link
        href="/community"
        className="press mt-3 w-full bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-black/30"
      >
        <IconTile emoji="✨" gradient="bg-gradient-to-br from-amber-500 to-orange-600" size="lg" />
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm text-amber-300">CREATE MY COMMUNITY</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Start your own space • chat & talk live</p>
        </div>
        <span className="text-slate-500 text-lg">→</span>
      </Link>
    </main>
  );
}