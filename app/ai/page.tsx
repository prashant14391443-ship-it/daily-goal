"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Sparkles, Send, Volume2, VolumeX } from "lucide-react";
import { useJarvisVoice } from "../hooks/jarvisVoice";
import { executeVoiceAction, isLikelyCommand } from "../hooks/jarvisActions";
import { JarvisOrb } from "../components/JarvisOrb";
import { ActionToast } from "../components/ActionToast";

type Msg = { role: "user" | "assistant"; content: string };

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const CHIPS = [
  { label: "📅 Plan my day", grad: "from-blue-500 to-indigo-600" },
  { label: "💪 Motivate me", grad: "from-orange-500 to-red-600" },
  { label: "🍽️ What should I eat?", grad: "from-green-500 to-emerald-600" },
  { label: "📚 Study tip", grad: "from-violet-500 to-fuchsia-600" },
];

export default function AIPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [left, setLeft] = useState(15);
  const [uid, setUid] = useState("guest");
  const [continuousMode, setContinuousMode] = useState(true);
  const [ctx, setCtx] = useState<{ name: string; studyMin: number; workouts: number; habits: string; todo: string; cal: number } | null>(null);
  const [actionToast, setActionToast] = useState<{ action: any; message: string } | null>(null);
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dg-ai-continuous");
      if (saved !== null) setContinuousMode(saved === "1");
    } catch {}
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id || "guest";
      setUid(id);

      try {
        setMsgs(JSON.parse(localStorage.getItem("dg-ai-chat-" + id) || "[]"));
        const c = JSON.parse(localStorage.getItem("dg-ai-count-" + id) || "null");
        if (c && c.date === toLocalISO(new Date())) setLeft(Math.max(0, 15 - c.n));
      } catch {}

      if (id !== "guest") {
        const today = toLocalISO(new Date());
        const meta = (data.session?.user.user_metadata || {}) as { display_name?: string };
        const name = meta.display_name || data.session?.user.email?.split("@")[0] || "friend";

        const [s, g, h, hl, t, n] = await Promise.all([
          supabase.from("study_sessions").select("duration_minutes").eq("user_id", id).eq("session_date", today),
          supabase.from("gym_logs").select("id").eq("user_id", id).eq("session_date", today),
          supabase.from("habits").select("id").eq("user_id", id),
          supabase.from("habit_logs").select("habit_id").eq("user_id", id).eq("log_date", today).eq("completed", true),
          supabase.from("tasks").select("id, completed").eq("user_id", id).eq("category", "todo").eq("task_date", today),
          supabase.from("nutrition_logs").select("calories").eq("user_id", id).eq("log_date", today),
        ]);

        const studyMin = (s.data || []).reduce((a, r) => a + r.duration_minutes, 0);
        const workouts = (g.data || []).length;
        const habitsTotal = (h.data || []).length;
        const habitsDone = (hl.data || []).length;
        const todoTotal = (t.data || []).length;
        const todoDone = (t.data || []).filter((r) => r.completed).length;
        const cal = (n.data || []).reduce((a, r) => a + r.calories, 0);

        setCtx({
          name, studyMin, workouts,
          habits: `${habitsDone}/${habitsTotal}`,
          todo: `${todoDone}/${todoTotal}`,
          cal,
        });
      }
    };
    load();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  const updateMessageCount = () => {
    const c = JSON.parse(localStorage.getItem("dg-ai-count-" + uid) || "null");
    const today = toLocalISO(new Date());
    const count = c && c.date === today ? c.n + 1 : 1;
    localStorage.setItem("dg-ai-count-" + uid, JSON.stringify({ date: today, n: count }));
    setLeft(Math.max(0, 15 - count));
  };

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loadingRef.current) return;
    if (left <= 0) {
      alert("🆓 Free daily limit reached (15 messages). Come back tomorrow!");
      return;
    }

    setInput("");
    clearTranscript();

    const base = msgsRef.current;
    const next = [...base, { role: "user" as const, content: msg }];
    setMsgs(next);
    setLoading(true);

    try {
      if (isLikelyCommand(msg) && uid !== "guest") {
        const actionResult = await executeVoiceAction(msg, uid);
        if (actionResult.action !== "chat") {
          setActionToast({ action: actionResult.action, message: actionResult.reply });
          const withReply = [...next, { role: "assistant" as const, content: actionResult.reply }];
          setMsgs(withReply);
          localStorage.setItem("dg-ai-chat-" + uid, JSON.stringify(withReply.slice(-50)));
          speak(actionResult.reply);
          updateMessageCount();
          setLoading(false);
          return;
        }
      }

      const context = ctx
        ? `Name: ${ctx.name} | Study: ${ctx.studyMin}min | Workouts: ${ctx.workouts} | Habits: ${ctx.habits} | Todo: ${ctx.todo} | Calories: ${ctx.cal}`
        : "New user, no data yet";

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: base.slice(-8),
          context,
          mode: "action",
          userId: uid,
        }),
      });

      const d = await res.json();
      const reply = d.reply || "Sorry, I didn't catch that.";

      const withReply = [...next, { role: "assistant" as const, content: reply }];
      setMsgs(withReply);
      localStorage.setItem("dg-ai-chat-" + uid, JSON.stringify(withReply.slice(-50)));

      speak(reply);
      updateMessageCount();
    } catch {
      setMsgs([...next, { role: "assistant" as const, content: "Network issue, can you say that again?" }]);
      interrupt();
    }
    setLoading(false);
  };

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
    if (voiceState === "speaking" || voiceState === "listening") {
      interrupt();
    } else {
      startListening();
    }
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
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[110px] transition-colors duration-700 pointer-events-none ${
        voiceState === "listening" ? "bg-red-500/10" :
        voiceState === "speaking" ? "bg-emerald-500/10" :
        voiceState === "thinking" ? "bg-violet-500/10" : "bg-slate-800/10"
      }`} />

      {actionToast && (
        <ActionToast action={actionToast.action} message={actionToast.message} onClose={() => setActionToast(null)} />
      )}

      {/* Header */}
      <div className="relative mb-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-900/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white leading-tight">Personal AI</h1>
            <p className="text-[9px] text-slate-400 font-semibold">
              {left}/15 left {ctx ? `· Hey ${ctx.name}!` : ""}
            </p>
          </div>
        </div>
        <Link href="/dashboard" className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 grid gap-3 content-start pb-2 z-10">
        {msgs.length === 0 && ctx && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
            <p className="font-black text-sm text-white mb-2">Hey {ctx.name}! I&apos;m your coach 👋</p>
            <div className="grid grid-cols-4 gap-1.5">
              <div className="bg-slate-800/60 rounded-lg p-1.5 text-center">
                <p className="text-[8px] font-black text-slate-500">📚</p>
                <p className="text-[11px] font-black text-blue-400">{ctx.studyMin}m</p>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-1.5 text-center">
                <p className="text-[8px] font-black text-slate-500">🏋️</p>
                <p className="text-[11px] font-black text-green-400">{ctx.workouts}</p>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-1.5 text-center">
                <p className="text-[8px] font-black text-slate-500">✅</p>
                <p className="text-[11px] font-black text-violet-400">{ctx.habits}</p>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-1.5 text-center">
                <p className="text-[8px] font-black text-slate-500">📝</p>
                <p className="text-[11px] font-black text-amber-400">{ctx.todo}</p>
              </div>
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg self-end">
                <Sparkles className="w-3.5 h-3.5 text-white" />
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
            <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
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

      {/* Chips */}
      <div className="shrink-0 flex gap-2 overflow-x-auto py-1.5 -mx-1 px-1 z-10">
        {CHIPS.map((c) => (
          <button
            key={c.label}
            onClick={() => sendMessage(c.label)}
            disabled={loading}
            className="shrink-0 flex items-center gap-1.5 text-xs font-black bg-slate-900/80 border border-slate-800 hover:border-violet-500/40 px-3 py-1.5 rounded-full shadow-md disabled:opacity-50 transition-all"
          >
            <span className={`w-5 h-5 rounded-md bg-gradient-to-br ${c.grad} flex items-center justify-center text-[10px]`}>
              {c.label.split(" ")[0]}
            </span>
            <span className="text-slate-300">{c.label.split(" ").slice(1).join(" ")}</span>
          </button>
        ))}
      </div>

      {/* 🎙️ COMPACT PROFESSIONAL VOICE BAR */}
      <div className="shrink-0 z-10 pt-1 pb-1">
        {/* tiny status line */}
        <div className="h-4 flex items-center justify-center mb-1">
          {statusLine && (
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate max-w-full px-2">
              {statusLine}
            </p>
          )}
        </div>

        {/* one clean row: [mic] [input] [send] */}
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex items-center gap-1.5">
          {isSupported ? (
            <JarvisOrb state={voiceState} onClick={handleOrbClick} />
          ) : (
            <div className="w-11 h-11 shrink-0 rounded-full bg-slate-800 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-slate-500" />
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

        {/* continuous toggle — small but clearly visible */}
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