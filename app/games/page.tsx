"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import SpeedQuiz from "@/app/components/games/SpeedQuiz";
import MatchPairs from "@/app/components/games/MatchPairs";
import Scramble from "@/app/components/games/Scramble";
import SayItRace from "@/app/components/games/SayItRace";
import DailyChallenge from "@/app/components/games/DailyChallenge";
import { getBest, levelInfo, chalConfig } from "@/app/components/games/gameData";
import { IconTile } from "@/app/components/ui";

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
          <button onClick={exit} className="text-sm text-slate-400 press">← Games</button>
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
    { id: "quiz" as GameId, emoji: "⚡", title: "Speed Quiz", desc: "60 sec • combo • 4 options", best: bests.quiz ? `${bests.quiz}` : null, grad: "bg-gradient-to-br from-blue-500 to-indigo-600", border: "border-blue-500/30" },
    { id: "match" as GameId, emoji: "🃏", title: "Match Pairs", desc: "word ↔ meaning • beat time", best: bests.match ? `${bests.match}s` : null, grad: "bg-gradient-to-br from-violet-500 to-purple-600", border: "border-violet-500/30" },
    { id: "scramble" as GameId, emoji: "🧩", title: "Word Scramble", desc: "build words from letters", best: bests.scramble ? `${bests.scramble}/5` : null, grad: "bg-gradient-to-br from-green-500 to-emerald-600", border: "border-green-500/30" },
    { id: "sayit" as GameId, emoji: "🎤", title: "Say-It Race", desc: "speak • get % • pass 70%", best: bests.sayit ? `${bests.sayit}%` : null, grad: "bg-gradient-to-br from-pink-500 to-rose-600", border: "border-pink-500/30" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <IconTile emoji="🎮" gradient="bg-gradient-to-br from-fuchsia-500 to-violet-600" size="lg" />
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Game Zone</h1>
            <p className="text-[10px] text-slate-400 font-semibold">Play with YOUR words • beat your best</p>
          </div>
        </div>
        <Link href="/speaking" className="text-sm text-slate-400 press">← Back</Link>
      </div>

      {/* game cards */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        {games.map((g) => (
          <button
            key={g.id}
            onClick={() => setGame(g.id)}
            className={`press relative bg-slate-900 p-4 rounded-2xl border ${g.border} shadow-lg shadow-black/30 text-left hover:shadow-xl transition-all overflow-hidden`}
          >
            {g.best && (
              <div className="absolute top-2 right-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <span>🏆</span>{g.best}
              </div>
            )}
            <IconTile emoji={g.emoji} gradient={g.grad} />
            <p className="font-black mt-3 text-sm text-white">{g.title}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{g.desc}</p>
          </button>
        ))}
      </div>

      {/* 🏆 DAILY CHALLENGE — glowing lobby card */}
      <button
        onClick={() => setGame("chal" as GameId)}
        className="press mt-4 w-full relative overflow-hidden rounded-2xl border-2 border-amber-400/60 bg-gradient-to-r from-amber-600/25 via-orange-600/25 to-amber-600/25 p-4 text-left shadow-2xl shadow-amber-900/30"
      >
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-400/20 rounded-full blur-2xl" />
        <div className="relative flex items-center gap-3">
          <IconTile emoji="🏆" gradient="bg-gradient-to-br from-amber-400 to-orange-600" size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm text-white">
              Daily Challenge <span className="text-amber-300">• ⭐ Level {li.level}</span>
            </p>
            <p className="text-[10px] text-slate-300 font-semibold mt-0.5">
              ⚡{cfg.quiz} + 🃏{cfg.match} + 🧩{cfg.scram} + 🎤{cfg.say} {li.level >= 3 ? "• HARD MODE" : "• grows every level!"}
            </p>
          </div>
          <span className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full border ${chalDone ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300" : "bg-orange-500/20 border-orange-400/50 text-orange-300"}`}>
            {chalDone ? "✅ done" : "▶ play"}
          </span>
        </div>
        <div className="relative h-1.5 bg-black/30 rounded-full mt-3 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <div className="relative flex justify-between mt-1.5">
          <p className="text-[10px] text-slate-300 font-semibold">⭐ {chalStars} • {chalStars - li.prev}/{li.next - li.prev} to Level {li.level + 1}</p>
          <p className="text-[10px] font-black text-orange-300">🔥 {chalStreak}-day streak</p>
        </div>
      </button>
    </main>
  );
}