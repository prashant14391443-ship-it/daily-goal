"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Check, X, Trophy, List } from "lucide-react";
import { ProgressRing, EmptyState } from "@/app/components/ui";

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Task = { id: string; title: string; completed: boolean; focus: boolean };

export default function MyDayPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) { router.push("/login"); return; }
    const today = toLocalISO(new Date());
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("id, title, completed, focus")
      .eq("user_id", userId)
      .eq("task_date", today)
      .eq("category", "todo");
    setTasks((tasksData as Task[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleFocus = async (t: Task) => {
    if (!t.focus && tasks.filter((x) => x.focus).length >= 3) {
      alert("Max 3 star tasks! Unstar one first.");
      return;
    }
    await supabase.from("tasks").update({ focus: !t.focus }).eq("id", t.id);
    setTasks(tasks.map((x) => (x.id === t.id ? { ...x, focus: !t.focus } : x)));
  };

  const toggleDone = async (t: Task) => {
    await supabase.from("tasks").update({ completed: !t.completed }).eq("id", t.id);
    setTasks(tasks.map((x) => (x.id === t.id ? { ...x, completed: !t.completed } : x)));
  };

  const stars = tasks.filter((t) => t.focus);
  const rest = tasks.filter((t) => !t.focus);
  const starsDone = stars.filter((t) => t.completed).length;
  const starPct = stars.length > 0 ? Math.round((starsDone / stars.length) * 100) : 0;
  const allDone = stars.length > 0 && stars.every((t) => t.completed);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 CALM HERO */}
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 p-5 shadow-xl shadow-fuchsia-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center">
            <Star size={22} strokeWidth={2.2} className="text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>My Day — Top 3</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">
              Star max 3 tasks → finish them first
            </p>
          </div>
          <ProgressRing pct={starPct} size={56} stroke={6} color="#fbbf24" track="rgba(0,0,0,0.25)" />
        </div>
      </div>

      {/* 🎉 WIN BANNER */}
      {allDone && (
        <div className="relative mb-5 overflow-hidden rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 p-5 text-center">
          <div className="relative">
            <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Trophy size={28} className="text-emerald-400 animate-bounce" />
            </div>
            <p className="text-xl font-black text-white">YOU WON TODAY!</p>
            <p className="text-xs text-emerald-200 font-bold mt-1">All 3 stars done — champion move</p>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm font-bold">Loading today...</p>
      ) : (
        <>
          {/* ⭐ STARRED SECTION */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Star size={14} strokeWidth={2.2} />
              </span>
              <p className="text-xs font-black text-slate-400">YOUR TOP {stars.length}/3</p>
            </div>
            <div className="grid gap-2">
              {stars.map((t, i) => (
                <div
                  key={t.id}
                  className={`bg-slate-900 border rounded-2xl p-4 flex items-center justify-between gap-3 ${
                    t.completed ? "border-emerald-500/20" : "border-amber-500/30"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleDone(t)}
                      className={`press w-7 h-7 rounded-md border-2 flex items-center justify-center shrink-0 ${
                        t.completed ? "bg-emerald-500 border-emerald-500" : "border-amber-500/40"
                      }`}
                    >
                      {t.completed && <Check size={14} strokeWidth={3} className="text-white" />}
                    </button>
                    <div className="min-w-0">
                      <p className={`font-black text-sm truncate flex items-center gap-1.5 ${t.completed ? "line-through text-slate-500" : "text-white"}`}>
                        <Star size={12} fill={t.completed ? "currentColor" : "#fbbf24"} className={t.completed ? "text-slate-600" : "text-amber-400"} />
                        {t.title}
                      </p>
                      <p className="text-[10px] text-amber-400 font-bold mt-0.5">Star {i + 1} of 3</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFocus(t)}
                    className="press shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-black flex items-center gap-1"
                  >
                    <X size={11} /> Unstar
                  </button>
                </div>
              ))}
              {stars.length === 0 && (
                <div className="bg-slate-900 border border-dashed border-amber-500/20 rounded-2xl">
                  <EmptyState emoji="🌟" text="No stars yet — tap the star below on your 3 most important tasks." />
                </div>
              )}
              {stars.length > 0 && stars.length < 3 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] font-black text-amber-300">💡 You can star {3 - stars.length} more — pick wisely!</p>
                </div>
              )}
            </div>
          </div>

          {/* 📋 REST OF TASKS */}
          {rest.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center">
                  <List size={14} strokeWidth={2.2} />
                </span>
                <p className="text-xs font-black text-slate-500">OTHER TASKS ({rest.length})</p>
              </div>
              <div className="grid gap-2">
                {rest.map((t) => (
                  <div
                    key={t.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => toggleDone(t)}
                        className={`press w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 ${
                          t.completed ? "bg-emerald-500 border-emerald-500" : "border-slate-700"
                        }`}
                      >
                        {t.completed && <Check size={12} strokeWidth={3} className="text-white" />}
                      </button>
                      <p className={`text-sm truncate ${t.completed ? "line-through text-slate-500" : "text-white"}`}>
                        {t.title}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleFocus(t)}
                      className="press shrink-0 text-slate-600 hover:text-amber-400 transition-colors"
                      title="Star this task"
                    >
                      <Star size={18} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rest.length === 0 && stars.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl">
              <EmptyState emoji="📭✨" text="No tasks today — add some in Task Log, then come back and star 3!" />
            </div>
          )}
        </>
      )}

      <Link href="/todo" className="inline-block mt-6 text-sm text-slate-500 hover:text-white press font-bold">
        ← Back to ToDo
      </Link>
    </main>
  );
}