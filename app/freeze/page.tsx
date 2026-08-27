"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Snowflake, Flame, AlertTriangle, Info, Shield, TrendingUp } from "lucide-react";
import { EmptyState } from "@/app/components/ui";

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

// 🎨 iOS-style toggle switch (calmed — no shadow)
function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`press relative shrink-0 w-14 h-8 rounded-full transition-all ${
        on ? "bg-cyan-500" : "bg-slate-700"
      } disabled:opacity-50`}
    >
      <span
        className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${
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
      {/* 🌆 CALM ICE HERO */}
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 via-teal-600 to-blue-600 p-5 shadow-xl shadow-teal-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center">
            <Snowflake size={22} strokeWidth={2.2} className="text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Streak Freeze</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">
              One missed day won&apos;t break your streak
            </p>
          </div>
          {activeCount > 0 && (
            <div className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-[10px] font-black text-white border border-white/20 flex items-center gap-1">
              <Snowflake size={10} />
              {activeCount} active
            </div>
          )}
        </div>
      </div>

      {/* 💡 INFO CARD */}
      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-300 flex items-center justify-center">
            <Info size={14} strokeWidth={2.2} />
          </span>
          <p className="text-xs font-black text-cyan-300">How freeze works</p>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed font-semibold">
          With freeze ON, you get <b className="text-white">one free missed day</b> before your streak breaks.
          Perfect for busy days, travel, or rest days!
        </p>
      </div>

      {/* 🧊 HABIT LIST */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-cyan-500/15 flex items-center justify-center">
            <Snowflake size={22} className="text-cyan-400 animate-pulse" />
          </div>
          <p className="text-slate-500 text-sm font-bold">Loading your habits...</p>
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
                className={`bg-slate-900 border-2 rounded-2xl p-4 transition-all ${
                  active
                    ? "border-cyan-500/30"
                    : "border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${
                      active ? "bg-cyan-500/15 text-cyan-300" : "bg-orange-500/15 text-orange-400"
                    }`}>
                      {active ? <Snowflake size={18} strokeWidth={2.2} /> : <Flame size={18} strokeWidth={2.2} />}
                    </span>
                    <p className="font-black text-sm text-white truncate">{h.habit_name}</p>
                  </div>
                  <Toggle on={active} onToggle={() => toggle(h.id, h.freeze)} />
                </div>

                {/* STREAK STATS */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className={`rounded-xl p-3 ${active ? "bg-orange-500/10 border border-orange-500/20" : "bg-slate-800/60"}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp size={10} className={active ? "text-orange-400" : "text-slate-500"} />
                      <p className="text-[9px] font-black text-slate-500">RAW STREAK</p>
                    </div>
                    <p className={`text-2xl font-black leading-none ${raw > 0 ? "text-orange-400" : "text-slate-600"}`}>
                      {raw}
                    </p>
                  </div>
                  <div className={`rounded-xl p-3 ${active ? "bg-cyan-500/10 border border-cyan-500/20" : "bg-slate-800/60 opacity-50"}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Shield size={10} className={active ? "text-cyan-400" : "text-slate-500"} />
                      <p className="text-[9px] font-black text-slate-500">PROTECTED</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className={`text-2xl font-black leading-none ${active ? "text-cyan-400" : "text-slate-600"}`}>
                        {active ? prot.streak : "—"}
                      </p>
                      {active && prot.frozen && (
                        <span className="text-[10px] font-black text-cyan-300 flex items-center gap-0.5">
                          <Snowflake size={10} /> used
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {active && prot.frozen && (
                  <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-black text-amber-300 leading-relaxed">
                      Your freeze saved your streak! Do the habit tomorrow to stay alive!
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Link href="/routine-habits" className="inline-block mt-6 text-sm text-slate-500 hover:text-white press font-bold">
        ← Back to Habits
      </Link>
    </main>
  );
}