"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PACKS_A } from "./dataA";
import { PACKS_B } from "./dataB";
import { PACKS_C } from "./dataC";
import { PACKS_D } from "./dataD";

type SItem = { wrong: string; right: string; why: string; hindi: string };
type Pack = { id: string; emoji: string; title: string; desc: string; items: SItem[] };
type Row = { sentence: string; hindi: string; level: number; next_review: string | null };

// ✅ ALL 20 TOPICS (600 sentences total) — manual, offline, instant
const PACKS: Pack[] = [...PACKS_A, ...PACKS_B, ...PACKS_C, ...PACKS_D];

const MASTERY = ["🌱", "🌿", "🌳", "🌲", ""];
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
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black">🎯 Sentence Club</h1>
          <Link href="/speaking" className="text-sm text-slate-400">← Back</Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
          <p className="text-xs text-slate-400 mb-1">Your sentence bank</p>
          <p className="text-2xl font-black text-amber-400">{learned.length} <span className="text-sm text-slate-400 font-bold">/ 600 sentences mastered</span></p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={startReview}
            disabled={due.length === 0}
            className={`rounded-xl p-4 text-left border transition-colors ${
              due.length > 0 ? "bg-amber-600/15 border-amber-500/50 hover:border-amber-400" : "opacity-50 bg-slate-900 border-slate-800"
            }`}
          >
            <p className="text-2xl mb-1">🔄</p>
            <p className="font-bold text-sm">Review Due</p>
            <p className="text-[10px] text-slate-400">{due.length > 0 ? `${due.length} sentences waiting!` : "All fresh! ✅"}</p>
          </button>
          <button onClick={() => setView("bank")} className="bg-slate-900 border border-slate-800 hover:border-violet-500/60 rounded-xl p-4 text-left transition-colors">
            <p className="text-2xl mb-1">🏦</p>
            <p className="font-bold text-sm">My Sentences</p>
            <p className="text-[10px] text-slate-400">{rows.length} saved</p>
          </button>
        </div>
        <div className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/40 rounded-xl p-4 mb-4 grid gap-2">
          <p className="font-bold text-sm text-violet-300">✨ Any Topic — AI Pack</p>
          <div className="flex gap-2">
            <input
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="e.g. Email writing, Airport talk..."
              className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm"
            />
            <button onClick={genAI} disabled={aiLoading} className="px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-bold disabled:opacity-50">
              {aiLoading ? "..." : "Go"}
            </button>
          </div>
        </div>

        <p className="text-xs font-black text-slate-400 mb-2">🎯 20 TOPICS • 30 SENTENCES EACH • 5 AT A TIME</p>
        <div className="grid gap-3">
          {PACKS.map((p) => {
            const done = p.items.filter((it) => learned.includes(it.right)).length;
            return (
              <button key={p.id} onClick={() => startPack(p)} className="bg-slate-900 border border-slate-800 hover:border-amber-500/60 rounded-xl p-4 text-left transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{p.emoji}</span>
                  <div className="flex-1">
                    <p className="font-bold">{p.title}</p>
                    <p className="text-[10px] text-slate-400">{p.desc}</p>
                  </div>
                  <span className="text-xs font-black text-amber-400">{done}/{p.items.length}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${(done / p.items.length) * 100}%` }} />
                </div>
                <p className="text-xs font-bold text-amber-300 mt-2">{done === p.items.length ? "🔁 Practice again" : done > 0 ? `▶ Continue (${p.items.length - done} left)` : "▶ Start learning"}</p>
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
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setView("home")} className="text-sm text-slate-400">← Packs</button>
          <p className="text-xs font-bold text-slate-400">{pack.emoji} {idx + 1} / {queue.length} • {learned.filter((l) => pack.items.some((x) => x.right === l)).length}/{pack.items.length} mastered</p>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-amber-500 transition-all" style={{ width: `${(idx / queue.length) * 100}%` }} />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 grid gap-3 max-w-md mx-auto w-full">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <p className="text-[10px] text-red-400 font-bold mb-1">❌ PEOPLE USUALLY SAY</p>
            <p className="text-sm text-red-200 line-through decoration-red-400">{it.wrong}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
            <p className="text-[10px] text-emerald-400 font-bold mb-1">✅ SAY THIS INSTEAD</p>
            <p className="text-base font-bold text-emerald-100">{it.right}</p>
          </div>
          <div className="bg-slate-950 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 font-bold mb-1">💡 WHY</p>
            <p className="text-xs text-slate-300">{it.why}</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
            <p className="text-[10px] text-amber-400 font-bold mb-1">🇮 HINDI</p>
            <p className="text-sm text-amber-100">{it.hindi}</p>
          </div>

          <div className="flex gap-2">
            <button onClick={() => speak(it.right)} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold">🔊 Hear it</button>
            <button onClick={toggleSay} className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${recording ? "bg-red-600 animate-pulse" : "bg-slate-800 hover:bg-slate-700"}`}>
              {recording ? "⏹️ Stop" : "🎤 Say it"}
            </button>
          </div>
          {sayScore !== null && (
            <p className={`text-center text-sm font-black ${sayScore >= 80 ? "text-emerald-400" : sayScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
              🎤 {sayScore}% — {sayScore >= 80 ? "Amazing!" : sayScore >= 50 ? "Good — try again!" : "Listen & retry!"}
            </p>
          )}
        </div>

        <div className="flex gap-3 max-w-md mx-auto w-full mt-6">
          <button onClick={() => advance(it)} className="flex-1 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold">🔁 Again</button>
          <button onClick={() => { saveItem(it); advance(); }} className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold">✅ Got it</button>
        </div>
        <p className="text-[10px] text-slate-500 text-center mt-3">Learned all 5? Come back later for the next 5! 🚀</p>
      </main>
    );
  }

  // 🔄 REVIEW
  if (view === "review" && revQueue.length > 0) {
    const w = revQueue[revIdx];
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setView("home")} className="text-sm text-slate-400">← Home</button>
          <p className="text-xs font-bold text-amber-400">🔄 Review {revIdx + 1} / {revQueue.length}</p>
        </div>
        <button onClick={() => setFlipped(true)} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md mx-auto w-full grid gap-4 text-center min-h-[280px] content-center">
          <p className="text-xl font-black">{w.sentence}</p>
          <button onClick={(e) => { e.stopPropagation(); speak(w.sentence); }} className="justify-self-center py-2 px-4 rounded-xl bg-slate-800 text-sm font-bold">🔊</button>
          {!flipped ? (
            <p className="text-xs text-slate-500 animate-pulse">👆 Tap to see Hindi + why it matters</p>
          ) : (
            <>
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

  // 🏦 BANK
  if (view === "bank") {
    const list = rows.filter((r) => r.sentence.toLowerCase().includes(bankQ.toLowerCase()));
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black">🏦 My Sentences</h1>
          <button onClick={() => setView("home")} className="text-sm text-slate-400">← Back</button>
        </div>
        <input value={bankQ} onChange={(e) => setBankQ(e.target.value)} placeholder="🔍 Search..." className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm mb-4" />
        <div className="grid gap-2">
          {list.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No sentences yet — learn a pack first! 🎯</p>}
          {list.map((r) => (
            <div key={r.sentence} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
              <span className="text-xl">{masteryOf(r.level)}</span>
              <div className="flex-1">
                <p className="font-bold text-sm">{r.sentence}</p>
                <p className="text-[10px] text-amber-200">{r.hindi}</p>
              </div>
              <button onClick={() => speak(r.sentence)} className="px-3 py-2 rounded-lg bg-slate-800 text-sm">🔊</button>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 text-center mt-4">🌱 new → 🌿 → 🌳 → 🌲 → 👑 mastered</p>
      </main>
    );
  }

  // ❓ QUIZ — tap the CORRECT sentence
  if (view === "quiz" && quizQs.length > 0) {
    const q = quizQs[qi];
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
        <p className="text-xs font-bold text-slate-400 text-center mb-6">❓ Tap the CORRECT sentence — {qi + 1}/{quizQs.length}</p>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md mx-auto grid gap-3">
          {q.options.map((opt, oi) => {
            let cls = "bg-slate-800 hover:bg-slate-700";
            if (picked !== -1) {
              if (oi === q.answer) cls = "bg-emerald-700";
              else if (oi === picked) cls = "bg-red-700";
            }
            return (
              <button key={oi} onClick={() => pick(oi)} className={`text-left p-4 rounded-xl text-sm font-medium ${cls}`}>
                {opt}
              </button>
            );
          })}
          {picked !== -1 && (
            <button onClick={nextQ} className="w-full mt-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold">
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
        <p className="text-4xl font-black text-amber-400">{score} / {quizQs.length}</p>
        <p className="text-sm text-slate-400 mt-2 mb-6">
          {score === quizQs.length ? "Sentence Master! Come back for the next 5!" : score >= 3 ? "Strong! Watch the red ones." : "Good start — repeat the pack!"}
        </p>
        <div className="grid gap-2">
          <button onClick={() => pack && startPack(pack)} className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold">➡️ Next 5 Sentences</button>
          <button onClick={() => setView("home")} className="py-3 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold">🏠 All Packs</button>
        </div>
      </div>
    </main>
  );
}