"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronDown, ChevronRight, Flame, Repeat, AlertTriangle, Sparkles, X, Loader2, Target } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ALL_EXAMS, getExamById, type ExamTopic } from "@/lib/examPatterns";
import { authHeaders } from "@/lib/testApi";

type TopicNote = {
  exam_id: string; topic_id: string; topic_name: string; section_name: string;
  concept_summary: string | null; key_formulas: string[] | null;
  common_traps: string[] | null; mnemonics: string | null; importance_score: number | null;
};
type TopicStat = { topic_id: string; total_pyq_count: number; last_5_years_count: number };

export default function SyllabusPage() {
  const router = useRouter();
  const [examId, setExamId] = useState(ALL_EXAMS[0].id);
  const exam = getExamById(examId) || ALL_EXAMS[0];

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<Record<string, TopicStat>>({});
  const [noteIds, setNoteIds] = useState<Set<string>>(new Set());
  const [weakIds, setWeakIds] = useState<Set<string>>(new Set());

  const [activeTopic, setActiveTopic] = useState<{ sectionName: string; topic: ExamTopic } | null>(null);
  const [note, setNote] = useState<TopicNote | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const [startingPractice, setStartingPractice] = useState(false);

  // Load PYQ stats + note availability + user's weak topics for this exam
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: st } = await supabase.from("topic_stats").select("*").eq("exam_id", examId);
      const map: Record<string, TopicStat> = {};
      (st || []).forEach((s: any) => { map[s.topic_id] = s; });

      const { data: nt } = await supabase.from("topic_notes").select("topic_id").eq("exam_id", examId);
      const nset = new Set<string>((nt || []).map((n: any) => n.topic_id));

      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      const wset = new Set<string>();
      if (uid) {
        const { data: atts } = await supabase.from("test_attempts")
          .select("weak_topics").eq("user_id", uid).eq("exam_id", examId).eq("status", "completed")
          .order("created_at", { ascending: false }).limit(3);
        (atts || []).forEach((a: any) => (a.weak_topics || []).forEach((w: any) => wset.add(w.topic_id)));
      }

      if (!cancelled) { setStats(map); setNoteIds(nset); setWeakIds(wset); }
    };
    load();
    return () => { cancelled = true; };
  }, [examId]);

  const openNote = async (sectionName: string, topic: ExamTopic) => {
    setActiveTopic({ sectionName, topic });
    setNote(null);
    setNoteLoading(true);
    const { data } = await supabase.from("topic_notes").select("*")
      .eq("exam_id", examId).eq("topic_id", topic.id).maybeSingle();
    setNote(data || null);
    setNoteLoading(false);
  };

  const startTopicPractice = async () => {
    if (!activeTopic) return;
    setStartingPractice(true);
    try {
      const res = await fetch("/api/test/start", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ exam_id: examId, topic_id: activeTopic.topic.id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to start practice");
      router.push(`/test/${d.attempt_id}`);
    } catch (e: any) {
      alert(e.message || "Could not start practice");
      setStartingPractice(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 px-4 pt-6 pb-24 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-black flex items-center gap-2 text-white">
          <BookOpen size={22} className="text-indigo-400" /> Syllabus & Smart Notes
        </h1>
        <p className="text-[11px] text-slate-500 font-semibold mt-1">
          Topic-wise cheat sheets · 🔥 high-weightage first · practice any topic instantly
        </p>
      </div>

      {/* Exam switcher */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
        {ALL_EXAMS.map((e) => (
          <button key={e.id} onClick={() => setExamId(e.id)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-black border ${examId === e.id ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-200" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
            {e.shortName}
          </button>
        ))}
      </div>

      {/* Sections → Topics tree */}
      <div className="grid gap-3">
        {exam.sections.map((s, si) => {
          const open = openSections[s.id] ?? si === 0;
          return (
            <div key={s.id} className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
              <button onClick={() => setOpenSections((o) => ({ ...o, [s.id]: !open }))}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                {open ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                <p className="text-sm font-bold text-white flex-1">{s.name}</p>
                <p className="text-[10px] font-bold text-slate-500">{s.questionCount} Qs · {s.questionCount * s.marksPerQ} marks</p>
              </button>

              {open && (
                <div className="px-3 pb-3 grid gap-1.5">
                  {[...s.topics].sort((a, b) => b.weight - a.weight).map((t) => {
                    const st = stats[t.id];
                    const repeated = (st?.total_pyq_count || 0) >= 5 || (st?.last_5_years_count || 0) >= 3;
                    return (
                      <button key={t.id} onClick={() => openNote(s.name, t)}
                        className="w-full flex items-center gap-2 px-3 py-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/30 text-left">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-100 truncate">{t.name}</p>
                          <div className="flex gap-1.5 mt-1 flex-wrap">
                            {t.weight >= 4 && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/25 text-[9px] font-black text-orange-300">
                                <Flame size={9} /> HIGH WEIGHTAGE
                              </span>
                            )}
                            {repeated && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/25 text-[9px] font-black text-teal-300">
                                <Repeat size={9} /> REPEATED {st?.total_pyq_count}× IN PYQs
                              </span>
                            )}
                            {weakIds.has(t.id) && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/25 text-[9px] font-black text-rose-300">
                                <AlertTriangle size={9} /> YOUR WEAK AREA
                              </span>
                            )}
                          </div>
                        </div>
                        {noteIds.has(t.id) ? (
                          <span className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[9px] font-black text-emerald-300">
                            <Sparkles size={10} /> NOTES
                          </span>
                        ) : (
                          <span className="shrink-0 text-[9px] font-bold text-slate-600">no notes</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── NOTE READER MODAL ── */}
      {activeTopic && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setActiveTopic(null)}>
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-slate-800 bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-wider">{activeTopic.sectionName}</p>
                <h2 className="text-base font-black text-white">{activeTopic.topic.name}</h2>
              </div>
              <button onClick={() => setActiveTopic(null)} className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center"><X size={14} /></button>
            </div>

            {noteLoading ? (
              <div className="py-10 text-center"><Loader2 size={22} className="animate-spin mx-auto text-indigo-400" /></div>
            ) : note ? (
              <div className="grid gap-4">
                {note.concept_summary && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5">Core Concepts</p>
                    <ul className="grid gap-1.5">
                      {note.concept_summary.split("\n").filter((l) => l.trim()).map((line, i) => (
                        <li key={i} className="text-[13px] text-slate-200 leading-relaxed">{line.replace(/^-\s*/, "• ")}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {note.key_formulas && note.key_formulas.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5">Key Formulas</p>
                    <div className="grid gap-1.5">
                      {note.key_formulas.map((f, i) => (
                        <p key={i} className="text-[12px] font-mono text-emerald-200 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{f}</p>
                      ))}
                    </div>
                  </div>
                )}
                {note.common_traps && note.common_traps.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-rose-300 uppercase mb-1.5 flex items-center gap-1"><AlertTriangle size={11} /> Examiner Traps</p>
                    <ul className="grid gap-1.5">
                      {note.common_traps.map((tr, i) => (
                        <li key={i} className="text-[12px] text-rose-100/80 leading-relaxed bg-rose-500/5 border border-rose-500/15 rounded-lg px-3 py-2">{tr}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {note.mnemonics && (
                  <div className="rounded-xl bg-violet-500/10 border border-violet-500/25 px-3 py-2.5">
                    <p className="text-[10px] font-black text-violet-300 uppercase mb-0.5">Memory Trick</p>
                    <p className="text-[13px] text-violet-100 font-semibold">{note.mnemonics}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm font-bold text-slate-300 mb-1">Notes not generated yet</p>
                <p className="text-[11px] text-slate-500">Admin: run /api/admin/generate-notes for this exam to create cheat sheets.</p>
              </div>
            )}

            <button onClick={startTopicPractice} disabled={startingPractice}
              className="w-full mt-5 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50">
              {startingPractice ? <><Loader2 size={15} className="animate-spin" /> Preparing…</> : <><Target size={15} /> Practice 10 Questions on this Topic</>}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}