"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
    if (!userId) {
      router.push("/login");
      return;
    }
    const [h, l] = await Promise.all([
      supabase.from("habits").select("id, habit_name, routine").eq("user_id", userId),
      supabase
        .from("habit_logs")
        .select("habit_id")
        .eq("user_id", userId)
        .eq("log_date", today)
        .eq("completed", true),
    ]);
    setHabits(h.data || []);
    setDoneToday(new Set((l.data || []).map((x) => x.habit_id)));
  };

  useEffect(() => {
    load();
  }, []);

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
        await supabase.from("habit_logs").insert({
          user_id: userId,
          habit_id: habit.id,
          log_date: today,
          completed: true,
        });
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
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-xl">🌅</span>
          Routines
        </h1>
        <p className="text-slate-400">Chain habits into morning & evening flows</p>
      </div>

      {!runner && (
        <>
          {unassigned.length > 0 && (
            <div className="bg-slate-900 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-400 mb-3">Assign habits to a routine:</p>
              <div className="grid gap-2">
                {unassigned.map((h) => (
                  <div key={h.id} className="flex justify-between items-center gap-2 bg-slate-800 rounded p-2">
                    <span className="text-sm font-semibold">{h.habit_name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => assign(h.id, "morning")}
                        className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-xs font-semibold"
                      >
                        🌅 Morning
                      </button>
                      <button
                        onClick={() => assign(h.id, "evening")}
                        className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
                      >
                        🌙 Evening
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(["morning", "evening"] as const).map((r) => {
            const list = r === "morning" ? morning : evening;
            return (
              <div key={r} className="bg-slate-900 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="font-bold">
                    {r === "morning" ? "🌅 Morning" : "🌙 Evening"} ({list.length})
                  </p>
                  {list.length > 0 && (
                    <button
                      onClick={() => start(r)}
                      className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-sm font-semibold"
                    >
                      ▶ Start
                    </button>
                  )}
                </div>
                <div className="grid gap-2">
                  {list.map((h, i) => (
                    <div key={h.id} className="flex justify-between items-center bg-slate-800 rounded p-2">
                      <span className="text-sm">
                        {i + 1}. {h.habit_name} {doneToday.has(h.id) && "✅"}
                      </span>
                      <button
                        onClick={() => assign(h.id, null)}
                        className="text-xs text-slate-500 hover:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {list.length === 0 && (
                    <p className="text-xs text-slate-500">No habits here yet.</p>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {runner && (
        <div className="max-w-md mx-auto bg-slate-900 rounded-xl p-8 text-center">
          <p className="text-sm text-slate-400 mb-2">
            {runner.name === "morning" ? "🌅 Morning" : "🌙 Evening"} • step {runner.i + 1}/{runner.queue.length}
          </p>
          <p className="text-3xl font-extrabold mb-8">
            {runner.queue[runner.i].habit_name}
          </p>
          <div className="flex gap-3">
            <button
              onClick={markDone}
              className="flex-1 py-3 rounded bg-green-600 hover:bg-green-500 font-semibold"
            >
              ✅ Done
            </button>
            <button
              onClick={() => next()}
              className="flex-1 py-3 rounded bg-slate-800 hover:bg-slate-700 font-semibold"
            >
              ⏭ Skip
            </button>
          </div>
          <div className="h-2 bg-slate-800 rounded-full mt-6 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${Math.round((runner.i / runner.queue.length) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {finished && (
        <div className="max-w-md mx-auto bg-slate-900 rounded-xl p-8 text-center">
          <p className="text-5xl mb-3">🎉</p>
          <p className="text-xl font-bold">
            {finished === "morning" ? "Morning" : "Evening"} routine complete!
          </p>
          <button
            onClick={() => setFinished("")}
            className="mt-6 px-6 py-3 rounded bg-amber-600 hover:bg-amber-500 font-semibold"
          >
            Back
          </button>
        </div>
      )}

      <Link
        href="/routine-habits"
        className="inline-block mt-6 text-sm text-slate-400 hover:text-white"
      >
        ← Back to Habits
      </Link>
    </main>
  );
}