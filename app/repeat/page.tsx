"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Repeat, Clock, X, List, Lightbulb } from "lucide-react";
import { EmptyState } from "@/app/components/ui";

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
      {/* 🌆 CALM HERO */}
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 p-5 shadow-xl shadow-indigo-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center">
            <Repeat size={22} strokeWidth={2.2} className="text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Repeat Tasks</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">
              Build habits by automating daily tasks
            </p>
          </div>
          {templates.length > 0 && (
            <span className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-[10px] font-black text-white border border-white/20">
              {templates.length} active
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-indigo-500/15 flex items-center justify-center">
            <Repeat size={22} className="text-indigo-400 animate-pulse" />
          </div>
          <p className="text-slate-500 text-sm font-bold">Loading your tasks...</p>
        </div>
      ) : (
        <>
          {/* 🔁 SECTION 1: ACTIVE REPEATS */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Repeat size={14} strokeWidth={2.2} />
                </span>
                <p className="font-black text-sm text-white">Active Repeats</p>
              </div>
              <span className="text-[10px] font-black text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
                {templates.length} running
              </span>
            </div>

            <div className="grid gap-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="bg-slate-900 border border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                      <Repeat size={18} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-sm text-white truncate">{t.title}</p>
                      <p className="text-[10px] text-indigo-300 font-bold mt-0.5 flex items-center gap-1">
                        <Clock size={10} />
                        Auto-copies every day
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => stopRepeating(t)}
                    className="press shrink-0 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-[10px] font-black flex items-center gap-1"
                  >
                    <X size={11} /> Stop
                  </button>
                </div>
              ))}
              {templates.length === 0 && (
                <div className="bg-slate-900 border border-dashed border-indigo-500/20 rounded-2xl">
                  <EmptyState
                    emoji="🔁✨"
                    text="No repeating tasks yet — tap 'Repeat Daily' below on any task to automate it!"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 📋 SECTION 2: TODAY'S TASKS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center">
                  <List size={14} strokeWidth={2.2} />
                </span>
                <p className="font-black text-sm text-white">Today&apos;s Tasks</p>
              </div>
              <span className="text-[10px] font-bold text-slate-600">{todayTasks.length} available</span>
            </div>

            <div className="grid gap-2">
              {todayTasks.map((t) => (
                <div
                  key={t.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-indigo-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="shrink-0 w-5 h-5 rounded-md border-2 border-slate-700 bg-slate-800" />
                    <p className="text-sm font-semibold text-slate-200 truncate">{t.title}</p>
                  </div>
                  <button
                    onClick={() => makeRepeating(t)}
                    className="press shrink-0 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-black flex items-center gap-1"
                  >
                    <Repeat size={11} /> Repeat Daily
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
            <div className="mt-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-md bg-indigo-500/15 text-indigo-300 flex items-center justify-center">
                  <Lightbulb size={13} strokeWidth={2.2} />
                </span>
                <p className="text-xs font-black text-indigo-300">Pro tip</p>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug font-semibold">
                Automating 3-5 daily tasks beats relying on willpower. You already have{" "}
                <b className="text-white">{templates.length}</b> — pick {Math.min(5 - templates.length, todayTasks.length)} more from above!
              </p>
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