"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Msg = { role: "user" | "assistant"; content: string };

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const CHIPS = [
  "📅 Plan my day",
  "💪 Motivate me",
  "🍽️ What should I eat next?",
  "📚 Give me a study tip",
];

export default function AIPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [left, setLeft] = useState(15);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setMsgs(JSON.parse(localStorage.getItem("dg-ai-chat") || "[]"));
      const c = JSON.parse(localStorage.getItem("dg-ai-count") || "null");
      if (c && c.date === toLocalISO(new Date()))
        setLeft(Math.max(0, 15 - c.n));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  const buildContext = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return "User not logged in.";
    const today = toLocalISO(new Date());
    const meta = (data.session?.user.user_metadata || {}) as {
      display_name?: string;
    };
    const name =
      meta.display_name || data.session?.user.email?.split("@")[0] || "friend";

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
    if (left <= 0) {
      alert("🆓 Free daily limit reached (15 messages). Come back tomorrow!");
      return;
    }
    setInput("");
    const next = [...msgs, { role: "user" as const, content: msg }];
    setMsgs(next);
    setLoading(true);
    const context = await buildContext();
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: msgs.slice(-8), context }),
      });
      const d = await res.json();
      const reply = d.reply || "😴 " + (d.error || "AI sleeping.");
      const withReply = [...next, { role: "assistant" as const, content: reply }];
      setMsgs(withReply);
      localStorage.setItem("dg-ai-chat", JSON.stringify(withReply.slice(-50)));
      const c = JSON.parse(localStorage.getItem("dg-ai-count") || "null");
      const today = toLocalISO(new Date());
      const count = c && c.date === today ? c.n + 1 : 1;
      localStorage.setItem("dg-ai-count", JSON.stringify({ date: today, n: count }));
      setLeft(Math.max(0, 15 - count));
    } catch {
      setMsgs([...next, { role: "assistant" as const, content: "📡 Network issue. Try again!" }]);
    }
    setLoading(false);
  };

  return (
    <main className="h-screen bg-slate-950 text-white flex flex-col p-4 md:p-8 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-black">🤖 Personal AI</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-violet-600/20 border border-violet-500/40 text-violet-300 px-2 py-1 rounded-lg font-bold">
            {left}/15 free today
          </span>
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">
            ← Back
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto grid gap-3 content-start">
        {msgs.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
            <p className="text-4xl mb-2">🤖</p>
            <p className="font-bold mb-1">Your personal coach is awake!</p>
            <p className="text-sm text-slate-400">
              I know your study, gym, habits, food & streaks — ask me anything!
            </p>
          </div>
        )}
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] p-3 rounded-xl text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "justify-self-end bg-violet-600 text-white"
                : "justify-self-start bg-slate-800 text-slate-100"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="justify-self-start bg-slate-800 p-3 rounded-xl text-sm text-slate-400 animate-pulse">
            🤖 thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 overflow-x-auto py-2">
        {CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => send(c)}
            className="shrink-0 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-lg"
          >
            {c}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your day or life..."
          className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm"
        />
        <button
          disabled={loading}
          className="px-5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold disabled:opacity-50"
        >
          ➤
        </button>
      </form>
    </main>
  );
}