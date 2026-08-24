"use client";
import { useState } from "react";
import { allWords, shuffle, getBest, saveBest } from "./gameData";
import type { VWord } from "./gameData";

type Letter = { id: number; ch: string; used: boolean };

function pickRound(): VWord[] {
  return shuffle(allWords().filter((w) => !w.word.includes(" ") && w.word.length >= 4 && w.word.length <= 9)).slice(0, 5);
}

function makeLetters(w: string): Letter[] {
  const arr = w.split("").map((ch, i) => ({ id: i, ch, used: false }));
  let s = shuffle(arr);
  let tries = 0;
  while (s.map((x) => x.ch).join("") === w && tries < 5) {
    s = shuffle(arr);
    tries++;
  }
  return s;
}

export default function Scramble({ onExit }: { onExit: () => void }) {
  const [round, setRound] = useState<VWord[]>(() => pickRound());
  const [idx, setIdx] = useState(0);
  const [letters, setLetters] = useState<Letter[]>(() => makeLetters(round[0].word.toLowerCase()));
  const [built, setBuilt] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [over, setOver] = useState(false);
  const [best, setBest] = useState(0);

  const w = round[idx].word.toLowerCase();

  const tapLetter = (id: number) => {
    if (over || wrong) return;
    const l = letters.find((x) => x.id === id);
    if (!l || l.used) return;
    setLetters((ls) => ls.map((x) => (x.id === id ? { ...x, used: true } : x)));
    const newBuilt = [...built, id];
    setBuilt(newBuilt);
    if (newBuilt.length === w.length) {
      const guess = newBuilt.map((bid) => letters.find((x) => x.id === bid)!.ch).join("");
      if (guess === w) {
        const ns = score + 1;
        setScore(ns);
        if (idx + 1 >= round.length) {
          setOver(true);
          saveBest("dg-game-scramble", ns, true);
          setBest(getBest("dg-game-scramble"));
        } else {
          const ni = idx + 1;
          setIdx(ni);
          setLetters(makeLetters(round[ni].word.toLowerCase()));
          setBuilt([]);
        }
      } else {
        setWrong(true);
        setTimeout(() => {
          setWrong(false);
          setBuilt([]);
          setLetters((ls) => ls.map((x) => ({ ...x, used: false })));
        }, 400);
      }
    }
  };

  const removeAt = (i: number) => {
    if (over || wrong) return;
    const bid = built[i];
    if (bid === undefined) return;
    setBuilt((b) => b.filter((_, pi) => pi !== i));
    setLetters((ls) => ls.map((x) => (x.id === bid ? { ...x, used: false } : x)));
  };

  const clear = () => {
    setBuilt([]);
    setLetters((ls) => ls.map((x) => ({ ...x, used: false })));
  };

  const restart = () => {
    const r = pickRound();
    setRound(r);
    setIdx(0);
    setLetters(makeLetters(r[0].word.toLowerCase()));
    setBuilt([]);
    setScore(0);
    setOver(false);
    setBest(getBest("dg-game-scramble"));
  };

  if (over) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-sm mx-auto mt-10">
        <p className="text-6xl mb-3">{score === 5 ? "🏆" : score >= 3 ? "💪" : "🌱"}</p>
        <p className="text-4xl font-black text-emerald-400">{score} / 5</p>
        <p className="text-sm text-slate-400 mt-1 mb-2">words built</p>
        <p className="text-xs text-amber-400 font-bold mb-6">🏆 Best: {Math.max(best, score)}/5</p>
        <div className="grid gap-2">
          <button onClick={restart} className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold">🔁 Play Again</button>
          <button onClick={onExit} className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold">🏠 Games Hub</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="flex justify-between items-center mb-4">
        <span className="text-lg font-black text-white">🧩 {idx + 1}/5</span>
        <span className="text-lg font-black text-emerald-400">⭐ {score}</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 text-center">
        <p className="text-[10px] text-slate-500 font-bold mb-1">💡 MEANING</p>
        <p className="text-sm text-slate-200">{round[idx].meaning}</p>
        <p className="text-xs text-amber-200 mt-2">🇮 {round[idx].hindi}</p>
      </div>

      <div className={`flex gap-1.5 justify-center flex-wrap mb-6 ${wrong ? "animate-pulse" : ""}`}>
        {w.split("").map((_, i) => {
          const bid = built[i];
          const ch = bid !== undefined ? letters.find((l) => l.id === bid)?.ch : "";
          return (
            <button
              key={i}
              onClick={() => removeAt(i)}
              className={`w-9 h-11 rounded-lg text-lg font-black flex items-center justify-center transition-colors ${
                ch ? (wrong ? "bg-red-700" : "bg-violet-600") : "bg-slate-800 border border-slate-700"
              }`}
            >
              {ch}
            </button>
          );
        })}
      </div>

      <div className="flex gap-1.5 justify-center flex-wrap mb-6">
        {letters.map((l) => (
          <button
            key={l.id}
            disabled={l.used}
            onClick={() => tapLetter(l.id)}
            className={`w-9 h-11 rounded-lg text-lg font-black uppercase ${
              l.used ? "opacity-20 bg-slate-800" : "bg-slate-800 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            {l.ch}
          </button>
        ))}
      </div>

      <button onClick={clear} className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold">
        ↩️ Clear
      </button>
      <p className="text-[10px] text-slate-500 text-center mt-3">Tap letters to build the word • tap a slot to remove</p>
    </div>
  );
}