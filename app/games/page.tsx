"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import SpeedQuiz from "@/app/components/games/SpeedQuiz";
import MatchPairs from "@/app/components/games/MatchPairs";
import Scramble from "@/app/components/games/Scramble";
import SayItRace from "@/app/components/games/SayItRace";
import DailyChallenge from "@/app/components/games/DailyChallenge";
import { getBest, levelInfo, chalConfig } from "@/app/components/games/gameData";
import { Gamepad2, Zap, Layers, Puzzle, Mic, Trophy, Flame, Star, ArrowLeft } from "lucide-react";

type GameId = "" | "quiz" | "match" | "scramble" | "sayit" | "challenge";

const TITLES: Record<string, string> = {
  quiz: "Speed Quiz",
  match: "Match Pairs",
  scramble: "Word Scramble",
  sayit: "Say-It Race",
  challenge: "Daily Challenge",
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
          <h1 className="text-xl font-bold">{TITLES[game]}</h1>
          <button onClick={exit} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-300 transition-colors">
            <ArrowLeft size={16} />
            Games
          </button>
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

  const games = [
    { id: "quiz" as GameId, icon: Zap, title: "Speed Quiz", desc: "60 sec • combo • 4 options", best: bests.quiz ? `${bests.quiz}` : null, tint: "bg-blue-500/10 border-blue-500/20", color: "text-blue-400" },
    { id: "match" as GameId, icon: Layers, title: "Match Pairs", desc: "word ↔ meaning • beat time", best: bests.match ? `${bests.match}s` : null, tint: "bg-violet-500/10 border-violet-500/20", color: "text-violet-400" },
    { id: "scramble" as GameId, icon: Puzzle, title: "Word Scramble", desc: "build words from letters", best: bests.scramble ? `${bests.scramble}/5` : null, tint: "bg-green-500/10 border-green-500/20", color: "text-green-400" },
    { id: "sayit" as GameId, icon: Mic, title: "Say-It Race", desc: "speak • get % • pass 70%", best: bests.sayit ? `${bests.sayit}%` : null, tint: "bg-pink-500/10 border-pink-500/20", color: "text-pink-400" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
            <Gamepad2 size={22} className="text-fuchsia-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Game Zone</h1>
            <p className="text-xs text-slate-400 font-medium">Play with YOUR words • beat your best</p>
          </div>
        </div>
        <Link href="/speaking" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-300 transition-colors">
          <ArrowLeft size={16} />
          Back
        </Link>
      </div>

      {/* game cards */}
      <div className="grid grid-cols-2 gap-3">
        {games.map((g) => {
          const Icon = g.icon;
          return (
            <button
              key={g.id}
              onClick={() => setGame(g.id)}
              className="relative bg-slate-900 p-4 rounded-2xl border border-slate-700 hover:border-slate-600 text-left transition-colors overflow-hidden"
            >
              {g.best && (
                <div className="absolute top-3 right-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
                  <Trophy size={10} />
                  {g.best}
                </div>
              )}
              <div className={`w-11 h-11 rounded-xl ${g.tint} flex items-center justify-center mb-3`}>
                <Icon size={20} className={g.color} />
              </div>
              <p className="font-semibold text-sm text-white">{g.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{g.desc}</p>
            </button>
          );
        })}
      </div>

      {/* 🏆 DAILY CHALLENGE */}
      <button
        onClick={() => setGame("challenge" as GameId)}
        className="mt-4 w-full relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-left hover:border-amber-500/50 transition-colors"
      >
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Trophy size={20} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white flex items-center gap-2">
              Daily Challenge
              <span className="text-amber-300 flex items-center gap-1 text-xs">
                <Star size={12} fill="currentColor" />
                Level {li.level}
              </span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <Zap size={11} className="text-blue-400" />{cfg.quiz}
              <Layers size={11} className="text-violet-400" />{cfg.match}
              <Puzzle size={11} className="text-green-400" />{cfg.scram}
              <Mic size={11} className="text-pink-400" />{cfg.say}
              {li.level >= 3 ? "• HARD MODE" : "• grows every level!"}
            </p>
          </div>
          <span className={`shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-lg border ${
            chalDone 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
              : "bg-orange-500/10 border-orange-500/30 text-orange-300"
          }`}>
            {chalDone ? "Done" : "Play"}
          </span>
        </div>

        <div className="relative h-1.5 bg-slate-800 rounded-full mt-4 overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="relative flex justify-between mt-2">
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Star size={11} className="text-amber-400" />
            {chalStars} • {chalStars - li.prev}/{li.next - li.prev} to Level {li.level + 1}
          </p>
          <p className="text-xs font-semibold text-orange-300 flex items-center gap-1">
            <Flame size={11} />
            {chalStreak}-day streak
          </p>
        </div>
      </button>
    </main>
  );
}