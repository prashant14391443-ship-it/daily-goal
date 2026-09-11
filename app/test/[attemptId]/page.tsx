"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight, Bookmark, Eraser, Send, AlertTriangle, LayoutGrid, X, Loader2 } from "lucide-react";
import { getExamById, type ExamPattern } from "@/lib/examPatterns";
import { authHeaders } from "@/lib/testApi";

// 🔥 UPDATED: Added question_type
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
  // 🔥 UPDATED: user_answer is now string | null to support text input
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
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
  const [topupError, setTopupError] = useState(""); // 🔥 NEW: Track generation errors

  const enterRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const qsRef = useRef<Q[]>([]);
  const answersRef = useRef<Record<string, string | null>>({});
  const totalRef = useRef(0);
  const moreRef = useRef(false);
  
  useEffect(() => { qsRef.current = qs; }, [qs]);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const cur = qs[idx] || null;

  const postAnswer = useCallback((qid: string, val: string | number | null, sec: number) => {
    authHeaders().then((h) =>
      fetch("/api/test/answer", {
        method: "POST", headers: h,
        body: JSON.stringify({ attempt_id: attemptId, question_id: qid, user_answer: val !== null ? String(val) : null, time_taken_sec: sec }),
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
          id: q.id, order: q.order, section_id: q.section_id, topic_id: q.topic_id, 
          question_type: q.question_type || "mcq-4",
          question_text: q.question_text, options: q.options 
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
      if (res.ok && d.new_questions?.length) {
        appendQuestions(d.new_questions);
        setTopupError(""); // clear any previous errors
      } else if (!res.ok || (res.ok && d.new_questions?.length === 0 && d.target > d.have)) {
        // 🔥 NEW: Graceful failure if AI gets stuck
        setTopupError("Questions are taking longer than expected to generate. Please submit what you have or wait.");
      }
    } catch {}
    moreRef.current = false;
  }, [attemptId, appendQuestions]);

  // ... (Keep finishTest and useEffects exactly the same as your original file) ...

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

  // ... (Keep toggleMark, statusOf, paletteColor exact same) ...
  
  // Quick fix for UI math
  const answeredCount = qs.filter((q) => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== "null").length;
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

  // ... (Keep renderPalette exact same) ...

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* ... Header and Top Bar ... (keep exactly the same) ... */}
      
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="max-w-3xl mx-auto">
            {topupError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-400">
                <AlertTriangle size={16} />
                <p className="text-xs font-bold">{topupError}</p>
              </div>
            )}
            
            {cur && (
              <>
                {/* ... Badges ... (keep exactly the same) ... */}
                
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
                  {/* Note: You can wrap this in a Markdown/KaTeX renderer in the future! */}
                  <p className="text-base font-bold leading-relaxed whitespace-pre-wrap">{cur.question_text}</p>
                </div>

                <div className="grid gap-2 mb-5">
                  {/* 🔥 NEW: Polymorphic Rendering Engine */}
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
                    // Standard MCQ Rendering (Dynamically handles 4 or 5 options)
                    cur.options.map((opt, i) => {
                      const picked = answers[cur.id] === String(i);
                      return (
                        <button key={i} onClick={() => selectOption(i)} className={`press flex items-start gap-3 p-4 rounded-xl border text-left text-sm transition-all ${picked ? "bg-emerald-500/15 border-emerald-500" : "bg-slate-900 border-slate-800 hover:border-slate-600"}`}>
                          <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${picked ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-300"}`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="flex-1 leading-relaxed text-slate-100">{opt}</span>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* ... Next/Prev Buttons ... (keep exactly the same) ... */}
              </>
            )}
          </div>
        </div>

        {/* ... Sidebar and Modals ... (keep exactly the same) ... */}
      </div>
    </main>
  );
}