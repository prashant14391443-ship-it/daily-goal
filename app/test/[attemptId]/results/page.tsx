"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Trophy, Clock, Target, TrendingUp, RotateCcw, ArrowLeft, CheckCircle2, XCircle, MinusCircle, Lightbulb, Flame } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { authHeaders } from "@/lib/testApi";
import { SSC_CGL_T1 } from "@/lib/examPatterns";

type SheetItem = {
  order: number; question_id: string; section_id: string; topic_id: string;
  question_text: string; options: string[]; correct_index: number; explanation: string | null;
  user_answer: number | null; is_correct: boolean; time_taken_sec: number;
};

function fmtClock(s: number) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}m ${ss}s`;
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;

  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "wrong" | "correct" | "skipped">("all");
  const [betterThan, setBetterThan] = useState<number | null>(null);

  const topicName = (id: string) =>
    SSC_CGL_T1.sections.flatMap((s) => s.topics).find((t) => t.id === id)?.name || id;
  const sectionShort = (id: string) =>
    SSC_CGL_T1.sections.find((s) => s.id === id)?.shortName || "";

  useEffect(() => {
    const load = async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`/api/test/${attemptId}`, { headers });
        const d = await res.json();
        if (!res.ok) { router.replace("/test"); return; }
        if (d.attempt.status !== "completed") { router.replace(`/test/${attemptId}`); return; }
        setData(d);

        // Compare with user's own past attempts
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user.id;
        if (uid) {
          const { data: past } = await supabase
            .from("test_attempts")
            .select("final_score")
            .eq("user_id", uid)
            .eq("exam_id", d.attempt.exam_id)
            .eq("status", "completed")
            .neq("id", attemptId);
          if (past && past.length > 0) {
            const beaten = past.filter((p: any) => (p.final_score || 0) < (d.attempt.final_score || 0)).length;
            setBetterThan(Math.round((beaten / past.length) * 100));
          }
        }
      } catch {
        router.replace("/test");
      }
    };
    load();
  }, [attemptId, router]);

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-sm font-black animate-pulse">Loading results...</p>
      </main>
    );
  }

  const a = data.attempt;
  const sheet: SheetItem[] = data.answer_sheet || [];
  const sections = data.analytics?.sections || {};
  const weak = a.weak_topics || [];
  const strong = a.strong_topics || [];

  // ✅ Dynamic total marks (works for both full mock 100Qs and sectional 25Qs)
  const totalMarks = (a.total_questions || SSC_CGL_T1.totalQuestions) * 2;

  const filtered = sheet.filter((q) => {
    if (filter === "wrong") return q.user_answer !== null && !q.is_correct;
    if (filter === "correct") return q.is_correct;
    if (filter === "skipped") return q.user_answer === null;
    return true;
  });

  const scorePct = Math.max(0, Math.min(100, (a.final_score / totalMarks) * 100));

  // ✅ Test title based on whether it's sectional or full
  const uniqueSections = new Set(sheet.map((q) => q.section_id));
  const isSectional = uniqueSections.size === 1;
  const testTitle = isSectional
    ? `${SSC_CGL_T1.sections.find((s) => s.id === sheet[0]?.section_id)?.shortName || "Sectional"} Test`
    : "Full Mock Test";

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* SCORE HERO */}
      <div className={`relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br ${SSC_CGL_T1.gradient} p-6 shadow-xl text-center`}>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <Trophy size={36} className="text-white mx-auto mb-2" />
          <p className="text-[11px] font-black text-white/80 uppercase tracking-wider">{testTitle} • Complete</p>
          <p className="text-4xl font-black text-white mt-1">
            {a.final_score}<span className="text-lg text-white/70">/{totalMarks}</span>
          </p>
          <p className="text-xs font-bold text-white/80 mt-1">
            Accuracy {Math.round(a.accuracy)}% • Time {fmtClock(a.time_taken_sec || 0)}
          </p>
          {betterThan !== null && (
            <p className="inline-block mt-3 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-[11px] font-black text-white">
              🔥 Better than {betterThan}% of your previous attempts
            </p>
          )}
        </div>
      </div>

      {/* STAT GRID */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-center">
          <CheckCircle2 size={16} className="text-emerald-400 mx-auto mb-1" />
          <p className="text-xl font-black text-emerald-400">{a.correct_count}</p>
          <p className="text-[9px] font-bold text-slate-500">CORRECT</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-center">
          <XCircle size={16} className="text-red-400 mx-auto mb-1" />
          <p className="text-xl font-black text-red-400">{a.wrong_count}</p>
          <p className="text-[9px] font-bold text-slate-500">WRONG</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-3 text-center">
          <MinusCircle size={16} className="text-slate-400 mx-auto mb-1" />
          <p className="text-xl font-black text-slate-300">{a.skipped_count}</p>
          <p className="text-[9px] font-bold text-slate-500">SKIPPED</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-center">
          <Target size={16} className="text-amber-400 mx-auto mb-1" />
          <p className="text-xl font-black text-amber-400">−{a.negative_marks}</p>
          <p className="text-[9px] font-bold text-slate-500">NEG. MARKS</p>
        </div>
      </div>

      {/* SECTION BREAKDOWN — only shows sections that have data */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5">
        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <TrendingUp size={14} /> Section-wise Performance
        </p>
        <div className="grid gap-3">
          {SSC_CGL_T1.sections
            .filter((s) => sheet.some((q) => q.section_id === s.id))
            .map((s) => {
              const st = sections[s.id] || { correct: 0, wrong: 0, skipped: 0, total: s.questionCount };
              const pct = Math.round(((st.correct || 0) / s.questionCount) * 100);
              return (
                <div key={s.id}>
                  <div className="flex justify-between text-[11px] font-bold mb-1">
                    <span className="text-slate-300">{s.name}</span>
                    <span className="text-slate-500">
                      <span className="text-emerald-400">{st.correct}✓</span> • <span className="text-red-400">{st.wrong}✗</span> • <span className="text-slate-500">{st.skipped}–</span>
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 60 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* WEAK / STRONG */}
      {(weak.length > 0 || strong.length > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-4">
            <p className="text-xs font-black text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Target size={13} /> Focus Here (Weak)
            </p>
            {weak.length === 0 ? <p className="text-[11px] text-slate-500 font-semibold">No weak topics — great!</p> : (
              <div className="flex flex-wrap gap-1.5">
                {weak.map((w: any) => (
                  <span key={w.topic_id} className="px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-300">
                    {topicName(w.topic_id)} ({Math.round(w.accuracy)}%)
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-4">
            <p className="text-xs font-black text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Flame size={13} /> Your Strengths
            </p>
            {strong.length === 0 ? <p className="text-[11px] text-slate-500 font-semibold">Attempt more to discover strengths.</p> : (
              <div className="flex flex-wrap gap-1.5">
                {strong.map((s: any) => (
                  <span key={s.topic_id} className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-300">
                    {topicName(s.topic_id)} ({Math.round(s.accuracy)}%)
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ANSWER REVIEW */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Lightbulb size={14} /> Solution Review
          </p>
          <div className="flex gap-1.5">
            {(["all", "wrong", "correct", "skipped"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`press px-2.5 py-1 rounded-lg text-[10px] font-black border capitalize ${filter === f ? "bg-orange-500/20 border-orange-500/40 text-orange-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3">
          {filtered.map((q) => (
            <div
              key={q.question_id}
              className={`rounded-xl border p-4 ${
                q.user_answer === null ? "border-slate-700 bg-slate-800/40"
                  : q.is_correct ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-red-500/30 bg-red-500/5"
              }`}
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-800 text-slate-400">Q{q.order + 1}</span>
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-800 text-slate-400">{sectionShort(q.section_id)}</span>
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-800 text-slate-500">{topicName(q.topic_id)}</span>
                <span className="ml-auto text-[9px] font-bold text-slate-500">{q.time_taken_sec}s</span>
              </div>
              <p className="text-sm font-bold text-white leading-relaxed mb-3">{q.question_text}</p>
              <div className="grid gap-1.5 mb-3">
                {q.options.map((opt, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 p-2.5 rounded-lg text-xs border ${
                      i === q.correct_index ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                        : q.user_answer === i ? "bg-red-500/15 border-red-500/40 text-red-200"
                        : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                    }`}
                  >
                    <span className="font-black shrink-0">{String.fromCharCode(65 + i)}.</span>
                    <span className="flex-1">{opt}</span>
                    {i === q.correct_index && <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />}
                    {q.user_answer === i && i !== q.correct_index && <XCircle size={13} className="text-red-400 shrink-0 mt-0.5" />}
                  </div>
                ))}
              </div>
              {q.user_answer === null && <p className="text-[11px] font-bold text-slate-500 mb-2">⏭️ You skipped this question.</p>}
              {q.explanation && (
                <div className="bg-slate-800/60 rounded-lg p-3">
                  <p className="text-[10px] font-black text-cyan-400 uppercase mb-1">Explanation</p>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{q.explanation}</p>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-xs text-slate-500 font-bold py-4">No questions in this filter.</p>}
        </div>
      </div>

      {/* ACTIONS */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/test" className="press py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-black text-sm flex items-center justify-center gap-2">
          <RotateCcw size={16} /> Take Another Test
        </Link>
        <Link href="/study" className="press py-3.5 rounded-xl bg-slate-800 border border-slate-700 font-black text-sm text-slate-300 flex items-center justify-center gap-2">
          <ArrowLeft size={16} /> Back to Study
        </Link>
      </div>
    </main>
  );
}