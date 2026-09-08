"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Target, Clock, FileText, AlertTriangle, ArrowLeft, Loader2, TrendingUp, CheckCircle2, CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { authHeaders } from "@/lib/testApi";
import { SSC_CGL_T1 } from "@/lib/examPatterns";

type Attempt = { id: string; status: string; mode: string; year: number | null; final_score: number; accuracy: number; created_at: string; questions_answered: number; total_questions: number };

const PYQ_YEARS = [2025, 2024, 2023, 2022, 2021, 2020];

export default function TestHub() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [starting, setStarting] = useState<string | null>(null);
  const [pyqYear, setPyqYear] = useState(2025);
  const [err, setErr] = useState("");
  const [prep, setPrep] = useState<null | { have: number; target: number; label: string }>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id || null;
      setUid(id);
      if (id) {
        const { data: rows } = await supabase.from("test_attempts").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(10);
        setAttempts((rows || []) as Attempt[]);
      }
    };
    load();
  }, []);

  // 🔥 Background bank warming (every 10 min while browsing hub)
  useEffect(() => {
    try {
      const last = Number(localStorage.getItem("dg-seed-at") || 0);
      if (Date.now() - last > 10 * 60 * 1000) {
        localStorage.setItem("dg-seed-at", String(Date.now()));
        fetch("/api/test/seed", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
      }
    } catch {}
  }, []);

  // Chunked paper preparation with live progress
  const ensurePaper = async (attemptId: string, label: string, initial: { have: number; target: number; done: boolean }) => {
    let { have, target, done } = initial;
    setPrep({ have, target, label });
    let tries = 0;
    while (!done && tries < 8) {
      tries += 1;
      await new Promise((r) => setTimeout(r, 250));
      const res = await fetch("/api/test/topup", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ attempt_id: attemptId }) });
      const d = await res.json();
      if (!res.ok) break;
      have = d.have; target = d.target; done = d.done;
      setPrep({ have, target, label });
    }
    setPrep(null);
    return done;
  };

  const startTest = async (sectionId?: string, year?: number) => {
    if (!uid) { alert("Please login first to take a test!"); return; }
    const key = year ? `pyq-${year}` : sectionId || "full";
    setStarting(key); setErr("");
    const ctrl = new AbortController();
    const watchdog = setTimeout(() => ctrl.abort(), 300000);
    try {
      const res = await fetch("/api/test/start", {
        method: "POST",
        headers: await authHeaders(),
        signal: ctrl.signal,
        body: JSON.stringify({ exam_id: SSC_CGL_T1.id, mode: year ? "pyq" : "mock", section_id: sectionId || null, year: year || null }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(typeof d.error === "string" ? d.error : "Failed to start test");
      const label = year ? `${year} Paper` : sectionId ? `${SSC_CGL_T1.sections.find((s) => s.id === sectionId)?.shortName || ""} Sectional` : "Full Mock";
      await ensurePaper(d.attempt_id, label, { have: d.have, target: d.target, done: d.done });
      router.push(`/test/${d.attempt_id}`);
    } catch (e: any) {
      setErr(e.name === "AbortError" ? "Preparation took too long — try again (bank is warming up)." : (e.message || "Failed to start"));
      setStarting(null);
      setPrep(null);
    } finally {
      clearTimeout(watchdog);
    }
  };

  const openAttempt = async (a: Attempt) => {
    if (a.status === "completed") { router.push(`/test/${a.id}/results`); return; }
    if (a.status === "preparing") {
      setStarting(a.id);
      try {
        await ensurePaper(a.id, "Your Paper", { have: 0, target: a.total_questions, done: false });
        router.push(`/test/${a.id}`);
      } catch { setStarting(null); }
      return;
    }
    router.push(`/test/${a.id}`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* PREPARATION OVERLAY */}
      {prep && (
        <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-sm text-center">
            <Loader2 size={28} className="text-orange-400 animate-spin mx-auto mb-3" />
            <p className="text-sm font-black text-white mb-1">Preparing {prep.label}…</p>
            <p className="text-[11px] text-slate-400 font-semibold mb-4">Building your question paper from the exam bank</p>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all" style={{ width: `${Math.max(2, Math.round((prep.have / Math.max(1, prep.target)) * 100))}%` }} />
            </div>
            <p className="text-xs font-black text-orange-300">{prep.have} / {prep.target} questions</p>
            <p className="text-[10px] text-slate-500 mt-3 font-semibold">First paper for a year takes ~1–3 min. After that it&apos;s instant.</p>
          </div>
        </div>
      )}

      {/* HERO */}
      <div className={`relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br ${SSC_CGL_T1.gradient} p-5 shadow-xl`}>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center">
              <Target size={22} className="text-white" />
            </span>
            <Link href="/study" className="flex items-center gap-1 text-xs text-white/80 hover:text-white font-bold">
              <ArrowLeft size={12} /> Study
            </Link>
          </div>
          <h1 className="text-xl font-black text-white leading-tight">{SSC_CGL_T1.name}</h1>
          <p className="text-[11px] text-white/80 font-semibold mt-0.5">{SSC_CGL_T1.description}</p>
          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center"><p className="text-[9px] font-bold text-white/70">QUESTIONS</p><p className="text-sm font-black text-white">{SSC_CGL_T1.totalQuestions}</p></div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center"><p className="text-[9px] font-bold text-white/70">MARKS</p><p className="text-sm font-black text-white">{SSC_CGL_T1.totalMarks}</p></div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center"><p className="text-[9px] font-bold text-white/70">TIME</p><p className="text-sm font-black text-white">{SSC_CGL_T1.durationMin}m</p></div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center"><p className="text-[9px] font-bold text-white/70">NEGATIVE</p><p className="text-sm font-black text-white">−{SSC_CGL_T1.negativeMarking}</p></div>
          </div>
        </div>
      </div>

      {/* FULL MOCK */}
      <button
        onClick={() => startTest()}
        disabled={starting !== null}
        className="press w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 font-black text-base shadow-xl shadow-red-900/30 flex items-center justify-center gap-2 disabled:opacity-60 mb-4"
      >
        {starting === "full" ? <><Loader2 size={18} className="animate-spin" /> Preparing paper...</> : <>Start Full Mock Test (100 Qs • 60 min)</>}
      </button>

      {/* SECTIONAL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText size={14} /> Sectional Practice — 25 Qs • 15 min each
        </p>
        <div className="grid grid-cols-2 gap-2">
          {SSC_CGL_T1.sections.map((s) => (
            <button
              key={s.id}
              onClick={() => startTest(s.id)}
              disabled={starting !== null}
              className="press p-3 rounded-xl bg-slate-800/60 border border-slate-700 hover:border-orange-500/40 text-left transition-all disabled:opacity-60"
            >
              {starting === s.id ? (
                <span className="flex items-center gap-2 text-sm font-black text-orange-300"><Loader2 size={15} className="animate-spin" /> Preparing...</span>
              ) : (
                <>
                  <p className="text-sm font-black text-white">{s.shortName}</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">{s.questionCount} Qs • {s.questionCount * s.marksPerQ} marks</p>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* PYQ YEARS */}
      <div className="bg-slate-900 border border-violet-500/20 rounded-2xl p-4 mb-4">
        <p className="text-xs font-black text-violet-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <CalendarDays size={14} /> Previous Year Papers — 100 Qs • 60 min
        </p>
        <div className="grid grid-cols-6 gap-1.5 mb-3">
          {PYQ_YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setPyqYear(y)}
              className={`press py-2 rounded-xl text-[11px] font-black border transition-all ${pyqYear === y ? "bg-violet-500/20 border-violet-500/50 text-violet-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}
            >
              {y}
            </button>
          ))}
        </div>
        <button
          onClick={() => startTest(undefined, pyqYear)}
          disabled={starting !== null}
          className="press w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 font-black text-sm shadow-xl shadow-violet-900/30 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {starting === `pyq-${pyqYear}` ? <><Loader2 size={16} className="animate-spin" /> Preparing {pyqYear} paper...</> : <>Start {pyqYear} Paper (PYQ Pattern)</>}
        </button>
        <p className="text-[10px] text-slate-500 mt-2 text-center font-semibold">
          AI-recreated paper in the exact {pyqYear} exam pattern & difficulty
        </p>
      </div>

      {/* PATTERN */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Exam Pattern</p>
        <div className="grid gap-2">
          {SSC_CGL_T1.sections.map((s, i) => (
            <div key={s.id} className="flex items-center justify-between bg-slate-800/60 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-black text-white">{i + 1}</span>
                <p className="text-sm font-bold text-white">{s.name}</p>
              </div>
              <p className="text-xs font-black text-slate-400">{s.questionCount} Qs • {s.questionCount * s.marksPerQ} marks</p>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2 mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
          <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-200 font-semibold">+2 per correct, −0.5 per wrong. Timer auto-submits at 0:00.</p>
        </div>
      </div>
      {err && <p className="text-center text-sm font-bold text-red-400 mb-4">❌ {err}</p>}

      {/* HISTORY */}
      {attempts.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp size={14} /> Your Attempts
          </p>
          <div className="grid gap-2">
            {attempts.map((a) => (
              <button key={a.id} onClick={() => openAttempt(a)} className="press flex items-center justify-between bg-slate-800/60 border border-slate-700 hover:border-slate-600 rounded-xl p-3 text-left">
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.status === "completed" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                    {a.status === "completed" ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {a.status === "completed" ? `Score: ${a.final_score}/${(a.total_questions || 100) * 2}` : a.status === "preparing" ? "Preparing paper..." : "In Progress"}
                      <span className="text-[10px] text-slate-500 font-bold ml-2">{a.total_questions} Qs</span>
                      {a.year && <span className="text-[10px] font-black text-violet-400 ml-2">PYQ {a.year}</span>}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold">{new Date(a.created_at).toLocaleDateString()} • {a.questions_answered}/{a.total_questions} answered</p>
                  </div>
                </div>
                {a.status === "completed" ? (
                  <span className={`text-sm font-black ${a.accuracy >= 60 ? "text-emerald-400" : a.accuracy >= 40 ? "text-amber-400" : "text-red-400"}`}>{Math.round(a.accuracy)}%</span>
                ) : (
                  <span className="text-xs font-black text-amber-400">Resume →</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}