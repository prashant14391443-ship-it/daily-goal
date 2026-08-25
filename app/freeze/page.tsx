"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconTile, Chip, EmptyState } from "@/app/components/ui";

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
  while (dates.has(cursor)) { streak += 1; cursor = addDays(cursor, -1); }
  return streak;
}
function protectedStreak(dates: Set<string>, today: string, freeze: boolean) {
  let streak = 0;
  let used = false;
  let frozen = false;
  let cursor = dates.has(today) ? today : addDays(today, -1);
  for (;;) {
    if (dates.has(cursor)) { streak += 1; cursor = addDays(cursor, -1); }
    else if (freeze && !used) { used = true; frozen = true; cursor = addDays(cursor, -1); }
    else break;
  }
  return { streak, frozen };
}

type Habit = { id: string; habit_name: string; freeze: boolean };

// 🎨 iOS-style toggle switch
function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`press relative shrink-0 w-14 h-8 rounded-full transition-all ${
        on
          ? "bg-gradient-to-r from-cyan-500 to-teal-600 shadow-lg shadow-cyan-900/40"
          : "bg-slate-700"
      } disabled:opacity-50`}
    >
      <span
        className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all ${
          on ? "left-7" : "left-1"
        }`}
      />
    </button>
  );
}

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
      if (!userId) { router.push("/login"); return; }
      const [h, l] = await Promise.all([
        supabase.from("habits").select("id, habit_name, freeze").eq("user_id", userId),
        supabase.from("habit_logs").select("habit_id, log_date").eq("user_id", userId).eq("completed", true),
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

  const activeCount = habits.filter((h) => h.freeze).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 ICE HERO */}
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-600 to-blue-600 p-5 shadow-2xl shadow-teal-900/30">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/15 rounded-full blur-3xl" />
        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-cyan-300/20 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="relative shrink-0">
            <span className="absolute inset-0 animate-pulse rounded-xl bg-cyan-200/30 blur-md" />
            <span className="relative w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-lg">🧊</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight">Streak Freeze</h1>
            <p className="text-[10px] text-white/80 font-semibold">
              One missed day won&apos;t break your streak ❄️
            </p>
          </div>
          {activeCount > 0 && (
            <div className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-xs font-black text-white border border-white/20">
              🧊 {activeCount} active
            </div>
          )}
        </div>
      </div>

      {/* 💡 INFO CARD */}
      <div className="bg-gradient-to-r from-cyan-600/10 to-teal-600/10 border border-cyan-500/30 rounded-2xl p-4 mb-5">
        <p className="text-xs font-black text-cyan-300 mb-1">❄️ How freeze works</p>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          With freeze ON, you get <b className="text-white">one free missed day</b> before your streak breaks.
          Perfect for busy days, travel, or rest days!
        </p>
      </div>

      {/* 🧊 HABIT LIST */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-2 animate-bounce">🧊</p>
          <p className="text-slate-400 text-sm">Loading your habits...</p>
        </div>
      ) : habits.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl">
          <EmptyState emoji="🌱" text="No habits yet — create some in Habit Log first!" />
        </div>
      ) : (
        <div className="grid gap-3">
          {habits.map((h) => {
            const dates = new Set(logs.filter((l) => l.habit_id === h.id).map((l) => l.log_date));
            const raw = rawStreak(dates, today);
            const prot = protectedStreak(dates, today, h.freeze);
            const active = h.freeze;
            return (
              <div
                key={h.id}
                className={`press bg-slate-900 border-2 rounded-2xl p-4 shadow-lg shadow-black/30 transition-all ${
                  active
                    ? "border-cyan-500/50 hover:shadow-cyan-900/20"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <IconTile
                      emoji={active ? "🧊" : "🔥"}
                      gradient={active ? "bg-gradient-to-br from-cyan-500 to-teal-600" : "bg-gradient-to-br from-orange-500 to-red-600"}
                    />
                    <p className="font-black text-sm text-white truncate">{h.habit_name}</p>
                  </div>
                  <Toggle on={active} onToggle={() => toggle(h.id, h.freeze)} />
                </div>

                {/* STREAK STATS */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className={`rounded-xl p-2.5 ${active ? "bg-orange-500/10 border border-orange-500/30" : "bg-slate-800/60"}`}>
                    <p className="text-[9px] font-black text-slate-400">RAW STREAK</p>
                    <p className={`text-xl font-black leading-none mt-1 ${raw > 0 ? "text-orange-400" : "text-slate-600"}`}>
                      {raw}
                    </p>
                  </div>
                  <div className={`rounded-xl p-2.5 ${active ? "bg-cyan-500/10 border border-cyan-500/30" : "bg-slate-800/60 opacity-50"}`}>
                    <p className="text-[9px] font-black text-slate-400">PROTECTED</p>
                    <div className="flex items-center gap-1 mt-1">
                      <p className={`text-xl font-black leading-none ${active ? "text-cyan-400" : "text-slate-600"}`}>
                        {active ? prot.streak : "—"}
                      </p>
                      {active && prot.frozen && (
                        <span className="text-[10px] font-black text-cyan-300">❄️ used!</span>
                      )}
                    </div>
                  </div>
                </div>

                {active && prot.frozen && (
                  <div className="mt-3 bg-amber-500/10 border border-amber-500/40 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] font-black text-amber-300">
                      ⚠️ Your freeze saved your streak! Do the habit tomorrow to stay alive!
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Link href="/routine-habits" className="inline-block mt-6 text-sm text-slate-400 hover:text-white press font-semibold">
        ← Back to Habits
      </Link>
    </main>
  );
}