"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function BreakdownPage() {
  const [task, setTask] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const [picked, setPicked] = useState<boolean[]>([]);
  const [saved, setSaved] = useState(false);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSteps([]);
    setSaved(false);
    try {
      const res = await fetch("/api/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      setSteps(data.steps || []);
      setPicked(new Array((data.steps || []).length).fill(true));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed. Try again.");
    }
    setLoading(false);
  };

  const addSelected = async () => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    const today = toLocalISO(new Date());
    const chosen = steps.filter((_, i) => picked[i]);
    for (const s of chosen) {
      await supabase.from("tasks").insert({
        user_id: userId,
        title: s,
        category: "todo",
        task_date: today,
        completed: false,
      });
    }
    setSaved(true);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-xl">🤖</span>
          AI Breakdown
        </h1>
        <p className="text-slate-400">Big scary task → tiny easy steps</p>
      </div>

      <form onSubmit={generate} className="bg-slate-900 p-6 rounded-lg mb-8 grid gap-4">
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Big task (e.g. Prepare for physics exam)"
          required
          className="p-3 rounded bg-slate-800 border border-slate-700"
        />
        <button
          disabled={loading}
          className="py-3 rounded bg-amber-600 hover:bg-amber-500 font-semibold disabled:opacity-50"
        >
          {loading ? "🤖 AI is thinking..." : "⚡ Break It Down"}
        </button>
      </form>

      {error && <p className="text-red-400 mb-4">❌ {error}</p>}

      {steps.length > 0 && !saved && (
        <div className="grid gap-2 mb-6">
          {steps.map((s, i) => (
            <label
              key={i}
              className="bg-slate-900 rounded p-3 flex items-center gap-3 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={picked[i]}
                onChange={() =>
                  setPicked(picked.map((p, j) => (j === i ? !p : p)))
                }
                className="w-4 h-4"
              />
              <span className="text-sm">
                {i + 1}. {s}
              </span>
            </label>
          ))}
          <button
            onClick={addSelected}
            className="py-3 rounded bg-green-600 hover:bg-green-500 font-semibold"
          >
            ➕ Add selected to today's tasks
          </button>
        </div>
      )}

      {saved && (
        <div className="bg-green-600/20 border border-green-500/40 rounded-xl p-6 text-center">
          <p className="text-4xl mb-2">✅</p>
          <p className="font-bold">Steps added to today's Task Log!</p>
          <Link href="/tasklog" className="text-sm text-green-400 underline">
            Open Task Log →
          </Link>
        </div>
      )}

      <Link
        href="/todo"
        className="inline-block mt-6 text-sm text-slate-400 hover:text-white"
      >
        ← Back to ToDo
      </Link>
    </main>
  );
}