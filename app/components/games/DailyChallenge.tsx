"use client";
import { useEffect, useRef, useState } from "react";
import { allWords, allSentences, samePackWords, shuffle, chalConfig, levelInfo } from "./gameData";
import { playCorrect, playWrong, playWin } from "@/lib/sounds";

function localISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daySeed() {
  const d = new Date();
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
}
function seededShuffle<T>(a: T[], seed: number): T[] {
  const arr = [...a];
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type Tile = { id: number; key: string; text: string; kind: "w" | "m" };
type Letter = { id: number; ch: string; used: boolean };

function makeLetters(w: string): Letter[] {
  const arr = w.split("").map((ch, i) => ({ id: i, ch, used: false }));
  let s = shuffle(arr);
  let t = 0;
  while (s.map((x) => x.ch).join("") === w && t < 5) {
    s = shuffle(arr);
    t++;
  }
  return s;
}

export default function DailyChallenge({ onExit }: { onExit: () => void }) {
  const [stage, setStage] = useState<"quiz" | "match" | "scramble" | "sayit" | "done">("quiz");

  const [info] = useState(() => {
    const stars = Number(localStorage.getItem("dg-chal-stars") || 0);
    const li = levelInfo(stars);
    return { stars, ...li, cfg: chalConfig(li.level) };
  });
  const cfg = info.cfg;

  const [data] = useState(() => {
    const seed = daySeed();
    const ws = seededShuffle(allWords(), seed);
    const quiz = ws.slice(0, cfg.quiz).map((w) => {
      const pool = (cfg.hard ? samePackWords(w) : allWords()).filter((x) => x.word !== w.word);
      const others = seededShuffle(pool, seed + 7).slice(0, 3).map((x) => x.meaning);
      const options = seededShuffle([w.meaning, ...others], seed + 3);
      return { w, options, answer: options.indexOf(w.meaning) };
    });
    const matchWords = ws.slice(cfg.quiz, cfg.quiz + cfg.match);
    let scramWords = seededShuffle(
      allWords().filter((w) => !w.word.includes(" ") && w.word.length >= cfg.lenMin && w.word.length <= cfg.lenMax),
      seed + 21
    ).slice(0, cfg.scram);
    if (scramWords.length < cfg.scram) {
      scramWords = seededShuffle(allWords().filter((w) => !w.word.includes(" ") && w.word.length >= 4 && w.word.length <= 10), seed + 21).slice(0, cfg.scram);
    }
    const sents = seededShuffle(allSentences(), seed).slice(0, cfg.say);
    return { quiz, matchWords, scramWords, sents };
  });

  const [tiles] = useState<Tile[]>(() =>
    seededShuffle(
      [
        ...data.matchWords.map((w, i) => ({ id: i * 2, key: w.word, text: w.word, kind: "w" as const })),
        ...data.matchWords.map((w, i) => ({ id: i * 2 + 1, key: w.word, text: w.meaning, kind: "m" as const })),
      ],
      daySeed() + 11
    )
  );

  // quiz
  const [qi, setQi] = useState(0);
  const [qScore, setQScore] = useState(0);
  const [flash, setFlash] = useState<"" | "ok" | "bad">("");
  // match
  const [sel, setSel] = useState<number | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [mMis, setMMis] = useState(0);
  // scramble
  const [sIdx, setSIdx] = useState(0);
  const [letters, setLetters] = useState<Letter[]>(() => makeLetters(data.scramWords[0].word.toLowerCase()));
  const [built, setBuilt] = useState<number[]>([]);
  const [sWrong, setSWrong] = useState(false);
  // sayit
  const [sayIdx, setSayIdx] = useState(0);
  const [rec, setRec] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [sayResults, setSayResults] = useState<(number | null)[]>(() => Array(cfg.say).fill(null));
  // done
  const [starsEarned, setStarsEarned] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [newLevel, setNewLevel] = useState(info.level);
  const [streak, setStreak] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recSecRef = useRef(0);
  const recTimerRef = useRef<number | null>(null);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  useEffect(() => {
    if (stage === "quiz") speak(data.quiz[qi].w.word);
    if (stage === "sayit") speak(data.sents[sayIdx].right);
  }, [stage, qi, sayIdx]);

  // ⚡ QUIZ
  const pickQ = (oi: number) => {
    if (oi === data.quiz[qi].answer) {
      setQScore((s) => s + 1);
      setFlash("ok");
      playCorrect();
    } else {
      setFlash("bad");
      playWrong();
    }
    setTimeout(() => {
      setFlash("");
      if (qi + 1 >= data.quiz.length) setStage("match");
      else setQi(qi + 1);
    }, 250);
  };

  // 🃏 MATCH
  const tapT = (t: Tile) => {
    if (matched.includes(t.key)) return;
    if (sel === null) return setSel(t.id);
    if (sel === t.id) return setSel(null);
    const s = tiles.find((x) => x.id === sel);
    if (!s || s.kind === t.kind) return setSel(t.id);
    if (s.key === t.key) {
      playCorrect();
      speak(t.key);
      const m = [...matched, t.key];
      setMatched(m);
      setSel(null);
      if (m.length === data.matchWords.length) setTimeout(() => setStage("scramble"), 300);
    } else {
      playWrong();
      setMMis((x) => x + 1);
      setSel(null);
    }
  };

  // 🧩 SCRAMBLE
  const sw = data.scramWords[sIdx].word.toLowerCase();
  const tapL = (id: number) => {
    const l = letters.find((x) => x.id === id);
    if (!l || l.used || sWrong) return;
    setLetters((ls) => ls.map((x) => (x.id === id ? { ...x, used: true } : x)));
    const nb = [...built, id];
    setBuilt(nb);
    if (nb.length === sw.length) {
      const guess = nb.map((bid) => letters.find((x) => x.id === bid)!.ch).join("");
      if (guess === sw) {
        playCorrect();
        setTimeout(() => {
          if (sIdx + 1 >= data.scramWords.length) setStage("sayit");
          else {
            setSIdx(sIdx + 1);
            setLetters(makeLetters(data.scramWords[sIdx + 1].word.toLowerCase()));
            setBuilt([]);
          }
        }, 250);
      } else {
        playWrong();
        setSWrong(true);
        setTimeout(() => {
          setSWrong(false);
          setBuilt([]);
          setLetters((ls) => ls.map((x) => ({ ...x, used: false })));
        }, 400);
      }
    }
  };

  const hint = () => {
    const need = sw[built.length];
    if (!need || sWrong) return;
    const l = letters.find((x) => !x.used && x.ch === need);
    if (l) tapL(l.id);
  };

  // 🎤 SAY-IT
  const toggleRec = async () => {
    if (rec) {
      mediaRef.current?.stop();
      setRec(false);
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      return;
    }
    window.speechSynthesis?.cancel();
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
              body: JSON.stringify({ mode: "drill", target: data.sents[sayIdx].right, audio: String(reader.result).split(",")[1], mimeType: mime }),
            });
            const d = await res.json();
            if (typeof d.score === "number") {
              if (d.score >= cfg.pass) playCorrect();
              else playWrong();
              setLastScore(d.score);
              setSayResults((r) => {
                const c = [...r];
                c[sayIdx] = d.score;
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

  const nextSay = () => {
    if (sayIdx + 1 >= data.sents.length) complete();
    else {
      setSayIdx(sayIdx + 1);
      setLastScore(null);
    }
  };

  const complete = () => {
    playWin();
    const quizGood = qScore >= data.quiz.length - 1;
    const sayPassed = sayResults.every((s) => s !== null && s >= cfg.pass);
    const earned = 1 + (quizGood ? 1 : 0) + (sayPassed ? 1 : 0);
    const newStars = info.stars + earned;
    localStorage.setItem("dg-chal-stars", String(newStars));
    const after = levelInfo(newStars).level;
    setStarsEarned(earned);
    setLeveledUp(after > info.level);
    setNewLevel(after);
    const today = localISO(new Date());
    const yest = localISO(new Date(Date.now() - 86400000));
    const st = JSON.parse(localStorage.getItem("dg-chal-streak") || "null");
    const count = st && st.date === yest ? st.count + 1 : 1;
    localStorage.setItem("dg-chal-streak", JSON.stringify({ date: today, count }));
    localStorage.setItem("dg-chal-done-" + today, "1");
    setStreak(count);
    setStage("done");
  };

  const replay = () => {
    setStage("quiz");
    setQi(0);
    setQScore(0);
    setSel(null);
    setMatched([]);
    setMMis(0);
    setSIdx(0);
    setLetters(makeLetters(data.scramWords[0].word.toLowerCase()));
    setBuilt([]);
    setSayIdx(0);
    setSayResults(Array(cfg.say).fill(null));
    setLastScore(null);
  };

  const steps = (
    <div className="flex justify-center gap-3 mb-4 text-lg">
      <span className={stage === "quiz" ? "scale-125" : "opacity-40"}>⚡</span>
      <span className={stage === "match" ? "scale-125" : "opacity-40"}>🃏</span>
      <span className={stage === "scramble" ? "scale-125" : "opacity-40"}>🧩</span>
      <span className={stage === "sayit" ? "scale-125" : "opacity-40"}>🎤</span>
    </div>
  );

  if (stage === "done") {
    return (
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-8 text-center max-w-sm mx-auto mt-10">
        {leveledUp && <p className="text-sm font-black text-fuchsia-400 mb-2 animate-bounce">🎉 LEVEL UP! You're Level {newLevel}!</p>}
        <p className="text-6xl mb-3">🏆</p>
        <p className="text-2xl font-black text-amber-400">Challenge Complete!</p>
        <p className="text-lg font-black text-yellow-400 mt-2">+{starsEarned} ⭐ earned</p>
        <div className="grid gap-1 my-4 text-sm text-slate-300">
          <p>⚡ Quiz: {qScore}/{data.quiz.length}</p>
          <p>🃏 Match mistakes: {mMis}</p>
          <p>🧩 Scramble: {data.scramWords.length} done</p>
          <p>🎤 Say-it: {sayResults.filter((s) => s !== null && s >= cfg.pass).length}/{data.sents.length} passed</p>
        </div>
        <p className="text-sm font-black text-slate-400 mb-1">⭐ Level {newLevel} • {info.stars + starsEarned} total stars</p>
        <p className="text-lg font-black text-orange-400 mb-6">🔥 {streak}-day streak!</p>
        <div className="grid gap-2">
          <button onClick={replay} className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold">🔁 Replay (practice)</button>
          <button onClick={onExit} className="py-3 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold">🏠 Games Hub</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <p className="text-center text-[10px] font-black text-amber-400 mb-2">⭐ LEVEL {info.level} CHALLENGE {info.level >= 3 ? "• HARD MODE" : ""}</p>
      {steps}

      {stage === "quiz" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
          <p className="text-[10px] text-slate-500 font-bold mb-2">⚡ {qi + 1}/{data.quiz.length} — 🎧 WHAT DOES THIS MEAN?</p>
          <p className="text-3xl font-black uppercase mb-3">{data.quiz[qi].w.word}</p>
          <button onClick={() => speak(data.quiz[qi].w.word)} className="mb-4 text-[10px] bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-full">🔊 hear again</button>
          <div className="grid grid-cols-2 gap-2">
            {data.quiz[qi].options.map((opt, oi) => (
              <button key={oi} onClick={() => pickQ(oi)} className={`p-3 rounded-xl text-sm font-bold text-left ${flash === "ok" && oi === data.quiz[qi].answer ? "bg-emerald-700" : flash === "bad" && oi !== data.quiz[qi].answer ? "bg-slate-800" : "bg-slate-800 hover:bg-slate-700"}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === "match" && (
        <div>
          <p className="text-[10px] text-slate-500 font-bold mb-3 text-center">🃏 MATCH {data.matchWords.length} PAIRS • ❌ {mMis}</p>
          <div className="grid grid-cols-2 gap-2">
            {tiles.map((t) => {
              const done = matched.includes(t.key);
              return (
                <button key={t.id} onClick={() => tapT(t)} disabled={done} className={`p-3 rounded-xl text-sm font-bold text-left min-h-[56px] ${done ? "opacity-30 bg-emerald-900/40" : sel === t.id ? "bg-violet-600 border-2 border-violet-400" : "bg-slate-800 hover:bg-slate-700"}`}>
                  {t.text}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {stage === "scramble" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
          <p className="text-[10px] text-slate-500 font-bold mb-1">🧩 {sIdx + 1}/{data.scramWords.length} — BUILD THE WORD</p>
          <p className="text-sm text-slate-300 mb-1">{data.scramWords[sIdx].meaning}</p>
          <p className="text-xs text-amber-200 mb-4">🇮 {data.scramWords[sIdx].hindi}</p>
          <div className={`flex gap-1.5 justify-center flex-wrap mb-5 ${sWrong ? "animate-pulse" : ""}`}>
            {sw.split("").map((_, i) => {
              const bid = built[i];
              const ch = bid !== undefined ? letters.find((l) => l.id === bid)?.ch : "";
              return <span key={i} className={`w-8 h-10 rounded-lg text-lg font-black flex items-center justify-center ${ch ? (sWrong ? "bg-red-700" : "bg-violet-600") : "bg-slate-800 border border-slate-700"}`}>{ch}</span>;
            })}
          </div>
          <div className="flex gap-1.5 justify-center flex-wrap">
            {letters.map((l) => (
              <button key={l.id} disabled={l.used} onClick={() => tapL(l.id)} className={`w-8 h-10 rounded-lg text-lg font-black uppercase ${l.used ? "opacity-20 bg-slate-800" : "bg-slate-800 hover:bg-slate-700 border border-slate-700"}`}>
                {l.ch}
              </button>
            ))}
          </div>
          <button onClick={hint} className="mt-3 w-full py-2.5 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-300 text-sm font-bold">💡 Hint — place next letter</button>
        </div>
      )}

      {stage === "sayit" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center grid gap-4">
          <p className="text-[10px] text-slate-500 font-bold">🎤 {sayIdx + 1}/{data.sents.length} — 🔊 LISTEN THEN SAY ({cfg.pass}%+ to pass)</p>
          <p className="text-xl font-black">"{data.sents[sayIdx].right}"</p>
          <div className="flex gap-2">
            <button onClick={() => speak(data.sents[sayIdx].right)} className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold">🔊 Hear again</button>
            <button onClick={toggleRec} className={`flex-1 py-3 rounded-xl text-sm font-bold ${rec ? "bg-red-600 animate-pulse" : "bg-violet-600 hover:bg-violet-500"}`}>
              {rec ? "⏹️ Stop" : "🎤 Say it"}
            </button>
          </div>
          {lastScore !== null && (
            <p className={`text-3xl font-black ${lastScore >= cfg.pass ? "text-emerald-400" : "text-amber-400"}`}>{lastScore}%</p>
          )}
          <button onClick={nextSay} disabled={lastScore === null} className="py-3 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold disabled:opacity-40">
            {sayIdx + 1 >= data.sents.length ? "🏁 Finish Challenge" : "Next ➡️"}
          </button>
        </div>
      )}
    </div>
  );
}