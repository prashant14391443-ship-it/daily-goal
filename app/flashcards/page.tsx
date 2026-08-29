"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Layers, Plus, Play, X, Check, BookOpen, RotateCw, Trophy } from "lucide-react";
import { EmptyState } from "@/app/components/ui";
import BackText from "@/app/components/BackBtn";
type Card = { id: string; subject: string; front: string; back: string };

export default function FlashcardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [subject, setSubject] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [queue, setQueue] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState({ knew: 0, forgot: 0 });
  const [reviewDone, setReviewDone] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const router = useRouter();

  const load = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) { router.push("/login"); return; }
    const { data } = await supabase.from("flashcards").select("*").eq("user_id", userId).order("created_at");
    setCards(data || []);
  };

  useEffect(() => { load(); }, []);

  const addCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    await supabase.from("flashcards").insert({ user_id: userId, subject: subject || "General", front, back });
    setFront(""); setBack(""); setSubject("");
    await load();
  };

  const deleteCard = async (id: string) => {
    await supabase.from("flashcards").delete().eq("id", id);
    setCards(cards.filter((c) => c.id !== id));
  };

  const startReview = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    setFlipped(false);
    setStats({ knew: 0, forgot: 0 });
    setReviewDone(false);
  };

  const answer = (knew: boolean) => {
    if (queue.length === 0) return;
    const [current, ...rest] = queue;
    setStats((s) => ({ knew: s.knew + (knew ? 1 : 0), forgot: s.forgot + (knew ? 0 : 1) }));
    setFlipped(false);
    if (knew) setQueue(rest);
    else setQueue([...rest, current]);
    if (rest.length === 0 && knew) setReviewDone(true);
  };

  const reviewing = queue.length > 0 || reviewDone;
  const currentCard = queue[0];
  const totalAnswered = stats.knew + stats.forgot;
  const accuracy = totalAnswered > 0 ? Math.round((stats.knew / totalAnswered) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 pt-6 pb-24 max-w-4xl mx-auto overflow-x-hidden">
      {/* 🌆 CALM HERO */}
      {!reviewing && (
        <>
          <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 p-5 shadow-xl shadow-fuchsia-900/20">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="relative flex items-center gap-4">
              <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center">
                <Layers size={22} strokeWidth={2.2} className="text-white" />
              </span>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Flashcards</h1>
                <p className="text-[11px] text-white/75 font-semibold mt-0.5">
                  {cards.length} cards • forgot cards repeat until known
                </p>
              </div>
            </div>
          </div>

          {/* 🎯 BIG START BUTTON */}
          {cards.length > 0 && (
            <button
              onClick={startReview}
              className="press w-full mb-5 py-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-base tracking-wide shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
            >
              <Play size={20} fill="white" />
              Start Review ({cards.length} cards)
            </button>
          )}
        </>
      )}

      {/* 📝 ADD CARD FORM */}
      {!reviewing && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5">
          <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
                <Plus size={16} strokeWidth={2.2} />
              </span>
              <p className="font-black text-sm text-white">{showAddForm ? "Add a card" : "Add a new card"}</p>
            </div>
            <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
              {showAddForm ? <X size={14} /> : <Plus size={14} />}
            </span>
          </button>

          {showAddForm && (
            <form onSubmit={addCard} className="mt-4 grid gap-3">
              <input
                value={subject} onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject (e.g. Biology)"
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500"
              />
              <input
                value={front} onChange={(e) => setFront(e.target.value)}
                placeholder="Question (front)" required
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500"
              />
              <input
                value={back} onChange={(e) => setBack(e.target.value)}
                placeholder="Answer (back)" required
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500"
              />
              <button type="submit" className="press w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-black flex items-center justify-center gap-1.5">
                <Plus size={15} /> Add Card
              </button>
            </form>
          )}
        </div>
      )}

      {/* 📚 CARD LIST */}
      {!reviewing && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
              <BookOpen size={14} strokeWidth={2.2} className="text-slate-400" />
            </span>
            <p className="text-xs font-black text-slate-400">YOUR DECK ({cards.length})</p>
          </div>
          <div className="grid gap-2">
            {cards.map((c) => (
              <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex justify-between gap-3 max-w-full overflow-hidden">
                <div className="min-w-0 flex-1">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 text-[9px] font-black mb-1">
                    {c.subject}
                  </span>
                  <p className="font-bold text-sm text-white truncate">{c.front}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{c.back}</p>
                </div>
                <button onClick={() => deleteCard(c.id)} className="press w-8 h-8 shrink-0 self-start rounded-lg bg-slate-800 flex items-center justify-center text-red-400 hover:bg-red-500/20">
                  <X size={14} />
                </button>
              </div>
            ))}
            {cards.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl">
                <EmptyState emoji="🃏✨" text="No cards yet — add your first one above!" />
              </div>
            )}
          </div>
        </>
      )}

      {/* 🔄 REVIEW MODE */}
      {reviewing && !reviewDone && currentCard && (
        <div className="max-w-md mx-auto">
          {/* stats chips */}
          <div className="flex justify-center gap-2 mb-4 flex-wrap">
            <div className="bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-full text-[11px] font-black text-emerald-400 flex items-center gap-1.5">
              <Check size={12} /> Knew {stats.knew}
            </div>
            <div className="bg-red-500/15 border border-red-500/30 px-3 py-1.5 rounded-full text-[11px] font-black text-red-400 flex items-center gap-1.5">
              <X size={12} /> Forgot {stats.forgot}
            </div>
            <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full text-[11px] font-black text-slate-300 flex items-center gap-1.5">
              <RotateCw size={12} /> {queue.length} left
            </div>
          </div>

          {/* card */}
          <button
            onClick={() => setFlipped(!flipped)}
            className="press w-full bg-slate-900 border-2 border-violet-500/30 rounded-3xl p-8 text-center min-h-[280px] shadow-xl shadow-violet-900/20 flex flex-col justify-center"
          >
            <span className="inline-block px-2.5 py-1 rounded-md bg-violet-500/15 text-violet-300 text-[10px] font-black mb-4">
              {currentCard.subject}
            </span>
            <p className={`text-2xl font-black ${flipped ? "text-violet-200" : "text-white"}`}>
              {flipped ? currentCard.back : currentCard.front}
            </p>
            <p className="text-xs text-slate-500 mt-6 font-bold">
              {flipped ? "👇 Did you know it?" : "👆 Tap to flip"}
            </p>
          </button>

          {/* actions */}
          {flipped && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => answer(false)}
                className="press flex-1 py-4 rounded-xl bg-red-500/15 border border-red-500/30 text-sm font-black text-red-300 flex items-center justify-center gap-1.5"
              >
                <X size={16} /> Forgot
              </button>
              <button
                onClick={() => answer(true)}
                className="press flex-1 py-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-sm font-black text-emerald-300 flex items-center justify-center gap-1.5"
              >
                <Check size={16} /> Knew it
              </button>
            </div>
          )}
        </div>
      )}

      {/* 🎉 REVIEW COMPLETE */}
      {reviewDone && (
        <div className="max-w-md mx-auto relative overflow-hidden rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 p-8 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.05),_transparent_70%)]" />
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Trophy size={32} className="text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-white mb-2">Deck mastered!</p>
            <p className="text-xs text-emerald-200 font-bold mb-5">Every card answered correctly</p>

            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-3">
                <p className="text-2xl font-black text-emerald-300">{stats.knew}</p>
                <p className="text-[10px] font-black text-emerald-200/70">KNEW</p>
              </div>
              <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-3">
                <p className="text-2xl font-black text-red-300">{stats.forgot}</p>
                <p className="text-[10px] font-black text-red-200/70">FORGOT</p>
              </div>
              <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3">
                <p className="text-2xl font-black text-amber-300">{accuracy}%</p>
                <p className="text-[10px] font-black text-amber-200/70">ACCURACY</p>
              </div>
            </div>

            <button
              onClick={() => { setReviewDone(false); setQueue([]); }}
              className="press w-full py-3 rounded-xl bg-violet-600 text-sm font-black"
            >
              ← Back to cards
            </button>
          </div>
        </div>
      )}

   <BackText />
    </main>
  );
}