"use client";

import { useState } from "react";
import Link from "next/link";

type Question = {
  q: string;
  options: string[];
  answer: number;
  explain: string;
};

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

  const submit = () => {
    setSubmitted(true);
  };

  const score = questions.filter((q, i) => answers[i] === q.answer).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-xl">🤖</span>
          AI Quiz
        </h1>
        <p className="text-slate-400">Type any topic → AI writes your test</p>
      </div>

      <form onSubmit={generate} className="bg-slate-900 p-6 rounded-lg mb-8 grid gap-4">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic (e.g. Photosynthesis, World War 2, Trigonometry)"
          required
          className="p-3 rounded bg-slate-800 border border-slate-700"
        />

        {/* ⚡ NEW: quiz length toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCount(5)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all ${
              count === 5
                ? "bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-900/40"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
          >
            ⚡ 5 Quick
          </button>
          <button
            type="button"
            onClick={() => setCount(10)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all ${
              count === 10
                ? "bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-900/40"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
          >
            📚 10 Standard
          </button>
        </div>

        <button
          disabled={loading}
          className="py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 font-bold shadow-lg shadow-emerald-900/30 disabled:opacity-50"
        >
          {loading ? `🤖 AI is writing your ${count} questions...` : ` Generate ${count}-Question Quiz`}
        </button>
      </form>

      {error && <p className="text-red-400 mb-4">❌ {error}</p>}

      {questions.length > 0 && (
        <div className="grid gap-5">
          {questions.map((q, qi) => (
            <div key={qi} className="bg-slate-900 rounded-xl p-5">
              <p className="font-bold mb-3">
                {qi + 1}. {q.q}
              </p>
              <div className="grid gap-2">
                {q.options.map((opt, oi) => {
                  let cls = "bg-slate-800 hover:bg-slate-700";
                  if (submitted) {
                    if (oi === q.answer) cls = "bg-green-700";
                    else if (answers[qi] === oi) cls = "bg-red-700";
                  } else if (answers[qi] === oi) {
                    cls = "bg-blue-700";
                  }
                  return (
                    <button
                      key={oi}
                      onClick={() => pick(qi, oi)}
                      className={`text-left p-3 rounded text-sm ${cls}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <p className="text-xs text-slate-400 mt-2">💡 {q.explain}</p>
              )}
            </div>
          ))}

          {!submitted ? (
            <button
              onClick={submit}
              disabled={answers.some((a) => a === -1)}
              className="py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 font-bold shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              ✅ Submit Answers
            </button>
          ) : (
            <div className="bg-slate-900 rounded-xl p-6 text-center">
              <p className="text-4xl font-extrabold text-green-400">
                {score} / {questions.length}
              </p>
              <p className="text-slate-400 mt-1">
                {score === questions.length
                  ? "🏆 Perfect! You're ready!"
                  : score >= count / 2
                  ? "💪 Good job — review the red ones!"
                  : "📚 Keep studying — you'll get there!"}
              </p>
            </div>
          )}
        </div>
      )}

      <Link
        href="/study-tracker"
        className="inline-block mt-6 text-sm text-slate-400 hover:text-white"
      >
        ← Back to Study
      </Link>
    </main>
  );
}