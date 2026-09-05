"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Sparkles, Send } from "lucide-react";
import { useJarvisVoice } from "@/app/hooks/JarvisVoice";
import { executeVoiceAction, isLikelyCommand } from "@/app/hooks/jarvisActions";
import { JarvisOrb } from "@/app/components/JarvisOrb";
import { ActionToast } from "@/app/components/ActionToast";
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
  const [continuousMode, setContinuousMode] = useState(true); // ✅ ON by default
  const [ctx, setCtx] = useState<{ name: string; studyMin: number; workouts: number; habits: string; todo: string; cal: number } | null>(null);
  const [actionToast, setActionToast] = useState<{ action: any; message: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  // 💾 Restore saved continuous mode preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dg-ai-continuous");
      if (saved !== null) setContinuousMode(saved === "1");
    } catch {}
  }, []);

  // Load user data and context
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

  // Auto-scroll
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

  // Send message (text or voice)
  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    if (left <= 0) {
      alert("🆓 Free daily limit reached (15 messages). Come back tomorrow!");
      interrupt(); // reset voice loop
      return;
    }

    setInput("");
    clearTranscript();

    const next = [...msgs, { role: "user" as const, content: msg }];
    setMsgs(next);
    setLoading(true);

    try {
      // 🛠️ Voice command → update app database directly
      if (isLikelyCommand(msg) && uid !== "guest") {
        const actionResult = await executeVoiceAction(msg, uid);
        if (actionResult.action !== "chat") {
          setActionToast({ action: actionResult.action, message: actionResult.reply });
          const withReply = [...next, { role: "assistant" as const, content: actionResult.reply }];
          setMsgs(withReply);
          localStorage.setItem("dg-ai-chat-" + uid, JSON.stringify(withReply.slice(-50)));
          speak(actionResult.reply); // 🔄 loop continues automatically after speaking
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
          history: msgs.slice(-8),
          context,
          mode: "action",
          userId: uid,
        }),
      });

      const d = await res.json();
      const reply = d.reply || "😴 AI sleeping.";

      const withReply = [...next, { role: "assistant" as const, content: reply }];
      setMsgs(withReply);
      localStorage.setItem("dg-ai-chat-" + uid, JSON.stringify(withReply.slice(-50)));

      speak(reply); // 🔄 mic reopens automatically after AI speaks
      updateMessageCount();
    } catch {
      setMsgs([...next, { role: "assistant" as const, content: "📡 Network issue. Try again!" }]);
      interrupt(); // reset voice loop on error
    }
    setLoading(false);
  };

  // 🎙️ Voice transcript handler
  const handleTranscript = async (text: string) => {
    if (!text) return;
    if (loading) {
      interrupt(); // ignore speech while busy, then re-listen
      return;
    }
    await sendMessage(text);
  };

  // Keep the hook's callback always fresh (no stale closures)
  useEffect(() => {
    setOnTranscript(handleTranscript);
  });

  // 🔁 Continuous mode toggle (saved forever)
  const toggleContinuous = () => {
    const next = !continuousMode;
    setContinuousMode(next);
    try {
      localStorage.setItem("dg-ai-continuous", next ? "1" : "0");
    } catch {}
    if (next) startListening(); // start the endless loop right now
    else stopListening();       // fully stop the loop
  };

  const handleOrbClick = () => {
    if (voiceState === "speaking" || voiceState === "listening") {
      interrupt();
    } else {
      startListening();
    }
  };

  return (
    <main className="h-screen bg-slate-950 text-white flex flex-col px-4 pt-6 pb-4 max-w-4xl mx-auto relative overflow-hidden">
      {/* Ambient Background Glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] transition-colors duration-700 pointer-events-none ${
        voiceState === "listening" ? "bg-red-500/15" :
        voiceState === "speaking" ? "bg-emerald-500/15" :
        voiceState === "thinking" ? "bg-violet-500/15" : "bg-slate-800/10"
      }`} />

      {/* Action Toast */}
      {actionToast && (
        <ActionToast
          action={actionToast.action}
          message={actionToast.message}
          onClose={() => setActionToast(null)}
        />
      )}

      {/* Header */}
      <div className="relative mb-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-900/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-white leading-tight">Personal AI</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {ctx ? `Hey ${ctx.name}!` : "Your daily assistant"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 text-[10px] font-bold text-slate-300">
            {left}/15 left
          </div>
          <Link href="/dashboard" className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto min-h-0 grid gap-4 content-start pb-2 z-10">
        {msgs.length === 0 && ctx && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-base shadow-lg">🤖</span>
              <p className="font-black text-sm text-white">Hey {ctx.name}! I&apos;m your coach 👋</p>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              I&apos;ve got a full picture of your day — here&apos;s what I see:
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-slate-800/60 rounded-lg p-2">
                <p className="text-[9px] font-black text-slate-500">📚 STUDY</p>
                <p className="text-xs font-black text-blue-400">{ctx.studyMin} min</p>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-2">
                <p className="text-[9px] font-black text-slate-500">🏋️ WORKOUTS</p>
                <p className="text-xs font-black text-green-400">{ctx.workouts}</p>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-2">
                <p className="text-[9px] font-black text-slate-500">✅ HABITS</p>
                <p className="text-xs font-black text-violet-400">{ctx.habits}</p>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-2">
                <p className="text-[9px] font-black text-slate-500">📝 TODO</p>
                <p className="text-xs font-black text-amber-400">{ctx.todo}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-3 font-semibold">
              Tap the orb ONCE and just keep talking! ⬇️
            </p>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm whitespace-pre-wrap shadow-md leading-relaxed ${
              m.role === "user"
                ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-br-sm"
                : "bg-slate-800/80 backdrop-blur text-slate-100 rounded-bl-sm border border-slate-700/50"
            }`}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && voiceState !== "speaking" && (
          <div className="flex gap-3 justify-start">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div className="bg-slate-800/80 border border-slate-700/50 p-4 rounded-2xl rounded-bl-sm shadow-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Chips */}
      <div className="shrink-0 flex gap-2 overflow-x-auto py-2 -mx-1 px-1 z-10">
        {CHIPS.map((c) => (
          <button
            key={c.label}
            onClick={() => sendMessage(c.label)}
            disabled={loading}
            className="shrink-0 flex items-center gap-1.5 text-xs font-black bg-slate-900/80 border border-slate-800 hover:border-violet-500/40 hover:bg-slate-800 px-3 py-2 rounded-full shadow-md disabled:opacity-50 transition-all backdrop-blur-sm"
          >
            <span className={`w-5 h-5 rounded-md bg-gradient-to-br ${c.grad} flex items-center justify-center text-[10px]`}>
              {c.label.split(" ")[0]}
            </span>
            <span className="text-slate-300">{c.label.split(" ").slice(1).join(" ")}</span>
          </button>
        ))}
      </div>

      {/* Jarvis Orb & Input */}
      <div className="shrink-0 flex flex-col items-center gap-3 pt-3 z-10">
        <JarvisOrb
          state={voiceState}
          transcript={transcript}
          onClick={handleOrbClick}
          continuousMode={continuousMode}
          onToggleContinuous={toggleContinuous}
        />

        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="w-full flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isSupported ? "Tap the orb to speak, or type here..." : "Type your message..."}
            disabled={loading}
            className="flex-1 p-3.5 rounded-xl bg-slate-900/80 backdrop-blur border border-slate-800 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-50 transition-all placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black disabled:opacity-40 shadow-lg shadow-violet-900/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </main>
  );
}