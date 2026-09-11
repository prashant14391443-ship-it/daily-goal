"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Trophy, Clock, Target, TrendingUp, RotateCcw, ArrowLeft, CheckCircle2, XCircle, MinusCircle, Lightbulb, Flame, Download, FileText, Share2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { authHeaders } from "@/lib/testApi";
import { getExamById, SSC_CGL_T1 } from "@/lib/examPatterns";

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

function downloadPaper(
  sheet: SheetItem[],
  examName: string,
  mode: "questions" | "solutions",
  sectionShort: (id: string) => string,
  topicName: (id: string) => string,
  mpq: number,
  neg: number,
  score?: { final: number; total: number; accuracy: number; correct: number; wrong: number; skipped: number }
) {
  const title = mode === "solutions" ? `${examName} — Answer Key & Solutions` : `${examName} — Question Paper`;
  const now = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const bySection: Record<string, SheetItem[]> = {};
  sheet.forEach((q) => {
    if (!bySection[q.section_id]) bySection[q.section_id] = [];
    bySection[q.section_id].push(q);
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', 'Noto Sans', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px 16px; color: #1a1a2e; font-size: 14px; line-height: 1.6; }
  .header { text-align: center; border-bottom: 3px solid #1a1a2e; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 20px; font-weight: 900; margin-bottom: 4px; }
  .header p { font-size: 12px; color: #555; }
  .stats { display: flex; justify-content: center; gap: 16px; margin: 12px 0; flex-wrap: wrap; }
  .stat { background: #f0f4f8; padding: 8px 16px; border-radius: 8px; text-align: center; }
  .stat-val { font-size: 18px; font-weight: 900; }
  .stat-label { font-size: 10px; color: #777; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-green .stat-val { color: #059669; }
  .stat-red .stat-val { color: #dc2626; }
  .section-title { background: #1a1a2e; color: white; padding: 8px 16px; border-radius: 8px; font-weight: 800; font-size: 14px; margin: 24px 0 12px; }
  .question { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; page-break-inside: avoid; }
  .q-num { font-weight: 900; color: #1a1a2e; }
  .q-topic { font-size: 11px; color: #888; margin-left: 8px; }
  .q-text { font-weight: 600; margin: 8px 0; font-size: 14px; }
  .options { padding-left: 8px; }
  .opt { padding: 4px 8px; margin: 3px 0; border-radius: 6px; font-size: 13px; }
  .opt-correct { background: #d1fae5; border: 1px solid #6ee7b7; }
  .opt-wrong { background: #fee2e2; border: 1px solid #fca5a5; }
  .opt-label { font-weight: 800; margin-right: 6px; }
  .explanation { background: #eff6ff; border-left: 3px solid #3b82f6; padding: 10px 14px; margin-top: 10px; border-radius: 0 8px 8px 0; font-size: 13px; }
  .explanation strong { color: #1d4ed8; font-size: 11px; text-transform: uppercase; }
  .user-skipped { color: #9ca3af; font-style: italic; font-size: 12px; margin-top: 6px; }
  .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 2px solid #e5e7eb; font-size: 11px; color: #999; }
  .answer-key { margin: 24px 0; padding: 16px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; }
  .answer-key h3 { font-size: 14px; font-weight: 800; margin-bottom: 8px; }
  .key-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 4px; font-size: 12px; }
  .key-item { padding: 3px 6px; border-radius: 4px; }
  .key-correct { background: #d1fae5; }
  .key-wrong { background: #fee2e2; }
  .key-skip { background: #f3f4f6; }
  @media print { body { padding: 0; } .question { page-break-inside: avoid; } .section-title { page-break-after: avoid; } }
</style>
</head>
<body>
<div class="header">
  <h1>${examName}</h1>
  <p>${mode === "solutions" ? "Answer Key & Solutions" : "Question Paper"} • ${now}</p>
  <p>Total: ${sheet.length} Questions • ${sheet.length * mpq} Marks • +${mpq} per correct, −${neg} per wrong</p>
  ${mode === "solutions" && score ? `
  <div class="stats">
    <div class="stat stat-green"><div class="stat-val">${score.final}/${score.total}</div><div class="stat-label">Score</div></div>
    <div class="stat stat-green"><div class="stat-val">${Math.round(score.accuracy)}%</div><div class="stat-label">Accuracy</div></div>
    <div class="stat"><div class="stat-val">${score.correct}</div><div class="stat-label">Correct</div></div>
    <div class="stat stat-red"><div class="stat-val">${score.wrong}</div><div class="stat-label">Wrong</div></div>
    <div class="stat"><div class="stat-val">${score.skipped}</div><div class="stat-label">Skipped</div></div>
  </div>` : ""}
</div>
${Object.entries(bySection).map(([secId, qs]) => `
<div class="section-title">${sectionShort(secId)}</div>
${qs.map((q) => `
<div class="question">
  <span class="q-num">Q${q.order + 1}.</span>
  <span class="q-topic">[${topicName(q.topic_id)}]</span>
  <p class="q-text">${q.question_text}</p>
  <div class="options">
    ${q.options.map((opt, j) => {
      let cls = "";
      if (mode === "solutions") {
        if (j === q.correct_index) cls = "opt-correct";
        else if (q.user_answer === j && j !== q.correct_index) cls = "opt-wrong";
      }
      return `<div class="opt ${cls}"><span class="opt-label">${String.fromCharCode(65 + j)}.</span> ${opt}</div>`;
    }).join("")}
  </div>
  ${mode === "solutions" && q.user_answer === null ? '<p class="user-skipped">⏭️ Skipped</p>' : ""}
  ${mode === "solutions" && q.explanation ? `<div class="explanation"><strong>Explanation:</strong> ${q.explanation}</div>` : ""}
</div>
`).join("")}
`).join("")}
<div class="answer-key">
  <h3>${mode === "solutions" ? "Quick Answer Key" : "Answer Key"}</h3>
  <div class="key-grid">
    ${sheet.map((q) => {
      const letter = String.fromCharCode(65 + q.correct_index);
      const cls = mode === "solutions" ? (q.user_answer === null ? "key-skip" : q.is_correct ? "key-correct" : "key-wrong") : "";
      return `<div class="key-item ${cls}">Q${q.order + 1}: <strong>${letter}</strong></div>`;
    }).join("")}
  </div>
</div>
<div class="footer">Generated by StudyBuddy AI • ${now} • For personal use only</div>
</body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${examName.replace(/\s+/g, "_")}_${mode === "solutions" ? "Solutions" : "Paper"}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function shareResult(examName: string, score: number, total: number, accuracy: number, correct: number, wrong: number) {
  const text = `📊 ${examName} Mock Test Result\n\n🏆 Score: ${score}/${total}\n✅ Correct: ${correct}\n❌ Wrong: ${wrong}\n🎯 Accuracy: ${Math.round(accuracy)}%\n\nPracticing on StudyBuddy AI 🚀`;
  if (navigator.share) navigator.share({ title: `${examName} Result`, text }).catch(() => {});
  else navigator.clipboard.writeText(text).then(() => alert("Result copied to clipboard!")).catch(() => {});
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;

  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "wrong" | "correct" | "skipped">("all");
  const [betterThan, setBetterThan] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`/api/test/${attemptId}`, { headers });
        const d = await res.json();
        if (!res.ok) { router.replace("/test"); return; }
        if (d.attempt.status !== "completed") { router.replace(`/test/${attemptId}`); return; }
        setData(d);

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
  const exam = getExamById(a.exam_id) || SSC_CGL_T1;
  const marksPerQ = exam.sections[0]?.marksPerQ ?? 2;
  const sheet: SheetItem[] = data.answer_sheet || [];
  const sections = data.analytics?.sections || {};
  const weak = a.weak_topics || [];
  const strong = a.strong_topics || [];
  const totalMarks = (a.total_questions || exam.totalQuestions) * marksPerQ;

  const topicName = (id: string) => exam.sections.flatMap((s) => s.topics).find((t) => t.id === id)?.name || id;
  const sectionShort = (id: string) => exam.sections.find((s) => s.id === id)?.shortName || "";

  const filtered = sheet.filter((q) => {
    if (filter === "wrong") return q.user_answer !== null && !q.is_correct;
    if (filter === "correct") return q.is_correct;
    if (filter === "skipped") return q.user_answer === null;
    return true;
  });

  const uniqueSections = new Set(sheet.map((q) => q.section_id));
  const isSectional = uniqueSections.size === 1;
  const testTitle = isSectional
    ? `${sectionShort(sheet[0]?.section_id)} Test`
    : a.year ? (a.mode === "pyq-real" ? `Real ${a.year} Paper` : `PYQ ${a.year} Paper`) : "Full Mock Test";

  const scoreData = { final: a.final_score, total: totalMarks, accuracy: a.accuracy, correct: a.correct_count, wrong: a.wrong_count, skipped: a.skipped_count };

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
<div className={`relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br ${('gradient' in exam ? exam.gradient : 'from-slate-800 to-slate-900')} p-6 shadow-xl text-center`}>        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <Trophy size={36} className="text-white mx-auto mb-2" />
          <p className="text-[11px] font-black text-white/80 uppercase tracking-wider">{testTitle} • Complete</p>
          <p className="text-4xl font-black text-white mt-1">
            {a.final_score}<span className="text-lg text-white/70">/{totalMarks}</span>
          </p>
          <p className="text-xs font-bold text-white/80 mt-1">Accuracy {Math.round(a.accuracy)}% • Time {fmtClock(a.time_taken_sec || 0)}</p>
          {betterThan !== null && (
            <p className="inline-block mt-3 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-[11px] font-black text-white">
              🔥 Better than {betterThan}% of your previous attempts
            </p>
          )}
        </div>
      </div>

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

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5">
        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Download size={14} /> Save & Share</p>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => downloadPaper(sheet, `${exam.name} ${testTitle}`, "questions", sectionShort, topicName, marksPerQ, exam.negativeMarking)} className="press p-3 rounded-xl bg-slate-800/60 border border-slate-700 hover:border-blue-500/40 text-center transition-all">
            <FileText size={18} className="text-blue-400 mx-auto mb-1.5" />
            <p className="text-[11px] font-black text-white">Questions</p>
            <p className="text-[9px] text-slate-500 font-bold">Download Paper</p>
          </button>
          <button onClick={() => downloadPaper(sheet, `${exam.name} ${testTitle}`, "solutions", sectionShort, topicName, marksPerQ, exam.negativeMarking, scoreData)} className="press p-3 rounded-xl bg-slate-800/60 border border-slate-700 hover:border-emerald-500/40 text-center transition-all">
            <Lightbulb size={18} className="text-emerald-400 mx-auto mb-1.5" />
            <p className="text-[11px] font-black text-white">Solutions</p>
            <p className="text-[9px] text-slate-500 font-bold">With Answers</p>
          </button>
          <button onClick={() => shareResult(exam.name, a.final_score, totalMarks, a.accuracy, a.correct_count, a.wrong_count)} className="press p-3 rounded-xl bg-slate-800/60 border border-slate-700 hover:border-violet-500/40 text-center transition-all">
            <Share2 size={18} className="text-violet-400 mx-auto mb-1.5" />
            <p className="text-[11px] font-black text-white">Share</p>
            <p className="text-[9px] text-slate-500 font-bold">Score Card</p>
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5">
        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><TrendingUp size={14} /> Section-wise Performance</p>
        <div className="grid gap-3">
          {exam.sections
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
                    <div className={`h-full rounded-full ${pct >= 60 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {(weak.length > 0 || strong.length > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-4">
            <p className="text-xs font-black text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Target size={13} /> Focus Here (Weak)</p>
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
            <p className="text-xs font-black text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Flame size={13} /> Your Strengths</p>
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

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2"><Lightbulb size={14} /> Solution Review</p>
          <div className="flex gap-1.5">
            {(["all", "wrong", "correct", "skipped"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`press px-2.5 py-1 rounded-lg text-[10px] font-black border capitalize ${filter === f ? "bg-orange-500/20 border-orange-500/40 text-orange-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3">
          {filtered.map((q) => (
            <div key={q.question_id} className={`rounded-xl border p-4 ${q.user_answer === null ? "border-slate-700 bg-slate-800/40" : q.is_correct ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-800 text-slate-400">Q{q.order + 1}</span>
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-800 text-slate-400">{sectionShort(q.section_id)}</span>
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-800 text-slate-500">{topicName(q.topic_id)}</span>
                <span className="ml-auto text-[9px] font-bold text-slate-500">{q.time_taken_sec}s</span>
              </div>
              <p className="text-sm font-bold text-white leading-relaxed mb-3">{q.question_text}</p>
              <div className="grid gap-1.5 mb-3">
                {q.options.map((opt, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg text-xs border ${i === q.correct_index ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200" : q.user_answer === i ? "bg-red-500/15 border-red-500/40 text-red-200" : "bg-slate-800/50 border-slate-700/50 text-slate-400"}`}>
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