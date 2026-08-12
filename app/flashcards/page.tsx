"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  const router = useRouter();

  const load = async () => {
    // 1st change: Renamed to sessionData to avoid duplicate names
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    
    if (!userId) {
      router.push("/login");
      return;
    }
    
    // Now 'data' can be declared safely without throwing an error
    const { data } = await supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at");
      
    setCards(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const addCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    await supabase.from("flashcards").insert({
      user_id: userId,
      subject: subject || "General",
      front,
      back,
    });
    setFront("");
    setBack("");
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
    // 2nd change: Ensure queue isn't empty so TS knows 'current' is definitely a Card
    if (queue.length === 0) return;
    
    const [current, ...rest] = queue;
    setStats((s) => ({
      knew: s.knew + (knew ? 1 : 0),
      forgot: s.forgot + (knew ? 0 : 1),
    }));
    setFlipped(false);
    
    if (knew) {
      setQueue(rest);
    } else {
      setQueue([...rest, current]);
    }
    
    if (rest.length === 0 && knew) {
      setReviewDone(true);
    }
  };

  const reviewing = queue.length > 0 || reviewDone;
  
  // 3rd change: Safely assign the current card to a variable so TS doesn't yell in the JSX
  const currentCard = queue[0];

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-xl">🃏</span>
          Flashcards
        </h1>
        <p className="text-slate-400">{cards.length} cards • forgot cards repeat until you know them</p>
      </div>

      {!reviewing && (
        <>
          <form onSubmit={addCard} className="bg-slate-900 p-6 rounded-lg mb-8 grid gap-4">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject (e.g. Biology)"
              className="p-3 rounded bg-slate-800 border border-slate-700"
            />
            <input
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Question (front)"
              required
              className="p-3 rounded bg-slate-800 border border-slate-700"
            />
            <input
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Answer (back)"
              required
              className="p-3 rounded bg-slate-800 border border-slate-700"
            />
            <button className="py-3 rounded bg-purple-600 hover:bg-purple-500 font-semibold">
              ➕ Add Card
            </button>
          </form>

          {cards.length > 0 && (
            <button
              onClick={startReview}
              className="w-full py-3 rounded bg-green-600 hover:bg-green-500 font-semibold mb-6"
            >
              🎯 Start Review ({cards.length} cards)
            </button>
          )}

          <div className="grid gap-3">
            {cards.map((c) => (
              <div key={c.id} className="bg-slate-900 p-4 rounded-lg flex justify-between gap-3">
                <div>
                  <p className="text-xs text-purple-400">{c.subject}</p>
                  <p className="font-semibold">{c.front}</p>
                  <p className="text-sm text-slate-400">{c.back}</p>
                </div>
                <button
                  onClick={() => deleteCard(c.id)}
                  className="text-red-400 text-sm self-start"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Applied currentCard here to fix the 3rd TS warning */}
      {reviewing && !reviewDone && currentCard && (
        <div className="max-w-md mx-auto">
          <p className="text-sm text-slate-400 mb-2 text-center">
            ✅ {stats.knew} • ❌ {stats.forgot} • {queue.length} left
          </p>
          <button
            onClick={() => setFlipped(!flipped)}
            className="w-full bg-slate-900 border border-purple-500/40 rounded-xl p-10 text-center min-h-[220px]"
          >
            <p className="text-xs text-purple-400 mb-2">{currentCard.subject}</p>
            <p className="text-xl font-bold">
              {flipped ? currentCard.back : currentCard.front}
            </p>
            <p className="text-xs text-slate-500 mt-4">tap to flip</p>
          </button>
          {flipped && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => answer(false)}
                className="flex-1 py-3 rounded bg-red-600 hover:bg-red-500 font-semibold"
              >
                ❌ Forgot
              </button>
              <button
                onClick={() => answer(true)}
                className="flex-1 py-3 rounded bg-green-600 hover:bg-green-500 font-semibold"
              >
                ✅ Knew it
              </button>
            </div>
          )}
        </div>
      )}

      {reviewDone && (
        <div className="max-w-md mx-auto bg-slate-900 rounded-xl p-8 text-center">
          <p className="text-5xl mb-3">🎉</p>
          <p className="text-xl font-bold mb-2">Review complete!</p>
          <p className="text-slate-400 mb-6">
            ✅ Knew: {stats.knew} • ❌ Forgot: {stats.forgot}
          </p>
          <button
            onClick={() => {
              setReviewDone(false);
              setQueue([]);
            }}
            className="px-6 py-3 rounded bg-purple-600 hover:bg-purple-500 font-semibold"
          >
            Back to cards
          </button>
        </div>
      )}

      <Link
        href="/study-tracker"
        className="inline-block mt-6 text-sm text-slate-400 hover:text-white"
      >
        ← Back to Study
      </Link>
    </main>
  );
}