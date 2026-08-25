"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconTile, GradButton, ProgressRing, EmptyState } from "@/app/components/ui";

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
      {/* 🌆 HERO */}
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 p-4 shadow-2xl shadow-orange-900/30">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-lg">🌅</span>
          <div>
            <h1 className="text-lg font-black text-white leading-tight">Routines</h1>
            <p className="text-[10px] text-white/80 font-semibold">Chain habits into morning & evening flows</p>
          </div>
        </div>
      </div>

      {!runner && (
        <>
          {unassigned.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 shadow-lg shadow-black/30">
              <p className="text-xs font-black text-slate-400 mb-3">📥 ASSIGN HABITS TO A ROUTINE:</p>
              <div className="grid gap-2">
                {unassigned.map((h) => (
                  <div key={h.id} className="flex justify-between items-center gap-2 bg-slate-800/60 rounded-xl p-3">
                    <span className="text-sm font-bold truncate">{h.habit_name}</span>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => assign(h.id, "morning")} className="press px-3 py-1.5 rounded-lg bg-amber-600/20 border border-amber-500/40 text-amber-300 text-[10px] font-black">🌅 Morning</button>
                      <button onClick={() => assign(h.id, "evening")} className="press px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-black">🌙 Evening</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(["morning", "evening"] as const).map((r) => {
            const list = r === "morning" ? morning : evening;
            const isM = r === "morning";
            return (
              <div key={r} className={`bg-slate-900 border rounded-2xl p-4 mb-4 shadow-lg shadow-black/30 ${isM ? "border-amber-500/30" : "border-indigo-500/30"}`}>
                <div className="flex justify-between items-center mb-3">
                  <p className="font-black text-sm flex items-center gap-2">
                    <IconTile emoji={isM ? "🌅" : "🌙"} gradient={isM ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-gradient-to-br from-indigo-500 to-violet-600"} size="sm" />
                    {isM ? "Morning" : "Evening"} ({list.length})
                  </p>
                  {list.length > 0 && (
                    <GradButton onClick={() => start(r)} gradient={isM ? "from-amber-500 to-orange-600" : "from-indigo-500 to-violet-600"} className="px-4 py-2 text-xs">
                      ▶ Start
                    </GradButton>
                  )}
                </div>
                <div className="grid gap-2">
                  {list.map((h, i) => (
                    <div key={h.id} className="flex justify-between items-center bg-slate-800/60 rounded-xl p-3">
                      <span className="text-sm font-semibold">
                        <span className="text-slate-500 font-black mr-1">{i + 1}.</span>
                        {h.habit_name} {doneToday.has(h.id) && "✅"}
                      </span>
                      <button onClick={() => assign(h.id, null)} className="press text-[10px] text-slate-500 hover:text-red-400 font-bold">Remove</button>
                    </div>
                  ))}
                  {list.length === 0 && (
                    <p className="text-[10px] text-slate-500 font-semibold">No habits here yet.</p>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {runner && (
        <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl shadow-black/40">
          <div className="flex justify-center mb-4">
            <ProgressRing pct={Math.round((runner.i / runner.queue.length) * 100)} size={72} stroke={7} color={runner.name === "morning" ? "#f59e0b" : "#818cf8"} />
          </div>
          <p className="text-xs font-black text-slate-400 mb-2">
            {runner.name === "morning" ? "🌅 Morning" : "🌙 Evening"} • step {runner.i + 1}/{runner.queue.length}
          </p>
          <p className="text-3xl font-black mb-8 text-white">{runner.queue[runner.i].habit_name}</p>
          <div className="flex gap-3">
            <GradButton onClick={markDone} gradient="from-green-600 to-emerald-500" className="flex-1 py-3 text-sm">✅ Done</GradButton>
            <button onClick={() => next()} className="press flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-black text-sm text-slate-300">⏭ Skip</button>
          </div>
        </div>
      )}

      {finished && (
        <div className="max-w-md mx-auto bg-gradient-to-br from-amber-600/20 to-orange-600/20 border-2 border-amber-500/50 rounded-3xl p-8 text-center shadow-2xl">
          <p className="text-6xl mb-3 animate-bounce">🎉</p>
          <p className="text-xl font-black text-white">
            {finished === "morning" ? "Morning" : "Evening"} routine complete!
          </p>
          <GradButton onClick={() => setFinished("")} gradient="from-amber-500 to-orange-600" className="mt-6 px-6 py-3 text-sm">
            ← Back
          </GradButton>
        </div>
      )}

      <Link href="/routine-habits" className="inline-block mt-6 text-sm text-slate-400 hover:text-white press">
        ← Back to Habits
      </Link>
    </main>
  );
}