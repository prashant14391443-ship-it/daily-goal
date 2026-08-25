"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { IconTile, Chip } from "@/app/components/ui";

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
  { label: "🍽️ What should I eat next?", grad: "from-green-500 to-emerald-600" },
  { label: "📚 Give me a study tip", grad: "from-violet-500 to-fuchsia-600" },
];

export default function AIPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [left, setLeft] = useState(15);
  const [failedMsg, setFailedMsg] = useState("");
  const [uid, setUid] = useState("guest");
  const [ctx, setCtx] = useState<{ name: string; studyMin: number; workouts: number; habits: string; todo: string; cal: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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

      // Build context preview for empty state
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

  const buildContext = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return "User not logged in.";
    const today = toLocalISO(new Date());
    const meta = (data.session?.user.user_metadata || {}) as { display_name?: string };
    const name = meta.display_name || data.session?.user.email?.split("@")[0] || "friend";
    const [s, g, h, hl, t, n, gl] = await Promise.all([
      supabase.from("study_sessions").select("duration_minutes").eq("user_id", uid).eq("session_date", today),
      supabase.from("gym_logs").select("id").eq("user_id", uid).eq("session_date", today),
      supabase.from("habits").select("id").eq("user_id", uid),
      supabase.from("habit_logs").select("habit_id").eq("user_id", uid).eq("log_date", today).eq("completed", true),
      supabase.from("tasks").select("id, completed").eq("user_id", uid).eq("category", "todo").eq("task_date", today),
      supabase.from("nutrition_logs").select("calories, protein").eq("user_id", uid).eq("log_date", today),
      supabase.from("user_goals").select("*").eq("user_id", uid).maybeSingle(),
    ]);
    const studyMin = (s.data || []).reduce((a, r) => a + r.duration_minutes, 0);
    const workouts = (g.data || []).length;
    const habitsTotal = (h.data || []).length;
    const habitsDone = (hl.data || []).length;
    const todoTotal = (t.data || []).length;
    const todoDone = (t.data || []).filter((r) => r.completed).length;
    const eaten = (n.data || []).reduce((a, r) => a + r.calories, 0);
    const protein = (n.data || []).reduce((a, r) => a + r.protein, 0);
    const goals = gl.data;
    return `Name: ${name} | Date: ${today}
Study: ${studyMin}/${goals?.study_target ?? 60} min
Workouts: ${workouts}/${goals?.workout_target ?? 1}
Habits: ${habitsDone}/${habitsTotal}
ToDo: ${todoDone}/${todoTotal}
Food eaten: ${eaten} cal (protein ${protein}g) of target ${goals?.calorie_target ?? 2000} cal`;
  };

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    if (left <= 0) { alert("🆓 Free daily limit reached (15 messages). Come back tomorrow!"); return; }
    setInput("");
    const next = [...msgs, { role: "user" as const, content: msg }];
    setMsgs(next);
    setLoading(true);
    const context = await buildContext();
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: msgs.slice(-8), context, mode: "coach" }),
      });
      const d = await res.json();
      const reply = d.reply || "😴 " + (d.error || "AI sleeping.");
      if (d.reply) setFailedMsg("");
      else setFailedMsg(msg);
      const withReply = [...next, { role: "assistant" as const, content: reply }];
      setMsgs(withReply);
      localStorage.setItem("dg-ai-chat-" + uid, JSON.stringify(withReply.slice(-50)));
      const c = JSON.parse(localStorage.getItem("dg-ai-count-" + uid) || "null");
      const today = toLocalISO(new Date());
      const count = c && c.date === today ? c.n + 1 : 1;
      localStorage.setItem("dg-ai-count-" + uid, JSON.stringify({ date: today, n: count }));
      setLeft(Math.max(0, 15 - count));
    } catch {
      setFailedMsg(msg);
      setMsgs([...next, { role: "assistant" as const, content: "📡 Network issue. Try again!" }]);
    }
    setLoading(false);
  };

  return (
    <main className="h-screen bg-slate-950 text-white flex flex-col px-4 pt-6 pb-4 max-w-4xl mx-auto">
      {/* 🌆 HERO */}
      <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 p-4 shadow-2xl shadow-fuchsia-900/30 shrink-0">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-lg shrink-0">🤖</span>
            <div className="min-w-0">
              <h1 className="text-base font-black text-white leading-tight">Personal AI</h1>
              <p className="text-[10px] text-white/80 font-semibold">
                I know your day — ask me anything
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Chip color="violet">{left}/15 free</Chip>
            <Link href="/dashboard" className="text-[10px] text-white/70 font-bold hover:text-white">← Back</Link>
          </div>
        </div>
      </div>

      {/* 💬 MESSAGE STREAM */}
      <div className="flex-1 overflow-y-auto min-h-0 grid gap-3 content-start pb-2">
        {msgs.length === 0 && ctx && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-black/30">
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
              Try one of the chips below or ask anything! ⬇️
            </p>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <span className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs shadow-lg self-end">
                🤖
              </span>
            )}
            <div
              className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-wrap shadow-md ${
                m.role === "user"
                  ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-br-sm"
                  : "bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700"
              }`}
            >
              {m.content}
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
            <span className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs shadow-lg">
              🤖
            </span>
            <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl rounded-bl-sm shadow-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ⚡ QUICK SUGGESTIONS */}
      <div className="shrink-0 flex gap-2 overflow-x-auto py-2 -mx-1 px-1">
        {CHIPS.map((c) => (
          <button
            key={c.label}
            onClick={() => send(c.label)}
            disabled={loading}
            className={`press shrink-0 flex items-center gap-1.5 text-xs font-black bg-slate-900 border border-slate-800 hover:border-violet-500/40 hover:bg-slate-800 px-3 py-2 rounded-full shadow-md disabled:opacity-50 transition-all`}
          >
            <span className={`w-5 h-5 rounded-md bg-gradient-to-br ${c.grad} flex items-center justify-center text-[10px]`}>
              {c.label.split(" ")[0]}
            </span>
            <span className="text-slate-300">{c.label.split(" ").slice(1).join(" ")}</span>
          </button>
        ))}
      </div>

      {/* ⚠️ FAILED RETRY */}
      {failedMsg && !loading && (
        <button
          onClick={() => {
            const m = failedMsg;
            setFailedMsg("");
            send(m);
          }}
          className="shrink-0 w-full py-2.5 mb-2 rounded-xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-300 text-xs font-black press"
        >
          😴 AI didn&apos;t respond — 🔄 Tap to try again
        </button>
      )}

      {/* 📝 INPUT */}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="shrink-0 flex gap-2 pt-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your day or life..."
          disabled={loading}
          className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-sm outline-none focus:border-violet-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="press shrink-0 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-lg font-black disabled:opacity-40 shadow-lg shadow-violet-900/30"
        >
          ➤
        </button>
      </form>
    </main>
  );
}