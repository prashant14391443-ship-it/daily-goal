"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Volume2, VolumeX, Mic } from "lucide-react";
import { useJarvisVoice } from "../hooks/jarvisVoice";
import { JarvisOrb } from "./JarvisOrb";

type Msg = { role: "user" | "assistant"; content: string };

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface VoiceCallProps {
  title: string;
  subtitle: string;
  backHref: string;
  storageKey: string;   // unique per page, e.g. "dg-talk-topic"
  mode?: string;        // "call"
  topic?: string;       // for topic mode
  freeLimit?: number;   // 16
  grad?: string;        // header gradient
}

export default function VoiceCall({
  title,
  subtitle,
  backHref,
  storageKey,
  mode = "call",
  topic,
  freeLimit = 16,
  grad = "from-emerald-500 to-teal-600",
}: VoiceCallProps) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [left, setLeft] = useState(freeLimit);
  const [continuousMode, setContinuousMode] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const msgsRef = useRef<Msg[]>([]);
  const loadingRef = useRef(false);
  useEffect(() => { msgsRef.current = msgs; }, [msgs]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

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

  // Load saved chat + daily counter + continuous preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dg-ai-continuous");
      if (saved !== null) setContinuousMode(saved === "1");
      setMsgs(JSON.parse(localStorage.getItem(storageKey + "-chat") || "[]"));
      const c = JSON.parse(localStorage.getItem(storageKey + "-count") || "null");
      if (c && c.date === toLocalISO(new Date())) setLeft(Math.max(0, freeLimit - c.n));
    } catch {}
  }, [storageKey, freeLimit]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  const updateCount = () => {
    const c = JSON.parse(localStorage.getItem(storageKey + "-count") || "null");
    const today = toLocalISO(new Date());
    const n = c && c.date === today ? c.n + 1 : 1;
    localStorage.setItem(storageKey + "-count", JSON.stringify({ date: today, n }));
    setLeft(Math.max(0, freeLimit - n));
  };

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loadingRef.current) return;
    if (left <= 0) {
      alert("🆓 Free daily limit reached. Come back tomorrow!");
      return;
    }

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
          message: msg,
          history: base.slice(-8),
          mode,
          topic,
        }),
      });
      const d = await res.json();
      const reply = d.reply || "Sorry, I didn't catch that.";

      const withReply = [...next, { role: "assistant" as const, content: reply }];
      setMsgs(withReply);
      localStorage.setItem(storageKey + "-chat", JSON.stringify(withReply.slice(-50)));

      speak(reply); // 🗣️ AI speaks out loud
      updateCount();
    } catch {
      setMsgs([...next, { role: "assistant" as const, content: "Network issue, try again!" }]);
      interrupt();
    }
    setLoading(false);
  };

  // Voice transcript (with wait-if-busy so interruptions aren't lost)
  const handleTranscript = async (text: string) => {
    if (!text) return;
    let waited = 0;
    while (loadingRef.current && waited < 6000) {
      await new Promise((r) => setTimeout(r, 200));
      waited += 200;
    }
    await sendMessage(text);
  };

  useEffect(() => {
    setOnTranscript(handleTranscript);
  });

  const toggleContinuous = () => {
    const next = !continuousMode;
    setContinuousMode(next);
    try { localStorage.setItem("dg-ai-continuous", next ? "1" : "0"); } catch {}
    if (next) startListening();
    else stopListening();
  };

  const handleOrbClick = () => {
    if (voiceState === "speaking" || voiceState === "listening") interrupt();
    else startListening();
  };

  const statusLine =
    voiceState === "listening"
      ? transcript ? `"${transcript}"` : "Listening..."
      : voiceState === "thinking" ? "Thinking..."
      : voiceState === "speaking" ? "Speaking — just talk to interrupt"
      : voiceState === "error" ? "Mic error — check permissions"
      : "";

  return (
    <main className="h-screen bg-slate-950 text-white flex flex-col px-4 pt-4 pb-2 max-w-4xl mx-auto relative overflow-hidden">
      {/* 🌆 Header banner */}
      <div className={`relative mb-3 shrink-0 z-10 overflow-hidden rounded-2xl bg-gradient-to-br ${grad} p-4 shadow-2xl`}>
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-lg shrink-0">
              <Mic className="w-5 h-5 text-white" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-black text-white leading-tight truncate">{title}</h1>
              <p className="text-[10px] text-white/80 font-semibold truncate">{subtitle}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-[10px] font-black text-white">
              {left}/{freeLimit} free
            </span>
            <Link href={backHref} className="text-[10px] text-white/70 font-bold hover:text-white">
              ← Back
            </Link>
          </div>
        </div>
      </div>

      {/* 💬 Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 grid gap-3 content-start pb-2 z-10">
        {msgs.length === 0 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
            <p className="text-xs text-slate-300 leading-relaxed">
              🎙️ Tap the mic and just talk — I&apos;ll reply out loud like a real call.
              You can interrupt me anytime by speaking. Pauses are okay, I&apos;ll wait for you!
            </p>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className={`shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center shadow-lg self-end`}>
                <Mic className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-wrap shadow-md leading-relaxed ${
              m.role === "user"
                ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-br-sm"
                : "bg-slate-800/80 backdrop-blur text-slate-100 rounded-bl-sm border border-slate-700/50"
            }`}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && voiceState !== "speaking" && (
          <div className="flex gap-2 justify-start">
            <div className={`shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center shadow-lg`}>
              <Mic className="w-3.5 h-3.5 text-white animate-pulse" />
            </div>
            <div className="bg-slate-800/80 border border-slate-700/50 p-3 rounded-2xl rounded-bl-sm shadow-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 🎙️ Compact voice bar */}
      <div className="shrink-0 z-10 pt-1 pb-1">
        <div className="h-4 flex items-center justify-center mb-1">
          {statusLine && (
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate max-w-full px-2">
              {statusLine}
            </p>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex items-center gap-1.5">
          {isSupported ? (
            <JarvisOrb state={voiceState} onClick={handleOrbClick} />
          ) : (
            <div className="w-11 h-11 shrink-0 rounded-full bg-slate-800 flex items-center justify-center">
              <Mic className="w-4 h-4 text-slate-500" />
            </div>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={voiceState === "listening" && transcript ? transcript : "Type a message..."}
            disabled={loading}
            className="flex-1 min-w-0 h-11 px-4 rounded-full bg-slate-900/80 backdrop-blur border border-slate-800 text-sm outline-none focus:border-violet-500 disabled:opacity-50 transition-all placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 w-11 h-11 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white disabled:opacity-40 shadow-lg shadow-violet-900/30 transition-all active:scale-95 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex justify-center mt-1.5">
          <button
            onClick={toggleContinuous}
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
    </main>
  );
}