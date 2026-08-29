"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, Sparkles, Pin, Camera, Download, Share2, Star, Layers, RefreshCw, HelpCircle, Copy, Save, Trash2, Edit3, Lightbulb, Volume2 } from "lucide-react";
import { EmptyState } from "@/app/components/ui";
import { supabase } from "@/lib/supabase";
import { addTopic } from "@/lib/srs";
import { drawMap, dataUrlToBlob, DESIGN_NAMES } from "@/lib/mindmap";
import type { MapData } from "@/lib/mindmap";

type Result = { title: string; points: string[]; map: MapData };
type QuizQ = { q: string; options: string[]; answer: string };

export default function SummarizePage() {
  const [text, setText] = useState("");
  const [img, setImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [mapImg, setMapImg] = useState("");
  const [designPick, setDesignPick] = useState<number | null>(null);
  const [uid, setUid] = useState("guest");
  const [confirm, setConfirm] = useState("");
  const [quiz, setQuiz] = useState<QuizQ[]>([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [saved, setSaved] = useState<any[]>([]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [memo, setMemo] = useState<any>(null);
  const [memoVisible, setMemoVisible] = useState(false);
  const [memoBusy, setMemoBusy] = useState(false);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setUid(data.session?.user.id || "guest")); }, []);

  /* ── Saved summaries (Supabase) ── */
  const loadSaved = async (id?: string) => {
    const userId = id || uid;
    if (!userId || userId === "guest") { setSaved([]); return; }
    const { data } = await supabase.from("summaries").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setSaved(data || []);
  };
  useEffect(() => { loadSaved(); }, [uid]);

  const saveSummary = async () => {
    if (!result) return;
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return notify("⚠️ Login first to save");
    const { error } = await supabase.from("summaries").insert({ user_id: userId, title: result.title || "Summary", points: result.points, map: result.map || null });
    notify(error ? "⚠️ Save failed — run the summaries SQL in Supabase" : "💾 Saved! See 'Saved' below.");
    await loadSaved(userId);
  };
  const deleteSummary = async (id: string) => {
    await supabase.from("summaries").delete().eq("id", id);
    setSaved(saved.filter((s) => s.id !== id));
    notify("🗑 Deleted");
  };
  const startRename = (s: any) => { setRenaming(s.id); setRenameVal(s.title); };
  const saveRename = async (id: string) => {
    await supabase.from("summaries").update({ title: renameVal }).eq("id", id);
    setRenaming(null);
    await loadSaved();
  };
  const openSaved = (s: any) => {
    setResult({ title: s.title, points: s.points, map: s.map });
    setQuiz([]); setQuizIdx(0); setQuizScore(0); setPicked(null); setMemo(null); setMemoVisible(false);
    if (s.map) setMapImg(drawMap(s.map, s.title, designPick ?? undefined));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ── Memorize ── */
  const buildOfflineMemo = (title: string, pts: string[]) => {
    const kw = (s: string) => s.replace(/[^A-Za-z ]/g, " ").split(/\s+/).filter((x) => x.length > 3);
    const keys = pts.slice(0, 8).map((p) => { const w = kw(p)[0]; return (w || "X")[0].toUpperCase(); });
    const acronym = keys.join("");
    const chain = pts.slice(0, 6).map((p) => kw(p)[0] || "idea").join(" → ");
    const t = kw(title)[0] || "topic";
    return {
      acronym,
      story: `Picture "${t}" as a movie: ${pts.slice(0, 5).map((p) => p.split(" ").slice(0, 6).join(" ")).join("; then ")}; the end.`,
      rhyme: `${acronym} — the ${t} chain: ${chain}.`,
      palace: `Imagine your house IS "${t}". Put ${(kw(pts[0] || "")[0] || "point 1")} at the door, ${(kw(pts[1] || "")[0] || "point 2")} on the sofa, ${(kw(pts[2] || "")[0] || "point 3")} in the kitchen, ${(kw(pts[3] || "")[0] || "point 4")} on your bed. Walk the house to recall ${t}.`,
    };
  };
  const memorize = async () => {
    if (!result) return;
    setMemoBusy(true);
    try {
      const res = await fetch("/api/memorize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: result.title, points: result.points }) });
      if (!res.ok) throw 0;
      const d = await res.json();
      if (d.story || d.acronym) { setMemo(d); setMemoVisible(true); setMemoBusy(false); return; }
      throw 0;
    } catch {
      setMemo(buildOfflineMemo(result.title, result.points));
      setMemoVisible(true);
    }
    setMemoBusy(false);
  };
  const toggleMemo = () => { if (memo) setMemoVisible((v) => !v); else memorize(); };
  const speakMemo = () => {
    if (!memo || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(`Memory word ${memo.acronym}. Story: ${memo.story}`);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  };

  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = 1024;
          let { width, height } = image;
          if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } }
          else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        image.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImg(await compressImage(f));
  };

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setResult(null); setQuiz([]); setMemo(null); setMemoVisible(false);
    try {
      const res = await fetch("/api/summarize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: text || undefined, image: img || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      setResult(data);
      setQuiz([]); setQuizIdx(0); setQuizScore(0); setPicked(null); setMemo(null); setMemoVisible(false);
      if (data.map) setMapImg(drawMap(data.map, data.title || "Summary", designPick ?? undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed. Try again.");
    }
    setLoading(false);
  };

  const download = () => { if (!mapImg) return; const a = document.createElement("a"); a.href = mapImg; a.download = "summary-mindmap.png"; a.click(); };
  const share = async () => {
    if (!mapImg) return;
    const blob = dataUrlToBlob(mapImg);
    const file = new File([blob], "summary-mindmap.png", { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) { try { await nav.share({ files: [file], title: "Summary" }); } catch {} } else download();
  };
  const redrawWithDesign = (d: number) => { if (result?.map) { setDesignPick(d); setMapImg(drawMap(result.map, result.title || "Summary", d)); } };

  /* ── Study Brain actions ── */
  const notify = (m: string) => { setConfirm(m); setTimeout(() => setConfirm(""), 3000); };
  const starsFor = (i: number) => (i < 2 ? 5 : i < 4 ? 4 : i < 6 ? 3 : 2);

  const saveFlashcards = async () => {
    if (!result) return;
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return notify("⚠️ Login first to save flashcards");
    const rows = result.points.map((p) => ({ user_id: userId, subject: result.title || "AI Summary", front: p.split(" ").slice(0, 5).join(" ") + "…?", back: p }));
    const { error } = await supabase.from("flashcards").insert(rows);
    notify(error ? "⚠️ Failed to save flashcards" : `🃏 ${rows.length} flashcards added! Open Flashcards to study.`);
  };
  const toReview = () => { if (!result) return; result.points.slice(0, 5).forEach((p) => addTopic(uid, p.slice(0, 80), true)); notify("🔄 Added to Review — due NOW. Open Review to see it!"); };
  const copyPoints = () => { if (!result) return; navigator.clipboard.writeText(result.points.map((p, i) => `${i + 1}. ${p}`).join("\n")); notify("📋 Copied to clipboard!"); };

  const startQuiz = () => {
    if (!result) return;
    const words = result.points.join(" ").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3);
    const freq: Record<string, number> = {}; words.forEach((w) => (freq[w] = (freq[w] || 0) + 1));
    const all = Object.keys(freq);
    setQuiz(result.points.slice(0, 5).map((p) => {
      const ws = p.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3).sort((a, b) => (freq[b] || 0) - (freq[a] || 0));
      const key = ws[0] || "concept";
      const d = all.filter((w) => w !== key).sort(() => Math.random() - 0.5).slice(0, 3);
      return { q: p.replace(new RegExp(key, "i"), "_____"), options: [key, ...d].sort(() => Math.random() - 0.5), answer: key };
    }));
    setQuizIdx(0); setQuizScore(0); setPicked(null);
  };
  const answer = (o: string) => { if (picked) return; setPicked(o); if (o === quiz[quizIdx].answer) setQuizScore((s) => s + 1); };
  const nextQ = () => { setPicked(null); setQuizIdx((i) => i + 1); };

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 CALM HERO */}
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 via-teal-600 to-blue-600 p-5 shadow-xl shadow-teal-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className={`w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center ${loading ? "animate-pulse" : ""}`}>
            <Brain size={22} strokeWidth={2.2} className="text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>AI Study Brain</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">Summarize → points + map + cards + quiz + memorize</p>
          </div>
        </div>
      </div>

      {/* 📝 FORM */}
      <form onSubmit={generate} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 grid gap-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center"><Sparkles size={16} strokeWidth={2.2} /></span>
          <p className="font-black text-sm text-white">What to summarize?</p>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a topic or paste text (e.g. Photosynthesis, World War 2 causes...)" rows={3} className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-cyan-500" />
        <label className="press block bg-slate-800 border-2 border-dashed border-slate-700 hover:border-cyan-500/40 rounded-xl p-4 text-center cursor-pointer transition-colors">
          <span className="w-12 h-12 mx-auto rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center"><Camera size={22} strokeWidth={2.2} /></span>
          <p className="text-sm text-slate-400 mt-2 font-bold">{img ? "Photo attached ✅ (tap to change)" : "or tap to add photo of notes"}</p>
          <input type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
        </label>
        {img && <img src={img} alt="notes" className="rounded-xl max-h-52 object-cover" />}
        <button type="submit" disabled={loading || (!text && !img)} className="press w-full py-3.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-sm font-black text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
          <Sparkles size={15} /> {loading ? "AI is summarizing..." : "Summarize + Draw Map"}
        </button>
      </form>

      {error && (<div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 mb-4 text-center"><p className="text-sm font-bold text-red-300">❌ {error}</p></div>)}

      {result && (
        <div className="grid gap-4">
          {/* POINTS + IMPORTANCE + ACTIONS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center"><Pin size={15} strokeWidth={2.2} /></span>
              <h3 className="font-black text-base text-white flex-1">{result.title}</h3>
              <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md">{result.points.length} points</span>
            </div>
            <div className="grid gap-2">
              {(result.points || []).map((p, i) => (
                <div key={i} className={`flex gap-3 items-start bg-slate-800/60 rounded-xl p-3 border-l-4 ${i < 2 ? "border-l-rose-500" : i < 4 ? "border-l-orange-500" : "border-l-emerald-500"}`}>
                  <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white ${i < 3 ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-slate-700"}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-0.5 mb-1">{Array.from({ length: starsFor(i) }).map((_, j) => <Star key={j} size={10} fill="currentColor" className="text-amber-400" />)}</div>
                    <p className="text-sm leading-relaxed text-slate-200">{p}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={saveFlashcards} className="press py-2.5 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-black flex items-center justify-center gap-1.5"><Layers size={14} /> Flashcards</button>
              <button onClick={toReview} className="press py-2.5 rounded-xl bg-teal-600/20 border border-teal-500/30 text-teal-300 text-xs font-black flex items-center justify-center gap-1.5"><RefreshCw size={14} /> Review</button>
              <button onClick={startQuiz} className="press py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-black flex items-center justify-center gap-1.5"><HelpCircle size={14} /> Quiz</button>
              <button onClick={copyPoints} className="press py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-black flex items-center justify-center gap-1.5"><Copy size={14} /> Copy</button>
              <button onClick={saveSummary} className="press py-2.5 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-300 text-xs font-black flex items-center justify-center gap-1.5"><Save size={14} /> Save</button>
              <button onClick={toggleMemo} disabled={memoBusy} className="press py-2.5 rounded-xl bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50"><Lightbulb size={14} /> {memoBusy ? "Thinking…" : memo && memoVisible ? "Hide" : "Memorize"}</button>
            </div>
            {confirm && <p className="text-center text-xs font-bold text-cyan-300 mt-3">{confirm}</p>}

            {quiz.length > 0 && quizIdx < quiz.length && (
              <div className="bg-slate-800/60 border border-blue-500/30 rounded-2xl p-4 mt-4">
                <p className="text-xs font-black text-blue-400 mb-2">🧪 QUIZ {quizIdx + 1}/{quiz.length} • Score {quizScore}</p>
                <p className="text-sm font-bold mb-3">{quiz[quizIdx].q}</p>
                <div className="grid gap-2 mb-3">
                  {quiz[quizIdx].options.map((o) => (
                    <button key={o} onClick={() => answer(o)} className={`p-2.5 rounded-xl border text-left text-sm ${picked ? (o === quiz[quizIdx].answer ? "bg-green-500/20 border-green-500" : "bg-slate-800 border-slate-700 opacity-50") : "bg-slate-800 border-slate-700"}`}>{o}</button>
                  ))}
                </div>
                {picked && <button onClick={nextQ} className="w-full py-2 rounded-xl bg-blue-600 font-black text-sm">{quizIdx + 1 >= quiz.length ? "Finish" : "Next"}</button>}
              </div>
            )}
            {quiz.length > 0 && quizIdx >= quiz.length && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 text-center mt-4"><p className="text-2xl mb-1">{quizScore >= quiz.length * 0.7 ? "🏆" : "📚"}</p><p className="text-lg font-black">{quizScore}/{quiz.length}</p></div>
            )}
          </div>

          {/* MEMORIZE (toggle + editable) */}
          {memo && memoVisible && (
            <div className="bg-slate-900 border border-fuchsia-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 flex items-center justify-center"><Lightbulb size={15} /></span>
                <h3 className="font-black text-base text-white flex-1">Memorize It</h3>
                <button onClick={speakMemo} className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center" title="Hear it"><Volume2 size={14} /></button>
              </div>
              <p className="text-[10px] font-black text-slate-500 mb-1">✏️ MEMORY WORD — tap to type your own</p>
              <input value={memo.acronym || ""} onChange={(e) => setMemo({ ...memo, acronym: e.target.value.toUpperCase() })} placeholder="Your own word" className="w-full bg-transparent text-2xl font-black tracking-widest text-fuchsia-300 outline-none border-b border-fuchsia-500/30 mb-3" />
              <p className="text-[10px] font-black text-slate-500">🎬 STORY — edit to make it yours</p>
              <textarea value={memo.story || ""} onChange={(e) => setMemo({ ...memo, story: e.target.value })} rows={3} className="w-full bg-slate-800/60 border border-slate-700 rounded-xl p-2 text-sm text-slate-200 outline-none focus:border-fuchsia-500 mb-2 resize-none" />
              <p className="text-[10px] font-black text-slate-500">🎵 RHYME</p>
              <textarea value={memo.rhyme || ""} onChange={(e) => setMemo({ ...memo, rhyme: e.target.value })} rows={2} className="w-full bg-slate-800/60 border border-slate-700 rounded-xl p-2 text-sm text-slate-200 outline-none focus:border-fuchsia-500 mb-2 resize-none" />
              <p className="text-[10px] font-black text-slate-500">🏰 MEMORY PALACE — each point in a real place</p>
              <textarea value={memo.palace || ""} onChange={(e) => setMemo({ ...memo, palace: e.target.value })} rows={3} className="w-full bg-slate-800/60 border border-slate-700 rounded-xl p-2 text-sm text-slate-200 outline-none focus:border-fuchsia-500 resize-none" />
            </div>
          )}

          {/* MAP */}
          {mapImg && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center"><Brain size={15} strokeWidth={2.2} /></span>
                <h3 className="font-black text-base text-white flex-1">Memory Map</h3>
                <span className="text-[9px] font-black text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-1 rounded-md">Design {designPick !== null ? designPick : "auto"}</span>
              </div>
              <img src={mapImg} alt="mind map" className="rounded-xl w-full" />
              <div className="mt-4">
                <p className="text-[10px] font-black text-slate-500 mb-2">🎨 TRY A DIFFERENT LAYOUT</p>
                <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto [scrollbar-width:thin]">
                  {DESIGN_NAMES.map((name, i) => (
                    <button key={i} onClick={() => redrawWithDesign(i)} className={`press px-2 py-2 rounded-lg text-[10px] font-black transition-all ${designPick === i ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300" : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"}`}>
                      {i + 1}. {name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={download} className="press flex-1 py-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-sm font-black text-cyan-300 flex items-center justify-center gap-1.5"><Download size={15} /> Download</button>
                <button onClick={share} className="press flex-1 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-black text-slate-300 flex items-center justify-center gap-1.5"><Share2 size={15} /> Share</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 💾 SAVED SUMMARIES */}
      {saved.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mt-5">
          <p className="text-xs font-black text-slate-400 mb-3">💾 SAVED SUMMARIES ({saved.length})</p>
          <div className="grid gap-2">
            {saved.map((s) => (
              <div key={s.id} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                {renaming === s.id ? (
                  <div className="flex gap-2">
                    <input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} className="flex-1 min-w-0 p-2 rounded-lg bg-slate-900 border border-slate-700 text-sm outline-none focus:border-amber-500" />
                    <button onClick={() => saveRename(s.id)} className="px-3 rounded-lg bg-amber-600 text-xs font-black shrink-0">Save</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => openSaved(s)} className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-bold text-white truncate">{s.title}</p>
                      <p className="text-[10px] text-slate-500">{(s.points || []).length} points</p>
                    </button>
                    <button onClick={() => startRename(s)} className="w-8 h-8 shrink-0 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 flex items-center justify-center" title="Rename"><Edit3 size={13} /></button>
                    <button onClick={() => deleteSummary(s.id)} className="w-8 h-8 shrink-0 rounded-lg bg-slate-900 border border-slate-700 text-red-400 flex items-center justify-center" title="Delete"><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!result && !loading && !error && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl mt-2">
          <EmptyState emoji="🧠✨" text="Type a topic or add a photo — AI will summarize, rank importance, draw a mind-map & build flashcards + quiz + mnemonics!" />
        </div>
      )}

      <Link href="/study" className="inline-block mt-6 text-sm text-slate-500 hover:text-white press font-bold">← Back to Study</Link>
    </main>
  );
}