"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { loadSrs, getDue, addTopic, reviewItem, deleteItem, SrsItem, todayISO } from "@/lib/srs";
import { ArrowLeft, BookOpen, Check, X, Plus, RefreshCw, Brain, Trash2 } from "lucide-react";

export default function ReviewPage() {
  const [uid, setUid] = useState("guest");
  const [due, setDue] = useState<SrsItem[]>([]);
  const [upcoming, setUpcoming] = useState<SrsItem[]>([]);
  const [topic, setTopic] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);

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

  const onReview = (id: string, good: boolean) => {
    reviewItem(uid, id, good);
    setRevealed(null);
    refresh(uid);
  };

  const onDelete = (id: string) => {
    deleteItem(uid, id);
    setRevealed(null);
    refresh(uid);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-24 max-w-2xl mx-auto overflow-x-hidden">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/study" className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-colors">
          <ArrowLeft size={18} className="text-slate-300" />
        </Link>
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
          <Brain size={20} className="text-teal-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Review</h1>
          <p className="text-xs text-slate-400">Spaced repetition — never forget again</p>
        </div>
      </div>

      <form onSubmit={submitTopic} className="bg-slate-900 border border-slate-700 rounded-2xl p-4 mb-6">
        <p className="text-xs font-black text-slate-400 mb-2">📓 ADD NOTE REMINDER</p>
        <div className="flex gap-2">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Newton's Laws / Ch 4 Bio" className="flex-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-teal-500" />
          <button className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-sm font-black flex items-center gap-1 transition-colors"><Plus size={15} /> Add</button>
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
            <div key={it.id} className="relative bg-slate-900 border border-slate-700 rounded-2xl p-4">
              <button onClick={() => onDelete(it.id)} className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-500 hover:text-rose-400 hover:border-rose-500/40 flex items-center justify-center transition-colors" title="Delete">
                <Trash2 size={13} />
              </button>
              {it.type === "topic" ? (
                <>
                  <div className="flex items-start gap-3 mb-3 pr-8">
                    <span className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0"><BookOpen size={17} /></span>
                    <div>
                      <p className="text-sm font-bold leading-snug">Review your notes: {it.front}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Open your notebook. Recall from memory first, then check.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onReview(it.id, true)} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"><Check size={15} /> Reviewed</button>
                    <button onClick={() => onReview(it.id, false)} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"><X size={15} /> Not yet</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold leading-snug mb-3 pr-8">{it.front}</p>
                  {revealed === it.id && it.back && <p className="text-sm text-teal-300 bg-teal-500/5 border border-teal-500/20 rounded-lg p-2 mb-3">{it.back}</p>}
                  <div className="flex gap-2">
                    {!it.back || revealed === it.id ? (
                      <>
                        <button onClick={() => onReview(it.id, true)} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"><Check size={15} /> Got it</button>
                        <button onClick={() => onReview(it.id, false)} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"><X size={15} /> Forgot</button>
                      </>
                    ) : (
                      <button onClick={() => setRevealed(it.id)} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"><RefreshCw size={15} /> Reveal answer</button>
                    )}
                  </div>
                </>
              )}
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
                <p className="text-xs text-slate-300 truncate flex-1 min-w-0">{it.type === "topic" ? "📓 " : "🃏 "}{it.front}</p>
                <span className="text-[10px] text-slate-500 shrink-0">{it.due}</span>
                <button onClick={() => onDelete(it.id)} className="w-7 h-7 shrink-0 rounded-lg bg-slate-800 border border-slate-700 text-slate-500 hover:text-rose-400 flex items-center justify-center" title="Delete"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}