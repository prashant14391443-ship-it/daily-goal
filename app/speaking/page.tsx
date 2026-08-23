"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Msg = { role: "user" | "assistant"; content: string };

const TOPICS = [
  { emoji: "🛒", title: "Buying Groceries" },
  { emoji: "👔", title: "Job Interview" },
  { emoji: "🏠", title: "Your Hometown" },
  { emoji: "🎉", title: "Festivals & Culture" },
  { emoji: "🧑‍🤝‍🧑", title: "Describing a Friend" },
  { emoji: "🗺️", title: "Famous Places" },
  { emoji: "🍕", title: "Food & Restaurants" },
  { emoji: "📚", title: "Studies & Exams" },
  { emoji: "🏏", title: "Sports & Fitness" },
  { emoji: "🎬", title: "Movies & Music" },
];

const DRILLS = [
  "I would like a cup of tea, please.",
  "The weather is really pleasant today.",
  "Can you schedule a meeting for Thursday?",
  "I practice my pronunciation every day.",
  "She sells seashells by the seashore.",
  "I thought I saw a thoughtful frog.",
];

export default function SpeakingPage() {
  const [topic, setTopic] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [mode, setMode] = useState<"" | "call" | "chat" | "drill">("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [left, setLeft] = useState(16);
  const [uid, setUid] = useState("guest");
  const [drillIdx, setDrillIdx] = useState(0);
  const [view, setView] = useState<"home" | "topics">("home");

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<number | null>(null);
  const recSecRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id || "guest";
      setUid(id);
      const c = JSON.parse(localStorage.getItem("dg-eng-count-" + id) || "null");
      if (c && c.date === new Date().toDateString()) setLeft(Math.max(0, 16 - c.n));
    };
    load();
  }, []);

  // Pre-warm mic
  useEffect(() => {
    const initMic = async () => {
      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
      } catch {}
    };
    initMic();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading, speaking]);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/❌|✅|Quick fix:/g, "");
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "en-US";
    u.rate = 1;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const stopAll = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    mediaRef.current?.stop();
    setRecording(false);
    if (recTimerRef.current) clearInterval(recTimerRef.current);
  };

  const bumpLimit = () => {
    const count = 16 - left + 1;
    setLeft(16 - count);
    localStorage.setItem("dg-eng-count-" + uid, JSON.stringify({ date: new Date().toDateString(), n: count }));
  };

  const useLimit = () => {
    if (left <= 0) {
      alert("🗣️ 16 free practice sessions per day! Come back tomorrow.");
      return false;
    }
    return true;
  };

  const startCall = async (t?: string) => {
    const useTopic = t || topic;
    if (!useTopic) return;
    setPicker(false);
    setMode("call");
    setMsgs([]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "call", topic: useTopic, message: `Start the conversation about "${useTopic}". Greet me warmly and ask the first question.`, history: [] }),
      });
      const d = await res.json();
      if (d.reply) {
        setMsgs([{ role: "assistant", content: d.reply }]);
        speak(d.reply);
      }
    } catch {}
    setLoading(false);
  };

  const startChat = () => {
    setPicker(false);
    setMode("chat");
    setMsgs([{ role: "assistant", content: `Hi! I'm Veer 😊 Let's talk about ${topic}. Write your first sentence!` }]);
  };

  const startDrill = () => {
    setPicker(false);
    setMode("drill");
    setMsgs([]);
    setDrillIdx(0);
  };

  const sendAudio = async (b64: string, mime: string) => {
    setMsgs((m) => [...m, { role: "user", content: "🎙️ (voice)" }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: mode === "drill" ? "drill" : "call",
          topic,
          target: DRILLS[drillIdx],
          audio: b64,
          mimeType: mime,
          history: msgs.slice(-6),
        }),
      });
      const d = await res.json();
      const heard = d.heard ? `🎤 "${d.heard}"\n\n` : "";
      const reply = d.reply || "😴 " + (d.error || "Could not hear you.");
      setMsgs((m) => [...m, { role: "assistant", content: heard + reply }]);
      if (d.reply && !d.debug?.length) {
        bumpLimit();
        speak(d.reply);
      }
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "📡 Network issue!" }]);
    }
    setLoading(false);
  };

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    if (!useLimit()) return;
    setInput("");
    const next = [...msgs, { role: "user" as const, content: msg }];
    setMsgs(next);
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: mode === "call" ? "call" : "english", topic: topic || "", message: msg, history: msgs.slice(-6) }),
      });
      const d = await res.json();
      const reply = d.reply || "😴 " + (d.error || "AI sleeping.");
      setMsgs([...next, { role: "assistant" as const, content: reply }]);
      if (d.reply) {
        bumpLimit();
        if (mode === "call") speak(d.reply);
      }
    } catch {
      setMsgs([...next, { role: "assistant" as const, content: "📡 Network issue!" }]);
    }
    setLoading(false);
  };

  const toggleRecord = async () => {
    if (recording) {
      mediaRef.current?.stop();
      setRecording(false);
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      if (recSecRef.current < 2) {
        setMsgs((m) => [...m, { role: "assistant", content: "⏱️ Speak for 2+ seconds!" }]);
        chunksRef.current = [];
      }
      return;
    }
    if (!useLimit()) return;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
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
          await sendAudio(String(reader.result).split(",")[1], mime);
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      recSecRef.current = 0;
      setRecSec(0);
      recTimerRef.current = window.setInterval(() => {
        recSecRef.current += 1;
        setRecSec(recSecRef.current);
      }, 1000);
    } catch {
      alert("🎤 Mic permission denied!");
    }
  };

  // 🏠 HOME: clean 2-column grid (exactly like your sketch!)
  if (!mode) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black">🗣️ Practice Speaking</h1>
          <Link href="/community" className="text-sm text-slate-400">← Back</Link>
        </div>

        {view === "home" ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setView("topics")}
              className="bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-xl p-4 text-left transition-colors"
            >
              <p className="text-2xl mb-1">🗣️</p>
              <p className="font-bold text-sm">Talk AI — Topic</p>
              <p className="text-[10px] text-slate-400">Pick a topic & call</p>
            </button>

            <button
              onClick={() => startCall("anything — free friendly conversation")}
              className="bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-xl p-4 text-left transition-colors"
            >
              <p className="text-2xl mb-1">💬</p>
              <p className="font-bold text-sm">Talk AI — Anything</p>
              <p className="text-[10px] text-slate-400">Free conversation call</p>
            </button>

            <Link
              href="/evaluate"
              className="bg-slate-900 border border-slate-800 hover:border-violet-500/60 rounded-xl p-4 text-left transition-colors"
            >
              <p className="text-2xl mb-1">📊</p>
              <p className="font-bold text-sm">Record & Analyse</p>
              <p className="text-[10px] text-slate-400">Score + full report</p>
            </Link>

            <Link href="/sentences" className="bg-slate-900 border border-slate-800 hover:border-amber-500/60 rounded-xl p-4 text-left transition-colors">
              <p className="text-2xl mb-1">🎯</p>
              <p className="font-bold text-sm">Sentence Practice</p>
              <p className="text-[10px] text-slate-400">Fix mistakes + say & score</p>
            </Link>

            <Link href="/vocab" className="bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-xl p-4 text-left transition-colors">
              <p className="text-2xl mb-1">📚</p>
              <p className="font-bold text-sm">Vocabulary</p>
              <p className="text-[10px] text-slate-400">5 words/day + Hindi meanings</p>
            </Link>

            <Link href="/tips" className="bg-slate-900 border border-slate-800 hover:border-amber-500/60 rounded-xl p-4 text-left transition-colors">
              <p className="text-2xl mb-1">💡</p>
              <p className="font-bold text-sm">Daily Tips</p>
              <p className="text-[10px] text-slate-400">1 tip a day to sound better</p>
            </Link>

            <button disabled className="col-span-2 opacity-50 bg-slate-900 border border-slate-800 rounded-xl p-4 text-left">
              <p className="text-2xl mb-1">🎮</p>
              <p className="font-bold text-sm">Game <span className="text-[9px] bg-slate-700 px-1.5 py-0.5 rounded">SOON</span></p>
              <p className="text-[10px] text-slate-400">Learn English by playing</p>
            </button>
          </div>
        ) : (
          <div>
            <button onClick={() => setView("home")} className="text-sm text-slate-400 mb-3">← All modes</button>
            <p className="text-sm text-slate-400 mb-3">Pick a topic → call or chat with Veer:</p>
            <div className="grid grid-cols-2 gap-3">
              {TOPICS.map((t) => (
                <button
                  key={t.title}
                  onClick={() => { setTopic(t.title); setPicker(true); }}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-xl p-4 text-center transition-colors"
                >
                  <p className="text-3xl mb-2">{t.emoji}</p>
                  <p className="text-sm font-bold">{t.title}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {picker && (
          <div className="fixed inset-0 z-[90] bg-black/70 flex items-end justify-center">
            <div className="bg-slate-900 border border-slate-700 rounded-t-3xl p-6 w-full max-w-md grid gap-3">
              <div className="flex justify-between items-center">
                <p className="font-bold">Select a method to practice</p>
                <button onClick={() => setPicker(false)} className="text-slate-400 text-xl">✖</button>
              </div>
              <p className="text-xs text-slate-400">Topic: {topic}</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => startCall()} className="py-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-lg">📞 Call</button>
                <button onClick={startChat} className="py-5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-lg">💬 Chat</button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // 🎙️ CONVERSATION / DRILL SCREEN
  return (
    <main className="h-screen bg-slate-950 text-white flex flex-col p-4 pb-24">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-xl ${speaking ? "animate-pulse ring-4 ring-emerald-400/40" : ""}`}>🤖</span>
          <div>
            <p className="font-bold text-sm">Veer • {mode === "drill" ? "Sentence Practice" : topic}</p>
            <p className="text-[10px] text-emerald-400">{speaking ? "🔊 Veer is speaking..." : mode === "chat" ? "💬 chat mode" : "🎤 Your turn — tap mic & speak"}</p>
          </div>
        </div>
        <button
          onClick={() => { stopAll(); setMode(""); setMsgs([]); }}
          className="px-3 py-2 rounded-xl bg-red-600/20 text-red-400 text-xs font-bold"
        >
          📴 End
        </button>
      </div>

      <div className="flex-1 overflow-y-auto grid gap-3 content-start">
        {mode === "drill" && (
          <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Repeat after Veer ({drillIdx + 1}/{DRILLS.length}):</p>
            <p className="font-bold text-amber-300">{DRILLS[drillIdx]}</p>
            <button onClick={() => speak(DRILLS[drillIdx])} className="mt-2 text-xs bg-slate-800 px-3 py-1.5 rounded-lg">🔊 Hear it</button>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[85%] p-3 rounded-xl text-sm whitespace-pre-wrap ${m.role === "user" ? "justify-self-end bg-emerald-600" : "justify-self-start bg-slate-800"}`}>
            {m.content}
            {m.role === "assistant" && mode === "chat" && (
              <button onClick={() => speak(m.content)} className="block mt-2 text-[10px] bg-slate-700 px-2 py-1 rounded">🔊 Listen</button>
            )}
          </div>
        ))}
        {loading && <div className="justify-self-start bg-slate-800 p-3 rounded-xl text-sm animate-pulse">🤖 Veer is thinking...</div>}
        <div ref={bottomRef} />
      </div>

      {mode === "drill" ? (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={toggleRecord}
            disabled={loading || speaking}
            className={`w-16 h-16 rounded-full text-xl flex items-center justify-center disabled:opacity-40 ${recording ? "bg-red-600 animate-pulse" : "bg-amber-600"}`}
          >
            {recording ? <>⏹️{recSec}s</> : "🎤"}
          </button>
          <button onClick={() => setDrillIdx((drillIdx + 1) % DRILLS.length)} className="px-4 py-3 rounded-xl bg-slate-800 text-sm font-bold">
            Next ➡️
          </button>
        </div>
      ) : mode === "call" ? (
        <div className="flex flex-col items-center gap-2 pt-2">
          <button
            onClick={toggleRecord}
            disabled={loading || speaking}
            className={`w-20 h-20 rounded-full font-bold text-sm flex items-center justify-center transition-all disabled:opacity-40 ${recording ? "bg-red-600 animate-pulse" : "bg-emerald-600 hover:bg-emerald-500"}`}
          >
            {recording ? <>⏹️ {recSec}s</> : "🎤"}
          </button>
          <p className="text-[10px] text-slate-400">{speaking ? "Listen to Veer first..." : "Tap & speak your answer"}</p>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 pt-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type in English..." className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm" />
          <button disabled={loading} className="px-5 rounded-xl bg-blue-600 font-bold disabled:opacity-50">➤</button>
        </form>
      )}
    </main>
  );
}