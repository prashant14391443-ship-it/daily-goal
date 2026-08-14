"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

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

function longestStreak(dates: Set<string>) {
  const sorted = [...dates].sort();
  let best = 0;
  let run = 0;
  let prev = "";
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

type Badge = { icon: string; name: string; desc: string; unlocked: boolean };

const SECTIONS = [
  {
    title: "📚 Study",
    items: [
      { id: "s1", icon: "📚", name: "Study Starter", desc: "First study session" },
      { id: "s2", icon: "📖", name: "Study Climber", desc: "10 study sessions" },
      { id: "s3", icon: "🎓", name: "Study Master", desc: "50 study sessions" },
    ],
  },
  {
    title: "💪 Gym",
    items: [
      { id: "g1", icon: "💪", name: "Gym Starter", desc: "First workout" },
      { id: "g2", icon: "🏋️", name: "Gym Climber", desc: "10 workouts" },
      { id: "g3", icon: "🦾", name: "Gym Master", desc: "25 workouts" },
    ],
  },
  {
    title: "✅ Habits",
    items: [
      { id: "h1", icon: "✅", name: "Habit Starter", desc: "First habit done" },
      { id: "h2", icon: "🌱", name: "Habit Climber", desc: "25 habits done" },
      { id: "h3", icon: "🌳", name: "Habit Master", desc: "50 habits done" },
    ],
  },
  {
    title: "🎯 Tasks",
    items: [
      { id: "t1", icon: "🎯", name: "Task Starter", desc: "First task done" },
      { id: "t2", icon: "⚡", name: "Task Climber", desc: "10 tasks done" },
      { id: "t3", icon: "👑", name: "Task Master", desc: "20 tasks done" },
    ],
  },
];

export default function BadgesPage() {
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [classic, setClassic] = useState<Badge[]>([]);
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

      const [eb, s, g, hl, t] = await Promise.all([
        supabase.from("earned_badges").select("badge_id").eq("user_id", userId),
        supabase
          .from("study_sessions")
          .select("session_date, duration_minutes")
          .eq("user_id", userId),
        supabase.from("gym_logs").select("session_date").eq("user_id", userId),
        supabase
          .from("habit_logs")
          .select("log_date")
          .eq("user_id", userId)
          .eq("completed", true),
        supabase
          .from("tasks")
          .select("completed")
          .eq("user_id", userId)
          .eq("completed", true),
      ]);

      setEarned(new Set((eb.data || []).map((r) => r.badge_id)));

      const studyDates = new Set((s.data || []).map((r) => r.session_date));
      const studyMin = (s.data || []).reduce((a, r) => a + r.duration_minutes, 0);
      const gymDates = new Set((g.data || []).map((r) => r.session_date));
      const gymCount = (g.data || []).length;

      const perDay = new Map<string, number>();
      (hl.data || []).forEach((r) =>
        perDay.set(r.log_date, (perDay.get(r.log_date) || 0) + 1)
      );
      const habitMachine = [...perDay.values()].some((c) => c >= 3);
      const habitDates = new Set((hl.data || []).map((r) => r.log_date));
      const todoDone = (t.data || []).length;

      const best = Math.max(
        longestStreak(studyDates),
        longestStreak(gymDates),
        longestStreak(habitDates)
      );
      const any = studyDates.size + gymDates.size + habitDates.size > 0;

      setClassic([
        { icon: "🥇", name: "First Step", desc: "Log your first session", unlocked: any },
        { icon: "📚", name: "Bookworm", desc: "Study 10 hours total", unlocked: studyMin >= 600 },
        { icon: "💪", name: "Iron Body", desc: "25 workouts logged", unlocked: gymCount >= 25 },
        { icon: "✅", name: "Habit Machine", desc: "3 habits done in one day", unlocked: habitMachine },
        { icon: "📝", name: "Task Master", desc: "20 tasks completed", unlocked: todoDone >= 20 },
        { icon: "🔥", name: "7-Day Warrior", desc: "Reach a 7-day streak", unlocked: best >= 7 },
        { icon: "🏆", name: "Month Master", desc: "Reach a 30-day streak", unlocked: best >= 30 },
      ]);
      setLoading(false);
    };
    load();
  }, []);

  const unlockedCount = earned.size + classic.filter((b) => b.unlocked).length;
  const total = 12 + classic.length;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-yellow-600/20 border border-yellow-500/40 flex items-center justify-center text-xl">🏆</span>
          Badges
        </h1>
        <p className="text-slate-400">
          {loading ? "Checking your achievements..." : `${unlockedCount} / ${total} unlocked`}
        </p>
      </div>

      {SECTIONS.map((sec) => (
        <div key={sec.title} className="mb-6">
          <h2 className="font-bold text-lg mb-3">{sec.title}</h2>
          <div className="grid grid-cols-3 gap-3">
            {sec.items.map((b) => {
              const un = earned.has(b.id);
              return (
                <div
                  key={b.id}
                  className={`rounded-xl p-4 text-center border ${
                    un
                      ? "bg-slate-900 border-yellow-500/40"
                      : "bg-slate-900/40 border-slate-800 opacity-50"
                  }`}
                >
                  <p className="text-3xl">{un ? b.icon : "🔒"}</p>
                  <p className="font-bold mt-2 text-xs">{b.name}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <h2 className="font-bold text-lg mb-3">🌟 Classic Achievements</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {classic.map((b) => (
          <div
            key={b.name}
            className={`rounded-xl p-5 text-center border ${
              b.unlocked
                ? "bg-slate-900 border-yellow-500/40"
                : "bg-slate-900/40 border-slate-800 opacity-50"
            }`}
          >
            <p className="text-4xl">{b.unlocked ? b.icon : "🔒"}</p>
            <p className="font-bold mt-2 text-sm">{b.name}</p>
            <p className="text-[11px] text-slate-400 mt-1">{b.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}