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
  question_type: string;
  question_text: string;
  options: string[];
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
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [paletteSection, setPaletteSection] = useState<string | "all">("all");
  const [testTitle, setTestTitle] = useState("Mock Test");
  const [totalQ, setTotalQ] = useState(0);
  const [exam, setExam] = useState<ExamPattern | null>(null);
  const [topupError, setTopupError] = useState("");
  const [finishError, setFinishError] = useState("");

  const enterRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const qsRef = useRef<Q[]>([]);
  const answersRef = useRef<Record<string, string | null>>({});
  const totalRef = useRef(0);
  const moreRef = useRef(false);

  useEffect(() => { qsRef.current = qs; }, [qs]);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const cur = qs[idx] || null;

  // ==========================================
  // Save answer in background (fire & forget)
  // ==========================================
  const postAnswer = useCallback((qid: string, val: string | number | null, sec: number) => {
    authHeaders().then((h) =>
      fetch("/api/test/answer", {
        method: "POST", headers: h,
        body: JSON.stringify({ attempt_id: attemptId, question_id: qid, user_answer: val !== null ? String(val) : null, time_taken_sec: sec }),
      }).catch(() => {})
    );
  }, [attemptId]);

  // ==========================================
  // Append incoming questions (dedupe + sort)
  // ==========================================
  const appendQuestions = useCallback((news: any[]) => {
    if (!news || news.length === 0) return;
    setQs((prev) => {
      const ids = new Set(prev.map((q) => q.id));
      const add: Q[] = news
        .filter((q: any) => q && !ids.has(q.id))
        .map((q: any): Q => ({
          id: q.id, order: q.order, section_id: q.section_id, topic_id: q.topic_id,
          question_type: q.question_type || "mcq-4",
          question_text: q.question_text, options: q.options || [],
        }));
      if (add.length === 0) return prev;
      return [...prev, ...add].sort((a, b) => a.order - b.order);
    });
  }, []);

  // ==========================================
  // Background top-up call
  // ==========================================
  const topupNow = useCallback(async (budget = 9000) => {
    if (moreRef.current || finishedRef.current) return;
    moreRef.current = true;
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/test/topup", {
        method: "POST", headers,
        body: JSON.stringify({ attempt_id: attemptId, budget }),
      });
      const d = await res.json();
      if (res.ok && d.new_questions?.length) {
        appendQuestions(d.new_questions);
        setTopupError("");
      } else if (!res.ok) {
        // Silent retry next tick; only show message if we have very few questions
        if (qsRef.current.length < 5) setTopupError("Adding more questions… please keep answering.");
      }
    } catch {}
    moreRef.current = false;
  }, [attemptId, appendQuestions]);

  // ==========================================
  // Submit test
  // ==========================================
  const finishTest = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSubmitting(true);
    setFinishError("");
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/test/finish", {
        method: "POST", headers,
        body: JSON.stringify({ attempt_id: attemptId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Submit failed");
      router.replace(`/test/${attemptId}/results`);
    } catch (e: any) {
      setFinishError(e.message || "Submit failed, try again");
      finishedRef.current = false;
      setSubmitting(false);
    }
  }, [attemptId, router]);

  // ==========================================
  // 🔥 INSTANT LOAD — never stuck on spinner
  // ==========================================
  useEffect(() => {
    const load = async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`/api/test/${attemptId}`, { headers });
        const d = await res.json();
        if (!res.ok || !d.attempt) { router.replace("/test"); return; }
        if (d.attempt.status === "completed") { router.replace(`/test/${attemptId}/results`); return; }

        const examObj = getExamById(d.attempt.exam_id) || null;
        setExam(examObj);
        const target = d.attempt.total_questions || 0;
        setTotalQ(target);
        totalRef.current = target;
        setTestTitle(
          d.attempt.mode === "pyq-real" ? `Real ${d.attempt.year} Paper`
          : d.attempt.year ? `PYQ ${d.attempt.year} Pattern`
          : "Mock Test"
        );
        if (Array.isArray(d.answer_sheet) && d.answer_sheet.length > 0) {
          appendQuestions(d.answer_sheet.map((a: any) => ({ ...a, id: a.question_id })));
        }
        setLoading(false);
      } catch {
        router.replace("/test");
      }
    };
    load();
  }, [attemptId, router, appendQuestions]);

  // 🔥 Countdown starts only when the first question is on screen
  useEffect(() => {
    if (timeLeft === null && qs.length > 0 && exam && !finishedRef.current) {
      setTimeLeft((exam.durationMin || 60) * 60);
    }
  }, [qs.length, exam, timeLeft]);

  // Countdown ticker
  const timerOn = timeLeft !== null;
  useEffect(() => {
    if (!timerOn) return;
    const iv = setInterval(() => {
      setTimeLeft((t) => (t === null ? null : Math.max(0, t - 1)));
    }, 1000);
    return () => clearInterval(iv);
  }, [timerOn]);

  // Auto-submit at 0:00
  useEffect(() => {
    if (timeLeft === 0 && !finishedRef.current) finishTest();
  }, [timeLeft, finishTest]);

  // 🔥 Background paper builder: top up every 9s while the user answers
  useEffect(() => {
    const iv = setInterval(() => {
      if (finishedRef.current) return;
      if (totalRef.current > 0 && qsRef.current.length >= totalRef.current) return;
      topupNow(9000);
    }, 9000);
    return () => clearInterval(iv);
  }, [topupNow]);

  // Mark visited + reset per-question timer when moving
  useEffect(() => {
    if (!cur) return;
    setVisited((v) => (v[cur.id] ? v : { ...v, [cur.id]: true }));
    enterRef.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // ==========================================
  // Answer actions
  // ==========================================
  const selectOption = (val: string | number) => {
    if (!cur) return;
    const sec = Math.max(1, Math.round((Date.now() - enterRef.current) / 1000));
    setAnswers((a) => ({ ...a, [cur.id]: String(val) }));
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

  const goNext = () => {
    if (idx < qs.length - 1) setIdx(idx + 1);
    // 🔥 Pre-fetch: when near the end, ask for more questions now
    if (idx + 2 >= qs.length && totalRef.current > qs.length) topupNow(9000);
  };

  const goPrev = () => {
    if (idx > 0) setIdx(idx - 1);
  };

  const statusOf = (q: Q): "answered" | "marked" | "seen" | "unseen" => {
    const a = answers[q.id];
    if (a !== undefined && a !== null && a !== "null") return "answered";
    if (marked[q.id]) return "marked";
    if (visited[q.id]) return "seen";
    return "unseen";
  };

  const paletteColor: Record<string, string> = {
    answered: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
    marked: "bg-violet-500/20 border-violet-500/40 text-violet-300",
    seen: "bg-rose-500/20 border-rose-500/40 text-rose-300",
    unseen: "bg-slate-800/60 border-slate-700 text-slate-400",
  };

  const answeredCount = qs.filter((q) => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== "null").length;
  const markedCount = qs.filter((q) => marked[q.id]).length;

  // ==========================================
  // Loading gates
  // ==========================================
  if (loading || !exam) {
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

  if (qs.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-orange-500/20 flex items-center justify-center animate-pulse">
            <Clock size={24} className="text-orange-400" />
          </div>
          <p className="text-sm font-black">Warming up your paper…</p>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">First questions will appear in a few seconds</p>
          {topupError && <p className="text-[11px] text-rose-300 font-semibold mt-2">{topupError}</p>}
        </div>
      </main>
    );
  }

  const marksPerQ = cur
    ? (exam.sections.find((s) => s.id === cur.section_id)?.marksPerQ ?? 2)
    : (exam.sections[0]?.marksPerQ ?? 2);

  const paletteQs = paletteSection === "all" ? qs : qs.filter((q) => q.section_id === paletteSection);
  const sectionIds = [...new Set(qs.map((q) => q.section_id))];

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black truncate">{testTitle}</p>
            <p className="text-[10px] text-slate-500 font-semibold">
              {answeredCount}/{qs.length} answered
              {totalQ > 0 && qs.length < totalQ && (
                <span className="ml-2 text-slate-500 animate-pulse">· {qs.length}/{totalQ} ready, adding…</span>
              )}
              {totalQ > 0 && qs.length >= totalQ && (
                <span className="ml-2 text-emerald-400">· {totalQ} Qs ready</span>
              )}
            </p>
          </div>
          <span className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-black border ${timeLeft !== null && timeLeft < 300 ? "bg-rose-500/15 border-rose-500/40 text-rose-300" : "bg-orange-500/15 border-orange-500/30 text-orange-300"}`}>
            {timeLeft === null ? "--:--" : fmtClock(timeLeft)}
          </span>
          <button onClick={() => setShowPalette(true)} className="shrink-0 w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center" title="Question palette">
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => { setShowSubmit(true); setFinishError(""); }} className="shrink-0 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-xs font-black flex items-center gap-1.5">
            <Send size={13} /> Submit
          </button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="max-w-3xl mx-auto">
          {topupError && qs.length > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-300">
              <AlertTriangle size={16} className="shrink-0" />
              <p className="text-xs font-bold">{topupError}</p>
            </div>
          )}

          {cur && (
            <>
              {/* Badges */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="px-2 py-1 rounded-lg bg-slate-800 text-[10px] font-black text-slate-300">Q{idx + 1}</span>
                <span className="px-2 py-1 rounded-lg bg-slate-800 text-[10px] font-black text-slate-400">
                  {exam.sections.find((s) => s.id === cur.section_id)?.shortName || "Section"}
                </span>
                <span className="px-2 py-1 rounded-lg bg-slate-800 text-[10px] font-black text-slate-500">+{marksPerQ} / −{exam.negativeMarking}</span>
                {marked[cur.id] && <span className="px-2 py-1 rounded-lg bg-violet-500/15 border border-violet-500/30 text-[10px] font-black text-violet-300">MARKED</span>}
              </div>

              {/* Question */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
                <p className="text-base font-bold leading-relaxed whitespace-pre-wrap">{cur.question_text}</p>
              </div>

              {/* Options / NVT input */}
              <div className="grid gap-2 mb-5">
                {cur.question_type === "nvt" ? (
                  <div className="p-4 rounded-xl border bg-slate-900 border-slate-800 focus-within:border-emerald-500">
                    <p className="text-xs text-slate-400 mb-2 font-bold uppercase">Enter Numerical Value</p>
                    <input
                      type="text"
                      value={answers[cur.id] || ""}
                      onChange={(e) => selectOption(e.target.value)}
                      placeholder="e.g. 42.5"
                      className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                ) : (
                  cur.options.map((opt, i) => {
                    const picked = answers[cur.id] === String(i);
                    return (
                      <button
                        key={i}
                        onClick={() => selectOption(i)}
                        className={`flex items-start gap-3 p-4 rounded-xl border text-left text-sm transition-all ${picked ? "bg-emerald-500/15 border-emerald-500" : "bg-slate-900 border-slate-800 hover:border-slate-600"}`}
                      >
                        <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${picked ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-300"}`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="flex-1 leading-relaxed text-slate-100">{opt}</span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mb-6">
                <button onClick={toggleMark} className={`flex-1 py-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 ${marked[cur.id] ? "bg-violet-500/15 border-violet-500/40 text-violet-300" : "bg-slate-900 border-slate-800 text-slate-300"}`}>
                  <Bookmark size={13} /> {marked[cur.id] ? "Unmark" : "Mark for review"}
                </button>
                <button onClick={clearResponse} className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-black text-slate-300 flex items-center justify-center gap-1.5">
                  <Eraser size={13} /> Clear
                </button>
              </div>

              {/* Nav */}
              <div className="flex items-center gap-2">
                <button onClick={goPrev} disabled={idx === 0} className="flex-1 py-3.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-black flex items-center justify-center gap-1.5 disabled:opacity-40">
                  <ChevronLeft size={16} /> Prev
                </button>
                <button onClick={goNext} disabled={idx >= qs.length - 1} className="flex-1 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-black flex items-center justify-center gap-1.5 disabled:opacity-40">
                  Next <ChevronRight size={16} />
                </button>
              </div>
              {idx >= qs.length - 1 && totalQ > qs.length && (
                <p className="text-center text-[11px] text-slate-500 font-semibold mt-3 animate-pulse">
                  More questions are being prepared in the background…
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── PALETTE MODAL ── */}
      {showPalette && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setShowPalette(false)}>
          <div className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-black">Question Palette</p>
              <button onClick={() => setShowPalette(false)} className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center"><X size={14} /></button>
            </div>

            <div className="flex gap-1.5 mb-4 flex-wrap">
              <button onClick={() => setPaletteSection("all")} className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${paletteSection === "all" ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>All</button>
              {sectionIds.map((sid) => (
                <button key={sid} onClick={() => setPaletteSection(sid)} className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${paletteSection === sid ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
                  {exam.sections.find((s) => s.id === sid)?.shortName || sid}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-6 gap-2 mb-4">
              {paletteQs.map((q) => {
                const st = statusOf(q);
                const qIdx = qs.findIndex((x) => x.id === q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => { setIdx(qIdx); setShowPalette(false); }}
                    className={`h-10 rounded-xl border text-xs font-black ${paletteColor[st]} ${qIdx === idx ? "ring-2 ring-white/60" : ""}`}
                  >
                    {q.order + 1}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/60" /> Answered ({answeredCount})</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-violet-500/60" /> Marked ({markedCount})</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-500/60" /> Seen, unanswered</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-700" /> Not visited</span>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBMIT MODAL ── */}
      {showSubmit && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSubmit(false)}>
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-black mb-1">Submit test?</p>
            <p className="text-xs text-slate-400 mb-4">You cannot change answers after submitting.</p>
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                <p className="text-lg font-black text-emerald-400">{answeredCount}</p>
                <p className="text-[9px] font-bold text-slate-500">ANSWERED</p>
              </div>
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3">
                <p className="text-lg font-black text-rose-400">{qs.length - answeredCount}</p>
                <p className="text-[9px] font-bold text-slate-500">UNANSWERED</p>
              </div>
              <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-3">
                <p className="text-lg font-black text-violet-400">{markedCount}</p>
                <p className="text-[9px] font-bold text-slate-500">MARKED</p>
              </div>
            </div>
            {finishError && <p className="text-xs text-rose-300 font-bold mb-3">❌ {finishError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowSubmit(false)} className="flex-1 py-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-black">Keep going</button>
              <button onClick={finishTest} disabled={submitting} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50">
                {submitting ? <><Loader2 size={13} className="animate-spin" /> Submitting…</> : <><Send size={13} /> Submit now</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}