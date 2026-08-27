"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TIPS, localISO, dayNum } from "@/app/components/tipsData";
import { GraduationCap, Flame, Volume2, Check, RefreshCw, ArrowLeft, Mic, BookOpen, PenLine, Headphones, SpellCheck, Target, Lightbulb } from "lucide-react";

type Tip = { cat: string; tip: string; why: string; try?: string };

const READING_TIPS: Tip[] = [
  { cat: "Reading", tip: "Read 10 minutes daily — same time every day.", why: "Tiny daily reading beats weekend binges.", try: "Pick one news article now." },
  { cat: "Reading", tip: "Read out loud for 2 minutes.", why: "Eyes + ears + mouth = 3x memory.", try: "Read any paragraph aloud." },
  { cat: "Reading", tip: "Don't stop for every new word.", why: "Guessing from context builds fluency.", try: "Underline 3 words, guess meanings." },
  { cat: "Reading", tip: "Read the same story twice.", why: "Second read = speed + confidence.", try: "Re-read yesterday's article." },
  { cat: "Reading", tip: "Start with easy stories or graded readers.", why: "Easy wins build the reading habit.", try: "Search 'easy English story'." },
  { cat: "Reading", tip: "Scan first, then read.", why: "Headlines + first lines give the map.", try: "Skim 30 seconds before reading." },
  { cat: "Reading", tip: "Collect 1 good phrase per page.", why: "Collecting makes reading active.", try: "Save one phrase today." },
];

const LISTENING_TIPS: Tip[] = [
  { cat: "Listening", tip: "Listen 5 minutes daily — podcast or video.", why: "Daily ears beat weekly marathons.", try: "Play one English video now." },
  { cat: "Listening", tip: "Watch with English subtitles, not Hindi.", why: "Reading + hearing wires the sounds.", try: "One scene with EN subs." },
  { cat: "Listening", tip: "Listen twice: first for gist, second for words.", why: "Two passes train real comprehension.", try: "Replay your last video." },
  { cat: "Listening", tip: "Slow the audio to 0.75x when hard.", why: "Slow = catchable; catchable = learnable.", try: "Try 0.75x on YouTube." },
  { cat: "Listening", tip: "Dictation: write what you hear.", why: "Writing exposes exactly what you miss.", try: "Write 1 sentence from a video." },
  { cat: "Listening", tip: "Listen to the same clip 3 days in a row.", why: "Repetition turns noise into words.", try: "Pick one 30-second clip." },
  { cat: "Listening", tip: "Don't translate while listening.", why: "Translation is slower than speech.", try: "Just catch the feeling, not words." },
];

const ENGLISH_CATS = ["Speaking", "Pronunciation", "Reading", "Writing", "Listening", "Vocabulary"];
const ALL: Tip[] = [
  ...TIPS.filter((t) => ENGLISH_CATS.includes(t.cat)).map((t) => ({ cat: t.cat, tip: t.tip, why: t.why, try: t.try })),
  ...READING_TIPS,
  ...LISTENING_TIPS,
];

const SKILLS = [
  { id: "Speaking", icon: Mic },
  { id: "Pronunciation", icon: Volume2 },
  { id: "Reading", icon: BookOpen },
  { id: "Writing", icon: PenLine },
  { id: "Listening", icon: Headphones },
  { id: "Vocabulary", icon: SpellCheck },
];

export default function EnglishTipsPage() {
  const [skill, setSkill] = useState("Speaking");
  const [offset, setOffset] = useState(0);
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);

  const todayTip = ALL[(dayNum(new Date()) + offset) % ALL.length];

  useEffect(() => {
    const today = localISO(new Date());
    const yest = localISO(new Date(Date.now() - 86400000));
    setDone(localStorage.getItem("dg-etip-done-" + today) === "1");
    const st = JSON.parse(localStorage.getItem("dg-etip-streak") || "null");
    if (st && (st.date === today || st.date === yest)) setStreak(st.count);
  }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  };

  const didIt = () => {
    if (done) return;
    const today = localISO(new Date());
    const yest = localISO(new Date(Date.now() - 86400000));
    const st = JSON.parse(localStorage.getItem("dg-etip-streak") || "null");
    const count = st && st.date === yest ? st.count + 1 : 1;
    localStorage.setItem("dg-etip-streak", JSON.stringify({ date: today, count }));
    localStorage.setItem("dg-etip-done-" + today, "1");
    setStreak(count);
    setDone(true);
  };

  const list = ALL.filter((t) => t.cat === skill);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Link href="/speaking" className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-colors">
            <ArrowLeft size={18} className="text-slate-300" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <GraduationCap size={20} className="text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">English Tips</h1>
            <p className="text-xs text-slate-400">Speaking • Reading • Writing • Listening</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-1.5">
          <Flame size={14} className="text-orange-400" />
          <span className="text-xs font-semibold text-orange-300">{streak}</span>
        </div>
      </div>

      {/* Today's English Tip */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-6">
        <p className="text-[10px] font-black text-slate-500 mb-3">TODAY&apos;S ENGLISH TIP • {todayTip.cat.toUpperCase()}</p>
        <p className="text-lg font-semibold leading-relaxed mb-3">"{todayTip.tip}"</p>
        <div className="bg-slate-800/60 rounded-xl p-3 mb-3 border border-slate-700/50">
          <div className="flex items-start gap-2">
            <Lightbulb size={14} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-300 leading-relaxed">{todayTip.why}</p>
          </div>
        </div>
        {todayTip.try && (
          <div className="bg-emerald-500/5 rounded-xl p-3 mb-4 border border-emerald-500/20">
            <div className="flex items-start gap-2">
              <Target size={14} className="text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-100 leading-relaxed">{todayTip.try}</p>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={() => speak(todayTip.tip + " " + todayTip.why)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium transition-colors">
            <Volume2 size={15} /> Hear
          </button>
          <button
            onClick={didIt}
            disabled={done}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              done ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            <Check size={15} /> {done ? "Done!" : "Did it!"}
          </button>
          <button onClick={() => setOffset((offset + 1) % 5)} className="px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Skill tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {SKILLS.map((s) => {
          const Icon = s.icon;
          const active = skill === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSkill(s.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                active ? "bg-teal-500/15 border-teal-500/30 text-teal-300" : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              <Icon size={13} />
              {s.id}
            </button>
          );
        })}
      </div>

      {/* Tips list for skill */}
      <div className="grid gap-3">
        {list.map((t, i) => (
          <div key={i} className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
            <p className="text-sm font-semibold leading-snug mb-2">{i + 1}. {t.tip}</p>
            <p className="text-xs text-slate-400 leading-relaxed mb-2">{t.why}</p>
            {t.try && (
              <div className="flex items-start gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2">
                <Target size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-emerald-100">{t.try}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}