"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PACKS_A } from "./dataA";
import { PACKS_B } from "./dataB";
import { PACKS_C } from "./dataC";
import { PACKS_D } from "./dataD";
import { BookOpen, RotateCw, Archive, Sparkles, Volume2, ArrowLeft, Check, Lightbulb, Flag, BookMarked, Repeat, Search, Award, TrendingUp } from "lucide-react";

type VWord = { word: string; type: string; meaning: string; hindi: string; example: string; synonym: string; antonym: string };
type Pack = { id: string; emoji: string; title: string; desc: string; words: VWord[] };
type Row = { word: string; meaning: string; hindi: string; level: number; next_review: string | null; synonym: string; antonym: string };

// ✅ ALL 20 TOPICS (600 words total)
const PACKS: Pack[] = [...PACKS_A, ...PACKS_B, ...PACKS_C, ...PACKS_D];

const MASTERY = ["🌱", "🌿", "🌳", "🌲", "👑"];
const masteryOf = (lvl: number) => MASTERY[Math.max(0, Math.min(4, lvl))];
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

// ==========================================
// ✅ OFFLINE VOCAB STORAGE HELPERS
// ==========================================
const VOCAB_STORAGE_KEY = "dg-vocab-progress-v1";

function loadLocalRows(): Row[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VOCAB_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRows(rows: Row[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(rows));
}

function mergeRows(local: Row[], remote: Row[]): Row[] {
  const map = new Map<string, Row>();
  for (const r of local) map.set(r.word, r);
  for (const r of remote) {
    const existing = map.get(r.word);
    if (!existing) {
      map.set(r.word, r);
    } else {
      // Keep the one with higher level, or if same level, later next_review
      if (r.level > existing.level) {
        map.set(r.word, r);
      } else if (r.level === existing.level && r.next_review && existing.next_review && r.next_review > existing.next_review) {
        map.set(r.word, r);
      }
    }
  }
  return Array.from(map.values());
}
// ==========================================

export default function VocabPage() {
  const [view, setView] = useState<"home" | "learn" | "quiz" | "result" | "review" | "bank">("home");
  const [pack, setPack] = useState<Pack | null>(null);
  const [queue, setQueue] = useState<VWord[]>([]);
  const [session, setSession] = useState<VWord[]>([]);
  const [idx, setIdx] = useState(0);
  
  // ✅ Initialize directly from localStorage so it's never empty offline
  const [rows, setRows] = useState<Row[]>(() => loadLocalRows()); 
  
  const [quizQs, setQuizQs] = useState<{ q: string; options: string[]; answer: number }[]>([]);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState(-1);
  const [score, setScore] = useState(0);
  const [uid, setUid] = useState("");
  const [revQueue, setRowQueue] = useState<Row[]>([]);
  const [revIdx, setRevIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [bankQ, setBankQ] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Helper to lookup offline data for older database rows
  const allOfflineWords = PACKS.flatMap(p => p.words);
  const getOfflineFallback = (wordText: string) => allOfflineWords.find(w => w.word === wordText);

  const load = async () => {
    const localRows = loadLocalRows();
    setRows(localRows); // ✅ Show local data immediately offline

    try {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id;
      if (!id) return;
      setUid(id);
      
      const { data: r, error } = await supabase.from("user_vocab").select("*").eq("user_id", id);
      if (r && !error) {
        const remoteRows = r as Row[];
        const merged = mergeRows(localRows, remoteRows);
        setRows(merged);
        saveLocalRows(merged); // ✅ Persist merged state
      }
    } catch (e) {
      // Offline or error, keep localRows
      console.log("Vocab load offline or failed, using local cache");
    }
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

  const startPack = (p: Pack) => {
    const un = p.words.filter((w) => !learned.includes(w.word));
    const batch = (un.length ? un : p.words).slice(0, 5);
    setPack(p);
    setSession(batch);
    setQueue(batch);
    setIdx(0);
    setView("learn");
  };

  const saveWord = async (w: VWord) => {
    const newRow: Row = {
      word: w.word,
      meaning: w.meaning,
      hindi: w.hindi,
      level: 0,
      next_review: addDaysISO(1),
      synonym: w.synonym,
      antonym: w.antonym
    };

    // ✅ Update local state and storage immediately
    setRows((prev) => {
      const exists = prev.some(r => r.word === newRow.word);
      const next = exists ? prev.map(r => r.word === newRow.word ? newRow : r) : [...prev, newRow];
      saveLocalRows(next);
      return next;
    });

    if (!uid) return;

    // Try to save to Supabase in background
    try {
      await supabase
        .from("user_vocab")
        .upsert(
          { 
            user_id: uid, 
            word: w.word, 
            meaning: w.meaning, 
            hindi: w.hindi, 
            level: 0, 
            next_review: addDaysISO(1),
            synonym: w.synonym,
            antonym: w.antonym
          },
          { onConflict: "user_id,word" }
        );
    } catch (e) {
      // Silently fail offline, will sync later
    }
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
    const qs = session.map((w) => {
      const others = shuffle(session.filter((x) => x.word !== w.word).map((x) => x.meaning)).slice(0, 3);
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
        .map((a: string[]) => ({ 
          word: a[0], 
          type: a[1] || "word", 
          meaning: a[2] || "", 
          hindi: a[3] || "", 
          example: a[4] || "", 
          synonym: a[5] || "",
          antonym: a[6] || "" 
        }))
        .filter((w: VWord) => w.word && w.meaning);
      if (words.length >= 3) startPack({ id: "ai-" + t, emoji: "✨", title: t, desc: "AI pack", words });
      else alert("😴 Could not generate — try another topic!");
    } catch {
      alert("📡 Network issue!");
    }
    setAiLoading(false);
  };

  const startReview = () => {
    setRowQueue(shuffle(due));
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

    // ✅ Update local state and storage immediately
    setRows((prev) => {
      const updatedRows = prev.map((r) =>
        r.word === w.word ? { ...r, level, next_review: next } : r,
      );
      saveLocalRows(updatedRows);
      return updatedRows;
    });

    if (revIdx + 1 >= revQueue.length) setView("home");
    else {
      setRevIdx(revIdx + 1);
      setFlipped(false);
    }

    if (!uid) return;

    // Try to update Supabase in background
    try {
      await supabase.from("user_vocab").update({ level, next_review: next }).eq("user_id", uid).eq("word", w.word);
    } catch (e) {
      // Silently fail offline
    }
  };

  // 🏠 HOME
  if (view === "home") {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <BookOpen size={20} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Vocabulary</h1>
              <p className="text-xs text-slate-400">Master 600 essential words</p>
            </div>
          </div>
          <Link href="/speaking" className="text-slate-400 hover:text-slate-300">
            <ArrowLeft size={18} />
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-5">
          <p className="text-xs text-slate-400 mb-2">Your word bank</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-400">{learned.length}</span>
            <span className="text-sm text-slate-400 font-semibold">/ 600 words learned</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={startReview}
            disabled={due.length === 0}
            className={`rounded-2xl p-4 text-left border transition-colors ${
              due.length > 0 
                ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50" 
                : "opacity-50 bg-slate-900 border-slate-700"
            }`}
          >
            <RotateCw size={24} className="text-amber-400 mb-2" />
            <p className="font-semibold text-sm mb-1">Review Due</p>
            <p className="text-xs text-slate-400">{due.length > 0 ? `${due.length} words waiting!` : "No reviews — great job! ✅"}</p>
          </button>
          <button onClick={() => setView("bank")} className="bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-2xl p-4 text-left transition-colors">
            <Archive size={24} className="text-violet-400 mb-2" />
            <p className="font-semibold text-sm mb-1">My Words</p>
            <p className="text-xs text-slate-400">{rows.length} saved</p>
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-violet-400" />
            <p className="font-semibold text-sm text-violet-300">Any Topic — AI Pack</p>
          </div>
          <div className="flex gap-2">
            <input
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="e.g. Cricket, Space, Bollywood..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:border-violet-500 focus:outline-none"
            />
            <button 
              onClick={genAI} 
              disabled={aiLoading} 
              className="px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {aiLoading ? "..." : "Go"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <BookMarked size={16} className="text-emerald-400" />
          <p className="text-xs font-semibold text-slate-400">20 TOPICS • 30 WORDS EACH • 5 AT A TIME</p>
        </div>

        <div className="grid gap-3">
          {PACKS.map((p) => {
            const done = p.words.filter((w) => learned.includes(w.word)).length;
            const progress = (done / p.words.length) * 100;
            return (
              <button key={p.id} onClick={() => startPack(p)} className="bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-2xl p-5 text-left transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl">
                    {p.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold mb-0.5">{p.title}</p>
                    <p className="text-xs text-slate-400">{p.desc}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-emerald-400">{done}/{p.words.length}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs font-medium text-emerald-300">
                  {done === p.words.length ? "🔁 Practice again" : done > 0 ? `▶ Continue (${p.words.length - done} left)` : "▶ Start learning"}
                </p>
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
    const progress = (idx / queue.length) * 100;
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setView("home")} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300">
            <ArrowLeft size={16} />
            Packs
          </button>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-400">
              {idx + 1} / {queue.length}
            </p>
            <p className="text-xs text-slate-500">
              {learned.filter((l) => pack.words.some((x) => x.word === l)).length}/{pack.words.length} mastered
            </p>
          </div>
        </div>

        <div className="h-1.5 bg-slate-800 rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 grid gap-4 max-w-md mx-auto w-full">
          <div className="text-center">
            <p className="text-4xl font-bold uppercase tracking-wide mb-2">{w.word}</p>
            <span className="inline-block text-[10px] bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg text-slate-400 font-semibold">
              {w.type}
            </span>
          </div>

          <button 
            onClick={() => speak(w.word)} 
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors"
          >
            <Volume2 size={16} />
            Hear the word
          </button>

          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={14} className="text-amber-400" />
              <p className="text-xs font-semibold text-slate-400">MEANING</p>
            </div>
            <p className="text-sm text-slate-200">{w.meaning}</p>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Flag size={14} className="text-amber-400" />
              <p className="text-xs font-semibold text-amber-400">HINDI</p>
            </div>
            <p className="text-sm text-amber-100">{w.hindi}</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={14} className="text-blue-400" />
              <p className="text-xs font-semibold text-slate-400">EXAMPLE</p>
            </div>
            <p className="text-sm text-slate-300 italic mb-3">"{w.example}"</p>
            <button 
              onClick={() => speak(w.example)} 
              className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Volume2 size={12} />
              Hear sentence
            </button>
          </div>

          <div className="text-center space-y-1 mt-2">
            {w.synonym && (
              <div>
                <span className="text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Repeat size={12} />
                  Synonym: <span className="font-semibold text-violet-400">{w.synonym}</span>
                </span>
              </div>
            )}
            {w.antonym && (
              <div>
                <span className="text-xs text-slate-400 flex items-center justify-center gap-2">
                  <span className="text-[10px]">🆚</span>
                  Antonym: <span className="font-semibold text-rose-400">{w.antonym}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 max-w-md mx-auto w-full mt-6">
          <button 
            onClick={() => advance(w)} 
            className="flex-1 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold transition-colors"
          >
            🔁 Again
          </button>
          <button 
            onClick={() => { saveWord(w); advance(); }} 
            className="flex-1 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold transition-colors"
          >
            ✅ Got it
          </button>
        </div>

        <p className="text-xs text-slate-500 text-center mt-4">
          Learned all 5? Come back later for the next 5! 🚀
        </p>
      </main>
    );
  }

  // 🔄 REVIEW
  if (view === "review" && revQueue.length > 0) {
    const r = revQueue[revIdx];
    const fallback = getOfflineFallback(r.word);
    
    // Check database first, if null/empty, fallback to our offline packs!
    const displaySyn = r.synonym || fallback?.synonym;
    const displayAnt = r.antonym || fallback?.antonym;

    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setView("home")} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300">
            <ArrowLeft size={16} />
            Home
          </button>
          <div className="flex items-center gap-2">
            <RotateCw size={14} className="text-amber-400" />
            <p className="text-xs font-semibold text-amber-400">
              Review {revIdx + 1} / {revQueue.length}
            </p>
          </div>
        </div>

        <button 
          onClick={() => setFlipped(true)} 
          className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md mx-auto w-full grid gap-4 text-center min-h-[300px] content-center hover:border-slate-600 transition-colors relative"
        >
          <p className="text-4xl font-bold uppercase mb-4">{r.word}</p>
          <button 
            onClick={(e) => { e.stopPropagation(); speak(r.word); }} 
            className="justify-self-center flex items-center gap-2 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors"
          >
            <Volume2 size={16} />
            Listen
          </button>
          {!flipped ? (
            <p className="text-xs text-slate-500 animate-pulse mt-4">👆 Tap card to reveal meaning</p>
          ) : (
            <>
              <p className="text-sm text-slate-200 mt-4">{r.meaning}</p>
              <p className="text-sm text-amber-200 mt-2">{r.hindi}</p>
              
              {/* 🔥 Synonym and Antonym added to review flip card */}
              <div className="flex justify-center items-center gap-4 mt-4">
                {displaySyn && (
                  <p className="text-xs flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/50">
                    <Repeat size={12} className="text-violet-400" />
                    <span className="text-violet-300 font-semibold">{displaySyn}</span>
                  </p>
                )}
                {displayAnt && (
                  <p className="text-xs flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/50">
                    <span className="text-[10px]">🆚</span>
                    <span className="text-rose-300 font-semibold">{displayAnt}</span>
                  </p>
                )}
              </div>

              <div className="absolute bottom-4 inset-x-0 flex justify-center items-center gap-1.5 mt-4">
                <span className="text-[14px]">{masteryOf(r.level)}</span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Level {r.level}</span>
              </div>
            </>
          )}
        </button>

        {flipped && (
          <div className="flex gap-2 max-w-md mx-auto w-full mt-6">
            <button 
              onClick={() => grade("forgot")} 
              className="flex-1 py-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 font-semibold hover:bg-red-500/20 transition-colors"
            >
              😵 Forgot
            </button>
            <button 
              onClick={() => grade("hard")} 
              className="flex-1 py-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold hover:bg-amber-500/20 transition-colors"
            >
              🤔 Hard
            </button>
            <button 
              onClick={() => grade("easy")} 
              className="flex-1 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold hover:bg-emerald-500/20 transition-colors"
            >
              😎 Easy
            </button>
          </div>
        )}
      </main>
    );
  }

  // 🏦 BANK
  if (view === "bank") {
    const list = rows.filter((r) => r.word.toLowerCase().includes(bankQ.toLowerCase()));
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Archive size={20} className="text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">My Words</h1>
              <p className="text-xs text-slate-400">{rows.length} saved</p>
            </div>
          </div>
          <button onClick={() => setView("home")} className="text-slate-400 hover:text-slate-300">
            <ArrowLeft size={18} />
          </button>
        </div>

        <div className="relative mb-5">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            value={bankQ} 
            onChange={(e) => setBankQ(e.target.value)} 
            placeholder="Search your words..." 
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm focus:border-slate-600 focus:outline-none" 
          />
        </div>

        <div className="grid gap-2">
          {list.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-12">
              No words yet — learn a pack first! 📚
            </p>
          )}
          {list.map((r) => {
            const fallback = getOfflineFallback(r.word);
            const displaySyn = r.synonym || fallback?.synonym;
            const displayAnt = r.antonym || fallback?.antonym;

            return (
              <div key={r.word} className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                <span className="text-xl flex-shrink-0">{masteryOf(r.level)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm uppercase mb-1">{r.word}</p>
                  <p className="text-xs text-slate-400">
                    {r.meaning} • <span className="text-amber-200">{r.hindi}</span>
                  </p>
                  {/* 🔥 Added Antonyms and Synonyms to the Bank view with fallback */}
                  {(displaySyn || displayAnt) && (
                    <div className="flex gap-3 mt-2">
                      {displaySyn && (
                        <span className="text-[10px] flex items-center gap-1 bg-slate-800/50 px-2 py-1 rounded text-violet-300 border border-slate-700/50">
                          <Repeat size={10} className="text-violet-500" /> {displaySyn}
                        </span>
                      )}
                      {displayAnt && (
                        <span className="text-[10px] flex items-center gap-1 bg-slate-800/50 px-2 py-1 rounded text-rose-300 border border-slate-700/50">
                          <span className="text-[8px]">🆚</span> {displayAnt}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => speak(r.word)} 
                  className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
                >
                  <Volume2 size={16} className="text-slate-300" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-500">
          <span>🌱</span>
          <span>new</span>
          <span className="text-slate-600">→</span>
          <span>🌿</span>
          <span className="text-slate-600">→</span>
          <span>🌳</span>
          <span className="text-slate-600">→</span>
          <span>🌲</span>
          <span className="text-slate-600">→</span>
          <span>👑</span>
          <span>mastered</span>
        </div>
      </main>
    );
  }

  // ❓ QUIZ
  if (view === "quiz" && quizQs.length > 0) {
    const q = quizQs[qi];
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
        <div className="flex items-center justify-center gap-2 mb-6">
          <BookOpen size={16} className="text-violet-400" />
          <p className="text-xs font-semibold text-slate-400">
            Quiz — {qi + 1}/{quizQs.length}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md mx-auto">
          <p className="text-xl font-bold text-center mb-6 uppercase">
            "{q.q}" means...?
          </p>
          <div className="grid gap-2">
            {q.options.map((opt, oi) => {
              let cls = "bg-slate-800 hover:bg-slate-700 border-slate-700";
              if (picked !== -1) {
                if (oi === q.answer) cls = "bg-emerald-500/20 border-emerald-500/50";
                else if (oi === picked) cls = "bg-red-500/20 border-red-500/50";
              }
              return (
                <button 
                  key={oi} 
                  onClick={() => pick(oi)} 
                  className={`text-left p-4 rounded-xl text-sm font-medium border transition-colors ${cls}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {picked !== -1 && (
            <button 
              onClick={nextQ} 
              className="w-full mt-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold transition-colors"
            >
              {qi + 1 >= quizQs.length ? "🏁 See Result" : "Next →"}
            </button>
          )}
        </div>
      </main>
    );
  }

  // 🏁 RESULT
  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center max-w-sm w-full">
        <div className="mb-4">
          {score === quizQs.length ? (
            <Award size={48} className="mx-auto text-emerald-400" />
          ) : score >= 3 ? (
            <TrendingUp size={48} className="mx-auto text-amber-400" />
          ) : (
            <span className="text-5xl">🌱</span>
          )}
        </div>

        <p className="text-4xl font-bold text-emerald-400 mb-2">{score} / {quizQs.length}</p>
        <p className="text-sm text-slate-400 mb-6">
          {score === quizQs.length 
            ? "Vocab Hero! Come back for the next 5!" 
            : score >= 3 
            ? "Strong! Review the red ones." 
            : "Good start — try again!"}
        </p>

        <div className="grid gap-2">
          <button 
            onClick={() => pack && startPack(pack)} 
            className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold transition-colors"
          >
            ➡️ Next 5 Words
          </button>
          <button 
            onClick={() => setView("home")} 
            className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold transition-colors"
          >
            🏠 All Packs
          </button>
        </div>
      </div>
    </main>
  );
}