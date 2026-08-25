"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconTile, GradButton, EmptyState, Chip } from "@/app/components/ui";

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Task = { id: string; title: string; repeat: string | null; completed: boolean };

export default function RepeatTasksPage() {
  const [templates, setTemplates] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) { router.push("/login"); return; }
    const today = toLocalISO(new Date());
    const { data: repeatingData } = await supabase
      .from("tasks").select("id, title, repeat, completed")
      .eq("user_id", userId).not("repeat", "is", null);
    const { data: regularData } = await supabase
      .from("tasks").select("id, title, repeat, completed")
      .eq("user_id", userId).eq("task_date", today)
      .is("repeat", null).is("parent_id", null).eq("category", "todo");
    setTemplates((repeatingData as Task[]) || []);
    setTodayTasks((regularData as Task[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const makeRepeating = async (t: Task) => {
    await supabase.from("tasks").update({ repeat: "daily" }).eq("id", t.id);
    await load();
  };
  const stopRepeating = async (t: Task) => {
    await supabase.from("tasks").update({ repeat: null }).eq("id", t.id);
    await load();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 HERO */}
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 p-5 shadow-2xl shadow-indigo-900/30">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-cyan-400/20 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="relative shrink-0">
            <span className="absolute inset-0 animate-ping rounded-xl bg-white/20" />
            <span className="relative w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-lg">🔁</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight">Repeat Tasks</h1>
            <p className="text-[10px] text-white/80 font-semibold">
              Build habits by automating daily tasks
            </p>
          </div>
          {templates.length > 0 && (
            <Chip color="violet">{templates.length} active</Chip>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-2 animate-bounce">🔁</p>
          <p className="text-slate-400 text-sm">Loading your tasks...</p>
        </div>
      ) : (
        <>
          {/* 🔁 SECTION 1: ACTIVE REPEATS */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <IconTile emoji="🔁" gradient="bg-gradient-to-br from-indigo-500 to-blue-600" size="sm" />
                <p className="font-black text-sm text-white">Active Repeats</p>
              </div>
              <Chip color="violet">{templates.length} running</Chip>
            </div>

            <div className="grid gap-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="press bg-slate-900 border-2 border-indigo-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-lg shadow-black/30"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-lg shadow-lg">
                      🔁
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-sm text-white truncate">{t.title}</p>
                      <p className="text-[10px] text-indigo-300 font-bold mt-0.5">
                        ⏰ Auto-copies every day
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => stopRepeating(t)}
                    className="press shrink-0 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-black hover:bg-red-500/30 transition-colors"
                  >
                    ✕ Stop
                  </button>
                </div>
              ))}
              {templates.length === 0 && (
                <div className="bg-slate-900 border border-dashed border-indigo-500/30 rounded-2xl">
                  <EmptyState
                    emoji="🔁✨"
                    text="No repeating tasks yet — tap 'Repeat Daily' below on any task to automate it!"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 📋 SECTION 2: TODAY'S TASKS (promote to repeating) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <IconTile emoji="📋" gradient="bg-gradient-to-br from-slate-500 to-slate-700" size="sm" />
                <p className="font-black text-sm text-white">Today&apos;s Tasks</p>
              </div>
              <span className="text-[10px] font-bold text-slate-500">{todayTasks.length} available</span>
            </div>

            <div className="grid gap-2">
              {todayTasks.map((t) => (
                <div
                  key={t.id}
                  className="press bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 shadow-md hover:border-indigo-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="shrink-0 w-5 h-5 rounded-md border-2 border-slate-600 bg-slate-800" />
                    <p className="text-sm font-semibold text-slate-200 truncate">{t.title}</p>
                  </div>
                  <button
                    onClick={() => makeRepeating(t)}
                    className="press shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-black hover:bg-indigo-600/40 transition-colors"
                  >
                    🔁 Repeat Daily
                  </button>
                </div>
              ))}
              {todayTasks.length === 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl">
                  <EmptyState
                    emoji="📝"
                    text="No regular tasks today — add some in Task Log, then come back to automate them!"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 💡 PRO TIP */}
          {templates.length > 0 && templates.length < 5 && todayTasks.length > 0 && (
            <div className="mt-5 bg-gradient-to-r from-indigo-600/10 to-blue-600/10 border border-indigo-500/20 rounded-2xl p-4">
              <p className="text-xs font-black text-indigo-300 mb-1">💡 Pro tip</p>
              <p className="text-[11px] text-slate-300 leading-snug">
                Automating 3-5 daily tasks beats relying on willpower. You already have{" "}
                <b className="text-white">{templates.length}</b> — pick {Math.min(5 - templates.length, todayTasks.length)} more from above!
              </p>
            </div>
          )}
        </>
      )}

      <Link href="/todo" className="inline-block mt-6 text-sm text-slate-400 hover:text-white press font-semibold">
        ← Back to ToDo
      </Link>
    </main>
  );
}