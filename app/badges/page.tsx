"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Trophy, BookOpen, Dumbbell, ListChecks, Target, Award, Lock } from "lucide-react";

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
    title: "Study",
    icon: BookOpen,
    color: "text-blue-400",
    tint: "bg-blue-500/10 border-blue-500/20",
    items: [
      { id: "s1", icon: "📚", name: "Study Starter", desc: "First study session" },
      { id: "s2", icon: "📖", name: "Study Climber", desc: "10 study sessions" },
      { id: "s3", icon: "🎓", name: "Study Master", desc: "50 study sessions" },
    ],
  },
  {
    title: "Gym",
    icon: Dumbbell,
    color: "text-orange-400",
    tint: "bg-orange-500/10 border-orange-500/20",
    items: [
      { id: "g1", icon: "💪", name: "Gym Starter", desc: "First workout" },
      { id: "g2", icon: "🏋️", name: "Gym Climber", desc: "10 workouts" },
      { id: "g3", icon: "🦾", name: "Gym Master", desc: "25 workouts" },
    ],
  },
  {
    title: "Habits",
    icon: ListChecks,
    color: "text-green-400",
    tint: "bg-green-500/10 border-green-500/20",
    items: [
      { id: "h1", icon: "✅", name: "Habit Starter", desc: "First habit done" },
      { id: "h2", icon: "🌱", name: "Habit Climber", desc: "25 habits done" },
      { id: "h3", icon: "🌳", name: "Habit Master", desc: "50 habits done" },
    ],
  },
  {
    title: "Tasks",
    icon: Target,
    color: "text-pink-400",
    tint: "bg-pink-500/10 border-pink-500/20",
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
  const progress = total ? Math.round((unlockedCount / total) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-24 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Trophy size={22} className="text-amber-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Badges</h1>
          <p className="text-xs text-slate-400 font-medium">
            {loading ? "Checking your achievements..." : `${unlockedCount} / ${total} unlocked`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {!loading && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 mb-6">
          <div className="flex justify-between text-xs mb-2">
            <span className="font-semibold text-slate-400">Collection progress</span>
            <span className="font-semibold text-amber-400">{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {SECTIONS.map((sec) => {
        const SecIcon = sec.icon;
        return (
          <div key={sec.title} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-lg ${sec.tint} flex items-center justify-center`}>
                <SecIcon size={16} className={sec.color} />
              </div>
              <h2 className="font-semibold text-base text-white">{sec.title}</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {sec.items.map((b) => {
                const un = earned.has(b.id);
                return (
                  <div
                    key={b.id}
                    className={`rounded-2xl p-4 text-center border transition-colors ${
                      un
                        ? "bg-slate-900 border-amber-500/30"
                        : "bg-slate-900/40 border-slate-800 opacity-50"
                    }`}
                  >
                    <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-2xl ${
                      un ? "bg-amber-500/10 border border-amber-500/20" : "bg-slate-800 border border-slate-700"
                    }`}>
                      {un ? b.icon : <Lock size={18} className="text-slate-500" />}
                    </div>
                    <p className="font-semibold mt-2 text-xs text-white">{b.name}</p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">{b.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Classic */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Award size={16} className="text-amber-400" />
        </div>
        <h2 className="font-semibold text-base text-white">Classic Achievements</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {classic.map((b) => (
          <div
            key={b.name}
            className={`rounded-2xl p-5 text-center border transition-colors ${
              b.unlocked
                ? "bg-slate-900 border-amber-500/30"
                : "bg-slate-900/40 border-slate-800 opacity-50"
            }`}
          >
            <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center text-3xl ${
              b.unlocked ? "bg-amber-500/10 border border-amber-500/20" : "bg-slate-800 border border-slate-700"
            }`}>
              {b.unlocked ? b.icon : <Lock size={20} className="text-slate-500" />}
            </div>
            <p className="font-semibold mt-3 text-sm text-white">{b.name}</p>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">{b.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}