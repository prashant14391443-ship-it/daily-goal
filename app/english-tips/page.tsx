"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TIPS, localISO, dayNum } from "@/app/components/tipsData";
import { GraduationCap, Flame, Volume2, Check, RefreshCw, ArrowLeft, Mic, BookOpen, PenLine, Headphones, SpellCheck, Target, Lightbulb, ChevronDown, Trophy } from "lucide-react";

type Tip = { cat: string; tip: string; why: string; try?: string };

// ─────────────────────────────────────────────────────────
//  READING — 11 tips
// ─────────────────────────────────────────────────────────
const READING_TIPS: Tip[] = [
  { cat: "Reading", tip: "Read 10 minutes daily — same time every day.", why: "Tiny daily reading beats weekend binges.", try: "Pick one news article now." },
  { cat: "Reading", tip: "Read out loud for 2 minutes.", why: "Eyes + ears + mouth = 3x memory.", try: "Read any paragraph aloud." },
  { cat: "Reading", tip: "Don't stop for every new word.", why: "Guessing from context builds fluency.", try: "Underline 3 words, guess meanings." },
  { cat: "Reading", tip: "Read the same story twice.", why: "Second read = speed + confidence.", try: "Re-read yesterday's article." },
  { cat: "Reading", tip: "Start with easy stories or graded readers.", why: "Easy wins build the reading habit.", try: "Search 'easy English story'." },
  { cat: "Reading", tip: "Scan first, then read.", why: "Headlines + first lines give the map.", try: "Skim 30 seconds before reading." },
  { cat: "Reading", tip: "Collect 1 good phrase per page.", why: "Collecting makes reading active.", try: "Save one phrase today." },
  { cat: "Reading", tip: "Highlight transition words (but, so, however).", why: "They reveal how ideas connect.", try: "Find 3 in your next article." },
  { cat: "Reading", tip: "Summarize each paragraph in 5 words.", why: "Forces you to find the real point.", try: "Try it on 3 paragraphs now." },
  { cat: "Reading", tip: "Mix fiction and non-fiction.", why: "Fiction trains feeling; non-fiction trains facts.", try: "Read 1 of each this week." },
  { cat: "Reading", tip: "Use a finger or pen to guide your eyes.", why: "Keeps focus, speeds up reading 20%.", try: "Try it on the next paragraph." },
];

// ─────────────────────────────────────────────────────────
//  LISTENING — 11 tips
// ─────────────────────────────────────────────────────────
const LISTENING_TIPS: Tip[] = [
  { cat: "Listening", tip: "Listen 5 minutes daily — podcast or video.", why: "Daily ears beat weekly marathons.", try: "Play one English video now." },
  { cat: "Listening", tip: "Watch with English subtitles, not Hindi.", why: "Reading + hearing wires the sounds.", try: "One scene with EN subs." },
  { cat: "Listening", tip: "Listen twice: first for gist, second for words.", why: "Two passes train real comprehension.", try: "Replay your last video." },
  { cat: "Listening", tip: "Slow the audio to 0.75x when hard.", why: "Slow = catchable; catchable = learnable.", try: "Try 0.75x on YouTube." },
  { cat: "Listening", tip: "Dictation: write what you hear.", why: "Writing exposes exactly what you miss.", try: "Write 1 sentence from a video." },
  { cat: "Listening", tip: "Listen to the same clip 3 days in a row.", why: "Repetition turns noise into words.", try: "Pick one 30-second clip." },
  { cat: "Listening", tip: "Don't translate while listening.", why: "Translation is slower than speech.", try: "Just catch the feeling, not words." },
  { cat: "Listening", tip: "Use podcasts made for learners first.", why: "They speak clearly, with simpler words.", try: "Try '6 Minute English' by BBC." },
  { cat: "Listening", tip: "Shadow the speaker — repeat right after them.", why: "Mouth + ears together = 3x learning.", try: "Shadow 30 seconds of any clip." },
  { cat: "Listening", tip: "Listen while doing something else (walk, dishes).", why: "Background listening builds comfort.", try: "Try on your next walk." },
  { cat: "Listening", tip: "Note down 3 new words per clip.", why: "Writing cements what ears caught.", try: "Do it for today's clip." },
];

// ─────────────────────────────────────────────────────────
//  EXTRA TIPS for other skills (extends TIPS)
// ─────────────────────────────────────────────────────────
const EXTRA_TIPS: Tip[] = [
  // Speaking — extra 3
  { cat: "Speaking", tip: "Practice tongue twisters for 2 minutes.", why: "Trains mouth muscles for clear English.", try: "Say 'Peter Piper' 5 times fast." },
  { cat: "Speaking", tip: "Record yourself answering a question.", why: "Hearing yourself = fastest fix.", try: "Answer: 'What did you eat today?'" },
  { cat: "Speaking", tip: "Replace 'I think' with 'I feel' or 'I believe'.", why: "Sounds more confident and varied.", try: "Use it in your next 3 sentences." },
  // Pronunciation — extra 3
  { cat: "Pronunciation", tip: "The silent letters: know, hour, knife.", why: "Knowing these prevents over-pronouncing.", try: "Say 5 silent-K words." },
  { cat: "Pronunciation", tip: "Link words: 'want to' = 'wanna'.", why: "Native speakers link, so you should too.", try: "Say 'gonna, wanna, gotta' aloud." },
  { cat: "Pronunciation", tip: "Question words go UP at the end.", why: "Wrong tone sounds like a statement.", try: "Ask 'Really?' with rising voice." },
  // Writing — extra 4
  { cat: "Writing", tip: "Use 'because' to explain every opinion.", why: "Opinion + reason = clear writing.", try: "Add 'because...' to your last sentence." },
  { cat: "Writing", tip: "Avoid 'very' + weak words.", why: "'Very tired' → 'exhausted' is stronger.", try: "Replace 3 'very...' phrases today." },
  { cat: "Writing", tip: "Use commas after intro phrases.", why: "'However, ...' reads smoother.", try: "Add a comma to your last paragraph." },
  { cat: "Writing", tip: "End paragraphs with a punchy line.", why: "Last line sticks in the reader's mind.", try: "Rewrite the last line of your essay." },
  // Vocabulary — extra 4
  { cat: "Vocabulary", tip: "Use words in sentences, not lists.", why: "Context wires memory 5x deeper.", try: "Write 3 sentences with a new word." },
  { cat: "Vocabulary", tip: "Group words by topic, not alphabet.", why: "Thematic = easier recall.", try: "Make a 'food' word list today." },
  { cat: "Vocabulary", tip: "Learn word families: teach, teacher, teaching.", why: "One root = 4 words learned.", try: "Pick one root, list all forms." },
  { cat: "Vocabulary", tip: "Revise words after 1 day, 7 days, 30 days.", why: "Spaced repetition = permanent memory.", try: "Review yesterday's 5 words now." },
];

// ─────────────────────────────────────────────────────────
//  COMBINED LIST
// ─────────────────────────────────────────────────────────
const ENGLISH_CATS = ["Speaking", "Pronunciation", "Reading", "Writing", "Listening", "Vocabulary"];
const ALL: Tip[] = [
  ...TIPS.filter((t) => ENGLISH_CATS.includes(t.cat)).map((t) => ({ cat: t.cat, tip: t.tip, why: t.why, try: t.try })),
  ...READING_TIPS,
  ...LISTENING_TIPS,
  ...EXTRA_TIPS,
];

const SKILLS = [
  { id: "Speaking", icon: Mic, color: "teal" },
  { id: "Pronunciation", icon: Volume2, color: "violet" },
  { id: "Reading", icon: BookOpen, color: "blue" },
  { id: "Writing", icon: PenLine, color: "amber" },
  { id: "Listening", icon: Headphones, color: "rose" },
  { id: "Vocabulary", icon: SpellCheck, color: "emerald" },
];

export default function EnglishTipsPage() {
  const [skill, setSkill] = useState("Speaking");
  const [offset, setOffset] = useState(0);
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});

  const todayTip = ALL[(dayNum(new Date()) + offset) % ALL.length];
  const list = ALL.filter((t) => t.cat === skill);
  const doneCount = list.filter((t) => doneMap[`${skill}-${list.indexOf(t)}`]).length;
  const allDone = list.length > 0 && doneCount === list.length;

  // Load daily streak + per-tip done map
  useEffect(() => {
    const today = localISO(new Date());
    const yest = localISO(new Date(Date.now() - 86400000));
    setDone(localStorage.getItem("dg-etip-done-" + today) === "1");
    const st = JSON.parse(localStorage.getItem("dg-etip-streak") || "null");
    if (st && (st.date === today || st.date === yest)) setStreak(st.count);
    try {
      const map = JSON.parse(localStorage.getItem("dg-etip-done-map") || "{}");
      setDoneMap(map);
    } catch {}
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

  const markDone = (idx: number) => {
    const key = `${skill}-${idx}`;
    const next = { ...doneMap, [key]: true };
    setDoneMap(next);
    try { localStorage.setItem("dg-etip-done-map", JSON.stringify(next)); } catch {}
  };

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
            <p className="text-xs text-slate-400">6 skills • apply 1 tip daily</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-1.5">
          <Flame size={14} className="text-orange-400" />
          <span className="text-xs font-semibold text-orange-300">{streak}</span>
        </div>
      </div>

      {/* ────────── TODAY'S TIP (clean, calm) ────────── */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-6">
        <p className="text-[10px] font-black text-teal-400 mb-3 tracking-wider">TODAY&apos;S TIP • {todayTip.cat.toUpperCase()}</p>
        <p className="text-base md:text-lg font-bold leading-snug mb-2">&ldquo;{todayTip.tip}&rdquo;</p>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">{todayTip.why}</p>
        <div className="flex gap-2">
          <button onClick={() => speak(todayTip.tip + ". " + todayTip.why)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors">
            <Volume2 size={15} /> Hear
          </button>
          <button
            onClick={didIt}
            disabled={done}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
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

      {/* ────────── SKILL PILLS (2-row wrap) ────────── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SKILLS.map((s) => {
          const Icon = s.icon;
          const active = skill === s.id;
          const count = ALL.filter((t) => t.cat === s.id).length;
          const doneCount = ALL.filter((t) => t.cat === s.id).reduce((acc, t, i) => acc + (doneMap[`${s.id}-${i}`] ? 1 : 0), 0);
          return (
            <button
              key={s.id}
              onClick={() => { setSkill(s.id); setExpandedIdx(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                active
                  ? "bg-teal-500/15 border-teal-500/40 text-teal-300"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              <Icon size={13} />
              {s.id}
              <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded-md ${active ? "bg-teal-500/30 text-teal-200" : "bg-slate-800 text-slate-500"}`}>
                {doneCount}/{count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ────────── PROGRESS BAR (current skill) ────────── */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 mb-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs font-semibold text-slate-400">{skill} progress</p>
          <p className={`text-xs font-black ${allDone ? "text-emerald-400" : "text-slate-300"}`}>
            {allDone ? "🎉 All done!" : `${doneCount} / ${list.length} done`}
          </p>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allDone ? "bg-emerald-500" : "bg-teal-500"}`}
            style={{ width: `${list.length ? (doneCount / list.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* ────────── ACCORDION TIP LIST ────────── */}
      <div className="grid gap-2">
        {list.map((t, i) => {
          const key = `${skill}-${i}`;
          const isDone = !!doneMap[key];
          const isExpanded = expandedIdx === i;
          return (
            <div key={i} className={`bg-slate-900 border rounded-xl transition-all ${isDone ? "border-emerald-500/30" : "border-slate-700"}`}>
              <button
                onClick={() => setExpandedIdx(isExpanded ? null : i)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markDone(i);
                  }}
                  disabled={isDone}
                  className={`shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                    isDone
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-slate-600 hover:border-emerald-500/60"
                  }`}
                >
                  {isDone && <Check size={14} className="text-white" strokeWidth={3} />}
                </button>
                <p className={`flex-1 text-sm font-semibold leading-snug ${isDone ? "line-through text-slate-500" : "text-white"}`}>
                  {i + 1}. {t.tip}
                </p>
                <ChevronDown
                  size={16}
                  className={`text-slate-500 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="flex items-start gap-2 bg-slate-800/50 rounded-lg p-3">
                    <Lightbulb size={13} className="text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-300 leading-relaxed">{t.why}</p>
                  </div>
                  {t.try && (
                    <div className="flex items-start gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                      <Target size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-emerald-100 leading-relaxed">{t.try}</p>
                    </div>
                  )}
                  <button
                    onClick={() => speak(t.tip + ". " + t.why)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white mt-1"
                  >
                    <Volume2 size={13} /> Hear this tip
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ────────── CELEBRATE COMPLETED SKILL ────────── */}
      {allDone && (
        <div className="mt-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-5 text-center">
          <Trophy size={32} className="mx-auto mb-2 text-amber-400" />
          <p className="text-base font-black text-white mb-1">{skill} mastered! 🎉</p>
          <p className="text-xs text-slate-400">You applied every tip. Move to the next skill!</p>
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-[10px] text-slate-600 mt-6 font-semibold">
        Tap any tip → read why → try now → mark done
      </p>
    </main>
  );
}