"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { IconTile, GradButton, EmptyState, Chip } from "@/app/components/ui";

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

  const toggle = (i: number) => {
    setPicked(picked.map((p, j) => (j === i ? !p : p)));
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

  const pickedCount = picked.filter(Boolean).length;
  const hasSteps = steps.length > 0;
  const allPicked = picked.every(Boolean);
  const nonePicked = pickedCount === 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 HERO */}
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 p-5 shadow-2xl shadow-orange-900/30">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className={`w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-lg ${loading ? "animate-pulse" : ""}`}>
            🤖
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight">AI Breakdown</h1>
            <p className="text-[10px] text-white/80 font-semibold">
              {loading ? "Thinking..." : "Big scary task → tiny easy steps"}
            </p>
          </div>
        </div>
      </div>

      {/* 📝 INPUT FORM */}
      <form onSubmit={generate} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 grid gap-3 shadow-lg shadow-black/30">
        <div className="flex items-center gap-2 mb-1">
          <IconTile emoji="🎯" gradient="bg-gradient-to-br from-amber-500 to-orange-600" size="sm" />
          <p className="font-black text-sm text-white">What big task are you avoiding?</p>
        </div>
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="e.g. Prepare for physics exam, Clean the whole house..."
          required
          disabled={loading}
          className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-amber-500 disabled:opacity-50"
        />
        <GradButton
          type="submit"
          gradient="from-amber-500 to-orange-600"
          disabled={loading}
          className="w-full py-3.5 text-sm"
        >
          {loading ? "🤖 AI is thinking..." : "⚡ Break It Down"}
        </GradButton>
      </form>

      {/* 🤖 LOADING STATE */}
      {loading && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-8 text-center shadow-lg shadow-black/30 mb-5">
          <p className="text-6xl mb-3 animate-bounce">🤖</p>
          <p className="text-lg font-black text-white mb-1">Breaking down your task...</p>
          <p className="text-xs text-amber-300 font-semibold">"{task}"</p>
          <div className="mt-4 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-xs mx-auto">
            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full animate-pulse" style={{ width: "70%" }} />
          </div>
        </div>
      )}

      {/* ❌ ERROR */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-3 mb-4 text-center">
          <p className="text-sm font-bold text-red-300">❌ {error}</p>
        </div>
      )}

      {/* ✅ STEPS PICKER */}
      {hasSteps && !saved && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 shadow-lg shadow-black/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <IconTile emoji="📋" gradient="bg-gradient-to-br from-emerald-500 to-green-600" size="sm" />
                <p className="font-black text-sm text-white">Your Steps</p>
              </div>
              <div className="flex gap-2">
                <Chip color={allPicked ? "green" : "orange"}>
                  {pickedCount}/{steps.length} picked
                </Chip>
                <button
                  onClick={() => setPicked(picked.map((_, i) => !picked.every(Boolean)))}
                  className="press text-[10px] font-black text-slate-400 hover:text-white"
                >
                  {allPicked ? "Deselect all" : "Select all"}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              {steps.map((s, i) => {
                const isPicked = picked[i];
                return (
                  <button
                    key={i}
                    onClick={() => toggle(i)}
                    className={`press text-left flex items-start gap-3 rounded-xl p-3 border-2 transition-all ${
                      isPicked
                        ? "bg-emerald-900/15 border-emerald-500/50"
                        : "bg-slate-800/40 border-slate-700/50 opacity-50"
                    }`}
                  >
                    <div
                      className={`shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                        isPicked
                          ? "bg-emerald-500 border-emerald-500"
                          : "bg-slate-800 border-slate-600"
                      }`}
                    >
                      {isPicked && <span className="text-white text-sm font-black">✓</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold leading-snug ${isPicked ? "text-white" : "text-slate-400 line-through"}`}>
                        {s}
                      </p>
                    </div>
                    <span className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${
                      isPicked ? "bg-emerald-500/30 text-emerald-200" : "bg-slate-700/50 text-slate-500"
                    }`}>
                      {i + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <GradButton
            onClick={addSelected}
            gradient="from-emerald-500 to-green-600"
            disabled={nonePicked}
            className="w-full py-4 text-base"
          >
            ➕ Add {pickedCount} {pickedCount === 1 ? "step" : "steps"} to today&apos;s tasks
          </GradButton>
        </>
      )}

      {/* 🎉 SUCCESS STATE */}
      {saved && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600/20 to-green-600/20 border-2 border-emerald-400/50 p-8 text-center shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08),_transparent_70%)]" />
          <div className="relative">
            <p className="text-6xl mb-3 animate-bounce">🎉</p>
            <p className="text-2xl font-black text-white mb-2">Tasks added!</p>
            <p className="text-xs text-emerald-200 font-semibold mb-5">
              {pickedCount} {pickedCount === 1 ? "step" : "steps"} are now in your Task Log
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/tasklog"
                className="press py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-sm font-black text-white"
              >
                📋 Open Task Log
              </Link>
              <button
                onClick={() => {
                  setSteps([]);
                  setPicked([]);
                  setSaved(false);
                  setTask("");
                }}
                className="press py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-black text-slate-300"
              >
                🔄 Break another
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {!hasSteps && !loading && !saved && !error && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl mt-2">
          <EmptyState emoji="🎯✨" text="Type a big scary task above — AI will break it into tiny easy steps!" />
        </div>
      )}

      <Link href="/todo" className="inline-block mt-6 text-sm text-slate-400 hover:text-white press font-semibold">
        ← Back to ToDo
      </Link>
    </main>
  );
}