"use client";

import { useState } from "react";
import Link from "next/link";
import { IconTile, GradButton, ProgressRing, Chip } from "@/app/components/ui";

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
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, count }),
      });
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
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 HERO */}
      {!isReviewing && (
        <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-600 to-blue-600 p-5 shadow-2xl shadow-teal-900/30">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="relative flex items-center gap-3">
            <span className={`w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-lg ${loading ? "animate-pulse" : ""}`}>
              🤖
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-black text-white leading-tight">AI Quiz</h1>
              <p className="text-[10px] text-white/80 font-semibold">
                {loading ? "Writing your questions..." : "Any topic → instant test with score"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && !isReviewing && (
        <div className="bg-slate-900 border border-teal-500/30 rounded-2xl p-8 text-center shadow-lg shadow-black/30">
          <p className="text-6xl mb-3 animate-bounce">🤖</p>
          <p className="text-lg font-black text-white mb-1">AI is crafting your quiz...</p>
          <p className="text-xs text-teal-300 font-semibold">"{topic}" • {count} questions</p>
          <div className="mt-4 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-xs mx-auto">
            <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}

      {/* FORM + QUICK CHIPS */}
      {!isReviewing && !loading && (
        <>
          {/* ⚡ QUICK TOPIC CHIPS — zero typing! */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 shadow-lg shadow-black/30">
            <p className="text-[10px] font-black text-slate-400 mb-2">⚡ QUICK TOPICS (tap to start)</p>
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
                  className="press inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-700 text-xs font-bold"
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 📝 CUSTOM FORM */}
          <form id="quiz-form" onSubmit={generate} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 grid gap-3 shadow-lg shadow-black/30">
            <div className="flex items-center gap-2 mb-1">
              <IconTile emoji="✨" gradient="bg-gradient-to-br from-cyan-500 to-teal-600" size="sm" />
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
                className={`press py-3 rounded-xl text-sm font-black border-2 transition-all ${
                  count === 5
                    ? "bg-gradient-to-br from-cyan-500 to-teal-600 border-transparent text-white shadow-lg"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <p className="text-2xl font-black leading-none">⚡ 5</p>
                <p className="text-[10px] mt-1">Quick test</p>
              </button>
              <button
                type="button"
                onClick={() => setCount(10)}
                className={`press py-3 rounded-xl text-sm font-black border-2 transition-all ${
                  count === 10
                    ? "bg-gradient-to-br from-cyan-500 to-teal-600 border-transparent text-white shadow-lg"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <p className="text-2xl font-black leading-none">📚 10</p>
                <p className="text-[10px] mt-1">Standard</p>
              </button>
            </div>

            <GradButton
              type="submit"
              gradient="from-cyan-500 to-teal-600"
              className="w-full py-3.5 text-sm"
            >
              🎯 Generate {count}-Question Quiz
            </GradButton>
          </form>

          {error && (
            <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-3 mb-4 text-center">
              <p className="text-sm font-bold text-red-300">❌ {error}</p>
            </div>
          )}
        </>
      )}

      {/* 📝 QUESTIONS + REVIEW */}
      {isReviewing && (
        <>
          {/* HEADER WITH PROGRESS */}
          <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-600 to-blue-600 p-4 shadow-2xl shadow-teal-900/30">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-black text-white leading-tight truncate">"{topic}"</h1>
                <p className="text-[10px] text-white/80 font-semibold">
                  {submitted ? `${score}/${questions.length} correct • ${pct}%` : `Answer all ${questions.length} questions`}
                </p>
              </div>
              {submitted && (
                <ProgressRing pct={pct} size={56} stroke={6} color="#ffffff" track="rgba(0,0,0,0.25)" />
              )}
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
                  className={`bg-slate-900 border-2 rounded-2xl p-5 shadow-lg shadow-black/30 transition-all ${
                    submitted
                      ? isCorrect
                        ? "border-emerald-500/40"
                        : "border-red-500/40"
                      : answered
                      ? "border-cyan-500/40"
                      : "border-slate-800"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                      submitted
                        ? isCorrect
                          ? "bg-emerald-500 text-white"
                          : "bg-red-500 text-white"
                        : "bg-gradient-to-br from-cyan-500 to-teal-600 text-white"
                    }`}>
                      {qi + 1}
                    </span>
                    <p className="font-black text-base leading-snug flex-1">{q.q}</p>
                  </div>

                  <div className="grid gap-2">
                    {q.options.map((opt, oi) => {
                      const selected = answers[qi] === oi;
                      const isAnswer = q.answer === oi;
                      let cls = "bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-cyan-500/50";
                      let letterBg = "bg-slate-700 text-slate-300";
                      if (submitted) {
                        if (isAnswer) {
                          cls = "bg-emerald-900/30 border-emerald-500/50";
                          letterBg = "bg-emerald-500 text-white";
                        } else if (selected) {
                          cls = "bg-red-900/30 border-red-500/50";
                          letterBg = "bg-red-500 text-white";
                        } else {
                          cls = "bg-slate-800/50 border-slate-700 opacity-60";
                        }
                      } else if (selected) {
                        cls = "bg-cyan-900/30 border-cyan-500/60";
                        letterBg = "bg-cyan-500 text-white";
                      }
                      return (
                        <button
                          key={oi}
                          onClick={() => pick(qi, oi)}
                          disabled={submitted}
                          className={`press text-left p-3 rounded-xl text-sm font-semibold border-2 flex items-center gap-3 ${cls}`}
                        >
                          <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${letterBg}`}>
                            {LETTERS[oi]}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {submitted && isAnswer && <span className="text-lg">✅</span>}
                          {submitted && selected && !isAnswer && <span className="text-lg">❌</span>}
                        </button>
                      );
                    })}
                  </div>

                  {submitted && q.explain && (
                    <div className="mt-3 bg-violet-900/20 border border-violet-500/30 rounded-xl p-3">
                      <p className="text-[10px] font-black text-violet-300 mb-1">💡 EXPLANATION</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{q.explain}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* SUBMIT OR SCORE */}
          {!submitted ? (
            <GradButton
              onClick={submit}
              disabled={answers.some((a) => a === -1)}
              gradient="from-emerald-500 to-green-600"
              className="w-full py-4 text-base"
            >
              ✅ Submit Answers ({answers.filter((a) => a !== -1).length}/{questions.length} answered)
            </GradButton>
          ) : (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border-2 border-emerald-400/50 p-6 text-center shadow-2xl shadow-emerald-900/30">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08),_transparent_70%)]" />
              <div className="relative flex flex-col items-center gap-3">
                <ProgressRing pct={pct} size={100} stroke={9} color="#10b981" track="rgba(255,255,255,0.1)" />
                <p className="text-4xl font-black text-white">{score} / {questions.length}</p>
                <p className="text-sm font-black text-emerald-200">
                  {scoreMessage.emoji} {scoreMessage.text}
                </p>
                <div className="flex gap-2 mt-2">
                  <Chip color="green">✅ {score} correct</Chip>
                  <Chip color="orange">❌ {questions.length - score} wrong</Chip>
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
            <p className="text-slate-400 text-sm">Tap a quick topic above or type your own!</p>
          </div>
        </div>
      )}

      <Link href="/study-tracker" className="inline-block mt-6 text-sm text-slate-400 hover:text-white press font-semibold">
        ← Back to Study
      </Link>
    </main>
  );
}