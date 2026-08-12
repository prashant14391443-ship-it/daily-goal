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

function calcStreak(dates: Set<string>, today: string) {
  let streak = 0;
  let cursor = dates.has(today) ? today : addDays(today, -1);
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

type Day = { date: string; study: number; gym: number; habits: number; todo: number };

export default function ReportPage() {
  const today = toLocalISO(new Date());
  const weekStart = addDays(today, -6);
  const [days, setDays] = useState<Day[]>([]);
  const [streak, setStreak] = useState(0);
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

      const [s, g, hl, t] = await Promise.all([
        supabase
          .from("study_sessions")
          .select("session_date, duration_minutes")
          .eq("user_id", userId)
          .gte("session_date", weekStart),
        supabase
          .from("gym_logs")
          .select("session_date")
          .eq("user_id", userId)
          .gte("session_date", weekStart),
        supabase
          .from("habit_logs")
          .select("log_date")
          .eq("user_id", userId)
          .eq("completed", true)
          .gte("log_date", weekStart),
        supabase
          .from("tasks")
          .select("task_date")
          .eq("user_id", userId)
          .eq("completed", true)
          .gte("task_date", weekStart),
      ]);

      const built: Day[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = addDays(today, -i);
        built.push({
          date: d,
          study: (s.data || [])
            .filter((r) => r.session_date === d)
            .reduce((a, r) => a + r.duration_minutes, 0),
          gym: (g.data || []).filter((r) => r.session_date === d).length,
          habits: (hl.data || []).filter((r) => r.log_date === d).length,
          todo: (t.data || []).filter((r) => r.task_date === d).length,
        });
      }
      setDays(built);

      const activeDates = new Set<string>();
      (s.data || []).forEach((r) => activeDates.add(r.session_date));
      (g.data || []).forEach((r) => activeDates.add(r.session_date));
      (hl.data || []).forEach((r) => activeDates.add(r.log_date));
      (t.data || []).forEach((r) => activeDates.add(r.task_date));
      setStreak(calcStreak(activeDates, today));
      setLoading(false);
    };
    load();
  }, []);

  const studyMin = days.reduce((a, d) => a + d.study, 0);
  const gymCount = days.reduce((a, d) => a + d.gym, 0);
  const habitsCount = days.reduce((a, d) => a + d.habits, 0);
  const todoCount = days.reduce((a, d) => a + d.todo, 0);
  const bestDay = days.reduce(
    (best, d) =>
      d.study / 60 + d.gym + d.habits + d.todo >
      best.study / 60 + best.gym + best.habits + best.todo
        ? d
        : best,
    days[0] || ({ date: today, study: 0, gym: 0, habits: 0, todo: 0 } as Day)
  );

  const makeImage = async (share: boolean) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, 1080, 1080);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(60, 60, 960, 960);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 64px sans-serif";
    ctx.fillText("DAILY GOAL 🔥", 110, 190);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "32px sans-serif";
    ctx.fillText(`${weekStart} → ${today}`, 110, 250);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 48px sans-serif";
    ctx.fillText(`📚 Study: ${Math.floor(studyMin / 60)}h ${studyMin % 60}m`, 110, 400);
    ctx.fillText(`🏋️ Workouts: ${gymCount}`, 110, 490);
    ctx.fillText(`✅ Habits done: ${habitsCount}`, 110, 580);
    ctx.fillText(`📝 Tasks done: ${todoCount}`, 110, 670);

    ctx.fillStyle = "#fb923c";
    ctx.font = "bold 60px sans-serif";
    ctx.fillText(`🔥 ${streak}-day streak!`, 110, 820);

    ctx.fillStyle = "#64748b";
    ctx.font = "28px sans-serif";
    ctx.fillText("Best day: " + bestDay.date, 110, 950);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "daily-goal.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (d: { files: File[] }) => boolean;
      };
      if (share && nav.share && nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: "DAILY GOAL" });
        } catch {
          // user cancelled
        }
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "daily-goal-stats.png";
        a.click();
      }
    }, "image/png");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-xl">📊</span>
          Weekly Report
        </h1>
        <p className="text-slate-400">{weekStart} → {today}</p>
      </div>

      {loading ? (
        <p className="text-slate-400">Crunching your week...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400">📚 Study</p>
              <p className="text-2xl font-extrabold text-blue-400">
                {Math.floor(studyMin / 60)}h {studyMin % 60}m
              </p>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400">🏋️ Workouts</p>
              <p className="text-2xl font-extrabold text-green-400">{gymCount}</p>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400">✅ Habits</p>
              <p className="text-2xl font-extrabold text-purple-400">{habitsCount}</p>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400">📝 Tasks</p>
              <p className="text-2xl font-extrabold text-amber-400">{todoCount}</p>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-5 mb-6">
            <p className="text-sm text-slate-400 mb-3">🔥 Current streak: <span className="text-white font-bold">{streak} days</span> • ⭐ Best day: <span className="text-white font-bold">{bestDay.date}</span></p>
            <div className="grid gap-2">
              {days.map((d) => (
                <div key={d.date} className="flex justify-between text-sm bg-slate-800 rounded p-2">
                  <span className="text-slate-300">{d.date}</span>
                  <span>
                    📚 {Math.floor(d.study / 60)}h{d.study % 60}m • 🏋️ {d.gym} • ✅ {d.habits} • 📝 {d.todo}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => makeImage(true)}
              className="flex-1 min-w-[140px] py-3 rounded bg-purple-600 hover:bg-purple-500 font-semibold"
            >
              📸 Share to WhatsApp / Instagram
            </button>
            <button
              onClick={() => makeImage(false)}
              className="flex-1 min-w-[140px] py-3 rounded bg-slate-800 hover:bg-slate-700 font-semibold"
            >
              📥 Download Image
            </button>
          </div>
        </>
      )}
    </main>
  );
}