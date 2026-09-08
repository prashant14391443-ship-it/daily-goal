"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight, Bookmark, Eraser, Send, AlertTriangle, LayoutGrid, X } from "lucide-react";
import { SSC_CGL_T1 } from "@/lib/examPatterns";

type Q = { id: string; order: number; section_id: string; topic_id: string; question_text: string; options: string[] };

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
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const enterRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const qsRef = useRef<Q[]>([]);
  const answersRef = useRef<Record<string, number | null>>({});
  useEffect(() => { qsRef.current = qs; }, [qs]);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const cur = qs[idx] || null;

  const postAnswer = useCallback((qid: string, val: number | null, sec: number) => {
    fetch("/api/test/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attempt_id: attemptId, question_id: qid, user_answer: val, time_taken_sec: sec }),
    }).catch(() => {});
  }, [attemptId]);

  const finishTest = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSubmitting(true);
    try {
      const all = qsRef.current;
      const ans = answersRef.current;
      const unanswered = all.filter((q) => ans[q.id] === undefined);
      await Promise.all(unanswered.map((q) =>
        fetch("/api/test/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attempt_id: attemptId, question_id: q.id, user_answer: null, time_taken_sec: 0 }),
        })
      ));
      await fetch("/api/test/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempt_id: attemptId }),
      });
    } catch {}
    router.replace(`/test/${attemptId}/results`);
  }, [attemptId, router]);

  // Load attempt (supports resume after refresh)
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/test/${attemptId}`);
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        if (d.attempt.status === "completed") { router.replace(`/test/${attemptId}/results`); return; }
        const sheet: Q[] = (d.answer_sheet || []).map((r: any) => ({
          id: r.question_id, order: r.order, section_id: r.section_id, topic_id: r.topic_id,
          question_text: r.question_text, options: r.options,
        }));
        setQs(sheet);
        const ans: Record<string, number | null> = {};
        const vis: Record<string, boolean> = {};
        (d.answer_sheet || []).forEach((r: any) => {
          if (r.user_answer !== null && r.user_answer !== undefined) { ans[r.question_id] = r.user_answer; vis[r.question_id] = true; }
        });
        setAnswers(ans);
        setVisited(vis);
        if (sheet.length > 0) setVisited((v) => ({ ...v, [sheet[0].id]: true }));
        const elapsed = Math.floor((Date.now() - new Date(d.attempt.started_at).getTime()) / 1000);
        setTimeLeft(Math.max(0, SSC_CGL_T1.durationMin * 60 - elapsed));
        setLoading(false);
      } catch {
        router.replace("/test");
      }
    };
    load();
  }, [attemptId, router]);

  // Countdown timer + auto-submit
  useEffect(() => {
    if (loading) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) { clearInterval(t); finishTest(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [loading, finishTest]);

  const goTo = (i: number) => {
    if (i < 0 || i >= qs.length) return;
    setVisited((v) => ({ ...v, [qs[i].id]: true }));
    setIdx(i);
    enterRef.current = Date.now();
    setShowPalette(false);
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
  const paletteQs = activeSection ? qs.filter((q) => q.section_id === activeSection) : qs;

  if (loading) {
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

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* TOP BAR */}
      <div className="shrink-0 bg-slate-900 border-b border-slate-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-black text-white truncate">{SSC_CGL_T1.name} — Mock Test</p>
            <p className="text-[10px] text-slate-500 font-bold">Q {idx + 1}/{qs.length} • {answeredCount} answered • {markedCount} marked</p>
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
        {/* QUESTION AREA */}
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="max-w-3xl mx-auto">
            {cur && (
              <>
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-slate-800 border border-slate-700 text-slate-300">
                    {SSC_CGL_T1.sections.find((s) => s.id === cur.section_id)?.shortName}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-slate-800 border border-slate-700 text-slate-400">
                    Q{idx + 1} • +2 / −0.5
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
                      <button
                        key={i}
                        onClick={() => selectOption(i)}
                        className={`press flex items-start gap-3 p-4 rounded-xl border text-left text-sm transition-all ${picked ? "bg-emerald-500/15 border-emerald-500" : "bg-slate-900 border-slate-800 hover:border-slate-600"}`}
                      >
                        <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${picked ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-300"}`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="flex-1 leading-relaxed text-slate-100">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* ACTION ROW */}
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
                  <button onClick={() => goTo(idx + 1)} disabled={idx === qs.length - 1} className="press px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-sm font-black flex items-center gap-1.5 ml-auto disabled:opacity-40">
                    Save & Next <ChevronRight size={15} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* PALETTE — desktop sidebar */}
        <aside className="hidden md:block w-72 shrink-0 border-l border-slate-800 bg-slate-900 overflow-y-auto p-4">
          <Palette
            paletteQs={paletteQs}
            qs={qs}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            idx={idx}
            goTo={goTo}
            paletteColor={paletteColor}
            answeredCount={answeredCount}
          />
        </aside>
      </div>

      {/* PALETTE — mobile drawer */}
      {showPalette && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden" onClick={() => setShowPalette(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-slate-900 border-l border-slate-800 overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-black">Question Palette</p>
              <button onClick={() => setShowPalette(false)} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center"><X size={15} /></button>
            </div>
            <Palette
              paletteQs={paletteQs}
              qs={qs}
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              idx={idx}
              goTo={goTo}
              paletteColor={paletteColor}
              answeredCount={answeredCount}
            />
          </div>
        </div>
      )}

      {/* mobile palette toggle */}
      <button onClick={() => setShowPalette(true)} className="md:hidden fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-600 shadow-xl flex items-center justify-center">
        <LayoutGrid size={22} className="text-white" />
      </button>

      {/* SUBMIT MODAL */}
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
              <div className="bg-red-500/10 rounded-xl p-3"><p className="text-xl font-black text-red-400">{qs.length - answeredCount}</p><p className="text-[9px] font-bold text-slate-500">LEFT</p></div>
            </div>
            {qs.length - answeredCount > 0 && (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-200 font-semibold">{qs.length - answeredCount} questions unanswered — they will count as skipped (no negative marks).</p>
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

/* ── Question Palette component ── */
function Palette({ paletteQs, qs, activeSection, setActiveSection, idx, goTo, paletteColor, answeredCount }: any) {
  return (
    <>
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button onClick={() => setActiveSection(null)} className={`press px-2.5 py-1 rounded-lg text-[10px] font-black border ${!activeSection ? "bg-orange-500/20 border-orange-500/40 text-orange-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
          All ({qs.length})
        </button>
        {SSC_CGL_T1.sections.map((s) => (
          <button key={s.id} onClick={() => setActiveSection(s.id)} className={`press px-2.5 py-1 rounded-lg text-[10px] font-black border ${activeSection === s.id ? "bg-orange-500/20 border-orange-500/40 text-orange-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
            {s.shortName}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1.5 mb-4">
        {paletteQs.map((q: Q) => {
          const num = qs.indexOf(q) + 1;
          return (
            <button
              key={q.id}
              onClick={() => goTo(num - 1)}
              className={`press h-9 rounded-lg text-xs font-black ${paletteColor(q)} ${num - 1 === idx ? "ring-2 ring-white" : ""}`}
            >
              {num}
            </button>
          );
        })}
      </div>
      <div className="grid gap-1.5 text-[10px] font-bold text-slate-400">
        <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-600" /> Answered ({answeredCount})</p>
        <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500/80" /> Seen, not answered</p>
        <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-violet-600" /> Marked for review</p>
        <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-slate-700" /> Not visited</p>
      </div>
    </>
  );
}