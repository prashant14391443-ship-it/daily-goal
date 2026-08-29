"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { loadSrs, saveSrs, getDue, addTopic, reviewItem, deleteItem, SrsItem, todayISO } from "@/lib/srs";
import { ArrowLeft, BookOpen, Check, X, Plus, RefreshCw, Brain } from "lucide-react";

export default function ReviewPage() {
  const [uid, setUid] = useState("guest");
  const [due, setDue] = useState<SrsItem[]>([]);
  const [upcoming, setUpcoming] = useState<SrsItem[]>([]);
  const [topic, setTopic] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  const refresh = (id: string) => {
    setDue(getDue(id));
    setUpcoming(loadSrs(id).filter((i) => i.due > todayISO()).slice(0, 5));
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id || "guest";
      setUid(id);
      refresh(id);
    };
    load();
  }, []);

  const submitTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    addTopic(uid, topic);
    setTopic("");
    refresh(uid);
  };
  const onReview = (id: string, good: boolean) => { reviewItem(uid, id, good); setRevealed(null); refresh(uid); };
  const onDelete = (id: string) => { deleteItem(uid, id); setRevealed(null); refresh(uid); };
  const startRename = (it: SrsItem) => { setRenamingId(it.id); setRenameVal(it.front); };
  const saveRename = (id: string) => {
    const items = loadSrs(uid);
    const it = items.find((i) => i.id === id);
    if (it && renameVal.trim()) { it.front = renameVal.trim(); saveSrs(uid, items); }
    setRenamingId(null);
    refresh(uid);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-24 max-w-2xl mx-auto overflow-x-hidden">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/study" className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-colors"><ArrowLeft size={18} className="text-slate-300" /></Link>
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center"><Brain size={20} className="text-teal-400" /></div>
        <div><h1 className="text-xl font-bold">Review</h1><p className="text-xs text-slate-400">Spaced repetition — never forget again</p></div>
      </div>

      <form onSubmit={submitTopic} className="bg-slate-900 border border-slate-700 rounded-2xl p-4 mb-6">
        <p className="text-xs font-black text-slate-400 mb-2">📓 ADD NOTE REMINDER</p>
        <div className="flex gap-2">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Newton's Laws / Ch 4 Bio" className="flex-1 min-w-0 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-teal-500" />
          <button className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-sm font-black flex items-center gap-1 transition-colors shrink-0"><Plus size={15} /> Add</button>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">We'll remind you on the perfect days (1 → 3 → 7 → 16 → 35…).</p>
      </form>

      <p className="text-xs font-black text-slate-400 mb-3">DUE TODAY • {due.length}</p>
      {due.length === 0 ? (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center">
          <p className="text-3xl mb-2">🎉</p>
          <p className="text-sm font-bold text-white mb-1">Nothing due today!</p>
          <p className="text-xs text-slate-500">Add a note reminder above, or come back tomorrow.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {due.map((it) => (
            <div key={it.id} className="bg-slate-900 border border-slate-700 rounded-2xl p-4 max-w-full">
              <div className="flex items-center gap-2 mb-3">
                {renamingId === it.id ? (
                  <>
                    <input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} className="flex-1 min-w-0 p-2 rounded-lg bg-slate-800 border border-slate-700 text-sm outline-none focus:border-teal-500" />
                    <button onClick={() => saveRename(it.id)} className="px-3 py-2 rounded-lg bg-teal-600 text-xs font-black shrink-0">Save</button>
                  </>
                ) : (
                  <>
                    <span className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0"><BookOpen size={17} /></span>
                    <p className="text-sm font-bold leading-snug break-words flex-1 min-w-0">{it.type === "topic" ? `Review: ${it.front}` : it.front}</p>
                    <button onClick={() => startRename(it)} className="w-8 h-8 shrink-0 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-base" title="Rename">✏️</button>
                    <button onClick={() => onDelete(it.id)} className="w-8 h-8 shrink-0 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-base" title="Delete">🗑️</button>
                  </>
                )}
              </div>
              {it.type === "topic" ? (
                <p className="text-[10px] text-slate-500 mb-3">Open your notebook. Recall from memory first, then check.</p>
              ) : (
                revealed === it.id && it.back && <p className="text-sm text-teal-300 bg-teal-500/5 border border-teal-500/20 rounded-lg p-2 mb-3 break-words">{it.back}</p>
              )}
              <div className="flex gap-2">
                {it.type === "card" && it.back && revealed !== it.id ? (
                  <button onClick={() => setRevealed(it.id)} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"><RefreshCw size={15} /> Reveal answer</button>
                ) : (
                  <>
                    <button onClick={() => onReview(it.id, true)} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"><Check size={15} /> {it.type === "topic" ? "Reviewed" : "Got it"}</button>
                    <button onClick={() => onReview(it.id, false)} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"><X size={15} /> {it.type === "topic" ? "Not yet" : "Forgot"}</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <>
          <p className="text-xs font-black text-slate-400 mt-6 mb-3">COMING UP</p>
          <div className="grid gap-2">
            {upcoming.map((it) => (
              <div key={it.id} className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-xl p-3 max-w-full">
                {renamingId === it.id ? (
                  <>
                    <input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} className="flex-1 min-w-0 p-2 rounded-lg bg-slate-800 border border-slate-700 text-sm outline-none focus:border-teal-500" />
                    <button onClick={() => saveRename(it.id)} className="px-3 py-2 rounded-lg bg-teal-600 text-xs font-black shrink-0">Save</button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-300 truncate flex-1 min-w-0">{it.type === "topic" ? "📓 " : "🃏 "}{it.front}</p>
                    <span className="text-[10px] text-slate-500 shrink-0">{it.due}</span>
                    <button onClick={() => startRename(it)} className="w-7 h-7 shrink-0 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-sm" title="Rename">✏️</button>
                    <button onClick={() => onDelete(it.id)} className="w-7 h-7 shrink-0 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-sm" title="Delete">🗑️</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}