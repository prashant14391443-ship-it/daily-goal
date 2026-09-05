"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Mic, Send, PhoneOff, Volume2, MessageCircle, ArrowLeft, Bot, User, Shuffle, Loader2, VolumeX } from "lucide-react";
import { useJarvisVoice } from "@/app/hooks/jarvisVoice";
import { JarvisOrb } from "@/app/components/JarvisOrb";

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
  { id: "tips", emoji: "🎓", title: "English Tips", desc: "Speaking • Reading • Writing • Listening", grad: "from-teal-500 to-cyan-600", border: "border-teal-500/30", href: "/english-tips" },
  { id: "games", emoji: "🎮", title: "Game Zone", desc: "4 games • beat your best", grad: "from-pink-500 to-rose-600", border: "border-pink-500/30", href: "/games" },
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
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [left, setLeft] = useState(16);
  const [uid, setUid] = useState("guest");
  const [drillIdx, setDrillIdx] = useState(0);
  const [view, setView] = useState<"home" | "topics">("home");
  const [continuousMode, setContinuousMode] = useState(true);

  // 🎙️ Jarvis Voice Engine
  const {
    state: voiceState,
    isSupported,
    transcript,
    startListening,
    stopListening,
    interrupt,
    speak,
    setOnTranscript,
    clearTranscript,
  } = useJarvisVoice(continuousMode);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<number | null>(null);
  const recSecRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  
  // Refs to prevent stale closures in async functions
  const msgsRef = useRef<Msg[]>([]);
  const loadingRef = useRef(false);
  useEffect(() => { msgsRef.current = msgs; }, [msgs]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

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
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [msgs, loading, voiceState]);

  const stopAll = () => {
    interrupt(); // Stops Jarvis voice
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
    setMsgs([{ role: "assistant", content: `Hi! I'm Swati 😊 Let's talk about ${topic}. Write your first sentence!` }]);
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
    if (!msg || loadingRef.current) return;
    if (!useLimit()) return;
    setInput("");
    clearTranscript();
    
    const base = msgsRef.current;
    const next = [...base, { role: "user" as const, content: msg }];
    setMsgs(next);
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mode: mode === "call" ? "call" : "english", 
          topic: topic || "", 
          message: msg, 
          history: base.slice(-6) 
        }),
      });
      const d = await res.json();
      const reply = d.reply || "😴 " + (d.error || "AI sleeping.");
      setMsgs([...next, { role: "assistant" as const, content: reply }]);
      if (d.reply) {
        bumpLimit();
        if (mode === "call") speak(reply);
      }
    } catch {
      setMsgs([...next, { role: "assistant" as const, content: "📡 Network issue!" }]);
      if (mode === "call") interrupt();
    }
    setLoading(false);
  };

  // 🎙️ Voice transcript handler for continuous conversation
  const handleTranscript = async (text: string) => {
    if (!text) return;
    let waited = 0;
    while (loadingRef.current && waited < 6000) {
      await new Promise((r) => setTimeout(r, 200));
      waited += 200;
    }
    await send(text);
  };

  useEffect(() => {
    setOnTranscript(handleTranscript);
  });

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
    interrupt(); // Stop Jarvis if active
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
      <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
        {/* HERO */}
        <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-5 shadow-xl shadow-teal-900/20">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Mic size={22} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-white leading-tight">Practice Speaking</h1>
                <p className="text-xs text-white/75 font-semibold">Speak English with Swati (AI coach)</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-[10px] font-bold text-white border border-white/20">
                {left}/16 free
              </span>
              <Link href="/english" className="text-[10px] text-white/70 font-bold hover:text-white flex items-center gap-1">
                <ArrowLeft size={10} /> English Club
              </Link>
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
                  <div className={`bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-2xl p-4 text-left transition-colors`}>
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${m.grad} flex items-center justify-center text-xl mb-3`}>
                      {m.emoji}
                    </div>
                    <p className="font-semibold text-sm text-white leading-tight">{m.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{m.desc}</p>
                  </div>
                );

                return m.href ? (
                  <Link key={m.id} href={m.href}>{content}</Link>
                ) : (
                  <button key={m.id} onClick={handleClick} className="text-left">{content}</button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* TOPIC PICKER */}
            <button onClick={() => setView("home")} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-4 font-semibold transition-colors">
              <ArrowLeft size={14} />
              All modes
            </button>
            <p className="text-xs font-bold text-slate-400 mb-4">🎯 PICK A TOPIC → call or chat with Swati:</p>
            <div className="grid grid-cols-2 gap-3">
              {TOPICS.map((t) => (
                <button
                  key={t.title}
                  onClick={() => { setTopic(t.title); setPicker(true); }}
                  className="bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-2xl p-4 text-center transition-colors"
                >
                  <div className={`w-11 h-11 mx-auto rounded-xl bg-gradient-to-br ${t.grad} flex items-center justify-center text-xl mb-2`}>
                    {t.emoji}
                  </div>
                  <p className="text-xs font-semibold text-white leading-tight">{t.title}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* METHOD PICKER MODAL */}
        {picker && (
          <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-end justify-center">
            <div className="bg-slate-900 border-t border-slate-700 rounded-t-3xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="font-bold text-base text-white">Select method</p>
                  <p className="text-xs text-slate-400 mt-0.5">Topic: {topic}</p>
                </div>
                <button onClick={() => setPicker(false)} className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => startCall()} className="py-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-base flex items-center justify-center gap-2 transition-colors">
                  <PhoneOff size={18} className="rotate-[135deg]" />
                  Call
                </button>
                <button onClick={startChat} className="py-5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-base flex items-center justify-center gap-2 transition-colors">
                  <MessageCircle size={18} />
                  Chat
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // 🎙️ CONVERSATION / DRILL SCREEN — LOCKED LAYOUT
  return (
    <main className="fixed inset-0 bg-slate-950 text-white flex flex-col">
      {/* HEADER — always visible */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-4 shrink-0">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`shrink-0 w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center ${voiceState === "speaking" ? "animate-pulse ring-2 ring-white/30" : ""}`}>
              <Bot size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-white leading-tight truncate">
                Swati • {mode === "drill" ? "Sentence Practice" : topic}
              </p>
              <p className="text-xs text-white/75 font-semibold">
                {voiceState === "speaking" ? "🔊 Swati is speaking..." : mode === "chat" ? "💬 chat mode" : "🎤 Your turn — tap mic & speak"}
              </p>
            </div>
          </div>
          <button
            onClick={() => { stopAll(); setMode(""); setMsgs([]); }}
            className="shrink-0 px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold flex items-center gap-1.5 hover:bg-red-500/30 transition-colors"
          >
            <PhoneOff size={14} />
            End
          </button>
        </div>
      </div>

      {/* DRILL TARGET */}
      {mode === "drill" && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 p-4 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-amber-300">
              REPEAT AFTER Swati ({drillIdx + 1}/{DRILLS.length})
            </p>
            <button
              onClick={() => speak(DRILLS[drillIdx])}
              className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              <Volume2 size={12} />
              Hear it
            </button>
          </div>
          <p className="font-bold text-base text-amber-200 leading-snug">{DRILLS[drillIdx]}</p>
        </div>
      )}

      {/* MESSAGE STREAM — scrolls ONLY inside this box */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        <div className="max-w-4xl mx-auto grid gap-3 content-start">
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs self-end">
                  <Bot size={14} className="text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-br-sm"
                    : "bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700"
                }`}
              >
                {m.content}
                {m.role === "assistant" && mode === "chat" && (
                  <button
                    onClick={() => speak(m.content)}
                    className="flex items-center gap-1.5 mt-2 text-xs font-bold bg-slate-700 border border-slate-600 px-2 py-1 rounded-lg hover:bg-slate-600 transition-colors"
                  >
                    <Volume2 size={12} />
                    Listen
                  </button>
                )}
              </div>
              {m.role === "user" && (
                <div className="shrink-0 w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs border border-slate-700 self-end">
                  <User size={14} className="text-slate-400" />
                </div>
              )}
            </div>
          ))}
          {loading && voiceState !== "speaking" && (
            <div className="flex gap-2 justify-start">
              <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl rounded-bl-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* CONTROLS — docked at bottom, always visible */}
      <div className="shrink-0 px-4 pt-4 pb-24 bg-slate-950 border-t border-slate-800">
        <div className="max-w-4xl mx-auto">
          {mode === "drill" ? (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={toggleRecord}
                disabled={loading || voiceState === "speaking"}
                className={`w-16 h-16 rounded-full flex items-center justify-center disabled:opacity-40 transition-all ${
                  recording
                    ? "bg-red-600 animate-pulse"
                    : "bg-gradient-to-br from-amber-500 to-orange-600"
                }`}
              >
                {recording ? (
                  <span className="text-sm font-bold text-white">⏹️ {recSec}s</span>
                ) : (
                  <Mic size={24} className="text-white" />
                )}
              </button>
              <button
                onClick={() => setDrillIdx((drillIdx + 1) % DRILLS.length)}
                className="px-5 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold hover:bg-slate-700 flex items-center gap-2 transition-colors"
              >
                <Shuffle size={14} />
                Next
              </button>
            </div>
          ) : mode === "call" ? (
            // 🎙️ JARVIS VOICE BAR FOR CALL MODE
            <div className="shrink-0 z-10 pt-1 pb-1">
              <div className="h-4 flex items-center justify-center mb-1">
                {voiceState === "listening" && transcript && (
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate max-w-full px-2">
                    &quot;{transcript}&quot;
                  </p>
                )}
                {voiceState === "listening" && !transcript && <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">Listening...</p>}
                {voiceState === "thinking" && <p className="text-[9px] font-bold uppercase tracking-wider text-violet-400">Thinking...</p>}
                {voiceState === "speaking" && <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">Speaking — talk to interrupt</p>}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-1.5">
                {isSupported ? (
                  <JarvisOrb 
                    state={voiceState} 
                    onClick={() => {
                      if (voiceState === "speaking" || voiceState === "listening") interrupt();
                      else startListening();
                    }} 
                  />
                ) : (
                  <div className="w-11 h-11 shrink-0 rounded-full bg-slate-800 flex items-center justify-center">
                    <Mic className="w-4 h-4 text-slate-500" />
                  </div>
                )}
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={voiceState === "listening" && transcript ? transcript : "Type or speak..."}
                  disabled={loading}
                  className="flex-1 min-w-0 h-11 px-4 rounded-full bg-slate-900/80 backdrop-blur border border-slate-800 text-sm outline-none focus:border-emerald-500 disabled:opacity-50 transition-all placeholder:text-slate-600"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="shrink-0 w-11 h-11 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white disabled:opacity-40 shadow-lg shadow-emerald-900/30 transition-all active:scale-95 flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              <div className="flex justify-center mt-1.5">
                <button
                  onClick={() => {
                    const next = !continuousMode;
                    setContinuousMode(next);
                    if (next) startListening();
                    else stopListening();
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black border transition-all ${
                    continuousMode
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                      : "bg-slate-800/60 border-slate-700 text-slate-500"
                  }`}
                >
                  {continuousMode ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                  {continuousMode ? "CONTINUOUS ON" : "CONTINUOUS OFF"}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type in English..."
                className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="shrink-0 px-5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white disabled:opacity-40 flex items-center justify-center transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}