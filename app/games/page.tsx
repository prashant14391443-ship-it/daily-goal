"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import SpeedQuiz from "@/app/components/games/SpeedQuiz";
import MatchPairs from "@/app/components/games/MatchPairs";
import Scramble from "@/app/components/games/Scramble";
import SayItRace from "@/app/components/games/SayItRace";
import DailyChallenge from "@/app/components/games/DailyChallenge"; 
import { getBest } from "@/app/components/games/gameData";


type GameId = "" | "quiz" | "match" | "scramble" | "sayit" | "chal";

const TITLES: Record<string, string> = {
  quiz: "⚡ Speed Quiz",
  match: "🃏 Match Pairs",
  scramble: "🧩 Word Scramble",
  sayit: "🎤 Say-It Race",
};

export default function GamesPage() {
  const [game, setGame] = useState<GameId>("");
  const [bests, setBests] = useState({ quiz: 0, match: 0, scramble: 0, sayit: 0 });
  const [chalDone, setChalDone] = useState(false);
  const [chalStreak, setChalStreak] = useState(0);
  useEffect(() => {
    if (game === "") {
      setBests({
        quiz: getBest("dg-game-quiz"),
        match: getBest("dg-game-match"),
        scramble: getBest("dg-game-scramble"),
        sayit: getBest("dg-game-sayit"),
      });
      const today = new Date();
      const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const yest = new Date(Date.now() - 86400000);
      const yiso = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, "0")}-${String(yest.getDate()).padStart(2, "0")}`;
      setChalDone(localStorage.getItem("dg-chal-done-" + iso) === "1");
      const st = JSON.parse(localStorage.getItem("dg-chal-streak") || "null");
      setChalStreak(st && (st.date === iso || st.date === yiso) ? st.count : 0);
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
                {game === "chal" && <DailyChallenge onExit={exit} />}
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

      <button onClick={() => setGame("chal")} className="mt-6 w-full bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/40 hover:border-amber-400 rounded-xl p-4 text-left transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏆</span>
          <div className="flex-1">
            <p className="font-bold text-sm">Daily Challenge</p>
            <p className="text-[10px] text-slate-400">⚡5 + 🃏4 + 🧩1 + 1 • 2 minutes</p>
          </div>
          <span className={`text-xs font-black ${chalDone ? "text-emerald-400" : "text-orange-400"}`}>{chalDone ? "✅ done" : "▶ play"}</span>
        </div>
        <p className="text-xs font-black text-amber-400 mt-2">🔥 {chalStreak}-day streak</p>
      </button>
    </main>
  );
}