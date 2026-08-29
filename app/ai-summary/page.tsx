"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { addTopic } from "@/lib/srs";
import { ArrowLeft, Brain, Sparkles, Star, Copy, Download, Save, Layers, HelpCircle, RefreshCw, Check, X } from "lucide-react";

type Point = { text: string; importance: number; highlight: "red" | "orange" | "green" };
type QuizQ = { q: string; options: string[]; answer: string };
type Summary = { title: string; mode: string; points: Point[]; facts: string[]; overall: string; t: number };

const STOP = new Set(("the a an and or but if then so of in on at to for from by with is are was were be been being it its this that these those as he she they we you i his her their our your my me him them us not no yes do does did have has had will would can could should may might must there here when where why how what which who whom than too very just also into over under again once more most some such only own same now about after before between during through above below out off up down").split(" "));

const sentOf = (t: string) => (t.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+/g) || [t]).map((s) => s.trim()).filter((s) => s.length > 10);
const wordsOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w) && w.length > 2);

function summarize(text: string, count: number) {
  const sents = sentOf(text);
  const freq: Record<string, number> = {};
  sents.forEach((s) => wordsOf(s).forEach((w) => (freq[w] = (freq[w] || 0) + 1)));
  const maxF = Math.max(1, ...Object.values(freq));
  const scored = sents.map((s, i) => {
    const ws = wordsOf(s);
    let sc = ws.reduce((a, w) => a + (freq[w] || 0), 0) / Math.sqrt(ws.length + 1);
    if (i < 2) sc *= 1.2;
    if (/\d/.test(s)) sc *= 1.15;
    if (ws.length < 4) sc *= 0.5;
    return { s, i, sc };
  });
  const maxS = Math.max(1, ...scored.map((x) => x.sc));
  const top = [...scored].sort((a, b) => b.sc - a.sc).slice(0, count).sort((a, b) => a.i - b.i);
  const points: Point[] = top.map((x) => {
    const n = x.sc / maxS;
    return { text: x.s, importance: Math.max(1, Math.round(n * 5)), highlight: n > 0.7 ? "red" : n > 0.4 ? "orange" : "green" };
  });
  const facts = sents.filter((s) => /\b(19|20)\d{2}\b/.test(s) || /\d+(\.\d+)?\s?(%|km|kg|cm|mm|ml|l|hours?|minutes?|days?|years?|million|billion)/i.test(s) || /^[A-Z][a-z]+ (is|are|was|were)/.test(s)).slice(0, 6);
  const overall = points.slice(0, 2).map((p) => p.text).join(" ");
  return { points, facts, overall };
}

function makeQuiz(points: Point[], text: string): QuizQ[] {
  const freq: Record<string, number> = {};
  wordsOf(text).forEach((w) => (freq[w] = (freq[w] || 0) + 1));
  const all = Object.keys(freq);
  return points.filter((p) => p.importance >= 3).slice(0, 5).map((p) => {
    const ws = wordsOf(p.text).sort((a, b) => (freq[b] || 0) - (freq[a] || 0));
    const key = ws[0] || "concept";
    const distractors = all.filter((w) => w !== key).sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [key, ...distractors].sort(() => Math.random() - 0.5);
    return { q: p.text.replace(new RegExp(key, "i"), "_____"), options, answer: key };
  });
}

export default function AiSummary() {
  const [tab, setTab] = useState<"text" | "topic">("text");
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"quick" | "brief" | "detailed">("brief");
  const [result, setResult] = useState<Summary | null>(null);
  const [quiz, setQuiz] = useState<QuizQ[]>([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [history, setHistory] = useState<Summary[]>([]);
  const [msg, setMsg] = useState("");
  const [uid, setUid] = useState("guest");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      setUid(data.session?.user.id || "guest");
      try { setHistory(JSON.parse(localStorage.getItem("dg-ai-history") || "[]")); } catch {}
    };
    load();
  }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2000); };

  const run = () => {
    if (!input.trim()) return flash("⚠️ Paste some text or type a topic first!");
    let text = input;
    if (tab === "topic") {
      text = `${input} is an important topic to study. To understand ${input}, first define what ${input} means. The key ideas of ${input} include its definition, its main features, and its real examples. ${input} is important because it appears in exams and real life. To master ${input}, revise its definition, list its points, and practice questions about ${input}.`;
    }
    const count = mode === "quick" ? 5 : mode === "brief" ? 10 : 15;
    const { points, facts, overall } = summarize(text, count);
    const res: Summary = { title: tab === "topic" ? input : input.slice(0, 40) + "…", mode, points, facts, overall, t: Date.now() };
    setResult(res); setQuiz([]); setQuizIdx(0); setQuizScore(0); setPicked(null);
  };

  const saveHistory = () => {
    if (!result) return;
    const h = [result, ...history].slice(0, 10);
    setHistory(h); localStorage.setItem("dg-ai-history", JSON.stringify(h));
    flash("💾 Saved to history!");
  };
  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.points.map((p, i) => `${i + 1}. ${p.text}`).join("\n"));
    flash("📋 Copied!");
  };
  const download = () => {
    if (!result) return;
    const blob = new Blob([result.points.map((p, i) => `${i + 1}. ${p.text}`).join("\n")], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "summary.txt"; a.click();
    flash("⬇️ Downloaded!");
  };
  const toReview = () => {
    if (!result) return;
    result.points.filter((p) => p.importance >= 4).forEach((p) => addTopic(uid, p.text.slice(0, 80)));
    flash("🔄 Added important points to Review!");
  };
  const toFlashcards = () => {
    if (!result) return;
    const cards = result.points.map((p) => ({ front: p.text.split(" ").slice(0, 4).join(" ") + "…?", back: p.text }));
    const old = JSON.parse(localStorage.getItem("dg-ai-flashcards") || "[]");
    localStorage.setItem("dg-ai-flashcards", JSON.stringify([...cards, ...old]));
    flash("🃏 Flashcards created!");
  };
  const toQuiz = () => {
    if (!result) return;
    setQuiz(makeQuiz(result.points, result.points.map((p) => p.text).join(" ")));
    setQuizIdx(0); setQuizScore(0); setPicked(null);
  };

  const answer = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    if (opt === quiz[quizIdx].answer) setQuizScore((s) => s + 1);
  };
  const nextQ = () => { setPicked(null); setQuizIdx((i) => i + 1); };

  const border = { red: "border-l-rose-500", orange: "border-l-orange-500", green: "border-l-emerald-500" };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-24 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/study" className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center"><ArrowLeft size={18} className="text-slate-300" /></Link>
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"><Brain size={20} className="text-cyan-400" /></div>
        <div><h1 className="text-xl font-bold">AI Study Brain</h1><p className="text-xs text-slate-400">Summarize anything → points, facts, flashcards, quiz</p></div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("text")} className={`flex-1 py-2 rounded-xl text-xs font-black border ${tab === "text" ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" : "bg-slate-900 border-slate-700 text-slate-400"}`}>📄 Paste Text</button>
        <button onClick={() => setTab("topic")} className={`flex-1 py-2 rounded-xl text-xs font-black border ${tab === "topic" ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" : "bg-slate-900 border-slate-700 text-slate-400"}`}>🎯 Type Topic</button>
      </div>

      {tab === "text" ? (
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={6} placeholder="Paste any text — textbook chapter, article, notes…" className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-cyan-500 mb-3 resize-none" />
      ) : (
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. Photosynthesis, World War 2, Newton's Laws…" className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-cyan-500 mb-3" />
      )}

      <div className="flex gap-2 mb-3">
        {(["quick", "brief", "detailed"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2 rounded-xl text-xs font-black border capitalize ${mode === m ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" : "bg-slate-900 border-slate-700 text-slate-400"}`}>{m === "quick" ? "Quick (5)" : m === "brief" ? "Brief (10)" : "Detailed (15)"}</button>
        ))}
      </div>

      <button onClick={run} className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-black flex items-center justify-center gap-2 mb-4"><Sparkles size={16} /> Summarize</button>
      {msg && <p className="text-center text-xs font-bold text-cyan-300 mb-3">{msg}</p>}

      {result && (
        <>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 mb-4">
            <p className="text-[10px] font-black text-cyan-400 mb-1">💡 OVERVIEW</p>
            <p className="text-sm text-slate-300">{result.overall}</p>
          </div>

          <p className="text-xs font-black text-slate-400 mb-2">📋 KEY POINTS ({result.points.length})</p>
          <div className="grid gap-2 mb-4">
            {result.points.map((p, i) => (
              <div key={i} className={`bg-slate-900 border border-slate-700 border-l-4 ${border[p.highlight]} rounded-xl p-3`}>
                <div className="flex items-center gap-1 mb-1">{Array.from({ length: p.importance }).map((_, j) => <Star key={j} size={10} fill="currentColor" className="text-amber-400" />)}</div>
                <p className="text-sm text-slate-200">{p.text}</p>
              </div>
            ))}
          </div>

          {result.facts.length > 0 && (
            <>
              <p className="text-xs font-black text-slate-400 mb-2">🔑 KEY FACTS</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {result.facts.map((f, i) => <span key={i} className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px]">{f.slice(0, 60)}</span>)}
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={toFlashcards} className="py-2.5 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-black flex items-center justify-center gap-1.5"><Layers size={14} /> Flashcards</button>
            <button onClick={toQuiz} className="py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-black flex items-center justify-center gap-1.5"><HelpCircle size={14} /> Quiz</button>
            <button onClick={toReview} className="py-2.5 rounded-xl bg-teal-600/20 border border-teal-500/30 text-teal-300 text-xs font-black flex items-center justify-center gap-1.5"><RefreshCw size={14} /> Review</button>
            <button onClick={saveHistory} className="py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-black flex items-center justify-center gap-1.5"><Save size={14} /> Save</button>
            <button onClick={copy} className="py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-black flex items-center justify-center gap-1.5"><Copy size={14} /> Copy</button>
            <button onClick={download} className="py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-black flex items-center justify-center gap-1.5"><Download size={14} /> Export</button>
          </div>

          {quiz.length > 0 && quizIdx < quiz.length && (
            <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-4 mb-4">
              <p className="text-xs font-black text-blue-400 mb-2">🧪 QUIZ {quizIdx + 1}/{quiz.length} • Score {quizScore}</p>
              <p className="text-sm font-bold mb-3">{quiz[quizIdx].q}</p>
              <div className="grid gap-2 mb-3">
                {quiz[quizIdx].options.map((o) => (
                  <button key={o} onClick={() => answer(o)} className={`p-2.5 rounded-xl border text-left text-sm ${picked ? (o === quiz[quizIdx].answer ? "bg-green-500/20 border-green-500" : "bg-slate-800 border-slate-700 opacity-50") : picked === o ? "bg-rose-500/20 border-rose-500" : "bg-slate-800 border-slate-700"}`}>{o}</button>
                ))}
              </div>
              {picked && <button onClick={nextQ} className="w-full py-2 rounded-xl bg-blue-600 font-black text-sm">{quizIdx + 1 >= quiz.length ? "Finish" : "Next"}</button>}
            </div>
          )}
          {quiz.length > 0 && quizIdx >= quiz.length && (
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center mb-4">
              <p className="text-3xl mb-2">{quizScore >= quiz.length * 0.7 ? "🏆" : "📚"}</p>
              <p className="text-xl font-black">{quizScore}/{quiz.length}</p>
            </div>
          )}
        </>
      )}

      {history.length > 0 && (
        <>
          <p className="text-xs font-black text-slate-400 mb-2">🕘 HISTORY</p>
          <div className="grid gap-2">
            {history.map((h, i) => (
              <button key={i} onClick={() => setResult(h)} className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-left text-sm text-slate-300 hover:border-slate-600">{h.title}</button>
            ))}
          </div>
        </>
      )}
    </main>
  );
}