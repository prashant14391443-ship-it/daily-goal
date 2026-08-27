"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sunrise, Moon, Inbox, Play, Check, SkipForward, Trophy, ArrowLeft } from "lucide-react";
import { ProgressRing, EmptyState } from "@/app/components/ui";

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Habit = { id: string; habit_name: string; routine: string | null };

export default function RoutinesPage() {
  const today = toLocalISO(new Date());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [doneToday, setDoneToday] = useState<Set<string>>(new Set());
  const [runner, setRunner] = useState<null | { name: string; queue: Habit[]; i: number; done: number }>(null);
  const [finished, setFinished] = useState("");
  const router = useRouter();

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) { router.push("/login"); return; }
    const [h, l] = await Promise.all([
      supabase.from("habits").select("id, habit_name, routine").eq("user_id", userId),
      supabase.from("habit_logs").select("habit_id").eq("user_id", userId).eq("log_date", today).eq("completed", true),
    ]);
    setHabits(h.data || []);
    setDoneToday(new Set((l.data || []).map((x) => x.habit_id)));
  };

  useEffect(() => { load(); }, []);

  const assign = async (id: string, value: string | null) => {
    await supabase.from("habits").update({ routine: value }).eq("id", id);
    setHabits(habits.map((h) => (h.id === id ? { ...h, routine: value } : h)));
  };

  const start = (name: "morning" | "evening") => {
    const queue = habits.filter((h) => h.routine === name);
    if (queue.length === 0) return;
    setFinished("");
    setRunner({ name, queue, i: 0, done: 0 });
  };

  const markDone = async () => {
    if (!runner) return;
    const habit = runner.queue[runner.i];
    if (!doneToday.has(habit.id)) {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (userId) {
        await supabase.from("habit_logs").insert({ user_id: userId, habit_id: habit.id, log_date: today, completed: true });
      }
      setDoneToday((s) => new Set(s).add(habit.id));
    }
    next(runner.done + 1);
  };

  const next = (doneCount?: number) => {
    if (!runner) return;
    const ni = runner.i + 1;
    if (ni >= runner.queue.length) {
      setFinished(runner.name);
      setRunner(null);
    } else {
      setRunner({ ...runner, i: ni, done: doneCount ?? runner.done });
    }
  };

  const morning = habits.filter((h) => h.routine === "morning");
  const evening = habits.filter((h) => h.routine === "evening");
  const unassigned = habits.filter((h) => !h.routine);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 CALM HERO */}
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 p-5 shadow-xl shadow-orange-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center">
            <Sunrise size={22} strokeWidth={2.2} className="text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Routines</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">Chain habits into morning & evening flows</p>
          </div>
        </div>
      </div>

      {!runner && (
        <>
          {unassigned.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center">
                  <Inbox size={14} strokeWidth={2.2} />
                </span>
                <p className="text-[10px] font-black text-slate-500">ASSIGN HABITS TO A ROUTINE</p>
              </div>
              <div className="grid gap-2">
                {unassigned.map((h) => (
                  <div key={h.id} className="flex justify-between items-center gap-2 bg-slate-800/60 rounded-xl p-3">
                    <span className="text-sm font-bold truncate flex-1">{h.habit_name}</span>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => assign(h.id, "morning")} className="press px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-black flex items-center gap-1">
                        <Sunrise size={11} /> Morning
                      </button>
                      <button onClick={() => assign(h.id, "evening")} className="press px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-black flex items-center gap-1">
                        <Moon size={11} /> Evening
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(["morning", "evening"] as const).map((r) => {
            const list = r === "morning" ? morning : evening;
            const isM = r === "morning";
            const Icon = isM ? Sunrise : Moon;
            return (
              <div key={r} className={`bg-slate-900 border rounded-2xl p-4 mb-4 ${isM ? "border-amber-500/20" : "border-indigo-500/20"}`}>
                <div className="flex justify-between items-center mb-3">
                  <p className="font-black text-sm flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${isM ? "bg-amber-500/10 text-amber-400" : "bg-indigo-500/10 text-indigo-400"}`}>
                      <Icon size={14} strokeWidth={2.2} />
                    </span>
                    {isM ? "Morning" : "Evening"} ({list.length})
                  </p>
                  {list.length > 0 && (
                    <button
                      onClick={() => start(r)}
                      className={`press px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border ${
                        isM ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                      }`}
                    >
                      <Play size={12} fill="currentColor" /> Start
                    </button>
                  )}
                </div>
                <div className="grid gap-2">
                  {list.map((h, i) => (
                    <div key={h.id} className="flex justify-between items-center bg-slate-800/60 rounded-xl p-3">
                      <span className="text-sm font-semibold flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-slate-600 font-black text-xs">{i + 1}.</span>
                        <span className="truncate">{h.habit_name}</span>
                        {doneToday.has(h.id) && <Check size={14} className="text-green-400 shrink-0" />}
                      </span>
                      <button onClick={() => assign(h.id, null)} className="press text-[10px] text-slate-600 hover:text-red-400 font-black shrink-0 ml-2">
                        Remove
                      </button>
                    </div>
                  ))}
                  {list.length === 0 && (
                    <p className="text-[10px] text-slate-600 font-bold py-2">No habits here yet.</p>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {runner && (
        <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <ProgressRing pct={Math.round((runner.i / runner.queue.length) * 100)} size={72} stroke={7} color={runner.name === "morning" ? "#f59e0b" : "#818cf8"} />
          </div>
          <p className="text-[10px] font-black text-slate-500 mb-2">
            {runner.name === "morning" ? "MORNING" : "EVENING"} • step {runner.i + 1}/{runner.queue.length}
          </p>
          <p className="text-3xl font-black mb-8 text-white">{runner.queue[runner.i].habit_name}</p>
          <div className="flex gap-3">
            <button
              onClick={markDone}
              className="press flex-1 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-sm font-black text-emerald-300 flex items-center justify-center gap-1.5"
            >
              <Check size={15} /> Done
            </button>
            <button
              onClick={() => next()}
              className="press flex-1 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-black text-slate-300 flex items-center justify-center gap-1.5"
            >
              <SkipForward size={15} /> Skip
            </button>
          </div>
        </div>
      )}

      {finished && (
        <div className="max-w-md mx-auto bg-emerald-500/10 border-2 border-emerald-500/30 rounded-3xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Trophy size={32} className="text-emerald-400 animate-bounce" />
          </div>
          <p className="text-xl font-black text-white">
            {finished === "morning" ? "Morning" : "Evening"} routine complete!
          </p>
          <button
            onClick={() => setFinished("")}
            className="press mt-6 px-6 py-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-sm font-black text-amber-300 flex items-center justify-center gap-1.5 mx-auto"
          >
            <ArrowLeft size={15} /> Back
          </button>
        </div>
      )}

      <Link href="/routine-habits" className="inline-block mt-6 text-sm text-slate-500 hover:text-white press font-bold">
        ← Back to Habits
      </Link>
    </main>
  );
}