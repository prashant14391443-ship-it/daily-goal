"use client";
import { useEffect, useState } from "react";
import { randomWord } from "@/lib/gameWords";
import { playCorrect, playWrong, playWin } from "@/lib/sounds";
import { Trophy, Link2, Play } from "lucide-react";

function targetFor(level: number): number {
  if (level === 1) return 10;
  if (level === 2) return 20;
  if (level === 3) return 30;
  if (level === 4) return 50;
  return 50 + (level - 4) * 20;
}

export default function WordChain({ onExit }: { onExit?: () => void }) {
  const [chain, setChain] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [lives, setLives] = useState(3);
  const [over, setOver] = useState(false);
  const [level, setLevel] = useState(1);
  const [startLevel, setStartLevel] = useState(1);
  const [levelUpFlash, setLevelUpFlash] = useState(false);
  const [best, setBest] = useState(0);
  const [msg, setMsg] = useState("");

  useEffect(() => { setBest(Number(localStorage.getItem("dg-best-chain") || 0)); }, []);

  const current = chain[chain.length - 1] || "";
  const need = current ? current[current.length - 1] : "";
  const target = targetFor(level);
  const progress = chain.length;

  const start = () => {
    setChain([randomWord()]);
    setLives(3);
    setOver(false);
    setLevel(1);
    setStartLevel(1);
    setInput("");
    setMsg("");
  };

  const end = () => {
    setOver(true);
    const reachedLevel = level - startLevel;
    if (reachedLevel > 0) playWin();
    if (chain.length > best) { setBest(chain.length); localStorage.setItem("dg-best-chain", String(chain.length)); }
  };

  const fail = (m: string) => {
    playWrong();
    setMsg(m);
    setInput("");
    setLives((l) => { if (l - 1 <= 0) end(); return l - 1; });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = input.trim().toLowerCase();
    if (!w) return;
    if (w.length < 3) return fail("Too short (min 3 letters)");
    if (!/^[a-z]+$/.test(w)) return fail("Letters only");
    if (w[0] !== need) return fail(`Must start with "${need.toUpperCase()}"`);
    if (chain.includes(w)) return fail("Already used");

    playCorrect();
    const next = [...chain, w];
    setChain(next);
    setInput("");
    setMsg("");

    if (next.length >= target) {
      // Level up!
      setLevel((lv) => lv + 1);
      setLevelUpFlash(true);
      setTimeout(() => setLevelUpFlash(false), 1500);
      playWin();
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {chain.length === 0 && !over ? (
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 text-center">
          <Link2 size={40} className="mx-auto mb-3 text-green-400" />
          <p className="text-lg font-black mb-1">Word Chain</p>
          <p className="text-xs text-slate-500 mb-6">Chain words to LEVEL UP! Each starts with the LAST letter of the previous.</p>
          <div className="grid grid-cols-2 gap-2 mb-6 text-xs">
            <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[10px] text-slate-500">Lvl 1</p><p className="font-black text-white">10 words</p></div>
            <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[10px] text-slate-500">Lvl 2</p><p className="font-black text-white">20 words</p></div>
            <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[10px] text-slate-500">Lvl 3</p><p className="font-black text-white">30 words</p></div>
            <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[10px] text-slate-500">Lvl 4</p><p className="font-black text-white">50 words</p></div>
          </div>
          <button onClick={start} className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-black flex items-center justify-center gap-2"><Play size={16} /> Start</button>
        </div>
      ) : !over ? (
        <>
          <div className="flex justify-between text-xs font-black text-slate-400 mb-2">
            <span className="flex items-center gap-1"><Trophy size={12} className="text-amber-400" /> {best}</span>
            <span className="text-green-400">Level {level} • {progress}/{target}</span>
            <span>{"❤️".repeat(lives)}{"🖤".repeat(3 - lives)}</span>
          </div>

          <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all" style={{ width: `${Math.min(100, (progress / target) * 100)}%` }} />
          </div>

          {levelUpFlash && (
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 rounded-2xl p-3 mb-3 text-center animate-pulse">
              <p className="text-sm font-black text-green-300">🎉 LEVEL {level} UNLOCKED!</p>
              <p className="text-[10px] text-green-400/80">New target: {targetFor(level)} words</p>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center mb-4">
            <p className="text-[10px] text-slate-500 mb-1">CURRENT WORD</p>
            <p className="text-2xl font-black mb-2">{current}</p>
            <p className="text-xs text-green-400 font-black">Next word starts with: {need.toUpperCase()}</p>
          </div>
          {msg && <p className="text-xs text-rose-400 font-bold mb-2 text-center">{msg}</p>}
          <form onSubmit={submit} className="flex gap-2 mb-4">
            <input autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Word starting with ${need.toUpperCase()}…`} className="flex-1 p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-green-500" />
            <button className="px-5 rounded-xl bg-green-600 font-black">→</button>
          </form>
          <div className="flex flex-wrap gap-1.5">
            {chain.slice(-10).map((w, i) => (
              <span key={i} className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[10px] text-slate-300">{w}</span>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 text-center">
          <p className="text-4xl mb-2">{level > startLevel ? "🏆" : "🔗"}</p>
          <p className="text-xl font-black mb-1">Reached Level {level}</p>
          <p className="text-sm text-slate-400 mb-1">Chain: {chain.length} words</p>
          <p className="text-xs text-slate-500 mb-6">Best: {best}</p>
          <button onClick={start} className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-black">Play again</button>
        </div>
      )}
    </div>
  );
}