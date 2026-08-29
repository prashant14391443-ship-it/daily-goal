"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Sparkles, Zap, BookOpen, Check, X, Lightbulb, Play } from "lucide-react";
import { ProgressRing } from "@/app/components/ui";
import BackText from "@/app/components/BackBtn";

type Question = {
  q: string;
  options: string[];
  answer: number;
  explain: string;
};

const QUICK_TOPICS = [
  { label: "Math", emoji: "🔢" },
  { label: "World War 2", emoji: "⚔️" },
  { label: "Photosynthesis", emoji: "🌱" },
  { label: "Python", emoji: "🐍" },
  { label: "India GK", emoji: "🇮🇳" },
  { label: "Physics", emoji: "⚛️" },
];

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function QuizPage() {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setQuestions([]);
    setSubmitted(false);
    try {
      const res = await fetch("/api/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, count }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      setQuestions(data.questions || []);
      setAnswers(new Array((data.questions || []).length).fill(-1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz.");
    }
    setLoading(false);
  };

  const pick = (qi: number, oi: number) => {
    if (submitted) return;
    const next = [...answers];
    next[qi] = oi;
    setAnswers(next);
  };

  const submit = () => setSubmitted(true);

  const score = questions.filter((q, i) => answers[i] === q.answer).length;
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;

  const scoreMessage =
    score === questions.length
      ? { emoji: "🏆", text: "Perfect! You're a champion!", color: "text-emerald-300" }
      : score >= count / 2
      ? { emoji: "💪", text: "Good job — review the red ones!", color: "text-amber-300" }
      : { emoji: "📚", text: "Keep studying — you'll get there!", color: "text-slate-300" };

  const isReviewing = questions.length > 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 CALM HERO */}
      {!isReviewing && (
        <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 via-teal-600 to-blue-600 p-5 shadow-xl shadow-teal-900/20">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="relative flex items-center gap-4">
            <span className={`w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center ${loading ? "animate-pulse" : ""}`}>
              <Bot size={22} strokeWidth={2.2} className="text-white" />
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>AI Quiz</h1>
              <p className="text-[11px] text-white/75 font-semibold mt-0.5">
                {loading ? "Writing your questions..." : "Any topic → instant test with score"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading && !isReviewing && (
        <div className="bg-slate-900 border border-teal-500/30 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-teal-500/15 flex items-center justify-center">
            <Bot size={32} className="text-teal-400 animate-pulse" />
          </div>
          <p className="text-lg font-black text-white mb-1">AI is crafting your quiz...</p>
          <p className="text-xs text-teal-300 font-bold">"{topic}" • {count} questions</p>
          <div className="mt-4 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-xs mx-auto">
            <div className="h-full bg-teal-500 rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}

      {/* FORM + QUICK CHIPS */}
      {!isReviewing && !loading && (
        <>
          {/* ⚡ QUICK TOPICS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
            <p className="text-[10px] font-black text-slate-500 mb-2">⚡ QUICK TOPICS (tap to start)</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TOPICS.map((t) => (
                <button
                  key={t.label}
                  onClick={() => {
                    setTopic(t.label);
                    setTimeout(() => {
                      const form = document.getElementById("quiz-form") as HTMLFormElement | null;
                      form?.requestSubmit();
                    }, 50);
                  }}
                  className="press inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 hover:border-cyan-500/40 hover:bg-slate-700 text-xs font-bold"
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 📝 CUSTOM FORM */}
          <form id="quiz-form" onSubmit={generate} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 grid gap-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Sparkles size={16} strokeWidth={2.2} />
              </span>
              <p className="font-black text-sm text-white">Or type your own topic</p>
            </div>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Quantum physics, Indian history, React hooks..."
              required
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-cyan-500"
            />

            {/* ⚡ QUIZ LENGTH */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCount(5)}
                className={`press py-3 rounded-xl text-sm font-black border transition-all ${
                  count === 5
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <p className="text-2xl font-black leading-none flex items-center justify-center gap-1"><Zap size={18} /> 5</p>
                <p className="text-[10px] mt-1">Quick test</p>
              </button>
              <button
                type="button"
                onClick={() => setCount(10)}
                className={`press py-3 rounded-xl text-sm font-black border transition-all ${
                  count === 10
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <p className="text-2xl font-black leading-none flex items-center justify-center gap-1"><BookOpen size={18} /> 10</p>
                <p className="text-[10px] mt-1">Standard</p>
              </button>
            </div>

            <button
              type="submit"
              className="press w-full py-3.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-sm font-black text-cyan-300 flex items-center justify-center gap-1.5"
            >
              <Play size={15} fill="currentColor" />
              Generate {count}-Question Quiz
            </button>
          </form>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 mb-4 text-center">
              <p className="text-sm font-bold text-red-300">❌ {error}</p>
            </div>
          )}
        </>
      )}

      {/* 📝 QUESTIONS + REVIEW */}
      {isReviewing && (
        <>
          {/* HEADER */}
          <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 via-teal-600 to-blue-600 p-4 shadow-xl shadow-teal-900/20">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-black text-white leading-tight truncate">"{topic}"</h1>
                <p className="text-[11px] text-white/75 font-semibold mt-0.5">
                  {submitted ? `${score}/${questions.length} correct • ${pct}%` : `Answer all ${questions.length} questions`}
                </p>
              </div>
              {submitted && <ProgressRing pct={pct} size={56} stroke={6} color="#ffffff" track="rgba(0,0,0,0.25)" />}
            </div>
          </div>

          {/* QUESTIONS */}
          <div className="grid gap-4 mb-5">
            {questions.map((q, qi) => {
              const answered = answers[qi] !== -1;
              const isCorrect = submitted && answers[qi] === q.answer;
              return (
                <div
                  key={qi}
                  className={`bg-slate-900 border rounded-2xl p-4 transition-all ${
                    submitted
                      ? isCorrect ? "border-emerald-500/30" : "border-red-500/30"
                      : answered ? "border-cyan-500/30" : "border-slate-800"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                      submitted
                        ? isCorrect ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                        : "bg-cyan-500/20 text-cyan-300"
                    }`}>
                      {qi + 1}
                    </span>
                    <p className="font-black text-base leading-snug flex-1">{q.q}</p>
                  </div>

                  <div className="grid gap-2">
                    {q.options.map((opt, oi) => {
                      const selected = answers[qi] === oi;
                      const isAnswer = q.answer === oi;
                      let cls = "bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-cyan-500/40";
                      let letterBg = "bg-slate-700 text-slate-300";
                      if (submitted) {
                        if (isAnswer) { cls = "bg-emerald-900/30 border-emerald-500/40"; letterBg = "bg-emerald-500 text-white"; }
                        else if (selected) { cls = "bg-red-900/30 border-red-500/40"; letterBg = "bg-red-500 text-white"; }
                        else { cls = "bg-slate-800/50 border-slate-700 opacity-60"; }
                      } else if (selected) { cls = "bg-cyan-900/30 border-cyan-500/50"; letterBg = "bg-cyan-500 text-white"; }
                      return (
                        <button
                          key={oi}
                          onClick={() => pick(qi, oi)}
                          disabled={submitted}
                          className={`press text-left p-3 rounded-xl text-sm font-semibold border flex items-center gap-3 ${cls}`}
                        >
                          <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${letterBg}`}>
                            {LETTERS[oi]}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {submitted && isAnswer && <Check size={16} className="text-emerald-400 shrink-0" />}
                          {submitted && selected && !isAnswer && <X size={16} className="text-red-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {submitted && q.explain && (
                    <div className="mt-3 bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
                      <p className="text-[10px] font-black text-violet-300 mb-1 flex items-center gap-1"><Lightbulb size={11} /> EXPLANATION</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{q.explain}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* SUBMIT OR SCORE */}
          {!submitted ? (
            <button
              onClick={submit}
              disabled={answers.some((a) => a === -1)}
              className="press w-full py-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-base font-black text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Check size={17} />
              Submit Answers ({answers.filter((a) => a !== -1).length}/{questions.length} answered)
            </button>
          ) : (
            <div className="relative overflow-hidden rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 p-6 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.05),_transparent_70%)]" />
              <div className="relative flex flex-col items-center gap-3">
                <ProgressRing pct={pct} size={100} stroke={9} color="#10b981" track="rgba(255,255,255,0.1)" />
                <p className="text-4xl font-black text-white">{score} / {questions.length}</p>
                <p className="text-sm font-black text-emerald-200">
                  {scoreMessage.emoji} {scoreMessage.text}
                </p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md flex items-center gap-1">
                    <Check size={11} /> {score} correct
                  </span>
                  <span className="text-[10px] font-black text-red-300 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-md flex items-center gap-1">
                    <X size={11} /> {questions.length - score} wrong
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* EMPTY STATE */}
      {!isReviewing && !loading && questions.length === 0 && !error && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl mt-4">
          <div className="text-center py-8">
            <p className="text-4xl mb-2">🎯</p>
            <p className="text-slate-500 text-sm font-bold">Tap a quick topic above or type your own!</p>
          </div>
        </div>
      )}

      <BackText />
    </main>
  );
}