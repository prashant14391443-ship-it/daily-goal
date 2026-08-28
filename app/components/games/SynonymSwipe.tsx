"use client";
import { useEffect, useRef, useState } from "react";
import { SYNONYMS, randomWord } from "@/lib/gameWords";
import { playCorrect, playWrong, playWin } from "@/lib/sounds";
import { Check, X, Trophy, ArrowLeftRight } from "lucide-react";

type Round = { a: string; b: string; isSyn: boolean; key: string };

function isSynonymPair(a: string, b: string): boolean {
  return SYNONYMS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

function makeKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

function drawRound(recent: Set<string>): Round {
  // 50/50 chance of synonym vs non-synonym
  const wantSyn = Math.random() < 0.5;

  if (wantSyn) {
    // Try to find an unused synonym pair
    const pool = SYNONYMS.filter(([a, b]) => !recent.has(makeKey(a, b)));
    if (pool.length > 0) {
      const [a, b] = pool[Math.floor(Math.random() * pool.length)];
      return { a, b, isSyn: true, key: makeKey(a, b) };
    }
    // Pool exhausted — allow repeats
    const [a, b] = SYNONYMS[Math.floor(Math.random() * SYNONYMS.length)];
    return { a, b, isSyn: true, key: makeKey(a, b) };
  } else {
    // Random non-synonym pair
    let tries = 0;
    while (tries < 30) {
      const a = randomWord();
      const b = randomWord(a);
      if (isSynonymPair(a, b)) { tries++; continue; }
      const key = makeKey(a, b);
      if (recent.has(key)) { tries++; continue; }
      return { a, b, isSyn: false, key };
    }
    // Fallback
    const a = randomWord(); const b = randomWord(a);
    return { a, b, isSyn: false, key: makeKey(a, b) };
  }
}

export default function SynonymSwipe({ onExit }: { onExit?: () => void }) {
  const [round, setRound] = useState<Round>(() => drawRound(new Set()));
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [over, setOver] = useState(false);
  const [best, setBest] = useState(0);
  const [flash, setFlash] = useState<null | boolean>(null);
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const [startX, setStartX] = useState(0);
  const recentRef = useRef<Set<string>>(new Set());

  useEffect(() => { setBest(Number(localStorage.getItem("dg-best-synonym") || 0)); }, []);

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

    // Track this pair as recent
    recentRef.current.add(round.key);
    if (recentRef.current.size > 20) {
      const arr = Array.from(recentRef.current);
      recentRef.current = new Set(arr.slice(-15));
    }

    setTimeout(() => {
      if (nl <= 0) return end(ns);
      setRound(drawRound(recentRef.current));
    }, 200);
  };

  const restart = () => {
    recentRef.current = new Set();
    setRound(drawRound(recentRef.current));
    setScore(0);
    setLives(3);
    setOver(false);
    setDx(0);
  };

  return (
    <div className="max-w-md mx-auto">
      {!over ? (
        <>
          <div className="flex justify-between text-xs font-black text-slate-400 mb-4">
            <span className="flex items-center gap-1"><Trophy size={12} className="text-amber-400" /> {best}</span>
            <span className="text-fuchsia-400">∞ endless</span>
            <span>{"❤️".repeat(lives)}{"🖤".repeat(3 - lives)}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 mb-4 text-center">
            <p className="text-[10px] text-slate-400 font-bold">Score <span className="text-white text-base font-black">{score}</span> • Survive as long as you can!</p>
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
          <p className="text-4xl mb-2">{score >= best && score > 0 ? "🏆" : "👏"}</p>
          <p className="text-xl font-black mb-1">Score: {score}</p>
          <p className="text-xs text-slate-500 mb-1">{score >= best && score > 0 ? "New personal best!" : `Best: ${best}`}</p>
          <p className="text-xs text-slate-500 mb-6">Endless mode — can you beat this?</p>
          <button onClick={restart} className="w-full py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 font-black">Play again</button>
        </div>
      )}
    </div>
  );
}