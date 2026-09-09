"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight, Bookmark, Eraser, Send, AlertTriangle, LayoutGrid, X, Loader2 } from "lucide-react";
import { getExamById, type ExamPattern } from "@/lib/examPatterns";
import { authHeaders } from "@/lib/testApi";

type Q = { 
  id: string; 
  order: number; 
  section_id: string; 
  topic_id: string; 
  question_text: string; 
  options: string[] 
};

function fmtClock(s: number) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
}

export default function LiveTest() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params.attemptId as string;

  const [qs, setQs] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [testTitle, setTestTitle] = useState("Mock Test");
  const [totalQ, setTotalQ] = useState(0);
  const [jumpLoading, setJumpLoading] = useState(false);
  const [exam, setExam] = useState<ExamPattern | null>(null);

  const enterRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const qsRef = useRef<Q[]>([]);
  const answersRef = useRef<Record<string, number | null>>({});
  const totalRef = useRef(0);
  const moreRef = useRef(false);
  
  useEffect(() => { qsRef.current = qs; }, [qs]);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const cur = qs[idx] || null;

  const postAnswer = useCallback((qid: string, val: number | null, sec: number) => {
    authHeaders().then((h) =>
      fetch("/api/test/answer", {
        method: "POST", headers: h,
        body: JSON.stringify({ attempt_id: attemptId, question_id: qid, user_answer: val, time_taken_sec: sec }),
      }).catch(() => {})
    );
  }, [attemptId]);

  const appendQuestions = useCallback((news: any[]) => {
    if (!news || news.length === 0) return;
    setQs((prev) => {
      const ids = new Set(prev.map((q) => q.id));
      const add: Q[] = news
        .filter((q: any) => !ids.has(q.id))
        .map((q: any): Q => ({ 
          id: q.id, 
          order: q.order, 
          section_id: q.section_id, 
          topic_id: q.topic_id, 
          question_text: q.question_text, 
          options: q.options 
        }));
      return [...prev, ...add].sort((a: Q, b: Q) => a.order - b.order);
    });
  }, []);

  const topupNow = useCallback(async (budget = 20000) => {
    if (moreRef.current) return;
    moreRef.current = true;
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/test/topup", {
        method: "POST", headers,
        body: JSON.stringify({ attempt_id: attemptId, budget }),
      });
      const d = await res.json();
      if (res.ok && d.new_questions?.length) appendQuestions(d.new_questions);
    } catch {}
    moreRef.current = false;
  }, [attemptId, appendQuestions]);

  const finishTest = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSubmitting(true);
    try {
      const all = qsRef.current;
      const ans = answersRef.current;
      const unanswered = all.filter((q) => ans[q.id] === undefined);
      const headers = await authHeaders();
      await Promise.all(unanswered.map((q) =>
        fetch("/api/test/answer", {
          method: "POST", headers,
          body: JSON.stringify({ attempt_id: attemptId, question_id: q.id, user_answer: null, time_taken_sec: 0 }),
        })
      ));
      await fetch("/api/test/finish", { method: "POST", headers, body: JSON.stringify({ attempt_id: attemptId }) });
    } catch {}
    router.replace(`/test/${attemptId}/results`);
  }, [attemptId, router]);

  useEffect(() => {
    const load = async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`/api/test/${attemptId}`, { headers });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        if (d.attempt.status === "completed") { router.replace(`/test/${attemptId}/results`); return; }

        const ex = getExamById(d.attempt.exam_id) || getExamById("SSC-CGL-T1")!;
        setExam(ex);

        const sheet: Q[] = (d.answer_sheet || []).map((r: any): Q => ({
          id: r.question_id, 
          order: r.order, 
          section_id: r.section_id, 
          topic_id: r.topic_id,
          question_text: r.question_text, 
          options: r.options,
        })).sort((a: Q, b: Q) => a.order - b.order);
        
        setQs(sheet);
        const total = d.attempt.total_questions || sheet.length;
        setTotalQ(total);
        totalRef.current = total;

        if (sheet.length > 0 && new Set(sheet.map((q) => q.section_id)).size === 1) {
          const sectionName = ex.sections.find((s) => s.id === sheet[0].section_id)?.shortName;
          setTestTitle(`${sectionName} Sectional`);
        } else if (d.attempt.year) {
          setTestTitle(d.attempt.mode === "pyq-real" ? `Real ${d.attempt.year}` : `PYQ ${d.attempt.year}`);
        } else {
          setTestTitle("Full Mock");
        }

        const ans: Record<string, number | null> = {};
        const vis: Record<string, boolean> = {};
        (d.answer_sheet || []).forEach((r: any) => {
          if (r.user_answer !== null && r.user_answer !== undefined) { ans[r.question_id] = r.user_answer; vis[r.question_id] = true; }
        });
        setAnswers(ans);
        setVisited(vis);
        if (sheet.length > 0) setVisited((v) => ({ ...v, [sheet[0].id]: true }));

        const durationMin = Math.max(5, Math.round(ex.durationMin * (total / ex.totalQuestions)));
        const elapsed = Math.floor((Date.now() - new Date(d.attempt.started_at).getTime()) / 1000);
        setTimeLeft(Math.max(0, durationMin * 60 - elapsed));
        setLoading(false);
      } catch {
        router.replace("/test");
      }
    };
    load();
  }, [attemptId, router]);

  useEffect(() => {
    if (loading) return;
    const t = setInterval(() => {
      if (qsRef.current.length < totalRef.current && !moreRef.current && !finishedRef.current) topupNow(15000);
    }, 10000);
    return () => clearInterval(t);
  }, [loading, topupNow]);

  useEffect(() => {
    if (loading || timeLeft === null) return;
    const t = setInterval(() => {
      setTimeLeft((s) => Math.max(0, (s || 0) - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [loading, timeLeft]);

  useEffect(() => {
    if (!loading && timeLeft === 0) {
      finishTest();
    }
  }, [loading, timeLeft, finishTest]);

  const goTo = (i: number) => {
    const list = qsRef.current;
    if (i < 0 || i >= list.length) return;
    setVisited((v) => ({ ...v, [list[i].id]: true }));
    setIdx(i);
    enterRef.current = Date.now();
    setShowPalette(false);
    if (i + 2 >= list.length && list.length < totalRef.current) topupNow(15000);
  };

  const jumpTo = async (i: number) => {
    if (i < qsRef.current.length) { goTo(i); return; }
    setJumpLoading(true);
    await topupNow(25000);
    setJumpLoading(false);
    if (i < qsRef.current.length) goTo(i);
  };

  const next = async () => {
    if (idx + 1 >= qsRef.current.length) {
      if (qsRef.current.length >= totalRef.current) return;
      setJumpLoading(true);
      await topupNow(25000);
      setJumpLoading(false);
      if (idx + 1 >= qsRef.current.length) return;
    }
    goTo(idx + 1);
  };

  const selectOption = (val: number) => {
    if (!cur) return;
    const sec = Math.max(1, Math.round((Date.now() - enterRef.current) / 1000));
    setAnswers((a) => ({ ...a, [cur.id]: val }));
    setVisited((v) => ({ ...v, [cur.id]: true }));
    postAnswer(cur.id, val, sec);
  };

  const clearResponse = () => {
    if (!cur) return;
    setAnswers((a) => ({ ...a, [cur.id]: null }));
    postAnswer(cur.id, null, 0);
  };

  const toggleMark = () => {
    if (!cur) return;
    setMarked((m) => ({ ...m, [cur.id]: !m[cur.id] }));
  };

  const statusOf = (q: Q): string => {
    const a = answers[q.id];
    const m = marked[q.id];
    if (a !== undefined && a !== null) return m ? "answered-marked" : "answered";
    if (m) return "marked";
    if (visited[q.id]) return "visited";
    return "not-visited";
  };

  const paletteColor = (q: Q) => {
    const s = statusOf(q);
    if (s === "answered") return "bg-emerald-600 text-white";
    if (s === "answered-marked") return "bg-emerald-600 text-white ring-2 ring-violet-400";
    if (s === "marked") return "bg-violet-600 text-white";
    if (s === "visited") return "bg-red-500/80 text-white";
    return "bg-slate-700 text-slate-300";
  };

  const answeredCount = qs.filter((q) => answers[q.id] !== undefined && answers[q.id] !== null).length;
  const markedCount = qs.filter((q) => marked[q.id]).length;

  if (loading || !exam || timeLeft === null) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-orange-500/20 flex items-center justify-center animate-pulse">
            <Clock size={24} className="text-orange-400" />
          </div>
          <p className="text-sm font-black">Loading your paper...</p>
        </div>
      </main>
    );
  }

  const marksPerQ = cur 
    ? (exam.sections.find((s) => s.id === cur.section_id)?.marksPerQ ?? 2)
    : (exam.sections[0]?.marksPerQ ?? 2);

  const renderPalette = () => {
    const slots = activeSection
      ? Array.from({ length: qs.length }, (_, i) => i).filter((i) => qs[i].section_id === activeSection)
      : Array.from({ length: totalQ || qs.length }, (_, i) => i);
    return (
      <>
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button onClick={() => setActiveSection(null)} className={`press px-2.5 py-1 rounded-lg text-[10px] font-black border ${!activeSection ? "bg-orange-500/20 border-orange-500/40 text-orange-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
            All ({totalQ || qs.length})
          </button>
          {exam.sections.map((s) => (
            <button key={s.id} onClick={() => setActiveSection(s.id)} className={`press px-2.5 py-1 rounded-lg text-[10px] font-black border ${activeSection === s.id ? "bg-orange-500/20 border-orange-500/40 text-orange-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
              {s.shortName}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1.5 mb-4">
          {slots.map((i) => {
            const q = qs[i];
            return (
              <button key={i} onClick={() => jumpTo(i)} className={`press h-9 rounded-lg text-xs font-black ${q ? paletteColor(q) : "bg-slate-800/40 text-slate-600"} ${i === idx ? "ring-2 ring-white" : ""}`}>
                {i + 1}
              </button>
            );
          })}
        </div>
        <div className="grid gap-1.5 text-[10px] font-bold text-slate-400">
          <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-600" /> Answered ({answeredCount})</p>
          <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500/80" /> Seen, not answered</p>
          <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-violet-600" /> Marked for review</p>
          <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-slate-700" /> Not visited</p>
          <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-slate-800/40" /> Still loading (tap anytime)</p>
        </div>
      </>
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col">
      <div className="shrink-0 bg-slate-900 border-b border-slate-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-black text-white truncate">{exam.name} — {testTitle}</p>
            <p className="text-[10px] text-slate-500 font-bold">
              Q {idx + 1}/{totalQ || qs.length} • {answeredCount} answered • {markedCount} marked
              {qs.length < totalQ && <span className="text-slate-600"> • {qs.length} loaded</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-black border ${timeLeft <= 300 ? "bg-red-500/15 border-red-500/40 text-red-400 animate-pulse" : "bg-slate-800 border-slate-700 text-white"}`}>
              <Clock size={14} /> {fmtClock(timeLeft)}
            </span>
            <button onClick={() => setShowSubmit(true)} disabled={submitting} className="press px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-sm font-black flex items-center gap-1.5 disabled:opacity-60">
              <Send size={14} /> Submit
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="max-w-3xl mx-auto">
            {cur && (
              <>
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-slate-800 border border-slate-700 text-slate-300">
                    {exam.sections.find((s) => s.id === cur.section_id)?.shortName}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-slate-800 border border-slate-700 text-slate-400">
                    Q{idx + 1} • +{marksPerQ} / −{exam.negativeMarking}
                  </span>
                  {marked[cur.id] && <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-violet-500/15 border border-violet-500/40 text-violet-300">Marked</span>}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
                  <p className="text-base font-bold leading-relaxed whitespace-pre-wrap">{cur.question_text}</p>
                </div>

                <div className="grid gap-2 mb-5">
                  {cur.options.map((opt, i) => {
                    const picked = answers[cur.id] === i;
                    return (
                      <button key={i} onClick={() => selectOption(i)} className={`press flex items-start gap-3 p-4 rounded-xl border text-left text-sm transition-all ${picked ? "bg-emerald-500/15 border-emerald-500" : "bg-slate-900 border-slate-800 hover:border-slate-600"}`}>
                        <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${picked ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-300"}`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="flex-1 leading-relaxed text-slate-100">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => goTo(idx - 1)} disabled={idx === 0} className="press px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-black text-slate-300 flex items-center gap-1.5 disabled:opacity-40">
                    <ChevronLeft size={15} /> Previous
                  </button>
                  <button onClick={clearResponse} className="press px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-black text-slate-300 flex items-center gap-1.5">
                    <Eraser size={15} /> Clear
                  </button>
                  <button onClick={toggleMark} className={`press px-4 py-2.5 rounded-xl border text-sm font-black flex items-center gap-1.5 ${marked[cur.id] ? "bg-violet-500/15 border-violet-500/40 text-violet-300" : "bg-slate-800 border-slate-700 text-slate-300"}`}>
                    <Bookmark size={15} /> {marked[cur.id] ? "Unmark" : "Mark for Review"}
                  </button>
                  <button onClick={next} disabled={jumpLoading} className="press px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-sm font-black flex items-center gap-1.5 ml-auto disabled:opacity-60">
                    {jumpLoading ? <Loader2 size={15} className="animate-spin" /> : <>Save & Next <ChevronRight size={15} /></>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <aside className="hidden md:block w-72 shrink-0 border-l border-slate-800 bg-slate-900 overflow-y-auto p-4">
          {renderPalette()}
        </aside>
      </div>

      {showPalette && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden" onClick={() => setShowPalette(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-slate-900 border-l border-slate-800 overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-black">Question Palette</p>
              <button onClick={() => setShowPalette(false)} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center"><X size={15} /></button>
            </div>
            {renderPalette()}
          </div>
        </div>
      )}

      <button onClick={() => setShowPalette(true)} className="md:hidden fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-600 shadow-xl flex items-center justify-center">
        <LayoutGrid size={22} className="text-white" />
      </button>

      {showSubmit && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <Send size={24} className="text-emerald-400" />
            </div>
            <p className="text-lg font-black text-center text-white mb-4">Submit Test?</p>
            <div className="grid grid-cols-3 gap-2 mb-5 text-center">
              <div className="bg-emerald-500/10 rounded-xl p-3"><p className="text-xl font-black text-emerald-400">{answeredCount}</p><p className="text-[9px] font-bold text-slate-500">ANSWERED</p></div>
              <div className="bg-violet-500/10 rounded-xl p-3"><p className="text-xl font-black text-violet-400">{markedCount}</p><p className="text-[9px] font-bold text-slate-500">MARKED</p></div>
              <div className="bg-red-500/10 rounded-xl p-3"><p className="text-xl font-black text-red-400">{(totalQ || qs.length) - answeredCount}</p><p className="text-[9px] font-bold text-slate-500">LEFT</p></div>
            </div>
            {(totalQ || qs.length) - answeredCount > 0 && (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-200 font-semibold">{(totalQ || qs.length) - answeredCount} questions unanswered — they will count as skipped (no negative marks).</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setShowSubmit(false)} className="press py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-black text-slate-300">Keep Going</button>
              <button onClick={finishTest} disabled={submitting} className="press py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-sm font-black disabled:opacity-60">
                {submitting ? "Submitting..." : "Submit Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}