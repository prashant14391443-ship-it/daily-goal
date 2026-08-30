"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconTile, GradButton, Chip } from "@/app/components/ui";
import { ChevronDown, ChevronRight, Lightbulb } from "lucide-react";

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
  while (dates.has(cursor)) { streak += 1; cursor = addDays(cursor, -1); }
  return streak;
}

type Day = {
  date: string;
  study: number;
  studyRows: { subject: string; minutes: number }[];
  gym: number;
  gymRows: { workout: string; minutes: number }[];
  runRows: { workout: string; minutes: number; dist: number }[];
  runDist: number;
  calTotal: number;
  habits: number;
  habitNames: string[];
  todo: number;
  todoTitles: string[];
};

export default function ReportPage() {
  const today = toLocalISO(new Date());
  const weekStart = addDays(today, -6);
  const [days, setDays] = useState<Day[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [calTarget, setCalTarget] = useState(0);
  const router = useRouter();

  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem("dg-calc") || "null");
      if (c?.result) setCalTarget(c.result.calories);
    } catch {}
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) { router.push("/login"); return; }
      const [s, g, hl, t, habits, nutrition] = await Promise.all([
        supabase.from("study_sessions").select("session_date, subject, duration_minutes").eq("user_id", userId).gte("session_date", weekStart),
        supabase.from("gym_logs").select("session_date, workout_type, duration_minutes, activity_type, distance_km").eq("user_id", userId).eq("completed", true).gte("session_date", weekStart),
        supabase.from("habit_logs").select("log_date, habit_id").eq("user_id", userId).eq("completed", true).gte("log_date", weekStart),
        supabase.from("tasks").select("task_date, title").eq("user_id", userId).eq("completed", true).gte("task_date", weekStart),
        supabase.from("habits").select("id, habit_name").eq("user_id", userId),
        supabase.from("nutrition_logs").select("log_date, calories").eq("user_id", userId).gte("log_date", weekStart),
      ]);
      const habitMap: Record<string, string> = {};
      (habits.data || []).forEach((h: any) => { habitMap[h.id] = h.habit_name; });

      const built: Day[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = addDays(today, -i);
        const dayStudy = (s.data || []).filter((r: any) => r.session_date === d);
        const dayGymAll = (g.data || []).filter((r: any) => r.session_date === d);
        const dayRun = dayGymAll.filter((r: any) => r.activity_type);
        const dayWorkout = dayGymAll.filter((r: any) => !r.activity_type);
        const dayHabits = (hl.data || []).filter((r: any) => r.log_date === d);
        const dayTodo = (t.data || []).filter((r: any) => r.task_date === d);
        const dayCal = (nutrition.data || []).filter((r: any) => r.log_date === d).reduce((a, r: any) => a + (r.calories || 0), 0);
        built.push({
          date: d,
          study: dayStudy.reduce((a: number, r: any) => a + (r.duration_minutes || 0), 0),
          studyRows: dayStudy.map((r: any) => ({ subject: r.subject || "study", minutes: r.duration_minutes || 0 })),
          gym: dayWorkout.length,
          gymRows: dayWorkout.map((r: any) => ({ workout: r.workout_type || "Workout", minutes: r.duration_minutes || 0 })),
          runRows: dayRun.map((r: any) => ({ workout: r.workout_type || "Run", minutes: r.duration_minutes || 0, dist: r.distance_km || 0 })),
          runDist: Math.round(dayRun.reduce((a: number, r: any) => a + (r.distance_km || 0), 0) * 100) / 100,
          calTotal: dayCal,
          habits: dayHabits.length,
          habitNames: dayHabits.map((h: any) => habitMap[h.habit_id] || "Habit").filter(Boolean),
          todo: dayTodo.length,
          todoTitles: dayTodo.map((r: any) => r.title || "Task"),
        });
      }
      setDays(built);
      const activeDates = new Set<string>();
      (s.data || []).forEach((r: any) => activeDates.add(r.session_date));
      (g.data || []).forEach((r: any) => activeDates.add(r.session_date));
      (hl.data || []).forEach((r: any) => activeDates.add(r.log_date));
      (t.data || []).forEach((r: any) => activeDates.add(r.task_date));
      setStreak(calcStreak(activeDates, today));
      setLoading(false);
    };
    load();
  }, []);

  const studyMin = days.reduce((a, d) => a + d.study, 0);
  const gymCount = days.reduce((a, d) => a + d.gym, 0);
  const habitsCount = days.reduce((a, d) => a + d.habits, 0);
  const todoCount = days.reduce((a, d) => a + d.todo, 0);
  const runDistWeek = Math.round(days.reduce((a, d) => a + d.runDist, 0) * 100) / 100;
  const calDays = days.filter((d) => d.calTotal > 0);
  const avgCal = calDays.length ? Math.round(calDays.reduce((s, d) => s + d.calTotal, 0) / calDays.length) : 0;
  const bestDay = days.reduce(
    (best, d) =>
      d.study / 60 + d.gym + d.habits + d.todo >
      best.study / 60 + best.gym + best.habits + best.todo ? d : best,
    days[0] || ({ date: today, study: 0, gym: 0, habits: 0, todo: 0 } as Day)
  );
  const totalScore = studyMin / 60 + gymCount + habitsCount + todoCount;

  const activeStudyDays = days.filter((d) => d.study > 0).length;
  const gymDays = days.filter((d) => d.gym > 0).length;
  const runDays = days.filter((d) => d.runDist > 0).length;
  const todoDoneWeek = days.reduce((a, d) => a + d.todo, 0);

  // Personalized tips
  const tips: string[] = [];
  if (activeStudyDays === 0) tips.push("No study this week — start today with one 25-min session. Momentum beats motivation.");
  else if (activeStudyDays < 4) tips.push(`You studied ${activeStudyDays}/7 days — aim for 5+. Short daily sessions beat rare long ones.`);
  if (studyMin > 0 && activeStudyDays <= 2) tips.push("You crammed. After studying, close notes and blurt everything from memory (Active Recall) — that's what locks it in.");
  if (gymDays < 3) tips.push(`Only ${gymDays} workout day(s) — add 2 more. Even 20 minutes of bodyweight work counts.`);
  if (runDays === 0) tips.push("No running this week — add 2 easy walk-runs (10-15 min each) to build base fitness.");
  if (calTarget && avgCal > 0 && avgCal < calTarget - 300) tips.push(`Calories ~${calTarget - avgCal} below target — add protein (soya, paneer, eggs, sattu) to hit it.`);
  if (calTarget && avgCal > calTarget + 300) tips.push("Calories above target — watch portions and sugary drinks.");
  if (todoDoneWeek > 0 && days.filter((d) => d.todo > 0).length < 3) tips.push("Write 3 small tasks each morning, do the hardest one first. That single habit changes everything.");
  tips.push("Try one 8-phase session this week: 10 min prep → 45 min learn + mimic → 10 min blurting → 10 min rest → 60 min real project. It's the real secret.");

  // Detail panels
  const renderDetail = (type: string) => {
    if (type === "Study") {
      const totals: Record<string, number> = {};
      days.forEach((d) => d.studyRows.forEach((r) => (totals[r.subject] = (totals[r.subject] || 0) + r.minutes)));
      const top = Object.entries(totals).sort((a, b) => b[1] - a[1]);
      return (
        <div className="mt-3 grid gap-2">
          <div className="bg-slate-800/60 rounded-xl p-3">
            <p className="text-xs text-slate-400 font-bold">TOTAL</p>
            <p className="text-xl font-black text-white">{Math.floor(studyMin / 60)}h {studyMin % 60}m • {activeStudyDays}/7 days</p>
          </div>
          {top.length > 0 && (
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-xs text-slate-400 font-bold mb-2">TOP SUBJECTS</p>
              <div className="grid gap-1">
                {top.slice(0, 5).map(([sub, min], i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-200 truncate">{sub}</span>
                    <span className="text-blue-300 font-bold">{Math.floor(min / 60)}h{min % 60}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-slate-800/60 rounded-xl p-3">
            <p className="text-xs text-slate-400 font-bold mb-2">DAY-BY-DAY</p>
            {days.filter((d) => d.studyRows.length > 0).map((d, i) => (
              <div key={i} className="mb-2 last:mb-0">
                <p className="text-xs text-slate-500 font-bold">{d.date.slice(5)}</p>
                {d.studyRows.map((r, j) => (
                  <p key={j} className="text-[11px] text-slate-300 pl-2">• {r.subject} — {r.minutes}m</p>
                ))}
              </div>
            ))}
            {days.every((d) => d.studyRows.length === 0) && <p className="text-[11px] text-slate-500">No study sessions logged.</p>}
          </div>
        </div>
      );
    }
    if (type === "Gym") {
      const allGymRows = days.flatMap((d) => d.gymRows.map((r) => ({ ...r, date: d.date })));
      return (
        <div className="mt-3 grid gap-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-bold">WORKOUTS</p>
              <p className="text-xl font-black text-white">{gymCount}</p>
              <p className="text-[10px] text-slate-500">{gymDays}/7 days</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-bold">RUNNING</p>
              <p className="text-xl font-black text-green-400">{runDistWeek} km</p>
              <p className="text-[10px] text-slate-500">{runDays} run(s)</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-bold">CALORIES</p>
              <p className="text-xl font-black text-amber-400">{avgCal}</p>
              <p className="text-[10px] text-slate-500">avg/day{calTarget ? ` / ${calTarget}` : ""}</p>
            </div>
          </div>
          {allGymRows.length > 0 && (
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-xs text-slate-400 font-bold mb-2">WORKOUT LOG</p>
              <div className="grid gap-1">
                {allGymRows.slice(0, 8).map((r, i) => (
                  <p key={i} className="text-[11px] text-slate-300">• {r.date.slice(5)} — {r.workout} ({r.minutes}m)</p>
                ))}
              </div>
            </div>
          )}
          {days.some((d) => d.runRows.length > 0) && (
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-xs text-green-400 font-bold mb-2">RUNNING LOG</p>
              <div className="grid gap-1">
                {days.flatMap((d) => d.runRows.map((r) => ({ ...r, date: d.date }))).map((r, i) => (
                  <p key={i} className="text-[11px] text-slate-300">• {r.date.slice(5)} — {r.workout} ({r.dist} km, {r.minutes}m)</p>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    if (type === "Habits") {
      const totals: Record<string, number> = {};
      days.forEach((d) => d.habitNames.forEach((n) => (totals[n] = (totals[n] || 0) + 1)));
      return (
        <div className="mt-3 grid gap-2">
          <div className="bg-slate-800/60 rounded-xl p-3">
            <p className="text-xs text-slate-400 font-bold">TOTAL</p>
            <p className="text-xl font-black text-white">{habitsCount} habit-days across 7 days</p>
          </div>
          {Object.keys(totals).length > 0 ? (
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-xs text-slate-400 font-bold mb-2">BY HABIT</p>
              <div className="grid gap-1">
                {Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([n, c], i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-200 truncate">{n}</span>
                    <span className="text-violet-300 font-bold">{c}/7</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/60 rounded-xl p-3 text-[11px] text-slate-500">No habits logged this week.</div>
          )}
        </div>
      );
    }
    if (type === "Tasks") {
      const allTitles = days.flatMap((d) => d.todoTitles.map((t) => ({ title: t, date: d.date })));
      return (
        <div className="mt-3 grid gap-2">
          <div className="bg-slate-800/60 rounded-xl p-3">
            <p className="text-xs text-slate-400 font-bold">TOTAL COMPLETED</p>
            <p className="text-xl font-black text-white">{todoCount} tasks</p>
          </div>
          {allTitles.length > 0 ? (
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-xs text-slate-400 font-bold mb-2">RECENTLY DONE</p>
              <div className="grid gap-1 max-h-48 overflow-y-auto">
                {allTitles.slice(-10).reverse().map((t, i) => (
                  <p key={i} className="text-[11px] text-slate-300">✓ {t.date.slice(5)} — {t.title}</p>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/60 rounded-xl p-3 text-[11px] text-slate-500">No tasks completed this week.</div>
          )}
        </div>
      );
    }
    return null;
  };

  const makeImage = async (share: boolean) => {
    setSharing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
      grad.addColorStop(0, "#7c3aed");
      grad.addColorStop(0.5, "#db2777");
      grad.addColorStop(1, "#f59e0b");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1350);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath(); ctx.arc(900, 150, 200, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(180, 1200, 250, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.roundRect(60, 60, 960, 1230, 40);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 72px sans-serif";
      ctx.fillText("🎯 MY WEEK", 110, 170);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "30px sans-serif";
      ctx.fillText(`${weekStart} → ${today}`, 110, 220);
      const stats = [
        { emoji: "📚", label: "STUDY", value: `${Math.floor(studyMin / 60)}h ${studyMin % 60}m`, color: "#60a5fa" },
        { emoji: "🏋️", label: "WORKOUTS", value: String(gymCount), color: "#4ade80" },
        { emoji: "✅", label: "HABITS", value: String(habitsCount), color: "#c084fc" },
        { emoji: "📝", label: "TASKS", value: String(todoCount), color: "#fbbf24" },
      ];
      stats.forEach((s, i) => {
        const x = 110 + (i % 2) * 440;
        const y = 320 + Math.floor(i / 2) * 200;
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.beginPath(); ctx.roundRect(x, y, 400, 170, 24); ctx.fill();
        ctx.fillStyle = s.color;
        ctx.font = "bold 52px sans-serif";
        ctx.fillText(`${s.emoji} ${s.label}`, x + 24, y + 60);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 60px sans-serif";
        ctx.fillText(s.value, x + 24, y + 130);
      });
      ctx.fillStyle = "rgba(251,146,60,0.2)";
      ctx.beginPath(); ctx.roundRect(110, 750, 860, 140, 24); ctx.fill();
      ctx.strokeStyle = "#fb923c";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(110, 750, 860, 140, 24); ctx.stroke();
      ctx.fillStyle = "#fb923c";
      ctx.font = "bold 56px sans-serif";
      ctx.fillText(`🔥 ${streak}-DAY STREAK`, 150, 835);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("⭐ Best day", 110, 950);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "28px sans-serif";
      ctx.fillText(`${bestDay.date} — ${Math.floor(bestDay.study / 60)}h${bestDay.study % 60}m study, ${bestDay.gym} gym, ${bestDay.habits} habits, ${bestDay.todo} tasks`, 110, 990);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "24px sans-serif";
      ctx.fillText("Tracked with DAILY GOAL 🎯", 110, 1230);
      canvas.toBlob(async (blob) => {
        if (!blob) { setSharing(false); return; }
        const file = new File([blob], "daily-goal.png", { type: "image/png" });
        const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
        if (share && nav.share && nav.canShare && nav.canShare({ files: [file] })) {
          try { await nav.share({ files: [file], title: "DAILY GOAL" }); } catch {}
        } else {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "daily-goal-stats.png";
          a.click();
        }
        setSharing(false);
      }, "image/png");
    } catch { setSharing(false); }
  };

  const stats = [
    { key: "Study", emoji: "📚", gradient: "from-blue-500 to-indigo-600", border: "border-blue-500/30", value: `${Math.floor(studyMin / 60)}h ${studyMin % 60}m`, sub: `${activeStudyDays}/7 days` },
    { key: "Gym", emoji: "🏋️", gradient: "from-green-500 to-emerald-600", border: "border-green-500/30", value: `${gymCount} + ${runDistWeek}km`, sub: `${gymDays} workouts, ${runDays} runs` },
    { key: "Habits", emoji: "✅", gradient: "from-violet-500 to-purple-600", border: "border-violet-500/30", value: String(habitsCount), sub: "habit-days this week" },
    { key: "Tasks", emoji: "📝", gradient: "from-amber-500 to-orange-600", border: "border-amber-500/30", value: String(todoCount), sub: "tasks completed" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-amber-500 p-5 shadow-2xl shadow-fuchsia-900/30">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-lg">📊</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight">Your Week Wrapped</h1>
            <p className="text-[10px] text-white/80 font-semibold">{weekStart} → {today} • tap any card</p>
          </div>
          {totalScore > 0 && (
            <div className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-xs font-black text-white border border-white/20">🏆 {totalScore.toFixed(1)} pts</div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-2 animate-bounce">📊</p>
          <p className="text-slate-400 text-sm">Crunching your week...</p>
        </div>
      ) : (
        <>
          {/* STATS GRID (now clickable) */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {stats.map((s) => {
              const open = openSection === s.key;
              return (
                <div key={s.key} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg shadow-black/30">
                  <button
                    onClick={() => setOpenSection(open ? null : s.key)}
                    className={`w-full p-4 text-left transition-all ${s.border} border ${open ? "bg-slate-800" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <IconTile emoji={s.emoji} gradient={`bg-gradient-to-br ${s.gradient}`} size="sm" />
                        <p className="text-[10px] font-black text-slate-400">{s.key.toUpperCase()}</p>
                      </div>
                      {open ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                    </div>
                    <p className="text-2xl font-black text-white leading-tight">{s.value}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{s.sub}</p>
                  </button>
                  {open && <div className="p-3 border-t border-slate-800">{renderDetail(s.key)}</div>}
                </div>
              );
            })}
          </div>

          {/* STREAK + BEST DAY */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 border-2 border-orange-500/40 rounded-2xl p-4 shadow-lg">
              <p className="text-[10px] font-black text-orange-300 mb-1">🔥 CURRENT STREAK</p>
              <p className="text-4xl font-black text-white leading-none">{streak}</p>
              <p className="text-[10px] text-orange-200/80 font-semibold mt-1">days active</p>
            </div>
            <div className="bg-gradient-to-br from-amber-600/20 to-yellow-600/20 border-2 border-amber-500/40 rounded-2xl p-4 shadow-lg">
              <p className="text-[10px] font-black text-amber-300 mb-1">⭐ BEST DAY</p>
              <p className="text-lg font-black text-white leading-tight truncate">{bestDay.date}</p>
              <p className="text-[10px] text-amber-200/80 font-semibold mt-1 truncate">
                {(bestDay.study / 60 + bestDay.gym + bestDay.habits + bestDay.todo).toFixed(1)} pts
              </p>
            </div>
          </div>

          {/* DAILY BREAKDOWN */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 shadow-lg shadow-black/30">
            <div className="flex items-center gap-2 mb-3">
              <IconTile emoji="📅" gradient="bg-gradient-to-br from-slate-500 to-slate-700" size="sm" />
              <p className="font-black text-sm text-white">Day by Day</p>
            </div>
            <div className="grid gap-1.5">
              {days.map((d) => {
                const isBest = d.date === bestDay.date;
                const dayScore = d.study / 60 + d.gym + d.habits + d.todo;
                return (
                  <div
                    key={d.date}
                    className={`flex items-center justify-between rounded-xl p-3 transition-all ${isBest ? "bg-amber-500/10 border border-amber-500/40" : "bg-slate-800/60"}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-black text-slate-400 w-20 shrink-0">{d.date.slice(5)}</span>
                      {isBest && <Chip color="amber">⭐ BEST</Chip>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black flex-wrap justify-end">
                      {d.study > 0 && <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">📚 {Math.floor(d.study / 60)}h{d.study % 60}m</span>}
                      {d.gym > 0 && <span className="bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded">🏋️ {d.gym}</span>}
                      {d.runDist > 0 && <span className="bg-green-600/20 text-green-300 px-1.5 py-0.5 rounded">🏃 {d.runDist}km</span>}
                      {d.calTotal > 0 && <span className="bg-amber-600/20 text-amber-300 px-1.5 py-0.5 rounded">🔥 {d.calTotal}</span>}
                      {d.habits > 0 && <span className="bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded">✅ {d.habits}</span>}
                      {d.todo > 0 && <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">📝 {d.todo}</span>}
                      {dayScore === 0 && d.calTotal === 0 && d.runDist === 0 && <span className="text-slate-600 text-[10px]">—</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TIPS TO IMPROVE */}
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-5 mb-5 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={20} className="text-amber-400" />
              <h2 className="text-base font-black text-white">Tips to improve next week</h2>
            </div>
            <div className="grid gap-2">
              {tips.map((t, i) => (
                <p key={i} className="text-sm text-slate-200 flex gap-2 leading-snug">
                  <span className="text-amber-400 shrink-0">→</span>
                  <span>{t}</span>
                </p>
              ))}
            </div>
          </div>

          {/* SHARE / DOWNLOAD */}
          <div className="grid grid-cols-2 gap-2">
            <GradButton onClick={() => makeImage(true)} gradient="from-violet-600 to-fuchsia-600" disabled={sharing} className="py-3.5 text-sm">
              {sharing ? "..." : "📸 Share"}
            </GradButton>
            <button
              onClick={() => makeImage(false)}
              disabled={sharing}
              className="press py-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-sm font-black disabled:opacity-50"
            >
              {sharing ? "..." : "📥 Download"}
            </button>
          </div>
        </>
      )}

      <Link href="/dashboard" className="inline-block mt-6 text-sm text-slate-400 hover:text-white press font-semibold">
        ← Back to Dashboard
      </Link>
    </main>
  );
}