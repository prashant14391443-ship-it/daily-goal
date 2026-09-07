"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Zap, Trophy, Target, ArrowLeft, Play, Sparkles, Brain, Flame, Clock, Award, Lightbulb, ChevronRight, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { EXAMS, DIFFICULTIES, type TopicTree } from "@/lib/subjectTree";
import BackText from "@/app/components/BackBtn";

type Question = {
  id?: string;
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
  exam: string;
  subject: string;
  topic: string;
  difficulty: string;
  cached?: boolean;
};

type Explanation = {
  verdict: "correct" | "wrong";
  one_line: string;
  steps: string[];
  wrong_explanations?: string[];
  memory_trick?: string;
  similar?: string;
};

export default function PYQPage() {
  const [exam, setExam] = useState<TopicTree>(EXAMS[0]);
  const [subject, setSubject] = useState(exam.subjects[0].name);
  const [topic, setTopic] = useState(exam.subjects[0].topics[0]);
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [stats, setStats] = useState({ total: 0, correct: 0, streak: 0 });
  const [uid, setUid] = useState("guest");
  const [startTime, setStartTime] = useState(0);

  // Load user + stats
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

  // Reset subject/topic when exam changes
  useEffect(() => {
    setSubject(exam.subjects[0].name);
    setTopic(exam.subjects[0].topics[0]);
    setQuestion(null);
    setExplanation(null);
    setUserAnswer(null);
  }, [exam]);

  // Reset topic when subject changes
  useEffect(() => {
    const s = exam.subjects.find((x) => x.name === subject);
    if (s && s.topics.length > 0) setTopic(s.topics[0]);
    setQuestion(null);
    setExplanation(null);
    setUserAnswer(null);
  }, [subject]);

  const currentSubject = exam.subjects.find((s) => s.name === subject);
  const topics = currentSubject?.topics || [];
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  const generateQuestion = async () => {
    setLoading(true);
    setQuestion(null);
    setExplanation(null);
    setUserAnswer(null);
    try {
      const res = await fetch("/api/pyq/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam: exam.id, subject, topic, difficulty }),
      });
      if (!res.ok) throw new Error("Failed");
      const q = await res.json();
      setQuestion(q);
      setStartTime(Date.now());
    } catch {
      alert("❌ Could not generate question. Try again.");
    }
    setLoading(false);
  };

  const submitAnswer = async (idx: number) => {
    if (userAnswer !== null || !question) return;
    setUserAnswer(idx);
    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    const isCorrect = idx === question.correct;

    // Update local stats
    setStats((s) => ({
      total: s.total + 1,
      correct: s.correct + (isCorrect ? 1 : 0),
      streak: isCorrect ? s.streak + 1 : 0,
    }));

    // Save attempt & update stats in DB
    if (uid !== "guest" && question.id) {
      supabase.from("pyq_attempts").insert({
        user_id: uid,
        question_id: question.id,
        user_answer: idx,
        is_correct: isCorrect,
        time_taken_sec: timeTaken,
      });
      supabase.from("pyq_stats").upsert({
        user_id: uid,
        total_attempted: stats.total + 1,
        total_correct: stats.correct + (isCorrect ? 1 : 0),
        last_active: new Date().toISOString().slice(0, 10),
      });
    }

    // Get AI explanation
    setExplaining(true);
    try {
      const res = await fetch("/api/pyq/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.question,
          options: question.options,
          correct: question.correct,
          userAnswer: idx,
          exam: exam.name,
          subject,
          topic,
        }),
      });
      if (res.ok) {
        const exp = await res.json();
        setExplanation(exp);
      }
    } catch {}
    setExplaining(false);
  };

  const diff = DIFFICULTIES.find((d) => d.id === difficulty) || DIFFICULTIES[1];

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-4 pb-24 max-w-4xl mx-auto">
      {/* 🌆 HERO */}
      <div className={`relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br ${exam.color} p-5 shadow-xl`}>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center">
              <BookOpen size={22} className="text-white" />
            </span>
            <Link href="/dashboard" className="flex items-center gap-1 text-xs text-white/80 hover:text-white font-bold">
              <ArrowLeft size={12} /> Home
            </Link>
          </div>
          <h1 className="text-lg font-black text-white leading-tight">PYQ Practice</h1>
          <p className="text-[11px] text-white/80 font-semibold mt-0.5">AI-generated exam questions + smart explanations</p>

          {/* STATS BAR */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
              <p className="text-[9px] font-bold text-white/70">ATTEMPTED</p>
              <p className="text-sm font-black text-white">{stats.total}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
              <p className="text-[9px] font-bold text-white/70">ACCURACY</p>
              <p className="text-sm font-black text-white">{accuracy}%</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
              <p className="text-[9px] font-bold text-white/70">STREAK</p>
              <p className="text-sm font-black text-white flex items-center justify-center gap-1">
                <Flame size={11} /> {stats.streak}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SETUP PANEL (shown when no question) ── */}
      {!question && !loading && (
        <>
          {/* EXAM SELECTOR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Target size={15} className="text-violet-400" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">1. Pick Exam</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {EXAMS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setExam(e)}
                  className={`press p-3 rounded-xl border text-left transition-all ${
                    exam.id === e.id
                      ? `bg-gradient-to-br ${e.color} border-white/20 shadow-lg`
                      : "bg-slate-800/60 border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <p className="text-sm font-black text-white leading-tight">{e.name}</p>
                  <p className="text-[9px] font-bold text-white/70 mt-0.5 uppercase">
                    {e.category === "competitive" ? "🎯 Competitive" : "🎓 University"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* SUBJECT SELECTOR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={15} className="text-blue-400" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">2. Pick Subject</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {exam.subjects.map((s) => (
                <button
                  key={s.name}
                  onClick={() => setSubject(s.name)}
                  className={`press px-3 py-1.5 rounded-lg text-xs font-black border transition-all ${
                    subject === s.name
                      ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* TOPIC SELECTOR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={15} className="text-emerald-400" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">3. Pick Topic</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  className={`press px-3 py-1.5 rounded-lg text-xs font-black border transition-all ${
                    topic === t
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* DIFFICULTY */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={15} className="text-amber-400" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">4. Difficulty</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`press py-2 rounded-xl text-xs font-black border transition-all ${
                    difficulty === d.id ? d.color : "bg-slate-800 border-slate-700 text-slate-500"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* GENERATE BUTTON */}
          <button
            onClick={generateQuestion}
            className="press w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 font-black text-base shadow-xl shadow-violet-900/30 flex items-center justify-center gap-2"
          >
            <Sparkles size={18} /> Generate Question
          </button>
        </>
      )}

      {/* ── LOADING STATE ── */}
      {loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-500/20 flex items-center justify-center">
            <Sparkles size={28} className="text-violet-400 animate-pulse" />
          </div>
          <p className="text-sm font-black text-white mb-1">Generating your question...</p>
          <p className="text-xs text-slate-400">{exam.name} • {subject} • {topic}</p>
        </div>
      )}

      {/* ── QUESTION PANEL ── */}
      {question && !loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
          {/* Question header */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`px-2 py-1 rounded-md text-[9px] font-black border ${diff.color}`}>
              {diff.label.toUpperCase()}
            </span>
            <span className="text-[9px] font-bold text-slate-500">{exam.name}</span>
            <span className="text-[9px] font-bold text-slate-500">•</span>
            <span className="text-[9px] font-bold text-slate-500">{subject}</span>
            <span className="text-[9px] font-bold text-slate-500">•</span>
            <span className="text-[9px] font-bold text-slate-500">{topic}</span>
            {question.cached && (
              <span className="ml-auto text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                ⚡ INSTANT
              </span>
            )}
          </div>

          {/* Question text */}
          <p className="text-base font-bold leading-relaxed mb-5">{question.question}</p>

          {/* Options */}
          <div className="grid gap-2 mb-4">
            {question.options.map((opt, idx) => {
              const isPicked = userAnswer === idx;
              const isCorrectOpt = idx === question.correct;
              const showResult = userAnswer !== null;
              let bgClass = "bg-slate-800 border-slate-700 hover:border-violet-500";
              if (showResult) {
                if (isCorrectOpt) bgClass = "bg-emerald-500/15 border-emerald-500";
                else if (isPicked) bgClass = "bg-red-500/15 border-red-500";
                else bgClass = "bg-slate-800 border-slate-700 opacity-50";
              }
              return (
                <button
                  key={idx}
                  onClick={() => submitAnswer(idx)}
                  disabled={userAnswer !== null}
                  className={`press p-3 rounded-xl border text-left text-sm transition-all flex items-start gap-3 ${bgClass}`}
                >
                  <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                    showResult && isCorrectOpt ? "bg-emerald-500 text-white" :
                    showResult && isPicked ? "bg-red-500 text-white" :
                    "bg-slate-700 text-slate-300"
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1 min-w-0 leading-relaxed">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation loading */}
          {explaining && (
            <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-3 flex items-center gap-2">
              <Sparkles size={14} className="text-violet-400 animate-pulse" />
              <p className="text-xs font-bold text-violet-300">Generating smart explanation...</p>
            </div>
          )}

          {/* Explanation */}
          {explanation && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mt-3">
              {/* Verdict */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  explanation.verdict === "correct" ? "bg-emerald-500/20" : "bg-red-500/20"
                }`}>
                  {explanation.verdict === "correct" ? (
                    <Trophy size={20} className="text-emerald-400" />
                  ) : (
                    <Lightbulb size={20} className="text-amber-400" />
                  )}
                </div>
                <div>
                  <p className={`text-lg font-black ${
                    explanation.verdict === "correct" ? "text-emerald-400" : "text-amber-400"
                  }`}>
                    {explanation.verdict === "correct" ? "Correct! 🎉" : "Not quite"}
                  </p>
                  <p className="text-xs text-slate-300">{explanation.one_line}</p>
                </div>
              </div>

              {/* Steps */}
              <div className="mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Step-by-step solution</p>
                <div className="grid gap-2">
                  {explanation.steps.map((step, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="shrink-0 w-5 h-5 rounded-md bg-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-black">
                        {i + 1}
                      </span>
                      <p className="text-sm text-slate-200 leading-relaxed flex-1">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wrong explanations */}
              {explanation.wrong_explanations && explanation.wrong_explanations.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Why others are wrong</p>
                  <div className="grid gap-1">
                    {explanation.wrong_explanations.map((w, i) => (
                      <p key={i} className="text-xs text-slate-400 pl-3 border-l-2 border-slate-700">• {w}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Memory trick */}
              {explanation.memory_trick && (
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 mb-3">
                  <p className="text-[10px] font-black text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Lightbulb size={11} /> Memory Trick
                  </p>
                  <p className="text-sm text-cyan-100 italic font-medium">{explanation.memory_trick}</p>
                </div>
              )}

              {/* Similar question */}
              {explanation.similar && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-3">
                  <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Target size={11} /> Try This Similar Question
                  </p>
                  <p className="text-sm text-amber-100 font-medium">{explanation.similar}</p>
                </div>
              )}

              {/* Next button */}
              <button
                onClick={generateQuestion}
                className="press w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 font-black flex items-center justify-center gap-2 mt-2"
              >
                <ChevronRight size={16} /> Next Question
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── CHANGE TOPIC BUTTON (when in question view) ── */}
      {question && !loading && (
        <button
          onClick={() => { setQuestion(null); setExplanation(null); setUserAnswer(null); }}
          className="press w-full py-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-sm font-black text-slate-300 flex items-center justify-center gap-2 mb-4"
        >
          <RotateCcw size={14} /> Change Topic / Exam
        </button>
      )}

      {/* ── EMPTY STATE ── */}
      {!question && !loading && stats.total === 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-center mt-5">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-violet-500/10 flex items-center justify-center">
            <Sparkles size={28} className="text-violet-400" />
          </div>
          <p className="text-sm font-black text-white mb-1">Ready to practice?</p>
          <p className="text-xs text-slate-400">Pick an exam, subject & topic above to start</p>
        </div>
      )}

      {/* ── INFO CARD ── */}
      {!question && !loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mt-5">
          <div className="flex items-center gap-2 mb-3">
            <Award size={15} className="text-amber-400" />
            <p className="text-xs font-black text-amber-400 uppercase tracking-wider">How it works</p>
          </div>
          <div className="grid gap-2 text-xs text-slate-400">
            <p>🎯 <span className="text-slate-200 font-semibold">AI generates questions</span> in exact exam pattern</p>
            <p>🧠 <span className="text-slate-200 font-semibold">Smart explanations</span> with step-by-step solutions</p>
            <p>💡 <span className="text-slate-200 font-semibold">Memory tricks</span> to remember every concept</p>
            <p>⚡ <span className="text-slate-200 font-semibold">Cached questions</span> load instantly (no wait!)</p>
            <p>🔥 <span className="text-slate-200 font-semibold">Track streak</span> & build daily practice habit</p>
          </div>
        </div>
      )}

      <BackText />
    </main>
  );
}