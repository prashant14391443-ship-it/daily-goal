"use client";
import { useEffect, useState } from "react";
import { pickWords, shuffle, getBest, saveBest } from "./gameData";

type Tile = { id: number; key: string; text: string; kind: "w" | "m" };

function makeRound(): Tile[] {
  const words = pickWords(6);
  return shuffle([
    ...words.map((w, i) => ({ id: i * 2, key: w.word, text: w.word, kind: "w" as const })),
    ...words.map((w, i) => ({ id: i * 2 + 1, key: w.word, text: w.meaning, kind: "m" as const })),
  ]);
}

export default function MatchPairs({ onExit }: { onExit: () => void }) {
  const [tiles, setTiles] = useState<Tile[]>(() => makeRound());
  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [over, setOver] = useState(false);
  const [best, setBest] = useState(0);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    setBest(getBest("dg-game-match"));
  }, []);

  useEffect(() => {
    if (over) return;
    const id = setInterval(() => setElapsed((e) => e + 0.1), 100);
    return () => clearInterval(id);
  }, [over]);

  const finalTime = Math.round((elapsed + penalty) * 10) / 10;

  useEffect(() => {
    if (matched.length === 6 && !over) {
      setOver(true);
      saveBest("dg-game-match", finalTime, false);
      setBest(getBest("dg-game-match"));
    }
  }, [matched, over, finalTime]);

  const tap = (t: Tile) => {
    if (over || matched.includes(t.key)) return;
    if (selected === null) {
      setSelected(t.id);
      return;
    }
    if (selected === t.id) {
      setSelected(null);
      return;
    }
    const sel = tiles.find((x) => x.id === selected);
    if (!sel || sel.kind === t.kind) {
      setSelected(t.id);
      return;
    }
    if (sel.key === t.key) {
      setMatched((m) => [...m, t.key]);
      setSelected(null);
    } else {
      setMistakes((m) => m + 1);
      setPenalty((p) => p + 1);
      setSelected(null);
      setShake(true);
      setTimeout(() => setShake(false), 200);
    }
  };

  const restart = () => {
    setTiles(makeRound());
    setSelected(null);
    setMatched([]);
    setMistakes(0);
    setElapsed(0);
    setPenalty(0);
    setOver(false);
  };

  if (over) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-sm mx-auto mt-10">
        <p className="text-6xl mb-3">{finalTime <= 15 ? "🏆" : finalTime <= 30 ? "💪" : "🌱"}</p>
        <p className="text-4xl font-black text-emerald-400">{finalTime}s</p>
        <p className="text-sm text-slate-400 mt-1 mb-2">❌ mistakes: {mistakes}</p>
        <p className="text-xs text-amber-400 font-bold mb-6">🏆 Best: {best ? `${best}s` : "—"}</p>
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
        <span className="text-lg font-black text-white">⏱ {finalTime}s</span>
        <span className={`text-sm font-black ${shake ? "text-red-400" : "text-slate-400"}`}>❌ {mistakes}</span>
        <span className="text-lg font-black text-emerald-400">🎯 {matched.length}/6</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((t) => {
          const done = matched.includes(t.key);
          const sel = selected === t.id;
          return (
            <button
              key={t.id}
              onClick={() => tap(t)}
              disabled={done}
              className={`p-3 rounded-xl text-sm font-bold text-left min-h-[64px] transition-all ${
                done
                  ? "opacity-30 bg-emerald-900/40"
                  : sel
                  ? "bg-violet-600 border-2 border-violet-400 scale-[1.02]"
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              {done ? "✅ " : ""}
              {t.text}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-500 text-center mt-4">Tap a WORD → tap its MEANING • ❌ = +1s penalty</p>
    </div>
  );
}