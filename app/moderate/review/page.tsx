"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, Lock, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { authHeaders } from "@/lib/testApi";
import { SSC_CGL_T1 } from "@/lib/examPatterns";

type PendingQ = {
  id: string; user_id: string; exam_id: string; section_id: string; topic_id: string;
  year: number | null; question_text: string; options: string[]; correct_index: number;
  explanation: string | null; submitted_at: string;
};

export default function ReviewPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [pending, setPending] = useState<PendingQ[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { setAllowed(false); return; }
      try {
        const res = await fetch("/api/community/approve", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "list" }) });
        const d = await res.json();
        setAllowed(!!d.admin);
        if (d.admin) {
          const { data: rows } = await supabase.from("community_questions").select("*").eq("status", "pending").order("submitted_at", { ascending: false });
          setPending((rows || []) as PendingQ[]);
        }
      } catch { setAllowed(false); }
      setLoading(false);
    };
    check();
  }, []);

  const topicName = (id: string) => SSC_CGL_T1.sections.flatMap((s) => s.topics).find((t) => t.id === id)?.name || id;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(pending.map((q) => q.id)));
  };

  const approve = async () => {
    if (selected.size === 0) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/community/approve", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "approve", question_ids: [...selected] }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      alert(`✅ Approved ${d.approved} questions! ${d.coins_awarded} coins awarded to contributors.`);
      setPending((prev) => prev.filter((q) => !selected.has(q.id)));
      setSelected(new Set());
    } catch (e: any) { alert(`❌ ${e.message}`); }
    setProcessing(false);
  };

  const reject = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Reject ${selected.size} questions?`)) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/community/approve", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "reject", question_ids: [...selected] }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      alert(`Rejected ${d.rejected} questions.`);
      setPending((prev) => prev.filter((q) => !selected.has(q.id)));
      setSelected(new Set());
    } catch (e: any) { alert(`❌ ${e.message}`); }
    setProcessing(false);
  };

  if (loading) return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center"><Loader2 className="animate-spin" /></main>;
  if (!allowed) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center max-w-sm w-full">
          <Lock size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-lg font-black mb-1">Admin Only</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2"><FileText size={22} className="text-amber-400" /> Review Community Submissions</h1>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">{pending.length} pending questions</p>
        </div>
        {pending.length > 0 && (
          <button onClick={selectAll} className="press px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-black">Select All</button>
        )}
      </div>

      {pending.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-4 flex items-center justify-between gap-2">
          <p className="text-xs font-black text-slate-300">{selected.size} selected</p>
          <div className="flex gap-2">
            <button onClick={reject} disabled={processing || selected.size === 0} className="press px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-black disabled:opacity-50 flex items-center gap-1">
              <XCircle size={12} /> Reject
            </button>
            <button onClick={approve} disabled={processing || selected.size === 0} className="press px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black disabled:opacity-50 flex items-center gap-1">
              <CheckCircle2 size={12} /> Approve (+coins)
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {pending.map((q) => (
          <div key={q.id} className={`bg-slate-900 border rounded-xl p-4 cursor-pointer ${selected.has(q.id) ? "border-emerald-500" : "border-slate-800"}`} onClick={() => toggle(q.id)}>
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={selected.has(q.id)} onChange={() => {}} className="mt-1" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-800 text-slate-400">{SSC_CGL_T1.sections.find((s) => s.id === q.section_id)?.shortName}</span>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-800 text-slate-500">{topicName(q.topic_id)}</span>
                  {q.year && <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-violet-500/20 text-violet-300">{q.year}</span>}
                </div>
                <p className="text-sm font-bold text-white mb-2">{q.question_text}</p>
                <div className="grid gap-1">
                  {q.options.map((opt, i) => (
                    <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${i === q.correct_index ? "bg-emerald-500/15 text-emerald-200" : "bg-slate-800/50 text-slate-400"}`}>
                      <span className="font-black shrink-0">{String.fromCharCode(65 + i)}.</span>
                      <span className="flex-1">{opt}</span>
                      {i === q.correct_index && <CheckCircle2 size={11} className="text-emerald-400 shrink-0 mt-0.5" />}
                    </div>
                  ))}
                </div>
                {q.explanation && <p className="text-[10px] text-cyan-400 mt-2 font-semibold">Explanation: {q.explanation}</p>}
              </div>
            </div>
          </div>
        ))}
        {pending.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
            <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-black text-slate-300">All caught up! No pending submissions.</p>
          </div>
        )}
      </div>
    </main>
  );
}