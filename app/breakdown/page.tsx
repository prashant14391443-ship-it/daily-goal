"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Bot, Target, List, Check, Plus, Trophy, RefreshCw, Zap } from "lucide-react";
import { EmptyState } from "@/app/components/ui";

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
      {/* 🌆 CALM HERO */}
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 p-5 shadow-xl shadow-orange-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className={`w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center ${loading ? "animate-pulse" : ""}`}>
            <Bot size={22} strokeWidth={2.2} className="text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>AI Breakdown</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">
              {loading ? "Thinking..." : "Big scary task → tiny easy steps"}
            </p>
          </div>
        </div>
      </div>

      {/* 📝 INPUT FORM */}
      <form onSubmit={generate} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 grid gap-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Target size={16} strokeWidth={2.2} />
          </span>
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
        <button
          type="submit"
          disabled={loading}
          className="press w-full py-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-sm font-black text-amber-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          <Zap size={15} />
          {loading ? "AI is thinking..." : "Break It Down"}
        </button>
      </form>

      {/* 🤖 LOADING STATE */}
      {loading && (
        <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-8 text-center mb-5">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-amber-500/15 flex items-center justify-center">
            <Bot size={32} className="text-amber-400 animate-bounce" />
          </div>
          <p className="text-lg font-black text-white mb-1">Breaking down your task...</p>
          <p className="text-xs text-amber-300 font-bold">"{task}"</p>
          <div className="mt-4 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-xs mx-auto">
            <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: "70%" }} />
          </div>
        </div>
      )}

      {/* ❌ ERROR */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 mb-4 text-center">
          <p className="text-sm font-bold text-red-300">❌ {error}</p>
        </div>
      )}

      {/* ✅ STEPS PICKER */}
      {hasSteps && !saved && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <List size={14} strokeWidth={2.2} />
                </span>
                <p className="font-black text-sm text-white">Your Steps</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-md border ${
                  allPicked ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-orange-500/10 border-orange-500/20 text-orange-300"
                }`}>
                  {pickedCount}/{steps.length} picked
                </span>
                <button
                  onClick={() => setPicked(picked.map((_, i) => !picked.every(Boolean)))}
                  className="press text-[10px] font-black text-slate-600 hover:text-white"
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
                    className={`press text-left flex items-start gap-3 rounded-xl p-3 border transition-all ${
                      isPicked
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-slate-800/40 border-slate-700/50 opacity-50"
                    }`}
                  >
                    <div
                      className={`shrink-0 w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all ${
                        isPicked
                          ? "bg-emerald-500 border-emerald-500"
                          : "bg-slate-800 border-slate-700"
                      }`}
                    >
                      {isPicked && <Check size={14} strokeWidth={3} className="text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold leading-snug ${isPicked ? "text-white" : "text-slate-400 line-through"}`}>
                        {s}
                      </p>
                    </div>
                    <span className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${
                      isPicked ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-700/50 text-slate-500"
                    }`}>
                      {i + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={addSelected}
            disabled={nonePicked}
            className="press w-full py-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-base font-black text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Plus size={17} />
            Add {pickedCount} {pickedCount === 1 ? "step" : "steps"} to today&apos;s tasks
          </button>
        </>
      )}

      {/* 🎉 SUCCESS STATE */}
      {saved && (
        <div className="relative overflow-hidden rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 p-8 text-center">
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Trophy size={32} className="text-emerald-400 animate-bounce" />
            </div>
            <p className="text-2xl font-black text-white mb-2">Tasks added!</p>
            <p className="text-xs text-emerald-200 font-bold mb-6">
              {pickedCount} {pickedCount === 1 ? "step" : "steps"} are now in your Task Log
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/tasklog"
                className="press py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-sm font-black text-emerald-300 flex items-center justify-center gap-1.5"
              >
                <List size={14} /> Open Task Log
              </Link>
              <button
                onClick={() => {
                  setSteps([]);
                  setPicked([]);
                  setSaved(false);
                  setTask("");
                }}
                className="press py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-black text-slate-300 flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={14} /> Break another
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

      <Link href="/todo" className="inline-block mt-6 text-sm text-slate-500 hover:text-white press font-bold">
        ← Back to ToDo
      </Link>
    </main>
  );
}