"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PACKS_A } from "./dataA";
import { PACKS_B } from "./dataB";
import { PACKS_C } from "./dataC";
import { PACKS_D } from "./dataD";
import { Target, RotateCw, Archive, Sparkles, Volume2, Mic, Flag, Lightbulb, Flag as IndiaFlag, Search, ArrowLeft, Check, X, Award, TrendingUp } from "lucide-react";

type SItem = { wrong: string; right: string; why: string; hindi: string };
type Pack = { id: string; emoji: string; title: string; desc: string; items: SItem[] };
type Row = { sentence: string; hindi: string; level: number; next_review: string | null };

// ✅ ALL 20 TOPICS (600 sentences total) — manual, offline, instant
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

export default function SentencesPage() {
  const [view, setView] = useState<"home" | "learn" | "quiz" | "result" | "review" | "bank">("home");
  const [pack, setPack] = useState<Pack | null>(null);
  const [queue, setQueue] = useState<SItem[]>([]);
  const [session, setSession] = useState<SItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [quizQs, setQuizQs] = useState<{ options: string[]; answer: number }[]>([]);
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
  const [sayScore, setSayScore] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recSecRef = useRef(0);
  const recTimerRef = useRef<number | null>(null);

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id;
    if (!id) return;
    setUid(id);
    const { data: r } = await supabase.from("user_sentences").select("*").eq("user_id", id);
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

  const learned = rows.map((r) => r.sentence);
  const due = rows.filter((r) => r.level < 4 && r.next_review && r.next_review <= todayISO());

  // ✅ 5 AT A TIME — next 5 unlearned sentences
  const startPack = (p: Pack) => {
    const un = p.items.filter((it) => !learned.includes(it.right));
    const batch = (un.length ? un : p.items).slice(0, 5);
    setPack(p);
    setSession(batch);
    setQueue(batch);
    setIdx(0);
    setSayScore(null);
    setView("learn");
  };

  const saveItem = async (it: SItem) => {
    if (!uid) return;
    await supabase
      .from("user_sentences")
      .upsert(
        { user_id: uid, sentence: it.right, hindi: it.hindi, level: 0, next_review: addDaysISO(1) },
        { onConflict: "user_id,sentence" }
      );
    load();
  };

  const advance = (extra?: SItem) => {
    const newQueue = extra ? [...queue, extra] : queue;
    if (extra) setQueue(newQueue);
    const n = idx + 1;
    if (n >= newQueue.length) {
      buildQuiz();
      setView("quiz");
    } else {
      setIdx(n);
      setSayScore(null);
    }
  };

  const toggleSay = async () => {
    const target = queue[idx]?.right;
    if (!target) return;
    if (recording) {
      mediaRef.current?.stop();
      setRecording(false);
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      return;
    }
    window.speechSynthesis?.cancel();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recSecRef.current < 2) return;
        const mime = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 5000 || blob.size > 3500000) return;
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const res = await fetch("/api/ai", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mode: "drill", target, audio: String(reader.result).split(",")[1], mimeType: mime }),
            });
            const d = await res.json();
            if (typeof d.score === "number") setSayScore(d.score);
          } catch {}
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      recSecRef.current = 0;
      recTimerRef.current = window.setInterval(() => {
        recSecRef.current += 1;
      }, 1000);
    } catch {
      alert("🎤 Mic permission denied!");
    }
  };

  const buildQuiz = () => {
    setQuizQs(
      session.map((it) => {
        const options = shuffle([it.wrong, it.right]);
        return { options, answer: options.indexOf(it.right) };
      })
    );
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
  
  // ✨ ANY TOPIC — AI pack on demand
  const genAI = async () => {
    const t = aiTopic.trim();
    if (!t || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "sentencepack", topic: t }),
      });
      const d = await res.json();
      const items: SItem[] = (d.items || [])
        .map((a: string[]) => ({ wrong: a[0], right: a[1], why: a[2] || "", hindi: a[3] || "" }))
        .filter((it: SItem) => it.wrong && it.right);
      if (items.length >= 3) startPack({ id: "ai-" + t, emoji: "✨", title: t, desc: "AI pack", items });
      else alert("😴 Could not generate — try another topic!");
    } catch {
      alert("📡 Network issue!");
    }
    setAiLoading(false);
  };

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
    } else if (g === "easy") {
      level = Math.min(4, level + 1);
      next = level >= 4 ? null : addDaysISO(INTERVALS[level] || 1);
    }
    await supabase.from("user_sentences").update({ level, next_review: next }).eq("user_id", uid).eq("sentence", w.sentence);
    setRows((prev) => prev.map((r) => (r.sentence === w.sentence ? { ...r, level, next_review: next } : r)));
    if (revIdx + 1 >= revQueue.length) setView("home");
    else {
      setRevIdx(revIdx + 1);
      setFlipped(false);
    }
  };

  // 🏠 HOME
  if (view === "home") {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Target size={20} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Sentence Club</h1>
              <p className="text-xs text-slate-400">Master 600 real sentences</p>
            </div>
          </div>
          <Link href="/speaking" className="text-sm text-slate-400 hover:text-slate-300">
            <ArrowLeft size={16} />
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-5">
          <p className="text-xs text-slate-400 mb-2">Your sentence bank</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-400">{learned.length}</span>
            <span className="text-sm text-slate-400 font-semibold">/ 600 sentences mastered</span>
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
            <p className="text-xs text-slate-400">{due.length > 0 ? `${due.length} sentences waiting!` : "All fresh! ✅"}</p>
          </button>
          <button onClick={() => setView("bank")} className="bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-2xl p-4 text-left transition-colors">
            <Archive size={24} className="text-violet-400 mb-2" />
            <p className="font-semibold text-sm mb-1">My Sentences</p>
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
              placeholder="e.g. Email writing, Airport talk..."
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
          <Target size={16} className="text-amber-400" />
          <p className="text-xs font-semibold text-slate-400">20 TOPICS • 30 SENTENCES EACH • 5 AT A TIME</p>
        </div>

        <div className="grid gap-3">
          {PACKS.map((p) => {
            const done = p.items.filter((it) => learned.includes(it.right)).length;
            const progress = (done / p.items.length) * 100;
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
                    <span className="text-sm font-semibold text-amber-400">{done}/{p.items.length}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-amber-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs font-medium text-amber-300">
                  {done === p.items.length ? "🔁 Practice again" : done > 0 ? `▶ Continue (${p.items.length - done} left)` : "▶ Start learning"}
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
    const it = queue[idx];
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
              {learned.filter((l) => pack.items.some((x) => x.right === l)).length}/{pack.items.length} mastered
            </p>
          </div>
        </div>

        <div className="h-1.5 bg-slate-800 rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-amber-500 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md mx-auto w-full">
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <X size={14} className="text-red-400" />
              <p className="text-xs font-semibold text-red-400">PEOPLE USUALLY SAY</p>
            </div>
            <p className="text-sm text-red-200 line-through decoration-red-400">{it.wrong}</p>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Check size={14} className="text-emerald-400" />
              <p className="text-xs font-semibold text-emerald-400">SAY THIS INSTEAD</p>
            </div>
            <p className="text-base font-semibold text-emerald-100">{it.right}</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={14} className="text-amber-400" />
              <p className="text-xs font-semibold text-slate-400">WHY</p>
            </div>
            <p className="text-sm text-slate-300">{it.why}</p>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Flag size={14} className="text-amber-400" />
              <p className="text-xs font-semibold text-amber-400">HINDI</p>
            </div>
            <p className="text-sm text-amber-100">{it.hindi}</p>
          </div>

          <div className="flex gap-2 mb-4">
            <button 
              onClick={() => speak(it.right)} 
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors"
            >
              <Volume2 size={16} />
              Hear it
            </button>
            <button 
              onClick={toggleSay} 
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors ${
                recording 
                  ? "bg-red-600 animate-pulse" 
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              <Mic size={16} />
              {recording ? "Stop" : "Say it"}
            </button>
          </div>

          {sayScore !== null && (
            <div className={`text-center py-3 rounded-xl font-semibold ${
              sayScore >= 80 
                ? "bg-emerald-500/10 text-emerald-400" 
                : sayScore >= 50 
                ? "bg-amber-500/10 text-amber-400" 
                : "bg-red-500/10 text-red-400"
            }`}>
              <Mic size={14} className="inline mr-2" />
              {sayScore}% — {sayScore >= 80 ? "Amazing!" : sayScore >= 50 ? "Good — try again!" : "Listen & retry!"}
            </div>
          )}
        </div>

        <div className="flex gap-3 max-w-md mx-auto w-full mt-6">
          <button 
            onClick={() => advance(it)} 
            className="flex-1 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold transition-colors"
          >
            🔁 Again
          </button>
          <button 
            onClick={() => { saveItem(it); advance(); }} 
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
    const w = revQueue[revIdx];
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
          className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md mx-auto w-full grid gap-4 text-center min-h-[280px] content-center hover:border-slate-600 transition-colors"
        >
          <p className="text-xl font-semibold">{w.sentence}</p>
          <button 
            onClick={(e) => { e.stopPropagation(); speak(w.sentence); }} 
            className="justify-self-center flex items-center gap-2 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors"
          >
            <Volume2 size={16} />
            Listen
          </button>
          {!flipped ? (
            <p className="text-xs text-slate-500 animate-pulse">👆 Tap to see Hindi + why it matters</p>
          ) : (
            <>
              <p className="text-sm text-amber-200">{w.hindi}</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">{masteryOf(w.level)}</span>
                <p className="text-xs text-slate-500">level {w.level}</p>
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
    const list = rows.filter((r) => r.sentence.toLowerCase().includes(bankQ.toLowerCase()));
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Archive size={20} className="text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">My Sentences</h1>
              <p className="text-xs text-slate-400">{rows.length} saved</p>
            </div>
          </div>
          <button onClick={() => setView("home")} className="text-sm text-slate-400 hover:text-slate-300">
            <ArrowLeft size={16} />
          </button>
        </div>

        <div className="relative mb-5">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            value={bankQ} 
            onChange={(e) => setBankQ(e.target.value)} 
            placeholder="Search sentences..." 
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm focus:border-slate-600 focus:outline-none" 
          />
        </div>

        <div className="grid gap-2">
          {list.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-12">
              No sentences yet — learn a pack first! 🎯
            </p>
          )}
          {list.map((r) => (
            <div key={r.sentence} className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <span className="text-xl flex-shrink-0">{masteryOf(r.level)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm mb-1">{r.sentence}</p>
                <p className="text-xs text-amber-200">{r.hindi}</p>
              </div>
              <button 
                onClick={() => speak(r.sentence)} 
                className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <Volume2 size={16} className="text-slate-300" />
              </button>
            </div>
          ))}
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

  // ❓ QUIZ — tap the CORRECT sentence
  if (view === "quiz" && quizQs.length > 0) {
    const q = quizQs[qi];
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
        <div className="flex items-center justify-center gap-2 mb-6">
          <TrendingUp size={16} className="text-violet-400" />
          <p className="text-xs font-semibold text-slate-400">
            Tap the CORRECT sentence — {qi + 1}/{quizQs.length}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md mx-auto">
          <div className="grid gap-3">
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
            <Award size={48} className="mx-auto text-amber-400" />
          ) : score >= 3 ? (
            <TrendingUp size={48} className="mx-auto text-emerald-400" />
          ) : (
            <span className="text-5xl">🌱</span>
          )}
        </div>

        <p className="text-4xl font-bold text-amber-400 mb-2">{score} / {quizQs.length}</p>
        <p className="text-sm text-slate-400 mb-6">
          {score === quizQs.length 
            ? "Sentence Master! Come back for the next 5!" 
            : score >= 3 
            ? "Strong! Watch the red ones." 
            : "Good start — repeat the pack!"}
        </p>

        <div className="grid gap-2">
          <button 
            onClick={() => pack && startPack(pack)} 
            className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold transition-colors"
          >
            ➡️ Next 5 Sentences
          </button>
          <button 
            onClick={() => setView("home")} 
            className="py-3 rounded-xl bg-amber-600 hover:bg-amber-500 font-semibold transition-colors"
          >
            🏠 All Packs
          </button>
        </div>
      </div>
    </main>
  );
}