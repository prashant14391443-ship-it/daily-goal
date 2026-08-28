"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { WORDS, randomWord } from "@/lib/gameWords";
import { ArrowLeft, Volume2, Trophy, Play, Ear } from "lucide-react";

export default function EarRace() {
  const [started, setStarted] = useState(false);
  const [over, setOver] = useState(false);
  const [word, setWord] = useState("");
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(45);
  const [best, setBest] = useState(0);
  const [wrong, setWrong] = useState(false);

  useEffect(() => { setBest(Number(localStorage.getItem("dg-best-ear") || 0)); }, []);

  useEffect(() => {
    if (!started || over) return;
    const id = setInterval(() => setTime((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [started, over]);

  useEffect(() => {
    if (time <= 0 && started) end();
  }, [time, started]);

  const speak = (w: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(w);
    u.lang = "en-US"; u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  useEffect(() => { if (word && started) speak(word); }, [word, started]);

  const start = () => { setStarted(true); setOver(false); setScore(0); setTime(45); setInput(""); setWord(randomWord()); };

  const end = () => {
    setOver(true); setStarted(false);
    if (score > best) { setBest(score); localStorage.setItem("dg-best-ear", String(score)); }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!started || over) return;
    if (input.trim().toLowerCase() === word) {
      setScore((s) => s + 1);
      setInput("");
      setWord(randomWord(word));
    } else {
      setWrong(true); setTimeout(() => setWrong(false), 250);
      setInput("");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-24 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/games" className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center"><ArrowLeft size={18} className="text-slate-300" /></Link>
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5"><Trophy size={14} className="text-amber-400" /><span className="text-xs font-black text-amber-300">{best}</span></div>
      </div>

      {!started && !over && (
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 text-center">
          <Ear size={40} className="mx-auto mb-3 text-cyan-400" />
          <p className="text-lg font-black mb-1">Ear Race</p>
          <p className="text-xs text-slate-500 mb-6">Listen to the word, type it before 45s runs out!</p>
          <button onClick={start} className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-black flex items-center justify-center gap-2"><Play size={16} /> Start</button>
        </div>
      )}

      {started && (
        <>
          <div className="flex justify-between text-xs font-black text-slate-400 mb-4">
            <span>Score {score}</span>
            <span className={time <= 10 ? "text-rose-400" : ""}>⏱ {time}s</span>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center mb-4">
            <button onClick={() => speak(word)} className="w-20 h-20 rounded-full bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-3"><Volume2 size={32} className="text-cyan-400" /></button>
            <p className="text-[10px] text-slate-500">Tap to hear again</p>
          </div>
          <form onSubmit={submit} className="flex gap-2">
            <input autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type what you hear…" className={`flex-1 p-3 rounded-xl bg-slate-800 border text-sm outline-none ${wrong ? "border-rose-500" : "border-slate-700 focus:border-cyan-500"}`} />
            <button className="px-5 rounded-xl bg-cyan-600 font-black">→</button>
          </form>
        </>
      )}

      {over && (
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 text-center">
          <p className="text-4xl mb-2">🎧</p>
          <p className="text-xl font-black mb-1">Score: {score}</p>
          <p className="text-xs text-slate-500 mb-6">Best: {best}</p>
          <button onClick={start} className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-black">Play again</button>
        </div>
      )}
    </main>
  );
}