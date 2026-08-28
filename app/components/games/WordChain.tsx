"use client";
import { useEffect, useState } from "react";
import { randomWord } from "@/lib/gameWords";
import { playCorrect, playWrong, playWin } from "@/lib/sounds";
import { Trophy, Link2, Play } from "lucide-react";

const TARGET = 10;

export default function WordChain({ onExit }: { onExit?: () => void }) {
  const [chain, setChain] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [lives, setLives] = useState(3);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [best, setBest] = useState(0);
  const [msg, setMsg] = useState("");

  useEffect(() => { setBest(Number(localStorage.getItem("dg-best-chain") || 0)); }, []);
  const current = chain[chain.length - 1] || "";
  const need = current ? current[current.length - 1] : "";

  const start = () => { setChain([randomWord()]); setLives(3); setOver(false); setWon(false); setInput(""); setMsg(""); };
  const end = (didWin: boolean) => {
    setOver(true); setWon(didWin);
    if (didWin) playWin();
    if (chain.length > best) { setBest(chain.length); localStorage.setItem("dg-best-chain", String(chain.length)); }
  };
  const fail = (m: string) => {
    playWrong(); setMsg(m); setInput("");
    setLives((l) => { if (l - 1 <= 0) end(false); return l - 1; });
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
    setChain(next); setInput(""); setMsg("");
    if (next.length >= TARGET) end(true);
  };

  return (
    <div className="max-w-md mx-auto">
      {chain.length === 0 && !over ? (
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 text-center">
          <Link2 size={40} className="mx-auto mb-3 text-green-400" />
          <p className="text-lg font-black mb-1">Word Chain</p>
          <p className="text-xs text-slate-500 mb-6">Chain {TARGET} words to WIN! Each starts with the LAST letter of the previous.</p>
          <button onClick={start} className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-black flex items-center justify-center gap-2"><Play size={16} /> Start</button>
        </div>
      ) : !over ? (
        <>
          <div className="flex justify-between text-xs font-black text-slate-400 mb-2">
            <span className="flex items-center gap-1"><Trophy size={12} className="text-amber-400" /> {best}</span>
            <span className="text-green-400">{chain.length}/{TARGET} 🎯</span>
            <span>{"❤️".repeat(lives)}{"🖤".repeat(3 - lives)}</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(chain.length / TARGET) * 100}%` }} />
          </div>
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
            {chain.slice(-8).map((w, i) => (
              <span key={i} className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[10px] text-slate-300">{w}</span>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 text-center">
          <p className="text-4xl mb-2">{won ? "🏆" : "🔗"}</p>
          <p className="text-xl font-black mb-1">{won ? "YOU WIN!" : `Chain: ${chain.length}`}</p>
          <p className="text-xs text-slate-500 mb-6">Best: {best}</p>
          <button onClick={start} className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-black">Play again</button>
        </div>
      )}
    </div>
  );
}