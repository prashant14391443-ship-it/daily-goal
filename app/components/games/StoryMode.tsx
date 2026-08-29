"use client";
import { useEffect, useRef, useState } from "react";
import { STORIES } from "@/lib/stories";
import type { Story } from "@/lib/stories";
import { generateStory } from "@/lib/storyGen";
import { playCorrect, playWrong, playWin } from "@/lib/sounds";
import { Play, Pause, SkipForward, Check, Trophy, BookOpen, Sparkles, Volume2, RotateCw } from "lucide-react";

export default function StoryMode({ onExit }: { onExit?: () => void }) {
  const [mode, setMode] = useState<"select" | "story" | "questions" | "results">("select");
  const [storyIdx, setStoryIdx] = useState(0);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [currentSentence, setCurrentSentence] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentQ, setCurrentQ] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const textRef = useRef<HTMLDivElement>(null);
  const sentenceRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const story = activeStory ?? STORIES[storyIdx];
  const question = story.questions[currentQ];

  useEffect(() => { setBest(Number(localStorage.getItem("dg-best-story") || 0)); }, []);

  // Auto-scroll to current sentence as it's being spoken
  useEffect(() => {
    const el = sentenceRefs.current[currentSentence];
    if (el && textRef.current) {
      const top = el.offsetTop - textRef.current.offsetTop - 40;
      textRef.current.scrollTo({ top, behavior: "smooth" });
    }
  }, [currentSentence]);

  // Speak current sentence
  useEffect(() => {
    if (!isPlaying || mode !== "story") return;
    if (currentSentence >= story.sentences.length) { setIsPlaying(false); return; }
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(story.sentences[currentSentence]);
    u.lang = "en-US";
    u.rate = speed * 0.9;
    u.onend = () => {
      setCurrentSentence((s) => s + 1);
    };
    window.speechSynthesis.speak(u);
    return () => { window.speechSynthesis.cancel(); };
  }, [currentSentence, isPlaying, mode, speed, story.sentences]);

  const reset = (st: Story | null, idx: number) => {
    setActiveStory(st); setStoryIdx(idx);
    setMode("story"); setCurrentSentence(0); setIsPlaying(false);
    setCurrentQ(0); setUserAnswers([]); setScore(0); setShowAnswer(false); setInput("");
    sentenceRefs.current = [];
  };
  const startStory = (i: number) => reset(STORIES[i], i);
  const startEndless = () => reset(generateStory(), 0);
  const restartStory = () => { setCurrentSentence(0); setIsPlaying(false); window.speechSynthesis?.cancel(); };

  const checkAnswer = (userAns: string, q: typeof question): boolean => {
    const u = userAns.trim().toLowerCase(); const a = q.answer.trim().toLowerCase();
    if (q.type === "mcq" || q.type === "word") return u === a;
    const uw = new Set(u.split(/\s+/)); const aw = a.split(/\s+/);
    return aw.filter((w) => uw.has(w)).length / aw.length >= 0.6;
  };

  const submitAnswer = () => {
    if (!input.trim()) return;
    if (checkAnswer(input, question)) { playCorrect(); setScore((s) => s + 1); } else playWrong();
    setUserAnswers((p) => [...p, input]); setInput(""); setShowAnswer(true);
  };
  const nextQuestion = () => {
    setShowAnswer(false);
    if (currentQ + 1 >= story.questions.length) endGame(); else setCurrentQ((q) => q + 1);
  };
  const endGame = () => {
    playWin();
    if (score > best) { setBest(score); localStorage.setItem("dg-best-story", String(score)); }
    setMode("results");
  };
  const restart = () => { setActiveStory(null); setMode("select"); setCurrentSentence(0); setIsPlaying(false); window.speechSynthesis?.cancel(); };

  const storyDone = currentSentence >= story.sentences.length;

  if (mode === "select") return (
    <div className="max-w-md mx-auto">
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs font-black text-slate-400 flex items-center gap-1"><Trophy size={12} className="text-amber-400" /> Best: {best}</p>
      </div>
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center mb-4">
        <BookOpen size={40} className="mx-auto mb-3 text-indigo-400" />
        <p className="text-lg font-black mb-1">Story Mode</p>
        <p className="text-xs text-slate-500">Listen, read, then answer!</p>
      </div>
      <button onClick={startEndless} className="w-full mb-4 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30">
        <Sparkles size={18} /> ♾️ Endless Story (never repeats!)
      </button>
      <p className="text-[10px] font-black text-slate-500 mb-2 mt-4">FEATURED STORIES</p>
      <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
        {STORIES.map((s, i) => (
          <button key={s.id} onClick={() => startStory(i)} className="bg-slate-900 border border-slate-700 rounded-2xl p-4 text-left hover:border-slate-600 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{s.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white">{s.title}</p>
                <p className="text-[10px] text-slate-500 truncate">{s.difficulty} • {s.questions.length} questions</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  if (mode === "story") return (
    <div className="max-w-md mx-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{story.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-white truncate">{story.title}</p>
            <p className="text-[10px] text-slate-500">{story.difficulty} • {story.sentences.length} sentences</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsPlaying(!isPlaying)} className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-black flex items-center justify-center gap-1.5">
            {isPlaying ? <Pause size={14} /> : <Play size={14} />} {isPlaying ? "Pause" : "Play"}
          </button>
          <button onClick={() => setSpeed(speed === 1 ? 0.75 : speed === 0.75 ? 1.25 : 1)} className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-black text-slate-300">{speed}x</button>
          <button onClick={restartStory} className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white" title="Restart"><RotateCw size={14} /></button>
        </div>
      </div>

      {/* 📖 FLOWING STORY TEXT */}
      <div ref={textRef} className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-4 h-80 overflow-y-auto leading-relaxed">
        <p className="text-sm text-slate-300 leading-7">
          {story.sentences.map((sentence, i) => (
            <span
              key={i}
              ref={(el) => { sentenceRefs.current[i] = el; }}
              className={`transition-all duration-300 ${
                i === currentSentence && isPlaying
                  ? "bg-indigo-500/20 text-white font-semibold rounded px-1 -mx-1"
                  : i < currentSentence
                  ? "text-slate-400"
                  : "text-slate-500"
              }`}
            >
              {sentence}{" "}
            </span>
          ))}
        </p>
        {!isPlaying && currentSentence === 0 && (
          <p className="text-center text-slate-500 text-xs mt-4">Press Play to start reading aloud</p>
        )}
      </div>

      {storyDone && (
        <button onClick={() => setMode("questions")} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black flex items-center justify-center gap-2">
          <SkipForward size={16} /> Continue to Questions
        </button>
      )}
    </div>
  );

  if (mode === "questions") return (
    <div className="max-w-md mx-auto">
      <div className="flex justify-between text-xs font-black text-slate-400 mb-4">
        <span>Q {currentQ + 1}/{story.questions.length}</span>
        <span className="text-emerald-400">Score: {score}</span>
      </div>
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 mb-4">
        <p className="text-[10px] font-black text-indigo-400 mb-2 flex items-center gap-1">
          {question.type === "mcq" && <><Volume2 size={11}/> MULTIPLE CHOICE</>}
          {question.type === "word" && "📝 ONE WORD"}
          {question.type === "sentence" && "✍️ FULL SENTENCE"}
          {question.type === "speak" && "🎤 SPEAK IT"}
        </p>
        <p className="text-base font-bold text-white leading-snug">{question.question}</p>
      </div>
      {!showAnswer ? (
        <>
          {question.type === "mcq" ? (
            <div className="grid gap-2 mb-4">
              {question.options?.map((opt, i) => (
                <button key={i} onClick={() => setInput(opt)} className={`p-3 rounded-xl border text-left text-sm font-semibold transition-colors ${input === opt ? "bg-indigo-500/20 border-indigo-500 text-white" : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600"}`}>{opt}</button>
              ))}
            </div>
          ) : (
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={question.type === "word" ? "One word…" : question.type === "sentence" ? "Write a full sentence…" : "Type what you would say…"} className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-indigo-500 mb-4" />
          )}
          <button onClick={submitAnswer} disabled={!input.trim()} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-black flex items-center justify-center gap-2"><Check size={16} /> Submit</button>
        </>
      ) : (
        <>
          <div className={`rounded-2xl p-4 mb-4 ${checkAnswer(userAnswers[currentQ], question) ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-rose-500/10 border border-rose-500/30"}`}>
            <p className="text-xs font-black mb-2">{checkAnswer(userAnswers[currentQ], question) ? "✅ CORRECT!" : "❌ NOT QUITE"}</p>
            <p className="text-xs text-slate-400 mb-1">Your answer:</p><p className="text-sm text-white mb-3">{userAnswers[currentQ]}</p>
            <p className="text-xs text-slate-400 mb-1">Correct answer:</p><p className="text-sm text-emerald-300 font-semibold mb-3">{question.answer}</p>
            <p className="text-xs text-slate-500">{question.explanation}</p>
          </div>
          <button onClick={nextQuestion} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-black">{currentQ + 1 >= story.questions.length ? "See Results" : "Next Question"}</button>
        </>
      )}
    </div>
  );

  const pct = Math.round((score / story.questions.length) * 100);
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 text-center">
        <p className="text-5xl mb-3">{pct >= 75 ? "🏆" : pct >= 50 ? "👏" : "📚"}</p>
        <p className="text-2xl font-black mb-1">{score}/{story.questions.length}</p>
        <p className="text-sm text-slate-400 mb-4">{pct}% correct</p>
        <div className="bg-slate-800/60 rounded-xl p-3 mb-4">
          <p className="text-xs text-slate-500 mb-1">{story.emoji} {story.title}</p>
          <p className="text-xs text-slate-400">Best score: {best}</p>
        </div>
        <button onClick={restart} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-black">Play Another Story</button>
      </div>
    </div>
  );
}