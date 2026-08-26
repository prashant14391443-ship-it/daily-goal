"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { IconTile, Chip, GradButton } from "@/app/components/ui";

type Msg = { role: "user" | "assistant"; content: string };

const TOPICS = [
  { emoji: "🛒", title: "Buying Groceries", grad: "from-green-500 to-emerald-600", border: "border-green-500/30" },
  { emoji: "👔", title: "Job Interview", grad: "from-blue-500 to-indigo-600", border: "border-blue-500/30" },
  { emoji: "🏠", title: "Your Hometown", grad: "from-amber-500 to-orange-600", border: "border-amber-500/30" },
  { emoji: "🎉", title: "Festivals & Culture", grad: "from-pink-500 to-rose-600", border: "border-pink-500/30" },
  { emoji: "🧑‍🤝‍🧑", title: "Describing a Friend", grad: "from-violet-500 to-purple-600", border: "border-violet-500/30" },
  { emoji: "🗺️", title: "Famous Places", grad: "from-cyan-500 to-teal-600", border: "border-cyan-500/30" },
  { emoji: "🍕", title: "Food & Restaurants", grad: "from-red-500 to-orange-600", border: "border-red-500/30" },
  { emoji: "📚", title: "Studies & Exams", grad: "from-indigo-500 to-blue-600", border: "border-indigo-500/30" },
  { emoji: "🏏", title: "Sports & Fitness", grad: "from-emerald-500 to-green-600", border: "border-emerald-500/30" },
  { emoji: "🎬", title: "Movies & Music", grad: "from-fuchsia-500 to-pink-600", border: "border-fuchsia-500/30" },
];

const MODES = [
  { id: "topic", emoji: "🗣️", title: "Talk AI — Topic", desc: "Pick a topic & call", grad: "from-emerald-500 to-green-600", border: "border-emerald-500/30", href: null },
  { id: "anything", emoji: "💬", title: "Talk AI — Anything", desc: "Free conversation call", grad: "from-blue-500 to-indigo-600", border: "border-blue-500/30", href: null },
  { id: "evaluate", emoji: "📊", title: "Record & Analyse", desc: "Score + full report", grad: "from-violet-500 to-purple-600", border: "border-violet-500/30", href: "/evaluate" },
  { id: "sentences", emoji: "🎯", title: "Sentence Practice", desc: "Fix mistakes + say & score", grad: "from-amber-500 to-orange-600", border: "border-amber-500/30", href: "/sentences" },
  { id: "vocab", emoji: "📚", title: "Vocabulary", desc: "5 words/day + Hindi meanings", grad: "from-emerald-500 to-teal-600", border: "border-emerald-500/30", href: "/vocab" },
  { id: "tips", emoji: "💡", title: "Daily Tips", desc: "1 tip a day to sound better", grad: "from-amber-500 to-yellow-600", border: "border-amber-500/30", href: "/tips" },
  { id: "games", emoji: "🎮", title: "Game Zone", desc: "4 games • beat your best", grad: "from-pink-500 to-rose-600", border: "border-pink-500/30", href: "/games" },
  // ✅ NEW: Talk to a Stranger — regular 2-col card
  { id: "stranger", emoji: "🌍", title: "Talk to a Stranger", desc: "1-on-1 voice • practice English", grad: "from-pink-500 to-rose-600", border: "border-rose-500/40", href: "/random-talk" },
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

  // 🏠 HOME VIEW
  if (!mode) {
    return (
      <main className="min-h-screen bg-slate-950 text-white px-4 pt-16 pb-24 max-w-4xl mx-auto">
        {/* 🌆 HERO */}
        <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-5 shadow-2xl shadow-teal-900/30">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-cyan-300/20 rounded-full blur-3xl" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-lg shrink-0">🗣️</span>
              <div className="min-w-0">
                <h1 className="text-lg font-black text-white leading-tight">Practice Speaking</h1>
                <p className="text-[10px] text-white/80 font-semibold">Speak English with AI coach</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Chip color="violet">{left}/16 free</Chip>
              {/* ✅ FIXED: Back now goes to dashboard (not community) */}
              <Link href="/dashboard" className="text-[10px] text-white/70 font-bold hover:text-white">← Back</Link>
            </div>
          </div>
        </div>

        {view === "home" ? (
          <>
            {/* MODE GRID */}
            <div className="grid grid-cols-2 gap-3">
              {MODES.map((m) => {
                const handleClick = () => {
                  if (m.id === "topic") setView("topics");
                  else if (m.id === "anything") startCall("anything — free friendly conversation");
                };

                const content = (
                  <div key={m.id} className={`press bg-slate-900 border-2 ${m.border} rounded-2xl p-4 text-left shadow-lg shadow-black/30 hover:shadow-xl transition-all`}>
                    <IconTile emoji={m.emoji} gradient={`bg-gradient-to-br ${m.grad}`} />
                    <p className="font-black text-sm text-white mt-3 leading-tight">{m.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{m.desc}</p>
                  </div>
                );

                return m.href ? (
                  <Link key={m.id} href={m.href}>{content}</Link>
                ) : (
                  <button key={m.id} onClick={handleClick}>{content}</button>
                );
              })}
            </div>

            {/* ✅ NEW: Create My Community — full-width gold banner */}
            <Link
              href="/community"
              className="press mt-3 w-full bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-black/30"
            >
              <IconTile emoji="✨" gradient="bg-gradient-to-br from-amber-500 to-orange-600" size="lg" />
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-amber-300">CREATE MY COMMUNITY</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Start your own space • chat & talk live</p>
              </div>
              <span className="text-slate-500 text-lg">→</span>
            </Link>
          </>
        ) : (
          <>
            {/* TOPIC PICKER */}
            <button onClick={() => setView("home")} className="press text-sm text-slate-400 mb-3 font-semibold">← All modes</button>
            <p className="text-xs font-black text-slate-400 mb-3">🎯 PICK A TOPIC → call or chat with Veer:</p>
            <div className="grid grid-cols-2 gap-3">
              {TOPICS.map((t) => (
                <button
                  key={t.title}
                  onClick={() => { setTopic(t.title); setPicker(true); }}
                  className={`press bg-slate-900 border-2 ${t.border} rounded-2xl p-4 text-center shadow-lg shadow-black/30 hover:shadow-xl transition-all`}
                >
                  <IconTile emoji={t.emoji} gradient={`bg-gradient-to-br ${t.grad}`} />
                  <p className="text-xs font-black text-white mt-2 leading-tight">{t.title}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* METHOD PICKER MODAL */}
        {picker && (
          <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-end justify-center">
            <div className="bg-slate-900 border-t-2 border-slate-700 rounded-t-3xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="font-black text-base text-white">Select method</p>
                  <p className="text-xs text-slate-400 mt-0.5">Topic: {topic}</p>
                </div>
                <button onClick={() => setPicker(false)} className="press w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white text-lg">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <GradButton onClick={() => startCall()} gradient="from-emerald-500 to-green-600" className="py-5 text-base">
                  📞 Call
                </GradButton>
                <GradButton onClick={startChat} gradient="from-blue-500 to-indigo-600" className="py-5 text-base">
                  💬 Chat
                </GradButton>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // 🎙️ CONVERSATION / DRILL SCREEN
  return (
    <main className="h-screen bg-slate-950 text-white flex flex-col px-4 pt-6 pb-4 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-4 shadow-2xl shadow-teal-900/30 shrink-0">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`shrink-0 w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-lg ${speaking ? "animate-pulse ring-4 ring-white/30" : ""}`}>
              🤖
            </div>
            <div className="min-w-0">
              <p className="font-black text-sm text-white leading-tight">Veer • {mode === "drill" ? "Sentence Practice" : topic}</p>
              <p className="text-[10px] text-white/80 font-semibold">
                {speaking ? "🔊 Veer is speaking..." : mode === "chat" ? "💬 chat mode" : "🎤 Your turn — tap mic & speak"}
              </p>
            </div>
          </div>
          <button
            onClick={() => { stopAll(); setMode(""); setMsgs([]); }}
            className="press shrink-0 px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-black"
          >
            📴 End
          </button>
        </div>
      </div>

      {/* DRILL TARGET */}
      {mode === "drill" && (
        <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-2 border-amber-500/40 rounded-2xl p-4 mb-4 shadow-lg shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-amber-300">REPEAT AFTER VEER ({drillIdx + 1}/{DRILLS.length})</p>
            <button onClick={() => speak(DRILLS[drillIdx])} className="press text-[10px] font-black bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-slate-300 hover:text-white">
              🔊 Hear it
            </button>
          </div>
          <p className="font-black text-base text-amber-200 leading-snug">{DRILLS[drillIdx]}</p>
        </div>
      )}

      {/* MESSAGE STREAM */}
      <div className="flex-1 overflow-y-auto min-h-0 grid gap-3 content-start pb-2">
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <span className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs shadow-lg self-end">
                🤖
              </span>
            )}
            <div
              className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-wrap shadow-md ${
                m.role === "user"
                  ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-br-sm"
                  : "bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700"
              }`}
            >
              {m.content}
              {m.role === "assistant" && mode === "chat" && (
                <button onClick={() => speak(m.content)} className="press block mt-2 text-[10px] font-black bg-slate-700 border border-slate-600 px-2 py-1 rounded-lg">
                  🔊 Listen
                </button>
              )}
            </div>
            {m.role === "user" && (
              <span className="shrink-0 w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs border border-slate-700 self-end">
                👤
              </span>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <span className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs shadow-lg">
              🤖
            </span>
            <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl rounded-bl-sm shadow-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* CONTROLS */}
      <div className="shrink-0 pt-2">
        {mode === "drill" ? (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={toggleRecord}
              disabled={loading || speaking}
              className={`press w-16 h-16 rounded-full text-xl flex items-center justify-center disabled:opacity-40 shadow-xl transition-all ${
                recording ? "bg-red-600 animate-pulse shadow-red-900/40" : "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-900/40"
              }`}
            >
              {recording ? <span className="text-sm font-black">⏹️ {recSec}s</span> : "🎤"}
            </button>
            <button
              onClick={() => setDrillIdx((drillIdx + 1) % DRILLS.length)}
              className="press px-5 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-black hover:bg-slate-700"
            >
              Next ➡️
            </button>
          </div>
        ) : mode === "call" ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={toggleRecord}
              disabled={loading || speaking}
              className={`press w-20 h-20 rounded-full font-black text-sm flex items-center justify-center transition-all disabled:opacity-40 shadow-2xl ${
                recording
                  ? "bg-red-600 animate-pulse shadow-red-900/40"
                  : "bg-gradient-to-br from-emerald-500 to-teal-600 hover:shadow-emerald-900/40"
              }`}
            >
              {recording ? <span className="text-base font-black">⏹️ {recSec}s</span> : <span className="text-2xl">🎤</span>}
            </button>
            <p className="text-[10px] text-slate-400 font-bold">
              {speaking ? "Listen to Veer first..." : "Tap & speak your answer"}
            </p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type in English..."
              className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-sm outline-none focus:border-blue-500"
            />
            <GradButton type="submit" disabled={loading} gradient="from-blue-500 to-indigo-600" className="px-5 text-lg">
              ➤
            </GradButton>
          </form>
        )}
      </div>
    </main>
  );
}