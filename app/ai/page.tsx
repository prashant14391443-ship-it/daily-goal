"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getTrackById } from "@/lib/learningTracks";
import Link from "next/link";
import { ArrowLeft, Sparkles, Send } from "lucide-react";
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

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

// 🗓️ detect a mentioned date ("yesterday", "3 days ago", "september 9", "9 sept")
function parseDateMention(msg: string): string | null {
  const m = msg.toLowerCase();
  const now = new Date();
  const ago = m.match(/(\d+)\s*days?\s*ago/);
  if (ago) { const d = new Date(now); d.setDate(d.getDate() - parseInt(ago[1], 10)); return toLocalISO(d); }
  if (/\byesterday\b/.test(m)) { const d = new Date(now); d.setDate(d.getDate() - 1); return toLocalISO(d); }
  for (let i = 0; i < 12; i++) {
    const re = new RegExp("\\b(" + MONTHS[i].slice(0, 3) + "[a-z]*)\\b");
    if (re.test(m)) {
      const num = m.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
      const day = num ? parseInt(num[1], 10) : 1;
      const d = new Date(now.getFullYear(), i, day);
      if (d.getTime() > now.getTime()) d.setFullYear(now.getFullYear() - 1);
      return toLocalISO(d);
    }
  }
  return null;
}

// 📦 fetch one specific day's full activity as a text line
async function fetchDayLine(uid: string, day: string): Promise<string> {
  const [s, g, hl, h, t] = await Promise.all([
    supabase.from("study_sessions").select("duration_minutes").eq("user_id", uid).eq("session_date", day).eq("completed", true),
    supabase.from("gym_logs").select("distance_km").eq("user_id", uid).eq("session_date", day).eq("completed", true),
    supabase.from("habit_logs").select("habit_id").eq("user_id", uid).eq("log_date", day).eq("completed", true),
    supabase.from("habits").select("id").eq("user_id", uid),
    supabase.from("tasks").select("completed").eq("user_id", uid).eq("task_date", day),
  ]);
  const sMin = (s.data || []).reduce((a: number, r: any) => a + (r.duration_minutes || 0), 0);
  const gRows = g.data || [];
  const km = Math.round(gRows.reduce((a: number, r: any) => a + (r.distance_km || 0), 0) * 100) / 100;
  const hDone = (hl.data || []).length, hTot = (h.data || []).length;
  const tRows = t.data || [], tDone = tRows.filter((x: any) => x.completed).length;
  const lbl = new Date(day + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${lbl}: study ${sMin}m, workouts ${gRows.length}${km ? ` (${km}km)` : ""}, habits ${hDone}/${hTot}, tasks ${tDone}/${tRows.length}`;
}

const CHIPS = [
  { label: "📅 Plan my day", grad: "from-blue-500 to-indigo-600" },
  { label: "💪 Motivate me", grad: "from-orange-500 to-red-600" },
  { label: "🍽️ What should I eat?", grad: "from-green-500 to-emerald-600" },
  { label: "📚 Study tip", grad: "from-violet-500 to-fuchsia-600" },
  { label: "🗂️ Summarize my week", grad: "from-teal-500 to-cyan-600" },
];

export default function AIPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [left, setLeft] = useState(15);
  const [uid, setUid] = useState("guest");
  const [ctx, setCtx] = useState<{ name: string; studyMin: number; workouts: number; habits: string; todo: string; cal: number } | null>(null);
  const [trackLine, setTrackLine] = useState("not enrolled");
  const [weekLines, setWeekLines] = useState<string[]>([]);
  const [actionToast, setActionToast] = useState<{ action: any; message: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const msgsRef = useRef<Msg[]>([]);
  const loadingRef = useRef(false);
  useEffect(() => { msgsRef.current = msgs; }, [msgs]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // 🎙️ always continuous (natural conversation); orb toggles mic on/off
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
  } = useJarvisVoice(true);

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
        const from = toLocalISO(new Date(Date.now() - 6 * 86400000));
        const meta = (data.session?.user.user_metadata || {}) as { display_name?: string };
        const name = meta.display_name || data.session?.user.email?.split("@")[0] || "friend";

        const [s, g, h, hl, t, n, en, lp, sw, gw, hlw, tw] = await Promise.all([
          supabase.from("study_sessions").select("duration_minutes").eq("user_id", id).eq("session_date", today).eq("completed", true),
          supabase.from("gym_logs").select("id").eq("user_id", id).eq("session_date", today).eq("completed", true),
          supabase.from("habits").select("id").eq("user_id", id),
          supabase.from("habit_logs").select("habit_id").eq("user_id", id).eq("log_date", today).eq("completed", true),
          supabase.from("tasks").select("id, completed").eq("user_id", id).eq("category", "todo").eq("task_date", today),
          supabase.from("nutrition_logs").select("calories").eq("user_id", id).eq("log_date", today),
          supabase.from("learning_enrollments").select("track_id").eq("user_id", id).eq("status", "active").maybeSingle(),
          supabase.from("learning_progress").select("status").eq("user_id", id),
          supabase.from("study_sessions").select("session_date, duration_minutes").eq("user_id", id).eq("completed", true).gte("session_date", from),
          supabase.from("gym_logs").select("session_date, distance_km").eq("user_id", id).eq("completed", true).gte("session_date", from),
          supabase.from("habit_logs").select("log_date, habit_id").eq("user_id", id).eq("completed", true).gte("log_date", from),
          supabase.from("tasks").select("task_date, completed").eq("user_id", id).gte("task_date", from),
        ]);

        const studyMin = (s.data || []).reduce((a: number, r: any) => a + r.duration_minutes, 0);
        const workouts = (g.data || []).length;
        const habitsTotal = (h.data || []).length;
        const habitsDone = (hl.data || []).length;
        const todoTotal = (t.data || []).length;
        const todoDone = (t.data || []).filter((r: any) => r.completed).length;
        const cal = (n.data || []).reduce((a: number, r: any) => a + r.calories, 0);
        setCtx({ name, studyMin, workouts, habits: `${habitsDone}/${habitsTotal}`, todo: `${todoDone}/${todoTotal}`, cal });

        let tl = "not enrolled in a track";
        const trackId = en?.data?.track_id;
        if (trackId) {
          const tr = getTrackById(trackId);
          if (tr) {
            const done = (lp.data || []).filter((p: any) => p.status === "completed").length;
            tl = `${tr.name} — ${done}/${tr.milestones.length} milestones done`;
          }
        }
        setTrackLine(tl);

        const lines: string[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = toLocalISO(new Date(Date.now() - i * 86400000));
          const sm = (sw.data || []).filter((r: any) => r.session_date === d).reduce((a: number, r: any) => a + (r.duration_minutes || 0), 0);
          const gRows = (gw.data || []).filter((r: any) => r.session_date === d);
          const km = Math.round(gRows.reduce((a: number, r: any) => a + (r.distance_km || 0), 0) * 100) / 100;
          const hd = new Set((hlw.data || []).filter((r: any) => r.log_date === d).map((r: any) => r.habit_id)).size;
          const tRows = (tw.data || []).filter((r: any) => r.task_date === d);
          const td = tRows.filter((r: any) => r.completed).length;
          const lbl = new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
          lines.push(`${lbl}: study ${sm}m, gym ${gRows.length}${km ? `/${km}km` : ""}, habits ${hd}/${habitsTotal}, tasks ${td}/${tRows.length}`);
        }
        setWeekLines(lines);
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
        ? `Name: ${ctx.name} | TODAY => study ${ctx.studyMin}m, workouts ${ctx.workouts}, habits ${ctx.habits}, todo ${ctx.todo}, calories ${ctx.cal} | TRACK: ${trackLine} | LAST 7 DAYS => ${weekLines.join(" | ")}`
        : "New user, no data yet";

      let extra = "";
      const mentioned = parseDateMention(msg);
      if (mentioned && uid !== "guest") {
        extra = " | THE SPECIFIC DAY USER ASKED ABOUT => " + (await fetchDayLine(uid, mentioned));
      }

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: base.slice(-8),
          context: context + extra,
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

  // 🎙️ tap mic = start continuous listening; tap again = stop
  const handleOrbClick = () => {
    if (voiceState === "listening") {
      stopListening();
    } else {
      interrupt();
      startListening();
    }
  };

  const statusLine =
    voiceState === "listening"
      ? transcript ? `"${transcript}"` : "Listening — just talk..."
      : voiceState === "thinking" ? "Thinking..."
      : voiceState === "speaking" ? "Speaking — talk anytime to interrupt"
      : voiceState === "error" ? "Mic error — check permissions"
      : "Tap the mic to talk";

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

      <div className="flex-1 overflow-y-auto min-h-0 grid gap-3 content-start pb-2 z-10">
        {msgs.length === 0 && ctx && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
            <p className="font-black text-sm text-white mb-2">Hey {ctx.name}! I&apos;m your coach 👋</p>
            <div className="grid grid-cols-4 gap-1.5">
              <div className="bg-slate-800/60 rounded-lg p-1.5 text-center"><p className="text-[8px] font-black text-slate-500">📚</p><p className="text-[11px] font-black text-blue-400">{ctx.studyMin}m</p></div>
              <div className="bg-slate-800/60 rounded-lg p-1.5 text-center"><p className="text-[8px] font-black text-slate-500">🏋️</p><p className="text-[11px] font-black text-green-400">{ctx.workouts}</p></div>
              <div className="bg-slate-800/60 rounded-lg p-1.5 text-center"><p className="text-[8px] font-black text-slate-500">✅</p><p className="text-[11px] font-black text-violet-400">{ctx.habits}</p></div>
              <div className="bg-slate-800/60 rounded-lg p-1.5 text-center"><p className="text-[8px] font-black text-slate-500">📝</p><p className="text-[11px] font-black text-amber-400">{ctx.todo}</p></div>
            </div>
            <p className="text-[9px] text-slate-500 mt-2">Ask me anything — &quot;what did I do on Sept 9?&quot;, &quot;summarize my week&quot;, &quot;how&apos;s my track going?&quot;</p>
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
      </div>
    </main>
  );
}