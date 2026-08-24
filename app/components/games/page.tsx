"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import SpeedQuiz from "@/app/components/games/SpeedQuiz";
import MatchPairs from "@/app/components/games/MatchPairs";
import Scramble from "@/app/components/games/Scramble";
import SayItRace from "@/app/components/games/SayItRace";
import DailyChallenge from "@/app/components/games/DailyChallenge";   // ✅ ADD THIS
import { getBest } from "@/app/components/games/gameData";
type GameId = "" | "quiz" | "match" | "scramble" | "sayit" | "challenge";

const TITLES: Record<string, string> = {
  quiz: "⚡ Speed Quiz",
  match: "🃏 Match Pairs",
  scramble: "🧩 Word Scramble",
  sayit: "🎤 Say-It Race",
  challenge: "🏆 Daily Challenge",
};

export default function GamesPage() {
  const [game, setGame] = useState<GameId>("");
  const [bests, setBests] = useState({ quiz: 0, match: 0, scramble: 0, sayit: 0, challenge: 0 });

  useEffect(() => {
    if (game === "") {
      setBests({
        quiz: getBest("dg-game-quiz"),
        match: getBest("dg-game-match"),
        scramble: getBest("dg-game-scramble"),
        sayit: getBest("dg-game-sayit"),
        challenge: getBest("dg-game-challenge"),
      });
    }
  }, [game]);

  const exit = () => setGame("");

  if (game) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
        <div className="flex justify-between items-center mb-6 max-w-md mx-auto">
          <h1 className="text-xl font-black">{TITLES[game]}</h1>
          <button onClick={exit} className="text-sm text-slate-400">← Games</button>
        </div>
        {game === "quiz" && <SpeedQuiz onExit={exit} />}
        {game === "match" && <MatchPairs onExit={exit} />}
        {game === "scramble" && <Scramble onExit={exit} />}
        {game === "sayit" && <SayItRace onExit={exit} />}
        {game === "challenge" && <DailyChallenge onExit={exit} />}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-black">🎮 Game Zone</h1>
        <Link href="/speaking" className="text-sm text-slate-400">← Back</Link>
      </div>
      <p className="text-xs text-slate-400 mb-5">Play with YOUR words • beat your best • learn without feeling it!</p>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setGame("quiz")} className="bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-xl p-4 text-left transition-colors">
          <p className="text-3xl">⚡</p>
          <p className="font-bold mt-2 text-sm">Speed Quiz</p>
          <p className="text-[10px] text-slate-400">60 sec • combo • 4 options</p>
          <p className="text-xs font-black text-amber-400 mt-2">🏆 {bests.quiz || "—"}</p>
        </button>
        <button onClick={() => setGame("match")} className="bg-slate-900 border border-slate-800 hover:border-violet-500/60 rounded-xl p-4 text-left transition-colors">
          <p className="text-3xl">🃏</p>
          <p className="font-bold mt-2 text-sm">Match Pairs</p>
          <p className="text-[10px] text-slate-400">word ↔ meaning • beat time</p>
          <p className="text-xs font-black text-amber-400 mt-2">🏆 {bests.match ? `${bests.match}s` : "—"}</p>
        </button>
        <button onClick={() => setGame("scramble")} className="bg-slate-900 border border-slate-800 hover:border-amber-500/60 rounded-xl p-4 text-left transition-colors">
          <p className="text-3xl">🧩</p>
          <p className="font-bold mt-2 text-sm">Word Scramble</p>
          <p className="text-[10px] text-slate-400">build words from letters</p>
          <p className="text-xs font-black text-amber-400 mt-2">🏆 {bests.scramble ? `${bests.scramble}/5` : "—"}</p>
        </button>
        <button onClick={() => setGame("sayit")} className="bg-slate-900 border border-slate-800 hover:border-red-500/60 rounded-xl p-4 text-left transition-colors">
          <p className="text-3xl">🎤</p>
          <p className="font-bold mt-2 text-sm">Say-It Race</p>
          <p className="text-[10px] text-slate-400">speak • get % • pass 70%</p>
          <p className="text-xs font-black text-amber-400 mt-2">🏆 {bests.sayit ? `${bests.sayit}%` : "—"}</p>
        </button>
      </div>

      <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-4 text-center opacity-60">
        <p className="font-bold text-sm">🏆 Daily Challenge</p>
        <p className="text-[10px] text-slate-400">SOON — one mixed challenge every day!</p>
      </div>
    </main>
  );
}