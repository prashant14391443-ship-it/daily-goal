"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type VWord = { word: string; type: string; meaning: string; hindi: string; example: string; synonym: string };
type Pack = { id: string; emoji: string; title: string; desc: string; words: VWord[] };
type Row = { word: string; meaning: string; hindi: string; level: number; next_review: string | null };

const PACKS: Pack[] = [
  {
    id: "daily",
    emoji: "🗣️",
    title: "Daily Conversation",
    desc: "Sound natural with friends",
    words: [
      { word: "genuinely", type: "adverb", meaning: "truly, honestly", hindi: "सच में, वास्तव में", example: "I genuinely enjoyed the food.", synonym: "truly" },
      { word: "grab", type: "verb", meaning: "take something quickly", hindi: "झट से ले लेना", example: "Let me grab a coffee before class.", synonym: "snatch" },
      { word: "catch up", type: "phrasal verb", meaning: "meet and share recent news", hindi: "हालचाल लेना, मिलकर बातें करना", example: "We should catch up soon!", synonym: "reconnect" },
      { word: "awesome", type: "adjective", meaning: "very impressive or excellent", hindi: "शानदार, कमाल का", example: "The movie was awesome!", synonym: "amazing" },
      { word: "figure out", type: "phrasal verb", meaning: "solve or understand after thinking", hindi: "समझना, हल निकालना", example: "I will figure out the bus route.", synonym: "solve" },
    ],
  },
  {
    id: "interview",
    emoji: "👔",
    title: "Interview Words",
    desc: "Impress any interviewer",
    words: [
      { word: "persevere", type: "verb", meaning: "keep going even when it is difficult", hindi: "दृढ़ता से लगे रहना", example: "She persevered until she passed the exam.", synonym: "persist" },
      { word: "punctual", type: "adjective", meaning: "always on time", hindi: "समय का पाबंद", example: "He is always punctual for meetings.", synonym: "on time" },
      { word: "collaborate", type: "verb", meaning: "work together with others", hindi: "सहयोग करना, मिलकर काम करना", example: "We collaborate with the design team.", synonym: "cooperate" },
      { word: "initiative", type: "noun", meaning: "the first step; leadership to act", hindi: "पहल, पहलकदमी", example: "She took the initiative to organize the event.", synonym: "enterprise" },
      { word: "diligent", type: "adjective", meaning: "hardworking and careful", hindi: "परिश्रमी, मेहनती", example: "A diligent worker always finishes on time.", synonym: "hardworking" },
    ],
  },
  {
    id: "exam",
    emoji: "📝",
    title: "Exam & Academic",
    desc: "Words that appear in tests",
    words: [
      { word: "analyze", type: "verb", meaning: "examine something in detail", hindi: "विश्लेषण करना", example: "Analyze the data carefully before answering.", synonym: "examine" },
      { word: "concise", type: "adjective", meaning: "short and clear", hindi: "संक्षिप्त और स्पष्ट", example: "Write a concise summary of the chapter.", synonym: "brief" },
      { word: "evaluate", type: "verb", meaning: "judge the value or quality", hindi: "मूल्यांकन करना", example: "Evaluate both arguments before deciding.", synonym: "assess" },
      { word: "hypothesis", type: "noun", meaning: "an idea to be tested", hindi: "परिकल्पना", example: "The hypothesis was proven correct.", synonym: "theory" },
      { word: "comprehend", type: "verb", meaning: "understand fully", hindi: "पूरी तरह समझना", example: "I could not comprehend the question.", synonym: "understand" },
    ],
  },
];

const MASTERY = ["🌱", "", "🌳", "🌲"];
const masteryOf = (lvl: number) => (lvl >= 4 ? "👑" : MASTERY[Math.max(0, lvl)]);
const INTERVALS: Record<number, number> = { 1: 1, 2: 3, 3: 7 };

function addDaysISO(n: number) {
  const d = new Date(Date.now() + n * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const todayISO = () => addDaysISO(0);

function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function VocabPage() {
  const [view, setView] = useState<"home" | "learn" | "quiz" | "result" | "review" | "bank">("home");
  const [pack, setPack] = useState<Pack | null>(null);
  const [queue, setQueue] = useState<VWord[]>([]);
  const [idx, setIdx] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [quizQs, setQuizQs] = useState<{ q: string; options: string[]; answer: number }[]>([]);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState(-1);
  const [score, setScore] = useState(0);
  const [uid, setUid] = useState("");
  const [revQueue, setRevQueue] = useState<Row[]>([]);
  const [revIdx, setRevIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [bankQ, setBankQ] = useState("");
    const [aiTopic, setAiTopic] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id;
    if (!id) return;
    setUid(id);
    const { data: r } = await supabase.from("user_vocab").select("*").eq("user_id", id);
    setRows((r as Row[]) || []);
  };

  useEffect(() => {
    load();
  }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  const learned = rows.map((r) => r.word);
  const due = rows.filter((r) => r.level < 4 && r.next_review && r.next_review <= todayISO());
  const genAI = async () => {
    const t = aiTopic.trim();
    if (!t || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "vocabpack", topic: t }),
      });
      const d = await res.json();
      const words: VWord[] = (d.items || [])
        .map((a: string[]) => ({ word: a[0], type: a[1] || "word", meaning: a[2] || "", hindi: a[3] || "", example: a[4] || "", synonym: a[5] || "" }))
        .filter((w: VWord) => w.word && w.meaning);
      if (words.length >= 3) startPack({ id: "ai-" + t, emoji: "✨", title: t, desc: "AI pack", words });
      else alert("😴 Could not generate — try another topic!");
    } catch {
      alert("📡 Network issue!");
    }
    setAiLoading(false);
  };

  const startPack = (p: Pack) => {
    setPack(p);
    setQueue([...p.words]);
    setIdx(0);
    setView("learn");
  };

  const saveWord = async (w: VWord) => {
    if (!uid) return;
    await supabase
      .from("user_vocab")
      .upsert(
        { user_id: uid, word: w.word, meaning: w.meaning, hindi: w.hindi, level: 0, next_review: addDaysISO(1) },
        { onConflict: "user_id,word" }
      );
    load();
  };

  const advance = (extra?: VWord) => {
    const newQueue = extra ? [...queue, extra] : queue;
    if (extra) setQueue(newQueue);
    const n = idx + 1;
    if (n >= newQueue.length) {
      buildQuiz();
      setView("quiz");
    } else {
      setIdx(n);
    }
  };

  const buildQuiz = () => {
    if (!pack) return;
    const qs = pack.words.map((w) => {
      const others = shuffle(pack.words.filter((x) => x.word !== w.word).map((x) => x.meaning)).slice(0, 3);
      const options = shuffle([w.meaning, ...others]);
      return { q: w.word, options, answer: options.indexOf(w.meaning) };
    });
    setQuizQs(qs);
    setQi(0);
    setPicked(-1);
    setScore(0);
  };

  const pick = (oi: number) => {
    if (picked !== -1) return;
    setPicked(oi);
    if (oi === quizQs[qi].answer) setScore((s) => s + 1);
  };

  const nextQ = () => {
    if (qi + 1 >= quizQs.length) setView("result");
    else {
      setQi(qi + 1);
      setPicked(-1);
    }
  };

  // 🔄 SPACED REPETITION
  const startReview = () => {
    setRevQueue(shuffle(due));
    setRevIdx(0);
    setFlipped(false);
    setView("review");
  };

  const grade = async (g: "forgot" | "hard" | "easy") => {
    const w = revQueue[revIdx];
    let level = w.level;
    let next: string | null = addDaysISO(1);
    if (g === "forgot") {
      level = 0;
      next = addDaysISO(1);
    } else if (g === "hard") {
      next = addDaysISO(1);
    } else {
      level = Math.min(4, level + 1);
      next = level >= 4 ? null : addDaysISO(INTERVALS[level] || 1);
    }
    await supabase.from("user_vocab").update({ level, next_review: next }).eq("user_id", uid).eq("word", w.word);
    setRows((prev) => prev.map((r) => (r.word === w.word ? { ...r, level, next_review: next } : r)));
    if (revIdx + 1 >= revQueue.length) setView("home");
    else {
      setRevIdx(revIdx + 1);
      setFlipped(false);
    }
  };

  // 🏠 HOME
  if (view === "home") {
    const total = PACKS.reduce((a, p) => a + p.words.length, 0);
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black">📚 Vocabulary</h1>
          <Link href="/speaking" className="text-sm text-slate-400">← Back</Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
          <p className="text-xs text-slate-400 mb-1">Your word bank</p>
          <p className="text-2xl font-black text-emerald-400">{learned.length} <span className="text-sm text-slate-400 font-bold">/ {Math.max(total, learned.length)} words learned</span></p>
          <div className="h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (learned.length / total) * 100)}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={startReview}
            disabled={due.length === 0}
            className={`rounded-xl p-4 text-left border transition-colors ${
              due.length > 0
                ? "bg-amber-600/15 border-amber-500/50 hover:border-amber-400"
                : "opacity-50 bg-slate-900 border-slate-800"
            }`}
          >
            <p className="text-2xl mb-1">🔄</p>
            <p className="font-bold text-sm">Review Due</p>
            <p className="text-[10px] text-slate-400">{due.length > 0 ? `${due.length} words waiting!` : "No reviews — great job! ✅"}</p>
          </button>
          <button onClick={() => setView("bank")} className="bg-slate-900 border border-slate-800 hover:border-violet-500/60 rounded-xl p-4 text-left transition-colors">
            <p className="text-2xl mb-1">🏦</p>
            <p className="font-bold text-sm">My Words</p>
            <p className="text-[10px] text-slate-400">{rows.length} saved</p>
          </button>
        </div>
        <div className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/40 rounded-xl p-4 mb-4 grid gap-2">
          <p className="font-bold text-sm text-violet-300">✨ Any Topic — AI Pack (8 words)</p>
          <div className="flex gap-2">
            <input
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="e.g. Travel, Cricket, Festivals..."
              className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm"
            />
            <button onClick={genAI} disabled={aiLoading} className="px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-bold disabled:opacity-50">
              {aiLoading ? "..." : "Go"}
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          {PACKS.map((p) => {
            const done = p.words.filter((w) => learned.includes(w.word)).length;
            return (
              <button
                key={p.id}
                onClick={() => startPack(p)}
                className="bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-xl p-4 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{p.emoji}</span>
                  <div className="flex-1">
                    <p className="font-bold">{p.title}</p>
                    <p className="text-[10px] text-slate-400">{p.desc}</p>
                  </div>
                  <span className="text-xs font-black text-emerald-400">{done}/{p.words.length}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${(done / p.words.length) * 100}%` }} />
                </div>
                <p className="text-xs font-bold text-emerald-300 mt-2">{done === p.words.length ? "🔁 Practice again" : "▶ Start learning"}</p>
              </button>
            );
          })}
        </div>
      </main>
    );
  }

  // 🎴 LEARN CARD
  if (view === "learn" && pack) {
    const w = queue[idx];
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setView("home")} className="text-sm text-slate-400">← Packs</button>
          <p className="text-xs font-bold text-slate-400">{pack.emoji} {idx + 1} / {queue.length}</p>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(idx / queue.length) * 100}%` }} />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 grid gap-4 max-w-md mx-auto w-full">
          <div className="text-center">
            <p className="text-4xl font-black uppercase tracking-wide">{w.word}</p>
            <span className="inline-block mt-2 text-[10px] bg-slate-800 border border-slate-700 px-2 py-1 rounded-full text-slate-400 font-bold">{w.type}</span>
          </div>
          <button onClick={() => speak(w.word)} className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold">
            🔊 Hear the word
          </button>
          <div className="bg-slate-950 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 font-bold mb-1">💡 MEANING</p>
            <p className="text-sm">{w.meaning}</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
            <p className="text-[10px] text-amber-400 font-bold mb-1">🇮🇳 HINDI</p>
            <p className="text-sm text-amber-100">{w.hindi}</p>
          </div>
          <div className="bg-slate-950 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 font-bold mb-1">📖 EXAMPLE</p>
            <p className="text-sm italic">"{w.example}"</p>
            <button onClick={() => speak(w.example)} className="mt-2 text-[10px] bg-slate-800 px-2 py-1 rounded">🔊 Hear sentence</button>
          </div>
          <div className="text-center">
            <span className="text-xs text-slate-400">🔁 Synonym: </span>
            <span className="text-xs font-bold text-violet-400">{w.synonym}</span>
          </div>
        </div>

        <div className="flex gap-3 max-w-md mx-auto w-full mt-6">
          <button onClick={() => advance(w)} className="flex-1 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold">🔁 Again</button>
          <button onClick={() => { saveWord(w); advance(); }} className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold">✅ Got it</button>
        </div>
      </main>
    );
  }

  // 🔄 REVIEW (spaced repetition flashcard)
  if (view === "review" && revQueue.length > 0) {
    const w = revQueue[revIdx];
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setView("home")} className="text-sm text-slate-400">← Home</button>
          <p className="text-xs font-bold text-amber-400">🔄 Review {revIdx + 1} / {revQueue.length}</p>
        </div>

        <button
          onClick={() => setFlipped(true)}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md mx-auto w-full grid gap-4 text-center min-h-[300px] content-center"
        >
          <p className="text-4xl font-black uppercase">{w.word}</p>
          <button onClick={(e) => { e.stopPropagation(); speak(w.word); }} className="justify-self-center py-2 px-4 rounded-xl bg-slate-800 text-sm font-bold">🔊</button>
          {!flipped ? (
            <p className="text-xs text-slate-500 animate-pulse">👆 Tap card to reveal meaning</p>
          ) : (
            <>
              <p className="text-sm text-slate-200">{w.meaning}</p>
              <p className="text-sm text-amber-200">{w.hindi}</p>
              <p className="text-[10px] text-slate-500">{masteryOf(w.level)} level {w.level}</p>
            </>
          )}
        </button>

        {flipped && (
          <div className="flex gap-2 max-w-md mx-auto w-full mt-6">
            <button onClick={() => grade("forgot")} className="flex-1 py-3.5 rounded-xl bg-red-600/20 border border-red-500/40 text-red-300 font-bold">😵 Forgot</button>
            <button onClick={() => grade("hard")} className="flex-1 py-3.5 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-300 font-bold">🤔 Hard</button>
            <button onClick={() => grade("easy")} className="flex-1 py-3.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 font-bold">😎 Easy</button>
          </div>
        )}
      </main>
    );
  }

  // 🏦 MY WORDS BANK
  if (view === "bank") {
    const list = rows.filter((r) => r.word.toLowerCase().includes(bankQ.toLowerCase()));
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black">🏦 My Words</h1>
          <button onClick={() => setView("home")} className="text-sm text-slate-400">← Back</button>
        </div>
        <input
          value={bankQ}
          onChange={(e) => setBankQ(e.target.value)}
          placeholder="🔍 Search your words..."
          className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm mb-4"
        />
        <div className="grid gap-2">
          {list.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No words yet — learn a pack first! 📚</p>}
          {list.map((r) => (
            <div key={r.word} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
              <span className="text-xl">{masteryOf(r.level)}</span>
              <div className="flex-1">
                <p className="font-bold text-sm uppercase">{r.word}</p>
                <p className="text-[10px] text-slate-400">{r.meaning} • <span className="text-amber-200">{r.hindi}</span></p>
              </div>
              <button onClick={() => speak(r.word)} className="px-3 py-2 rounded-lg bg-slate-800 text-sm">🔊</button>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 text-center mt-4">🌱 new → 🌿 → 🌳 → 🌲 →  mastered</p>
      </main>
    );
  }

  // ❓ QUIZ
  if (view === "quiz" && quizQs.length > 0) {
    const q = quizQs[qi];
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
        <p className="text-xs font-bold text-slate-400 text-center mb-6">❓ Quiz — {qi + 1}/{quizQs.length}</p>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md mx-auto">
          <p className="text-xl font-black text-center mb-6 uppercase">"{q.q}" means...?</p>
          <div className="grid gap-2">
            {q.options.map((opt, oi) => {
              let cls = "bg-slate-800 hover:bg-slate-700";
              if (picked !== -1) {
                if (oi === q.answer) cls = "bg-emerald-700";
                else if (oi === picked) cls = "bg-red-700";
              }
              return (
                <button key={oi} onClick={() => pick(oi)} className={`text-left p-3 rounded-xl text-sm font-medium ${cls}`}>
                  {opt}
                </button>
              );
            })}
          </div>
          {picked !== -1 && (
            <button onClick={nextQ} className="w-full mt-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold">
              {qi + 1 >= quizQs.length ? "🏁 See Result" : "Next ➡️"}
            </button>
          )}
        </div>
      </main>
    );
  }

  // 🏁 RESULT
  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-sm w-full">
        <p className="text-6xl mb-3">{score === quizQs.length ? "🏆" : score >= 3 ? "💪" : "🌱"}</p>
        <p className="text-4xl font-black text-emerald-400">{score} / {quizQs.length}</p>
        <p className="text-sm text-slate-400 mt-2 mb-6">
          {score === quizQs.length ? "Vocab Hero! All words mastered!" : score >= 3 ? "Strong! Review the red ones." : "Good start — try the pack again!"}
        </p>
        <div className="grid gap-2">
          <button onClick={() => pack && startPack(pack)} className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold">🔁 Retry Pack</button>
          <button onClick={() => setView("home")} className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold">🏠 All Packs</button>
        </div>
      </div>
    </main>
  );
}
