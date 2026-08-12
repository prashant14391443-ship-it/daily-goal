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

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toLocalISO(d);
}

function rawStreak(dates: Set<string>, today: string) {
  let streak = 0;
  let cursor = dates.has(today) ? today : addDays(today, -1);
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function protectedStreak(dates: Set<string>, today: string, freeze: boolean) {
  let streak = 0;
  let used = false;
  let frozen = false;
  let cursor = dates.has(today) ? today : addDays(today, -1);
  for (;;) {
    if (dates.has(cursor)) {
      streak += 1;
      cursor = addDays(cursor, -1);
    } else if (freeze && !used) {
      used = true;
      frozen = true;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }
  return { streak, frozen };
}

type Habit = { id: string; habit_name: string; freeze: boolean };

export default function FreezePage() {
  const today = toLocalISO(new Date());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<{ habit_id: string; log_date: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) {
        router.push("/login");
        return;
      }
      const [h, l] = await Promise.all([
        supabase.from("habits").select("id, habit_name, freeze").eq("user_id", userId),
        supabase
          .from("habit_logs")
          .select("habit_id, log_date")
          .eq("user_id", userId)
          .eq("completed", true),
      ]);
      setHabits(h.data || []);
      setLogs(l.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const toggle = async (id: string, current: boolean) => {
    await supabase.from("habits").update({ freeze: !current }).eq("id", id);
    setHabits(habits.map((h) => (h.id === id ? { ...h, freeze: !current } : h)));
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-xl">🧊</span>
          Streak Freeze
        </h1>
        <p className="text-slate-400">
          With freeze ON, one missed day will NOT break your streak
        </p>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : (
        <div className="grid gap-4">
          {habits.map((h) => {
            const dates = new Set(
              logs.filter((l) => l.habit_id === h.id).map((l) => l.log_date)
            );
            const raw = rawStreak(dates, today);
            const prot = protectedStreak(dates, today, h.freeze);
            return (
              <div
                key={h.id}
                className="bg-slate-900 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap"
              >
                <div>
                  <p className="font-semibold">
                    {h.freeze ? "🧊" : "🔥"} {h.habit_name}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Raw streak: <span className="text-white font-bold">{raw}</span>
                    {h.freeze && (
                      <>
                        {" "}• Protected:{" "}
                        <span className="text-cyan-400 font-bold">
                          {prot.streak} {prot.frozen ? "❄️" : ""}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => toggle(h.id, h.freeze)}
                  className={`px-4 py-2 rounded font-semibold text-sm ${
                    h.freeze
                      ? "bg-cyan-600 hover:bg-cyan-500"
                      : "bg-slate-800 hover:bg-slate-700"
                  }`}
                >
                  {h.freeze ? "🧊 Freeze ON" : "Enable Freeze"}
                </button>
              </div>
            );
          })}
          {habits.length === 0 && (
            <p className="text-slate-400">No habits yet — create some in Habit Log!</p>
          )}
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