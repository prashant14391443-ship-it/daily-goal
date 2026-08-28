"use client";
import { useEffect, useState } from "react";
import { SYNONYMS, shuffle, randomWord } from "@/lib/gameWords";
import { playCorrect, playWrong, playWin } from "@/lib/sounds";
import { Check, X, Trophy, ArrowLeftRight } from "lucide-react";

type Round = { a: string; b: string; isSyn: boolean };
function buildDeck(): Round[] {
  const yes: Round[] = shuffle(SYNONYMS).slice(0, 8).map(([a, b]) => ({ a, b, isSyn: true }));
  const no: Round[] = [];
  while (no.length < 8) {
    const a = randomWord(); const b = randomWord(a);
    if (SYNONYMS.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) continue;
    no.push({ a, b, isSyn: false });
  }
  return shuffle([...yes, ...no]);
}

export default function SynonymSwipe({ onExit }: { onExit?: () => void }) {
  const [deck, setDeck] = useState<Round[]>(() => buildDeck());
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [over, setOver] = useState(false);
  const [best, setBest] = useState(0);
  const [flash, setFlash] = useState<null | boolean>(null);
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const [startX, setStartX] = useState(0);

  useEffect(() => { setBest(Number(localStorage.getItem("dg-best-synonym") || 0)); }, []);
  const round = deck[idx];

  const end = (fs?: number) => {
    const f = fs ?? score;
    playWin();
    if (f > best) { setBest(f); localStorage.setItem("dg-best-synonym", String(f)); }
    setOver(true);
  };
  const answer = (chosen: boolean) => {
    const correct = chosen === round.isSyn;
    correct ? playCorrect() : playWrong();
    setFlash(correct); setTimeout(() => setFlash(null), 250);
    const ns = correct ? score + 1 : score;
    if (correct) setScore(ns);
    const nl = correct ? lives : lives - 1;
    if (!correct) setLives(nl);
    setDx(0);
    setTimeout(() => {
      if (nl <= 0) return end(ns);
      if (idx + 1 >= deck.length) return end(ns);
      setIdx((i) => i + 1);
    }, 200);
  };
  const restart = () => { setDeck(buildDeck()); setIdx(0); setScore(0); setLives(3); setOver(false); setDx(0); };

  return (
    <div className="max-w-md mx-auto">
      {!over ? (
        <>
          <div className="flex justify-between text-xs font-black text-slate-400 mb-4">
            <span className="flex items-center gap-1"><Trophy size={12} className="text-amber-400" /> {best}</span>
            <span>Score {score}/{deck.length}</span>
            <span>{"❤️".repeat(lives)}{"🖤".repeat(3 - lives)}</span>
          </div>
          <div
            onPointerDown={(e) => { setDrag(true); setStartX(e.clientX); }}
            onPointerMove={(e) => { if (drag) setDx(e.clientX - startX); }}
            onPointerUp={() => { setDrag(false); if (dx > 60) answer(true); else if (dx < -60) answer(false); else setDx(0); }}
            className={`select-none touch-none bg-slate-900 border rounded-3xl p-8 text-center mb-6 ${flash === true ? "border-green-500" : flash === false ? "border-rose-500" : "border-slate-700"}`}
            style={{ transform: `translateX(${dx}px) rotate(${dx / 20}deg)` }}
          >
            <p className="text-[10px] font-black text-slate-500 mb-4 flex items-center justify-center gap-1"><ArrowLeftRight size={12} /> SYNONYM OR NOT?</p>
            <p className="text-2xl font-black mb-2">{round.a}</p>
            <p className="text-slate-500 text-sm mb-2">↕</p>
            <p className="text-2xl font-black">{round.b}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => answer(false)} className="flex-1 py-4 rounded-2xl bg-rose-600/20 border border-rose-500/30 text-rose-300 font-black flex items-center justify-center gap-2"><X size={18} /> Different</button>
            <button onClick={() => answer(true)} className="flex-1 py-4 rounded-2xl bg-green-600/20 border border-green-500/30 text-green-300 font-black flex items-center justify-center gap-2"><Check size={18} /> Synonym</button>
          </div>
          <p className="text-center text-[10px] text-slate-600 mt-3">or swipe the card ← / →</p>
        </>
      ) : (
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 text-center">
          <p className="text-4xl mb-2">👏</p>
          <p className="text-xl font-black mb-1">Score: {score}/{deck.length}</p>
          <p className="text-xs text-slate-500 mb-6">Best: {best}</p>
          <button onClick={restart} className="w-full py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 font-black">Play again</button>
        </div>
      )}
    </div>
  );
}