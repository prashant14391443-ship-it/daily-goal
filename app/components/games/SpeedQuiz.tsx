"use client";
import { useEffect, useState } from "react";
import { pickWords, shuffle, getBest, saveBest } from "./gameData";
import type { VWord } from "./gameData";
import { playCorrect, playWrong, playWin } from "@/lib/sounds";

type Q = { w: VWord; options: string[]; answer: number };

function makeQ(): Q {
  const [w, ...rest] = pickWords(4);
  const options = shuffle([w.meaning, ...rest.map((x) => x.meaning)]);
  return { w, options, answer: options.indexOf(w.meaning) };
}

export default function SpeedQuiz({ onExit }: { onExit: () => void }) {
  const [q, setQ] = useState<Q>(() => makeQ());
  const [time, setTime] = useState(60);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [flash, setFlash] = useState<"" | "ok" | "bad">("");
  const [over, setOver] = useState(false);
  const [best, setBest] = useState(0);

  useEffect(() => {
    setBest(getBest("dg-game-quiz"));
  }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  // 🔊 Duolingo style: AI says the word FIRST, then you answer
  useEffect(() => {
    if (!over) speak(q.w.word);
  }, [q, over]);

  useEffect(() => {
    if (over) return;
    const id = setInterval(() => setTime((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [over]);

  useEffect(() => {
    if (time <= 0 && !over) {
      setOver(true);
      playWin();
      saveBest("dg-game-quiz", score, true);
      setBest(getBest("dg-game-quiz"));
    }
  }, [time, over, score]);

  const pick = (oi: number) => {
    if (over) return;
    if (oi === q.answer) {
      const bonus = combo >= 2 ? 2 : 1;
      setScore((s) => s + bonus);
      setCombo((c) => c + 1);
      setFlash("ok");
      playCorrect();
    } else {
      setCombo(0);
      setTime((t) => Math.max(0, t - 3));
      setFlash("bad");
      playWrong();
    }
    setTimeout(() => setFlash(""), 180);
    setQ(makeQ());
  };

  const restart = () => {
    setQ(makeQ());
    setTime(60);
    setScore(0);
    setCombo(0);
    setOver(false);
  };

  if (over) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-sm mx-auto mt-10">
        <p className="text-6xl mb-3">{score >= 20 ? "🏆" : score >= 10 ? "💪" : "🌱"}</p>
        <p className="text-4xl font-black text-emerald-400">{score}</p>
        <p className="text-sm text-slate-400 mt-1 mb-2">points</p>
        <p className="text-xs text-amber-400 font-bold mb-6">🏆 Best: {Math.max(best, score)}</p>
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
        <span className={`text-lg font-black ${time <= 10 ? "text-red-400 animate-pulse" : "text-white"}`}>⏱ {time}s</span>
        <span className={`text-sm font-black ${combo >= 3 ? "text-orange-400" : "text-slate-400"}`}>🔥 x{combo}</span>
        <span className="text-lg font-black text-emerald-400">⭐ {score}</span>
      </div>
      <div className={`bg-slate-900 border rounded-2xl p-6 mb-4 text-center ${flash === "ok" ? "border-emerald-500" : flash === "bad" ? "border-red-500" : "border-slate-800"}`}>
        <p className="text-[10px] text-slate-500 font-bold mb-2">🔊 WHAT DOES THIS MEAN?</p>
        <p className="text-3xl font-black uppercase">{q.w.word}</p>
        <button onClick={() => speak(q.w.word)} className="mt-2 text-[10px] bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-full">🔊 hear again</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {q.options.map((opt, oi) => (
          <button key={oi} onClick={() => pick(oi)} className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-left">
            {opt}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-slate-500 text-center mt-4">✅ +1 (combo +2) • ❌ −3 sec</p>
    </div>
  );
}