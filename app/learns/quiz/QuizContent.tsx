"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Sparkles, Database } from "lucide-react";

type Q = { q: string; options: string[]; correct: number; explain: string; source: string };

export default function QuizContent() {
  const sp = useSearchParams();
  const track_id = sp.get("track_id") || "web-dev";
  const milestone_id = sp.get("milestone_id") || "";
  const want_ai = sp.get("ai") === "1";

  const [qs, setQs] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [meta, setMeta] = useState<{ milestone?: string; local_count?: number; ai_count?: number }>({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/learn/quiz?track_id=${track_id}&milestone_id=${milestone_id}&ai=${want_ai ? 1 : 0}`);
        const d = await res.json();
        if (res.ok) { setQs(d.questions || []); setMeta(d); }
      } catch (e) {
        console.error("Failed to load quiz", e);
      }
      setLoading(false);
    };
    load();
  }, [track_id, milestone_id, want_ai]);

  const answered = Object.keys(picked).length;
  const correct = qs.filter((q, i) => picked[i] === q.correct).length;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-400" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-8 pb-24 max-w-2xl mx-auto">
      <Link href={`/learns/${track_id}`} className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
        <ArrowLeft size={13} /> Back to track
      </Link>

      <h1 className="text-lg font-black mb-1">{meta.milestone || "Practice Quiz"}</h1>
      <p className="text-[11px] text-slate-500 font-semibold mb-5 flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
          <Database size={10} /> {meta.local_count || 0} free bank Qs
        </span>
        {(meta.ai_count || 0) > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/25 text-violet-300">
            <Sparkles size={10} /> {meta.ai_count} cached AI Qs
          </span>
        )}
      </p>

      {qs.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm font-bold text-slate-300 mb-1">No questions available yet</p>
          <p className="text-[11px] text-slate-500">Quiz bank for this milestone is being prepared.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {qs.map((q, qi) => {
            const pick = picked[qi];
            const revealed = pick !== undefined;
            return (
              <div key={qi} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-[13px] font-bold text-slate-100 mb-3">Q{qi + 1}. {q.q}</p>
                <div className="grid gap-1.5">
                  {q.options.map((opt, oi) => {
                    const isPick = pick === oi;
                    const isCorrect = oi === q.correct;
                    let cls = "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60";
                    if (revealed && isCorrect) cls = "bg-emerald-500/10 border-emerald-500/40 text-emerald-200";
                    else if (revealed && isPick && !isCorrect) cls = "bg-rose-500/10 border-rose-500/40 text-rose-200";
                    return (
                      <button key={oi} disabled={revealed}
                        onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[12px] font-semibold transition-colors ${cls}`}>
                        <span className="shrink-0 w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black">
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {revealed && isCorrect && <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />}
                        {revealed && isPick && !isCorrect && <XCircle size={14} className="text-rose-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {pick !== undefined && (
                  <p className="mt-2 text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
                    💡 {q.explain}
                  </p>
                )}
              </div>
            );
          })}

          {answered === qs.length && qs.length > 0 && (
            <div className="rounded-2xl border border-indigo-400/25 bg-indigo-500/10 p-5 text-center">
              <p className="text-xl font-black text-indigo-200">{correct}/{qs.length}</p>
              <p className="text-[11px] text-slate-400 font-semibold mt-1">
                {correct === qs.length ? "Perfect! Move to the next milestone 🎉" : correct >= qs.length / 2 ? "Good — revise the explanations above 👍" : "Revisit the resources, then retake 💪"}
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}