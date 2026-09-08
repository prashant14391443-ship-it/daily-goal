"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Target, Clock, FileText, AlertTriangle, ArrowLeft, Loader2, TrendingUp, CheckCircle2, CalendarDays, Zap, Trash2, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { authHeaders } from "@/lib/testApi";
import { SSC_CGL_T1 } from "@/lib/examPatterns";

type Attempt = {
  id: string;
  status: string;
  mode: string;
  year: number | null;
  final_score: number;
  accuracy: number;
  created_at: string;
  questions_answered: number;
  total_questions: number;
};

const PYQ_YEARS = [2025, 2024, 2023, 2022, 2021, 2020];

export default function TestHub() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [starting, setStarting] = useState<string | null>(null);
  const [pyqYear, setPyqYear] = useState(2025);
  const [err, setErr] = useState("");
  const [realCounts, setRealCounts] = useState<Record<number, number>>({});
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id || null;
      setUid(id);
      if (id) {
        const { data: rows } = await supabase
          .from("test_attempts")
          .select("*")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(10);
        setAttempts((rows || []) as Attempt[]);
      }
    };
    load();
  }, []);

  // ✅ Real-question counts per year + admin detection
  useEffect(() => {
    const loadMeta = async () => {
      const counts: Record<number, number> = {};
      await Promise.all(
        PYQ_YEARS.map(async (y) => {
          const { count } = await supabase
            .from("questions")
            .select("id", { count: "exact", head: true })
            .eq("source", "official")
            .eq("year", y);
          counts[y] = count || 0;
        })
      );
      setRealCounts(counts);
      try {
        const res = await fetch("/api/seeder", {
          method: "POST",
          headers: await authHeaders(),
          body: JSON.stringify({ action: "ping" }),
        });
        const d = await res.json();
        setIsAdminUser(!!d.admin);
      } catch {}
    };
    loadMeta();
  }, []);

  // 🔥 Background bank warming (max once per 10 min)
  useEffect(() => {
    try {
      const last = Number(localStorage.getItem("dg-seed-at") || 0);
      if (Date.now() - last > 10 * 60 * 1000) {
        localStorage.setItem("dg-seed-at", String(Date.now()));
        fetch("/api/test/seed", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
      }
    } catch {}
  }, []);

  const startTest = async (sectionId?: string, year?: number) => {
    if (!uid) { alert("Please login first to take a test!"); return; }
    const key = year ? `pyq-${year}` : sectionId || "full";
    setStarting(key);
    setErr("");
    const ctrl = new AbortController();
    const watchdog = setTimeout(() => ctrl.abort(), 60000);
    try {
      const res = await fetch("/api/test/start", {
        method: "POST",
        headers: await authHeaders(),
        signal: ctrl.signal,
        body: JSON.stringify({
          exam_id: SSC_CGL_T1.id,
          mode: year ? "pyq" : "mock",
          section_id: sectionId || null,
          year: year || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(typeof d.error === "string" ? d.error : "Failed to start test");
      router.push(`/test/${d.attempt_id}`);
    } catch (e: any) {
      setErr(e.name === "AbortError"
        ? "Server took too long — try again in a few seconds."
        : (e.message || "Failed to start"));
      setStarting(null);
    } finally {
      clearTimeout(watchdog);
    }
  };

  const openAttempt = (a: Attempt) => {
    if (a.status === "completed") router.push(`/test/${a.id}/results`);
    else router.push(`/test/${a.id}`);
  };

  const deleteAttempt = async (a: Attempt) => {
    if (!confirm(`Delete this attempt (${new Date(a.created_at).toLocaleDateString()})? This cannot be undone.`)) return;
    try {
      const res = await fetch("/api/test/delete", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ attempt_id: a.id }),
      });
      if (res.ok) setAttempts((prev) => prev.filter((x) => x.id !== a.id));
    } catch {}
  };

  const clearHistory = async () => {
    if (!confirm("Delete ALL completed test history? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/test/delete", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ clear_all: true }),
      });
      if (res.ok) setAttempts((prev) => prev.filter((x) => x.status !== "completed"));
    } catch {}
  };

  const realInYear = realCounts[pyqYear] || 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
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

      {/* INSTANT-ENTRY NOTE */}
      <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-4">
        <Zap size={14} className="text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-emerald-200 font-semibold">
          Tests open instantly — your full 100-question paper builds itself silently in the background while you answer.
        </p>
      </div>

      {/* FULL MOCK */}
      <button
        onClick={() => startTest()}
        disabled={starting !== null}
        className="press w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 font-black text-base shadow-xl shadow-red-900/30 flex items-center justify-center gap-2 disabled:opacity-60 mb-4"
      >
        {starting === "full" ? (
          <><Loader2 size={18} className="animate-spin" /> Starting...</>
        ) : (
          <>Start Full Mock Test (100 Qs • 60 min)</>
        )}
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
                <span className="flex items-center gap-2 text-sm font-black text-orange-300"><Loader2 size={15} className="animate-spin" /> Starting...</span>
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
              className={`press py-2 rounded-xl text-[11px] font-black border transition-all ${
                pyqYear === y ? "bg-violet-500/20 border-violet-500/50 text-violet-300" : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              {y}
              {/* ✅ REAL badge when official questions exist for this year */}
              {(realCounts[y] || 0) > 0 && (
                <span className="block text-[8px] font-black text-emerald-400 mt-0.5">{realCounts[y]} REAL</span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => startTest(undefined, pyqYear)}
          disabled={starting !== null}
          className="press w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 font-black text-sm shadow-xl shadow-violet-900/30 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {starting === `pyq-${pyqYear}` ? (
            <><Loader2 size={16} className="animate-spin" /> Starting {pyqYear} paper...</>
          ) : (
            <>Start {pyqYear} Paper (PYQ Pattern)</>
          )}
        </button>
        <p className="text-[10px] text-slate-500 mt-2 text-center font-semibold">
          {realInYear > 0
            ? `✅ Includes ${realInYear} REAL ${pyqYear} questions + AI pattern-matched fill`
            : `AI-recreated paper in the exact ${pyqYear} exam pattern & difficulty • ~90% new questions every attempt`}
        </p>
        {/* ✅ ADMIN-ONLY shortcut to the real-PYQ seeder */}
        {isAdminUser && (
          <Link
            href="/seeder"
            className="press mt-2 w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5"
          >
            <Upload size={13} /> Upload Real PYQs (Admin Seeder)
          </Link>
        )}
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

      {/* HISTORY with DELETE 🗑 */}
      {attempts.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={14} /> Your Attempts
            </p>
            <button onClick={clearHistory} className="press text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
              Clear All
            </button>
          </div>
          <div className="grid gap-2">
            {attempts.map((a) => (
              <div key={a.id} className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 hover:border-slate-600 rounded-xl p-3">
                <button onClick={() => openAttempt(a)} className="press flex-1 min-w-0 flex items-center justify-between text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${
                      a.status === "completed" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                    }`}>
                      {a.status === "completed" ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {a.status === "completed"
                          ? `Score: ${a.final_score}/${(a.total_questions || 100) * 2}`
                          : a.status === "preparing" ? "Preparing paper..." : "In Progress"}
                        <span className="text-[10px] text-slate-500 font-bold ml-2">{a.total_questions} Qs</span>
                        {a.year && <span className="text-[10px] font-black text-violet-400 ml-2">PYQ {a.year}</span>}
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        {new Date(a.created_at).toLocaleDateString()} • {a.questions_answered}/{a.total_questions} answered
                      </p>
                    </div>
                  </div>
                  {a.status === "completed" ? (
                    <span className={`ml-2 text-sm font-black shrink-0 ${
                      a.accuracy >= 60 ? "text-emerald-400" : a.accuracy >= 40 ? "text-amber-400" : "text-red-400"
                    }`}>
                      {Math.round(a.accuracy)}%
                    </span>
                  ) : (
                    <span className="ml-2 text-xs font-black text-amber-400 shrink-0">Resume →</span>
                  )}
                </button>
                <button
                  onClick={() => deleteAttempt(a)}
                  className="press shrink-0 w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 text-red-400 flex items-center justify-center"
                  title="Delete attempt"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}