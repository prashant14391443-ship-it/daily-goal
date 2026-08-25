"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconTile, GradButton, EmptyState, Chip } from "@/app/components/ui";

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
    const { data } = await supabase
      .from("flashcards").select("*").eq("user_id", userId).order("created_at");
    setCards(data || []);
  };

  useEffect(() => { load(); }, []);

  const addCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    await supabase.from("flashcards").insert({
      user_id: userId, subject: subject || "General", front, back,
    });
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
    setStats((s) => ({
      knew: s.knew + (knew ? 1 : 0),
      forgot: s.forgot + (knew ? 0 : 1),
    }));
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
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 HERO */}
      {!reviewing && (
        <>
          <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 p-5 shadow-2xl shadow-fuchsia-900/30">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            <div className="relative flex items-center gap-3">
              {/* tilted card deck */}
              <div className="relative w-14 h-14 shrink-0">
                <div className="absolute inset-0 rounded-xl bg-white/10 rotate-[-8deg]" />
                <div className="absolute inset-0 rounded-xl bg-white/20 rotate-[-4deg]" />
                <div className="absolute inset-0 rounded-xl bg-white/30 flex items-center justify-center text-3xl shadow-xl">🃏</div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-black text-white leading-tight">Flashcards</h1>
                <p className="text-[10px] text-white/80 font-semibold">
                  {cards.length} cards • forgot cards repeat until known
                </p>
              </div>
            </div>
          </div>

          {/* 🎯 BIG START REVIEW BUTTON — the star */}
          {cards.length > 0 && (
            <GradButton
              onClick={startReview}
              gradient="from-emerald-500 to-green-600"
              className="w-full py-5 mb-5 text-base tracking-wide shadow-xl shadow-emerald-900/30"
            >
              🎯 Start Review ({cards.length} cards)
            </GradButton>
          )}
        </>
      )}

      {/* 📝 ADD CARD FORM */}
      {!reviewing && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 shadow-lg shadow-black/30">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <IconTile emoji="✨" gradient="bg-gradient-to-br from-violet-500 to-fuchsia-600" size="sm" />
              <p className="font-black text-sm text-white">{showAddForm ? "Add a card" : "Add a new card"}</p>
            </div>
            <span className="text-slate-500 text-xl">{showAddForm ? "−" : "+"}</span>
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
              <GradButton type="submit" gradient="from-violet-600 to-fuchsia-600" className="py-3 text-sm">
                ➕ Add Card
              </GradButton>
            </form>
          )}
        </div>
      )}

      {/* 📚 CARD LIST */}
      {!reviewing && (
        <>
          <p className="text-xs font-black text-slate-400 mb-2 flex items-center gap-1.5">
            <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-[10px]">📚</span>
            YOUR DECK ({cards.length})
          </p>
          <div className="grid gap-2">
            {cards.map((c) => (
              <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex justify-between gap-3 shadow-md">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Chip color="violet">{c.subject}</Chip>
                  </div>
                  <p className="font-bold text-sm text-white truncate">{c.front}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">{c.back}</p>
                </div>
                <button
                  onClick={() => deleteCard(c.id)}
                  className="press text-red-400 text-xs font-bold shrink-0 self-start"
                >
                  ✕
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

      {/* 🔄 REVIEW MODE — full screen focus */}
      {reviewing && !reviewDone && currentCard && (
        <div className="max-w-md mx-auto">
          {/* stats chips */}
          <div className="flex justify-center gap-2 mb-4 flex-wrap">
            <div className="bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 rounded-full text-[11px] font-black text-emerald-300">
              ✅ Knew {stats.knew}
            </div>
            <div className="bg-red-500/20 border border-red-500/40 px-3 py-1.5 rounded-full text-[11px] font-black text-red-300">
              ❌ Forgot {stats.forgot}
            </div>
            <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full text-[11px] font-black text-slate-300">
              🃏 {queue.length} left
            </div>
          </div>

          {/* card */}
          <button
            onClick={() => setFlipped(!flipped)}
            className="press w-full bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-violet-500/40 rounded-3xl p-8 text-center min-h-[280px] shadow-2xl shadow-violet-900/30 flex flex-col justify-center"
          >
            <Chip color="violet">{currentCard.subject}</Chip>
            <p className={`text-2xl font-black mt-4 ${flipped ? "text-violet-200" : "text-white"}`}>
              {flipped ? currentCard.back : currentCard.front}
            </p>
            <p className="text-xs text-slate-500 mt-6 font-semibold">
              {flipped ? "👇 Did you know it?" : "👆 Tap to flip"}
            </p>
          </button>

          {/* actions */}
          {flipped && (
            <div className="flex gap-3 mt-4">
              <GradButton
                onClick={() => answer(false)}
                gradient="from-red-600 to-rose-600"
                className="flex-1 py-4 text-sm"
              >
                ❌ Forgot
              </GradButton>
              <GradButton
                onClick={() => answer(true)}
                gradient="from-emerald-500 to-green-600"
                className="flex-1 py-4 text-sm"
              >
                ✅ Knew it
              </GradButton>
            </div>
          )}
        </div>
      )}

      {/* 🎉 REVIEW COMPLETE */}
      {reviewDone && (
        <div className="max-w-md mx-auto relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600/20 to-green-600/20 border-2 border-emerald-400/50 p-8 text-center shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08),_transparent_70%)]" />
          <div className="relative">
            <p className="text-6xl mb-3 animate-bounce">🎉</p>
            <p className="text-2xl font-black text-white mb-2">Deck mastered!</p>
            <p className="text-xs text-emerald-200 font-semibold mb-5">Every card answered correctly</p>

            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-3">
                <p className="text-2xl font-black text-emerald-300">{stats.knew}</p>
                <p className="text-[10px] font-black text-emerald-200/70">KNEW</p>
              </div>
              <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3">
                <p className="text-2xl font-black text-red-300">{stats.forgot}</p>
                <p className="text-[10px] font-black text-red-200/70">FORGOT</p>
              </div>
              <div className="bg-amber-500/20 border border-amber-500/40 rounded-xl p-3">
                <p className="text-2xl font-black text-amber-300">{accuracy}%</p>
                <p className="text-[10px] font-black text-amber-200/70">ACCURACY</p>
              </div>
            </div>

            <GradButton
              onClick={() => { setReviewDone(false); setQueue([]); }}
              gradient="from-violet-600 to-fuchsia-600"
              className="w-full py-3 text-sm"
            >
              ← Back to cards
            </GradButton>
          </div>
        </div>
      )}

      <Link href="/study-tracker" className="inline-block mt-6 text-sm text-slate-400 hover:text-white press font-semibold">
        ← Back to Study
      </Link>
    </main>
  );
}