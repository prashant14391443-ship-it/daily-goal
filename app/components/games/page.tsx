"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import SpeedQuiz from "@/app/components/games/SpeedQuiz";
import MatchPairs from "@/app/components/games/MatchPairs";
import Scramble from "@/app/components/games/Scramble";
import SayItRace from "@/app/components/games/SayItRace";
import DailyChallenge from "@/app/components/games/DailyChallenge";
import { getBest, levelInfo, chalConfig } from "@/app/components/games/gameData";

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
  const [bests, setBests] = useState({ quiz: 0, match: 0, scramble: 0, sayit: 0 });
  const [chalDone, setChalDone] = useState(false);
  const [chalStreak, setChalStreak] = useState(0);
  const [chalStars, setChalStars] = useState(0);

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
      setChalStars(Number(localStorage.getItem("dg-chal-stars") || 0));
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

  const li = levelInfo(chalStars);
  const cfg = chalConfig(li.level);
  const progress = Math.min(100, ((chalStars - li.prev) / (li.next - li.prev)) * 100);

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

      {/* 🏆 LEVEL-AWARE DAILY CHALLENGE */}
      <button onClick={() => setGame("challenge")} className="mt-6 w-full bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/40 hover:border-amber-400 rounded-xl p-4 text-left transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏆</span>
          <div className="flex-1">
            <p className="font-bold text-sm">Daily Challenge <span className="text-amber-400">• ⭐ Level {li.level}</span></p>
            <p className="text-[10px] text-slate-400">
              ⚡{cfg.quiz} + 🃏{cfg.match} + 🧩{cfg.scram} + 🎤{cfg.say} {li.level >= 3 ? "• HARD MODE" : "• grows every level!"}
            </p>
          </div>
          <span className={`text-xs font-black ${chalDone ? "text-emerald-400" : "text-orange-400"}`}>{chalDone ? "✅ done" : "▶ play"}</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
          <div className="h-full bg-amber-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <p className="text-[10px] text-slate-400">⭐ {chalStars} • {chalStars - li.prev}/{li.next - li.prev} to Level {li.level + 1}</p>
          <p className="text-xs font-black text-orange-400">🔥 {chalStreak}</p>
        </div>
      </button>
    </main>
  );
}