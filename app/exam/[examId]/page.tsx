"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Target, Clock, FileText, AlertTriangle, ArrowLeft, Loader2, TrendingUp,
  CheckCircle2, Zap, Trash2, Upload, Database, Sparkles, Layers,
  LayoutGrid, ClipboardList, ChevronDown, ChevronRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { authHeaders } from "@/lib/testApi";
import { getExamById, type ExamPattern } from "@/lib/examPatterns";
import ExamSyllabusNotes from "@/app/components/ExamSyllabusNotes";

type Attempt = {
  id: string; status: string; mode: string; year: number | null; exam_id: string;
  final_score: number; accuracy: number; created_at: string;
  questions_answered: number; total_questions: number;
};

const PYQ_YEARS = [2025, 2024, 2023, 2022, 2021, 2020];

export default function ExamDashboard() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const exam: ExamPattern | undefined = getExamById(examId);

  const [uid, setUid] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [starting, setStarting] = useState<string | null>(null);
  const [pyqYear, setPyqYear] = useState(2025);
  const [realYear, setRealYear] = useState(2025);
  const [err, setErr] = useState("");
  const [realCounts, setRealCounts] = useState<Record<number, number>>({});
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [openBlock, setOpenBlock] = useState<string | null>("sectional");

  const toggle = (k: string) => setOpenBlock((o) => (o === k ? null : k));

  // Auth + attempts
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id || null;
      setUid(id);
      if (id && exam) {
        const { data: rows } = await supabase.from("test_attempts")
          .select("*").eq("user_id", id).eq("exam_id", exam.id)
          .order("created_at", { ascending: false }).limit(30);
        setAttempts((rows || []) as Attempt[]);
      }
    };
    load();
  }, [examId, exam?.id]);

  // Real-question counts + admin detection
  useEffect(() => {
    if (!exam) return;
    const loadMeta = async () => {
      const counts: Record<number, number> = {};
      await Promise.all(PYQ_YEARS.map(async (y) => {
        const { count } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("exam_id", exam.id).eq("source", "official").eq("year", y);
        const { count: c2 } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("exam_id", exam.id).eq("source", "community").eq("year", y);
        counts[y] = (count || 0) + (c2 || 0);
      }));
      setRealCounts(counts);
      try {
        const res = await fetch("/api/seeder", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "ping" }) });
        const d = await res.json();
        setIsAdminUser(!!d.admin);
      } catch {}
    };
    loadMeta();
  }, [exam?.id]);

  const realYears = PYQ_YEARS.filter((y) => (realCounts[y] || 0) > 0);
  useEffect(() => {
    if (realYears.length > 0 && !realYears.includes(realYear)) setRealYear(realYears[0]);
  }, [realYears.length]);

  const startTest = async (sectionId?: string, year?: number, source?: "ai" | "real") => {
    if (!uid) { alert("Please login first to take a test!"); return; }
    if (!exam) return;
    const key = source === "real" ? `real-${year}` : year ? `pyq-${year}` : sectionId || "full";
    setStarting(key); setErr("");
    const ctrl = new AbortController();
    const watchdog = setTimeout(() => ctrl.abort(), 60000);
    try {
      const res = await fetch("/api/test/start", {
        method: "POST",
        headers: await authHeaders(),
        signal: ctrl.signal,
        body: JSON.stringify({ exam_id: exam.id, section_id: sectionId || null, year: year || null, source: source || "ai" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(typeof d.error === "string" ? d.error : "Failed to start test");
      router.push(`/test/${d.attempt_id}`);
    } catch (e: any) {
      setErr(e.name === "AbortError" ? "Server took too long — try again in a few seconds." : (e.message || "Failed to start"));
      setStarting(null);
    } finally { clearTimeout(watchdog); }
  };

  const openAttempt = (a: Attempt) => {
    if (a.status === "completed") router.push(`/test/${a.id}/results`);
    else router.push(`/test/${a.id}`);
  };

  const deleteAttempt = async (a: Attempt) => {
    if (!confirm(`Delete this attempt (${new Date(a.created_at).toLocaleDateString()})? This cannot be undone.`)) return;
    try {
      const res = await fetch("/api/test/delete", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ attempt_id: a.id }) });
      if (res.ok) setAttempts((prev) => prev.filter((x) => x.id !== a.id));
    } catch {}
  };

  const clearHistory = async () => {
    if (!exam) return;
    if (!confirm("Delete ALL completed history for this exam? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/test/delete", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ clear_all: true, exam_id: exam.id }) });
      if (res.ok) setAttempts((prev) => prev.filter((x) => x.status !== "completed"));
    } catch {}
  };

  // Unknown exam guard
  if (!exam) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-300 mb-3">Unknown exam: {examId}</p>
          <Link href="/test" className="text-xs text-indigo-300 underline">← Back to exam list</Link>
        </div>
      </main>
    );
  }

  const marksPerQ = exam.sections[0]?.marksPerQ ?? 2;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 antialiased px-4 pt-6 pb-24 max-w-4xl mx-auto relative">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-gradient-to-b from-indigo-500/[0.06] to-transparent" />

      {/* ── HERO ── */}
      <div className="relative mb-5 overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-950 p-6">
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between mb-5">
            <span className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Target size={20} className="text-indigo-300" strokeWidth={1.8} />
            </span>
            <Link href="/test" className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={13} /> All exams
            </Link>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300/80 mb-1.5">Exam Dashboard</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{exam.name}</h1>
          <p className="text-[13px] text-slate-400 mt-1.5 leading-relaxed max-w-md">{exam.description}</p>
          <div className="grid grid-cols-4 divide-x divide-white/5 mt-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur">
            <div className="py-3.5 text-center"><p className="text-lg font-semibold text-white">{exam.totalQuestions}</p><p className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-500 mt-0.5">Questions</p></div>
            <div className="py-3.5 text-center"><p className="text-lg font-semibold text-white">{exam.totalMarks}</p><p className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-500 mt-0.5">Marks</p></div>
            <div className="py-3.5 text-center"><p className="text-lg font-semibold text-white">{exam.durationMin}m</p><p className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-500 mt-0.5">Duration</p></div>
            <div className="py-3.5 text-center"><p className="text-lg font-semibold text-white">−{exam.negativeMarking}</p><p className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-500 mt-0.5">Negative</p></div>
          </div>
        </div>
      </div>

      {/* Quick tip */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-teal-400/15 bg-teal-400/[0.05] px-4 py-3 mb-5">
        <Zap size={14} className="text-teal-300 shrink-0 mt-0.5" strokeWidth={1.8} />
        <p className="text-xs text-teal-100/70 leading-relaxed">Tests open instantly — your paper assembles silently in the background while you answer.</p>
      </div>

      {/* ── BIG MOCK CTA ── */}
      <button onClick={() => startTest()} disabled={starting !== null}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mb-5">
        {starting === "full" ? <><Loader2 size={16} className="animate-spin" /> Preparing...</> : <>Start Full Mock Test · {exam.totalQuestions} Qs · {exam.durationMin} min</>}
      </button>

      {err && <p className="text-center text-xs font-medium text-rose-300 mb-4">❌ {err}</p>}

      {/* ══════════ ICON MENU BLOCKS ══════════ */}
      <div className="grid gap-2.5 mb-5">

        {/* ── 1. SECTIONAL PRACTICE ── */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <button onClick={() => toggle("sectional")} className="w-full flex items-center gap-3 p-4 text-left">
            <span className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <LayoutGrid size={18} className="text-white" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-semibold text-white">Sectional Practice</span>
              <span className="block text-[10px] text-slate-500 font-medium mt-0.5">{exam.sections.length} sections · focused practice · proportional timer</span>
            </span>
            {openBlock === "sectional" ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-600" />}
          </button>
          {openBlock === "sectional" && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-2.5">
                {exam.sections.map((s) => (
                  <button key={s.id} onClick={() => startTest(s.id)} disabled={starting !== null}
                    className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-left hover:border-indigo-400/25 hover:bg-white/[0.04] transition-all disabled:opacity-50">
                    {starting === s.id ? (
                      <span className="flex items-center gap-2 text-sm font-medium text-indigo-300"><Loader2 size={14} className="animate-spin" /> Preparing...</span>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-slate-100">{s.shortName}</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {s.questionCount} Qs · {s.questionCount * s.marksPerQ} marks · {s.timeLimitMin ?? Math.max(5, Math.round((exam.durationMin * s.questionCount) / exam.totalQuestions))} min
                        </p>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── 2. AI PATTERN PAPERS ── */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <button onClick={() => toggle("ai")} className="w-full flex items-center gap-3 p-4 text-left">
            <span className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Sparkles size={18} className="text-white" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-semibold text-white">AI Pattern Papers</span>
              <span className="block text-[10px] text-slate-500 font-medium mt-0.5">{exam.totalQuestions} Qs · {exam.durationMin} min · year-matched style · ~90% fresh</span>
            </span>
            {openBlock === "ai" ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-600" />}
          </button>
          {openBlock === "ai" && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-6 gap-1.5 mb-4">
                {PYQ_YEARS.map((y) => (
                  <button key={y} onClick={() => setPyqYear(y)}
                    className={`rounded-xl border py-2.5 text-xs font-medium transition-all ${pyqYear === y ? "border-violet-400/40 bg-violet-500/15 text-violet-200" : "border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10 hover:text-slate-200"}`}>
                    {y}
                  </button>
                ))}
              </div>
              <button onClick={() => startTest(undefined, pyqYear, "ai")} disabled={starting !== null}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400 text-sm font-semibold text-white shadow-lg shadow-violet-500/15 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {starting === `pyq-${pyqYear}` ? <><Loader2 size={15} className="animate-spin" /> Preparing {pyqYear}...</> : <>Start {pyqYear} Pattern Paper</>}
              </button>
              <p className="text-[11px] text-slate-500 mt-3 text-center">Reconstructed in the exact {pyqYear} {exam.name} pattern</p>
            </div>
          )}
        </div>

        {/* ── 3. REAL PYQ PAPERS ── */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <button onClick={() => toggle("real")} className="w-full flex items-center gap-3 p-4 text-left">
            <span className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <Database size={18} className="text-white" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-semibold text-white">Real Previous Year Papers</span>
              <span className="block text-[10px] text-slate-500 font-medium mt-0.5">
                {realYears.length > 0 ? `${realYears.length} year(s) available · official questions` : "No papers uploaded yet"}
              </span>
            </span>
            {openBlock === "real" ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-600" />}
          </button>
          {openBlock === "real" && (
            <div className="px-4 pb-4">
              {realYears.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] px-5 py-6 text-center">
                  <p className="text-xs font-medium text-slate-300 mb-1">No real papers uploaded for {exam.name} yet</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-4">Official papers uploaded via the admin seeder appear here automatically.</p>
                  {isAdminUser && (
                    <Link href="/seeder" className="inline-flex items-center gap-1.5 rounded-xl border border-teal-400/25 bg-teal-500/10 px-4 py-2.5 text-xs font-semibold text-teal-200 hover:bg-teal-500/15 transition-colors">
                      <Upload size={13} /> Upload first paper
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {realYears.map((y) => (
                      <button key={y} onClick={() => setRealYear(y)}
                        className={`rounded-2xl border p-3 text-center transition-all ${realYear === y ? "border-teal-400/40 bg-teal-500/10" : "border-white/5 bg-white/[0.02] hover:border-white/10"}`}>
                        <p className={`text-sm font-semibold ${realYear === y ? "text-teal-200" : "text-slate-200"}`}>{y}</p>
                        <p className="text-[10px] font-medium text-teal-300/80 mt-0.5">{realCounts[y]} real Qs</p>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => startTest(undefined, realYear, "real")} disabled={starting !== null}
                    className="w-full py-3.5 rounded-2xl border border-teal-400/30 bg-teal-500/10 hover:bg-teal-500/15 text-sm font-semibold text-teal-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {starting === `real-${realYear}` ? <><Loader2 size={15} className="animate-spin" /> Loading...</> : <>Start {realYear} Real Paper · {realCounts[realYear]} Qs</>}
                  </button>
                  <p className="text-[11px] text-slate-500 mt-3 text-center">100% official questions · timer scales to length · retake anytime</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── 4. EXAM PATTERN ── */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <button onClick={() => toggle("pattern")} className="w-full flex items-center gap-3 p-4 text-left">
            <span className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center shadow-lg">
              <ClipboardList size={18} className="text-white" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-semibold text-white">Exam Pattern</span>
              <span className="block text-[10px] text-slate-500 font-medium mt-0.5">Sections, marks & marking scheme</span>
            </span>
            {openBlock === "pattern" ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-600" />}
          </button>
          {openBlock === "pattern" && (
            <div className="px-4 pb-4">
              <div className="grid gap-2 mb-3">
                {exam.sections.map((s, i) => (
                  <div key={s.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg border border-white/5 bg-white/[0.03] flex items-center justify-center text-[11px] font-semibold text-slate-400">{i + 1}</span>
                      <p className="text-[13px] font-medium text-slate-200">{s.name}</p>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500">{s.questionCount} Qs · {s.questionCount * s.marksPerQ} marks</p>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2.5 rounded-2xl border border-amber-400/15 bg-amber-400/[0.05] px-4 py-3">
                <AlertTriangle size={14} className="text-amber-300 shrink-0 mt-0.5" strokeWidth={1.8} />
                <p className="text-[11px] text-amber-100/70 leading-relaxed">+{marksPerQ} per correct, −{exam.negativeMarking} per wrong. Timer auto-submits at 0:00.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 5. SYLLABUS & SMART NOTES ── */}
      <ExamSyllabusNotes exam={exam} />

      {/* ── 6. YOUR ATTEMPTS (HISTORY) ── */}
      {attempts.length > 0 && (
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <button onClick={() => toggle("history")} className="w-full flex items-center gap-3 p-4 text-left">
            <span className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
              <TrendingUp size={18} className="text-white" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-semibold text-white">Your Attempts</span>
              <span className="block text-[10px] text-slate-500 font-medium mt-0.5">{attempts.length} attempt(s) · scores & history</span>
            </span>
            {openBlock === "history" ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-600" />}
          </button>
          {openBlock === "history" && (
            <div className="px-4 pb-4">
              <div className="flex justify-end mb-3">
                <button onClick={clearHistory} className="rounded-lg border border-rose-400/20 bg-rose-500/[0.06] px-2.5 py-1.5 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/10 transition-colors">Clear completed</button>
              </div>
              <div className="grid gap-2">
                {attempts.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-3.5 hover:bg-white/[0.04] transition-colors">
                    <button onClick={() => openAttempt(a)} className="press flex-1 min-w-0 flex items-center justify-between text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center ${a.status === "completed" ? "bg-emerald-500/[0.08] border-emerald-400/15 text-emerald-300" : "bg-amber-500/[0.08] border-amber-400/15 text-amber-300"}`}>
                          {a.status === "completed" ? <CheckCircle2 size={15} strokeWidth={1.8} /> : <Clock size={15} strokeWidth={1.8} />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-slate-100 truncate">
                            {a.status === "completed" ? `Score ${a.final_score}/${a.total_questions * marksPerQ}` : a.status === "preparing" ? "Preparing paper..." : "In progress"}
                            <span className="text-[11px] text-slate-500 ml-2">{a.total_questions} Qs</span>
                            {a.year && (
                              <span className={`ml-2 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${a.mode === "pyq-real" ? "border-teal-400/20 bg-teal-500/10 text-teal-300" : "border-violet-400/20 bg-violet-500/10 text-violet-300"}`}>
                                {a.mode === "pyq-real" ? `REAL ${a.year}` : `PYQ ${a.year}`}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{new Date(a.created_at).toLocaleDateString()} · {a.questions_answered}/{a.total_questions} answered</p>
                        </div>
                      </div>
                      {a.status === "completed" ? (
                        <span className={`ml-2 text-sm font-semibold shrink-0 ${a.accuracy >= 60 ? "text-emerald-300" : a.accuracy >= 40 ? "text-amber-300" : "text-rose-300"}`}>{Math.round(a.accuracy)}%</span>
                      ) : (
                        <span className="ml-2 text-[11px] font-semibold text-amber-300 shrink-0">Resume →</span>
                      )}
                    </button>
                    <button onClick={() => deleteAttempt(a)} className="shrink-0 w-8 h-8 rounded-lg border border-white/5 bg-white/[0.02] text-slate-500 hover:text-rose-300 hover:border-rose-400/20 transition-colors flex items-center justify-center" title="Delete attempt">
                      <Trash2 size={13} strokeWidth={1.8} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}