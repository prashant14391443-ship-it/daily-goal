"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Zap, Trophy, Target, ArrowLeft, Sparkles, Flame, Lightbulb, ChevronRight, RotateCcw, FileText, Timer, ClipboardList } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { EXAMS, DIFFICULTIES, type TopicTree } from "@/lib/subjectTree";
import BackText from "@/app/components/BackBtn";

type Question = { id?: string; question: string; options: string[]; correct: number; explanation?: string; cached?: boolean };
type Explanation = { verdict: "correct" | "wrong"; one_line: string; steps: string[]; wrong_explanations?: string[]; memory_trick?: string; similar?: string };

const YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016];
const TARGETS = [10, 25, 50];

function fmtTime(s: number) { const m = Math.floor(s / 60); const ss = s % 60; return `${m}m ${ss.toString().padStart(2, "0")}s`; }

export default function PYQPage() {
  const [tab, setTab] = useState<"topic" | "paper">("topic");
  const [exam, setExam] = useState<TopicTree>(EXAMS[0]);
  const [uid, setUid] = useState("guest");
  const seenRef = useRef<string[]>([]);

  // topic mode
  const [subject, setSubject] = useState(EXAMS[0].subjects[0].name);
  const [topic, setTopic] = useState(EXAMS[0].subjects[0].topics[0]);
  const [difficulty, setDifficulty] = useState("medium");
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);

  // paper mode
  const [year, setYear] = useState(2025);
  const [target, setTarget] = useState(25);
  const [pStarted, setPStarted] = useState(false);
  const [paperQs, setPaperQs] = useState<Question[]>([]);
  const [pIdx, setPIdx] = useState(0);
  const [pLoading, setPLoading] = useState(false);
  const [pDone, setPDone] = useState(false);
  const [pResult, setPResult] = useState({ correct: 0, answered: 0 });
  const [sec, setSec] = useState(0);
  const moreRef = useRef(false);

  // shared answer/explanation
  const [userAnswer, setUserAnswer] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [explaining, setExplaining] = useState(false);

  const [stats, setStats] = useState({ total: 0, correct: 0, streak: 0 });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id || "guest";
      setUid(id);
      if (id !== "guest") {
        const { data: s } = await supabase.from("pyq_stats").select("*").eq("user_id", id).maybeSingle();
        if (s) setStats({ total: s.total_attempted || 0, correct: s.total_correct || 0, streak: s.streak_days || 0 });
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!pStarted || pDone) return;
    const id = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [pStarted, pDone]);

  useEffect(() => {
    setSubject(exam.subjects[0].name);
    setTopic(exam.subjects[0].topics[0]);
    setQuestion(null); setUserAnswer(null); setExplanation(null);
    setPStarted(false); setPaperQs([]); setPIdx(0); setPDone(false); setPResult({ correct: 0, answered: 0 }); setSec(0);
  }, [exam]);

  useEffect(() => {
    const s = exam.subjects.find((x) => x.name === subject);
    if (s && s.topics.length > 0) setTopic(s.topics[0]);
    setQuestion(null); setUserAnswer(null); setExplanation(null);
  }, [subject]);

  const cur = tab === "topic" ? question : paperQs[pIdx] || null;
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  const diff = DIFFICULTIES.find((d) => d.id === difficulty) || DIFFICULTIES[1];

  /* ── TOPIC MODE ── */
  const generateTopic = async () => {
    setLoading(true); setUserAnswer(null); setExplanation(null);
    try {
      const res = await fetch("/api/pyq/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exam: exam.id, subject, topic, difficulty, excludeIds: seenRef.current }) });
      if (!res.ok) throw new Error("failed");
      const q = await res.json();
      if (q.id) seenRef.current.push(q.id);
      setQuestion(q);
    } catch { alert("❌ Could not generate. Try again."); }
    setLoading(false);
  };

  /* ── PAPER MODE ── */
  const loadPaperBatch = async (): Promise<Question[]> => {
    if (moreRef.current) return [];
    moreRef.current = true; setPLoading(true);
    let added: Question[] = [];
    try {
      const res = await fetch("/api/pyq/paper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exam: exam.id, year, batch: 5, excludeIds: seenRef.current }) });
      const d = await res.json();
      added = d.questions || [];
      added.forEach((q: Question) => { if (q.id) seenRef.current.push(q.id); });
      if (added.length) setPaperQs((prev) => [...prev, ...added]);
    } catch {}
    setPLoading(false); moreRef.current = false;
    return added;
  };

  const startPaper = async () => {
    seenRef.current = [];
    setPaperQs([]); setPIdx(0); setPResult({ correct: 0, answered: 0 }); setPDone(false); setSec(0);
    setUserAnswer(null); setExplanation(null);
    setPStarted(true);
    await loadPaperBatch();
  };

  const next = async () => {
    setUserAnswer(null); setExplanation(null);
    if (tab === "topic") { await generateTopic(); return; }
    if (pIdx + 1 < paperQs.length) {
      setPIdx(pIdx + 1);
      if (pIdx + 3 >= paperQs.length && paperQs.length < target) loadPaperBatch();
      return;
    }
    if (paperQs.length < target) {
      const added = await loadPaperBatch();
      if (added.length > 0) { setPIdx(pIdx + 1); return; }
    }
    setPDone(true);
  };

  /* ── ANSWER + EXPLANATION (both modes) ── */
  const answer = async (idx: number) => {
    if (userAnswer !== null || !cur) return;
    setUserAnswer(idx);
    const isCorrect = idx === cur.correct;
    if (tab === "paper") setPResult((r) => ({ correct: r.correct + (isCorrect ? 1 : 0), answered: r.answered + 1 }));
    setStats((s) => ({ total: s.total + 1, correct: s.correct + (isCorrect ? 1 : 0), streak: isCorrect ? s.streak + 1 : 0 }));
    if (uid !== "guest" && cur.id) {
      supabase.from("pyq_attempts").insert({ user_id: uid, question_id: cur.id, user_answer: idx, is_correct: isCorrect });
      supabase.from("pyq_stats").upsert({ user_id: uid, total_attempted: stats.total + 1, total_correct: stats.correct + (isCorrect ? 1 : 0), last_active: new Date().toISOString().slice(0, 10) });
    }
    setExplaining(true);
    try {
      const res = await fetch("/api/pyq/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: cur.question, options: cur.options, correct: cur.correct, userAnswer: idx, exam: exam.name, subject, topic }) });
      if (res.ok) setExplanation(await res.json());
    } catch {}
    setExplaining(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-4 pb-24 max-w-4xl mx-auto">
      {/* HERO */}
      <div className={`relative mb-4 overflow-hidden rounded-3xl bg-gradient-to-br ${exam.color} p-5 shadow-xl`}>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center"><BookOpen size={22} className="text-white" /></span>
            <Link href="/study" className="flex items-center gap-1 text-xs text-white/80 hover:text-white font-bold"><ArrowLeft size={12} /> Study</Link>
          </div>
          <h1 className="text-lg font-black text-white leading-tight">PYQ Practice</h1>
          <p className="text-[11px] text-white/80 font-semibold mt-0.5">Exam-pattern questions + smart explanations</p>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center"><p className="text-[9px] font-bold text-white/70">ATTEMPTED</p><p className="text-sm font-black text-white">{stats.total}</p></div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center"><p className="text-[9px] font-bold text-white/70">ACCURACY</p><p className="text-sm font-black text-white">{accuracy}%</p></div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center"><p className="text-[9px] font-bold text-white/70">STREAK</p><p className="text-sm font-black text-white flex items-center justify-center gap-1"><Flame size={11} /> {stats.streak}</p></div>
          </div>
        </div>
      </div>

      {/* EXAM PICKER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Exam</p>
        <div className="grid grid-cols-2 gap-2">
          {EXAMS.map((e) => (
            <button key={e.id} onClick={() => setExam(e)} className={`press p-3 rounded-xl border text-left transition-all ${exam.id === e.id ? `bg-gradient-to-br ${e.color} border-white/20 shadow-lg` : "bg-slate-800/60 border-slate-700 hover:border-slate-600"}`}>
              <p className="text-sm font-black text-white leading-tight">{e.name}</p>
              <p className="text-[9px] font-bold text-white/70 mt-0.5 uppercase">{e.category === "competitive" ? "🎯 Competitive" : "🎓 University"}</p>
            </button>
          ))}
        </div>
      </div>

      {/* MODE TABS */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button onClick={() => { setTab("topic"); setUserAnswer(null); setExplanation(null); }} className={`press py-3 rounded-xl text-sm font-black border flex items-center justify-center gap-2 ${tab === "topic" ? "bg-violet-500/20 border-violet-500/50 text-violet-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}>
          <Target size={15} /> Topic Practice
        </button>
        <button onClick={() => { setTab("paper"); setUserAnswer(null); setExplanation(null); }} className={`press py-3 rounded-xl text-sm font-black border flex items-center justify-center gap-2 ${tab === "paper" ? "bg-amber-500/20 border-amber-500/50 text-amber-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}>
          <FileText size={15} /> Year Paper
        </button>
      </div>

      {/* ── TOPIC MODE SETUP ── */}
      {tab === "topic" && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Subject</p>
            <div className="flex flex-wrap gap-2">
              {exam.subjects.map((s) => (
                <button key={s.name} onClick={() => setSubject(s.name)} className={`press px-3 py-1.5 rounded-lg text-xs font-black border ${subject === s.name ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>{s.name}</button>
              ))}
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mt-4 mb-2">Topic</p>
            <div className="flex flex-wrap gap-2">
              {(exam.subjects.find((s) => s.name === subject)?.topics || []).map((t) => (
                <button key={t} onClick={() => setTopic(t)} className={`press px-3 py-1.5 rounded-lg text-xs font-black border ${topic === t ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>{t}</button>
              ))}
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mt-4 mb-2">Difficulty</p>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map((d) => (
                <button key={d.id} onClick={() => setDifficulty(d.id)} className={`press py-2 rounded-xl text-xs font-black border ${difficulty === d.id ? d.color : "bg-slate-800 border-slate-700 text-slate-500"}`}>{d.label}</button>
              ))}
            </div>
            <button onClick={generateTopic} disabled={loading} className="press w-full mt-4 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 font-black text-base shadow-xl flex items-center justify-center gap-2 disabled:opacity-50">
              <Sparkles size={18} /> {loading ? "Generating..." : question ? "Next New Question" : "Generate Question"}
            </button>
          </div>
        </>
      )}

      {/* ── PAPER MODE SETUP ── */}
      {tab === "paper" && !pStarted && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Paper Year</p>
          <div className="grid grid-cols-5 gap-2">
            {YEARS.map((y) => (
              <button key={y} onClick={() => setYear(y)} className={`press py-2 rounded-xl text-xs font-black border ${year === y ? "bg-amber-500/20 border-amber-500/50 text-amber-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>{y}</button>
            ))}
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mt-4 mb-2">Paper Length</p>
          <div className="grid grid-cols-3 gap-2">
            {TARGETS.map((t) => (
              <button key={t} onClick={() => setTarget(t)} className={`press py-2 rounded-xl text-xs font-black border ${target === t ? "bg-amber-500/20 border-amber-500/50 text-amber-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>{t} Qs</button>
            ))}
          </div>
          <button onClick={startPaper} className="press w-full mt-4 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 font-black text-base shadow-xl flex items-center justify-center gap-2">
            <FileText size={18} /> Start {year} Paper ({target} Qs)
          </button>
          <p className="text-[10px] text-slate-500 mt-3 text-center font-semibold">Full-syllabus paper in exact exam pattern • loads in fast batches</p>
        </div>
      )}

      {/* ── PAPER PROGRESS BAR ── */}
      {tab === "paper" && pStarted && !pDone && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-amber-300 flex items-center gap-1.5"><FileText size={13} /> {exam.name} • {year}</p>
            <p className="text-xs font-black text-slate-400 flex items-center gap-1.5"><Timer size={13} /> {fmtTime(sec)}</p>
          </div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-black text-slate-500">Q {Math.min(pIdx + 1, paperQs.length)}/{target}</p>
            <p className="text-[10px] font-black text-emerald-400">✓ {pResult.correct} correct</p>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all" style={{ width: `${Math.min((pIdx / target) * 100, 100)}%` }} />
          </div>
        </div>
      )}

      {/* ── LOADING ── */}
      {(loading || (pLoading && !cur)) && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center mb-4">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-violet-500/20 flex items-center justify-center"><Sparkles size={24} className="text-violet-400 animate-pulse" /></div>
          <p className="text-sm font-black text-white">Loading questions...</p>
        </div>
      )}

      {/* ── QUESTION CARD (both modes) ── */}
      {cur && !pDone && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`px-2 py-1 rounded-md text-[9px] font-black border ${diff.color}`}>{tab === "paper" ? "PAPER" : diff.label.toUpperCase()}</span>
            {tab === "paper" && <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md">{year}</span>}
            {cur.cached && <span className="ml-auto text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">⚡ INSTANT</span>}
          </div>
          <p className="text-base font-bold leading-relaxed mb-5">{cur.question}</p>
          <div className="grid gap-2 mb-4">
            {cur.options.map((opt, idx) => {
              const picked = userAnswer === idx;
              const correctOpt = idx === cur.correct;
              const show = userAnswer !== null;
              let bg = "bg-slate-800 border-slate-700 hover:border-violet-500";
              if (show) bg = correctOpt ? "bg-emerald-500/15 border-emerald-500" : picked ? "bg-red-500/15 border-red-500" : "bg-slate-800 border-slate-700 opacity-50";
              return (
                <button key={idx} onClick={() => answer(idx)} disabled={show} className={`press p-3 rounded-xl border text-left text-sm flex items-start gap-3 ${bg}`}>
                  <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${show && correctOpt ? "bg-emerald-500 text-white" : show && picked ? "bg-red-500 text-white" : "bg-slate-700 text-slate-300"}`}>{String.fromCharCode(65 + idx)}</span>
                  <span className="flex-1 min-w-0 leading-relaxed">{opt}</span>
                </button>
              );
            })}
          </div>

          {explaining && <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-3 flex items-center gap-2"><Sparkles size={14} className="text-violet-400 animate-pulse" /><p className="text-xs font-bold text-violet-300">Generating explanation...</p></div>}

          {explanation && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mt-3">
              <p className={`text-lg font-black mb-1 ${explanation.verdict === "correct" ? "text-emerald-400" : "text-amber-400"}`}>{explanation.verdict === "correct" ? "Correct! 🎉" : "Not quite"}</p>
              <p className="text-xs text-slate-300 mb-3">{explanation.one_line}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Step-by-step</p>
              <div className="grid gap-2 mb-3">
                {explanation.steps.map((s, i) => (
                  <div key={i} className="flex gap-2 items-start"><span className="shrink-0 w-5 h-5 rounded-md bg-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-black">{i + 1}</span><p className="text-sm text-slate-200 flex-1 leading-relaxed">{s}</p></div>
                ))}
              </div>
              {explanation.wrong_explanations && explanation.wrong_explanations.length > 0 && (
                <div className="mb-3"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Why others are wrong</p>{explanation.wrong_explanations.map((w, i) => <p key={i} className="text-xs text-slate-400 pl-3 border-l-2 border-slate-700 mb-1">• {w}</p>)}</div>
              )}
              {explanation.memory_trick && <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 mb-3"><p className="text-[10px] font-black text-cyan-400 uppercase mb-1 flex items-center gap-1"><Lightbulb size={11} /> Memory Trick</p><p className="text-sm text-cyan-100 italic">{explanation.memory_trick}</p></div>}
              <button onClick={next} className="press w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 font-black flex items-center justify-center gap-2">
                <ChevronRight size={16} /> {tab === "paper" ? (pIdx + 1 >= target ? "Finish Paper" : "Next Question") : "Next Question"}
              </button>
            </div>
          )}

          {userAnswer !== null && !explanation && !explaining && (
            <button onClick={next} className="press w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 font-black flex items-center justify-center gap-2"><ChevronRight size={16} /> Next</button>
          )}
        </div>
      )}

      {/* ── PAPER RESULT ── */}
      {tab === "paper" && pDone && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 text-center mb-4">
          <Trophy size={40} className="text-amber-400 mx-auto mb-3" />
          <p className="text-xl font-black text-white mb-1">Paper Complete!</p>
          <p className="text-sm text-slate-400 mb-4">{exam.name} • {year} • {fmtTime(sec)}</p>
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-2xl font-black text-emerald-400">{pResult.correct}</p><p className="text-[10px] text-slate-500 font-bold">CORRECT</p></div>
            <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-2xl font-black text-red-400">{pResult.answered - pResult.correct}</p><p className="text-[10px] text-slate-500 font-bold">WRONG</p></div>
            <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-2xl font-black text-white">{pResult.answered > 0 ? Math.round((pResult.correct / pResult.answered) * 100) : 0}%</p><p className="text-[10px] text-slate-500 font-bold">SCORE</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={startPaper} className="press py-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-black flex items-center justify-center gap-2"><RotateCcw size={15} /> New Paper</button>
            <button onClick={() => { setPStarted(false); setPDone(false); }} className="press py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-black flex items-center justify-center gap-2"><ClipboardList size={15} /> Change Setup</button>
          </div>
        </div>
      )}

      {/* exit paper button */}
      {tab === "paper" && pStarted && !pDone && (
        <button onClick={() => { setPStarted(false); setPDone(false); setPaperQs([]); setPIdx(0); }} className="press w-full py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-black text-slate-300 flex items-center justify-center gap-2 mb-4">
          <RotateCcw size={14} /> Exit Paper
        </button>
      )}

      <BackText />
    </main>
  );
}