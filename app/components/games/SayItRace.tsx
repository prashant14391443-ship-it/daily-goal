"use client";
import { useRef, useState } from "react";
import { pickSentences, getBest, saveBest } from "./gameData";
import type { SItem } from "./gameData";

export default function SayItRace({ onExit }: { onExit: () => void }) {
  const [round, setRound] = useState<SItem[]>(() => pickSentences(5));
  const [idx, setIdx] = useState(0);
  const [rec, setRec] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [results, setResults] = useState<(number | null)[]>([null, null, null, null, null]);
  const [over, setOver] = useState(false);
  const [best, setBest] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recSecRef = useRef(0);
  const recTimerRef = useRef<number | null>(null);

  const it = round[idx];

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  const toggleRec = async () => {
    if (rec) {
      mediaRef.current?.stop();
      setRec(false);
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      return;
    }
    window.speechSynthesis?.cancel();
    setLastScore(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recSecRef.current < 2) return;
        const mime = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 5000 || blob.size > 3500000) return;
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const res = await fetch("/api/ai", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mode: "drill", target: it.right, audio: String(reader.result).split(",")[1], mimeType: mime }),
            });
            const d = await res.json();
            if (typeof d.score === "number") {
              setLastScore(d.score);
              setResults((r) => {
                const c = [...r];
                c[idx] = d.score;
                return c;
              });
            }
          } catch {}
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      mediaRef.current = mr;
      setRec(true);
      recSecRef.current = 0;
      recTimerRef.current = window.setInterval(() => {
        recSecRef.current += 1;
      }, 1000);
    } catch {
      alert("🎤 Mic permission denied!");
    }
  };

  const passed = results.filter((s) => s !== null && s >= 70).length;
  const doneScores = results.filter((s): s is number => s !== null);
  const avg = doneScores.length ? Math.round(doneScores.reduce((a, b) => a + b, 0) / doneScores.length) : 0;

  const next = () => {
    if (idx + 1 >= round.length) {
      setOver(true);
      saveBest("dg-game-sayit", avg, true);
      setBest(getBest("dg-game-sayit"));
    } else {
      setIdx(idx + 1);
      setLastScore(null);
    }
  };

  const restart = () => {
    setRound(pickSentences(5));
    setIdx(0);
    setResults([null, null, null, null, null]);
    setLastScore(null);
    setOver(false);
    setBest(getBest("dg-game-sayit"));
  };

  if (over) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-sm mx-auto mt-10">
        <p className="text-6xl mb-3">{passed === 5 ? "🏆" : passed >= 3 ? "💪" : "🌱"}</p>
        <p className="text-4xl font-black text-emerald-400">{passed} / 5</p>
        <p className="text-sm text-slate-400 mt-1 mb-2">passed • average {avg}%</p>
        <p className="text-xs text-amber-400 font-bold mb-6">🏆 Best average: {Math.max(best, avg)}%</p>
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
        <span className="text-lg font-black text-white">🎤 {idx + 1}/5</span>
        <span className="text-lg font-black text-emerald-400">✅ {passed}</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 grid gap-4 text-center">
        <p className="text-[10px] text-slate-500 font-bold">SAY THIS SENTENCE (70%+ to pass)</p>
        <p className="text-xl font-black leading-snug">"{it.right}"</p>
        <p className="text-xs text-amber-200">🇮 {it.hindi}</p>

        <div className="flex gap-2">
          <button onClick={() => speak(it.right)} className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold">
            🔊 Hear it
          </button>
          <button
            onClick={toggleRec}
            className={`flex-1 py-3 rounded-xl text-sm font-bold ${rec ? "bg-red-600 animate-pulse" : "bg-violet-600 hover:bg-violet-500"}`}
          >
            {rec ? "⏹️ Stop" : "🎤 Say it"}
          </button>
        </div>

        {lastScore !== null && (
          <div className={`rounded-xl p-4 border ${lastScore >= 70 ? "bg-emerald-600/15 border-emerald-500/40" : "bg-red-600/15 border-red-500/40"}`}>
            <p className={`text-3xl font-black ${lastScore >= 70 ? "text-emerald-400" : "text-red-400"}`}>{lastScore}%</p>
            <p className="text-xs text-slate-300 mt-1">
              {lastScore >= 70 ? "✅ Passed! Amazing pronunciation!" : "❌ Under 70% — hear it & try again!"}
            </p>
          </div>
        )}

        <button
          onClick={next}
          disabled={lastScore === null}
          className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold disabled:opacity-40"
        >
          {idx + 1 >= round.length ? "🏁 Finish" : "Next ➡️"}
        </button>
      </div>
      <p className="text-[10px] text-slate-500 text-center mt-3">Record 2+ seconds • retry as many times as you want!</p>
    </div>
  );
}