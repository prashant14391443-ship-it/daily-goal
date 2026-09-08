"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Target, Clock, FileText, AlertTriangle, ArrowLeft, Loader2, TrendingUp, CheckCircle2, Minus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SSC_CGL_T1 } from "@/lib/examPatterns";

type Attempt = { id: string; status: string; mode: string; final_score: number; accuracy: number; created_at: string; questions_answered: number; total_questions: number };

export default function TestHub() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState("");

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

  const startTest = async () => {
    if (!uid) { alert("Please login first to take a test!"); return; }
    setStarting(true); setErr("");
    try {
      const res = await fetch("/api/test/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam_id: SSC_CGL_T1.id, mode: "mock" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to start test");
      router.push(`/test/${d.attempt_id}`);
    } catch (e: any) {
      setErr(e.message || "Failed to start");
      setStarting(false);
    }
  };

  const openAttempt = (a: Attempt) => {
    if (a.status === "completed") router.push(`/test/${a.id}/results`);
    else router.push(`/test/${a.id}`);
  };

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
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
              <p className="text-[9px] font-bold text-white/70">QUESTIONS</p>
              <p className="text-sm font-black text-white">{SSC_CGL_T1.totalQuestions}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
              <p className="text-[9px] font-bold text-white/70">MARKS</p>
              <p className="text-sm font-black text-white">{SSC_CGL_T1.totalMarks}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
              <p className="text-[9px] font-bold text-white/70">TIME</p>
              <p className="text-sm font-black text-white">{SSC_CGL_T1.durationMin}m</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
              <p className="text-[9px] font-bold text-white/70">NEGATIVE</p>
              <p className="text-sm font-black text-white">−{SSC_CGL_T1.negativeMarking}</p>
            </div>
          </div>
        </div>
      </div>

      {/* PATTERN */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText size={14} /> Exam Pattern
        </p>
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
          <p className="text-[11px] text-amber-200 font-semibold">
            +2 marks per correct answer, −0.5 for wrong. No sectional time limit — switch freely. Timer auto-submits at 0:00.
          </p>
        </div>
      </div>

      {/* START */}
      <button
        onClick={startTest}
        disabled={starting}
        className="press w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 font-black text-base shadow-xl shadow-red-900/30 flex items-center justify-center gap-2 disabled:opacity-60 mb-6"
      >
        {starting ? <><Loader2 size={18} className="animate-spin" /> Generating your paper (first time ~20s)...</> : <>Start Full Mock Test (100 Qs)</>}
      </button>
      {err && <p className="text-center text-sm font-bold text-red-400 -mt-4 mb-4">❌ {err}</p>}

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
                      {a.status === "completed" ? `Score: ${a.final_score}/${SSC_CGL_T1.totalMarks}` : "In Progress"}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      {new Date(a.created_at).toLocaleDateString()} • {a.questions_answered}/{a.total_questions} answered
                    </p>
                  </div>
                </div>
                {a.status === "completed" ? (
                  <span className={`text-sm font-black ${a.accuracy >= 60 ? "text-emerald-400" : a.accuracy >= 40 ? "text-amber-400" : "text-red-400"}`}>
                    {Math.round(a.accuracy)}%
                  </span>
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