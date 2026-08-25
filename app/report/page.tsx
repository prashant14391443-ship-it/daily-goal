"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconTile, GradButton, Chip } from "@/app/components/ui";

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

type Day = { date: string; study: number; gym: number; habits: number; todo: number };

export default function ReportPage() {
  const today = toLocalISO(new Date());
  const weekStart = addDays(today, -6);
  const [days, setDays] = useState<Day[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) { router.push("/login"); return; }
      const [s, g, hl, t] = await Promise.all([
        supabase.from("study_sessions").select("session_date, duration_minutes").eq("user_id", userId).gte("session_date", weekStart),
        supabase.from("gym_logs").select("session_date").eq("user_id", userId).gte("session_date", weekStart),
        supabase.from("habit_logs").select("log_date").eq("user_id", userId).eq("completed", true).gte("log_date", weekStart),
        supabase.from("tasks").select("task_date").eq("user_id", userId).eq("completed", true).gte("task_date", weekStart),
      ]);
      const built: Day[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = addDays(today, -i);
        built.push({
          date: d,
          study: (s.data || []).filter((r) => r.session_date === d).reduce((a, r) => a + r.duration_minutes, 0),
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
      best.study / 60 + best.gym + best.habits + best.todo ? d : best,
    days[0] || ({ date: today, study: 0, gym: 0, habits: 0, todo: 0 } as Day)
  );

  const totalScore = studyMin / 60 + gymCount + habitsCount + todoCount;

  // 🎨 Premium canvas for share/download
  const makeImage = async (share: boolean) => {
    setSharing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // gradient background
      const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
      grad.addColorStop(0, "#7c3aed");
      grad.addColorStop(0.5, "#db2777");
      grad.addColorStop(1, "#f59e0b");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1350);

      // decorative circles
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath(); ctx.arc(900, 150, 200, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(180, 1200, 250, 0, Math.PI * 2); ctx.fill();

      // inner card
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.roundRect(60, 60, 960, 1230, 40);
      ctx.fill();

      // header
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 72px sans-serif";
      ctx.fillText("🎯 MY WEEK", 110, 170);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "30px sans-serif";
      ctx.fillText(`${weekStart} → ${today}`, 110, 220);

      // big stats (2×2)
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

      // streak highlight
      ctx.fillStyle = "rgba(251,146,60,0.2)";
      ctx.beginPath(); ctx.roundRect(110, 750, 860, 140, 24); ctx.fill();
      ctx.strokeStyle = "#fb923c";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(110, 750, 860, 140, 24); ctx.stroke();
      ctx.fillStyle = "#fb923c";
      ctx.font = "bold 56px sans-serif";
      ctx.fillText(`🔥 ${streak}-DAY STREAK`, 150, 835);

      // best day
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("⭐ Best day", 110, 950);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "28px sans-serif";
      ctx.fillText(`${bestDay.date} — ${Math.floor(bestDay.study / 60)}h${bestDay.study % 60}m study, ${bestDay.gym} gym, ${bestDay.habits} habits, ${bestDay.todo} tasks`, 110, 990);

      // footer
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
    } catch {
      setSharing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 HERO */}
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-amber-500 p-5 shadow-2xl shadow-fuchsia-900/30">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-lg">📊</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight">Your Week Wrapped</h1>
            <p className="text-[10px] text-white/80 font-semibold">{weekStart} → {today}</p>
          </div>
          {totalScore > 0 && (
            <div className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-xs font-black text-white border border-white/20">
              🏆 {totalScore.toFixed(1)} pts
            </div>
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
          {/* 🎯 STATS GRID */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-4 shadow-lg shadow-black/30">
              <div className="flex items-center gap-2 mb-2">
                <IconTile emoji="📚" gradient="bg-gradient-to-br from-blue-500 to-indigo-600" size="sm" />
                <p className="text-[10px] font-black text-slate-400">STUDY</p>
              </div>
              <p className="text-2xl font-black text-white">{Math.floor(studyMin / 60)}h {studyMin % 60}m</p>
            </div>
            <div className="bg-slate-900 border border-green-500/30 rounded-2xl p-4 shadow-lg shadow-black/30">
              <div className="flex items-center gap-2 mb-2">
                <IconTile emoji="🏋️" gradient="bg-gradient-to-br from-green-500 to-emerald-600" size="sm" />
                <p className="text-[10px] font-black text-slate-400">WORKOUTS</p>
              </div>
              <p className="text-2xl font-black text-white">{gymCount}</p>
            </div>
            <div className="bg-slate-900 border border-violet-500/30 rounded-2xl p-4 shadow-lg shadow-black/30">
              <div className="flex items-center gap-2 mb-2">
                <IconTile emoji="✅" gradient="bg-gradient-to-br from-violet-500 to-purple-600" size="sm" />
                <p className="text-[10px] font-black text-slate-400">HABITS</p>
              </div>
              <p className="text-2xl font-black text-white">{habitsCount}</p>
            </div>
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-lg shadow-black/30">
              <div className="flex items-center gap-2 mb-2">
                <IconTile emoji="📝" gradient="bg-gradient-to-br from-amber-500 to-orange-600" size="sm" />
                <p className="text-[10px] font-black text-slate-400">TASKS</p>
              </div>
              <p className="text-2xl font-black text-white">{todoCount}</p>
            </div>
          </div>

          {/* 🔥 STREAK + ⭐ BEST DAY (side by side) */}
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

          {/* 📅 DAILY BREAKDOWN */}
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
                    className={`flex items-center justify-between rounded-xl p-3 transition-all ${
                      isBest ? "bg-amber-500/10 border border-amber-500/40" : "bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-black text-slate-400 w-20 shrink-0">{d.date.slice(5)}</span>
                      {isBest && <Chip color="amber">⭐ BEST</Chip>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black flex-wrap justify-end">
                      {d.study > 0 && <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">📚 {Math.floor(d.study / 60)}h{d.study % 60}m</span>}
                      {d.gym > 0 && <span className="bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded">🏋️ {d.gym}</span>}
                      {d.habits > 0 && <span className="bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded">✅ {d.habits}</span>}
                      {d.todo > 0 && <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">📝 {d.todo}</span>}
                      {dayScore === 0 && <span className="text-slate-600 text-[10px]">—</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 📸 SHARE / DOWNLOAD */}
          <div className="grid grid-cols-2 gap-2">
            <GradButton
              onClick={() => makeImage(true)}
              gradient="from-violet-600 to-fuchsia-600"
              disabled={sharing}
              className="py-3.5 text-sm"
            >
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