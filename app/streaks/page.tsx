"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { IconTile } from "@/app/components/ui";

function toLocalISO(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${day}`; }
function addDays(dateStr: string, days: number) { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + days); return toLocalISO(d); }
function calcStreak(dates: Set<string>, today: string) { let streak = 0; let cursor = dates.has(today) ? today : addDays(today, -1); while (dates.has(cursor)) { streak += 1; cursor = addDays(cursor, -1); } return streak; }
function brokenStreak(dates: Set<string>, today: string) { if (dates.has(today) || dates.has(addDays(today, -1))) return 0; let len = 0; let cursor = addDays(today, -2); while (dates.has(cursor)) { len += 1; cursor = addDays(cursor, -1); } return len; }

type Row = { id: string; name: string; icon: string; grad: string; border: string; streak: number; broken: number };

export default function StreaksPage() {
  const today = toLocalISO(new Date());
  const [cats, setCats] = useState<Row[]>([]);
  const [habits, setHabits] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) { setLoading(false); return; }
      const [s, g, mv, t, h, hl] = await Promise.all([
        supabase.from("study_sessions").select("session_date").eq("user_id", uid).eq("completed", true),
        supabase.from("gym_logs").select("session_date").eq("user_id", uid).eq("completed", true),
        supabase.from("gym_logs").select("session_date").eq("user_id", uid).eq("completed", true).not("activity_type", "is", null),
        supabase.from("tasks").select("task_date").eq("user_id", uid).eq("category", "todo").eq("completed", true),
        supabase.from("habits").select("id, habit_name").eq("user_id", uid),
        supabase.from("habit_logs").select("habit_id, log_date").eq("user_id", uid).eq("completed", true),
      ]);
      const mk = (dates: Set<string>) => ({ streak: calcStreak(dates, today), broken: brokenStreak(dates, today) });
      const study = mk(new Set((s.data || []).map((r) => r.session_date)));
      const gym = mk(new Set((g.data || []).map((r) => r.session_date)));
      const move = mk(new Set((mv.data || []).map((r) => r.session_date)));
      const todo = mk(new Set((t.data || []).map((r) => r.task_date)));
      setCats([
        { id: "study", name: "Study", icon: "📚", grad: "from-blue-500 to-indigo-600", border: "border-blue-500/30", ...study },
        { id: "workout", name: "Workout", icon: "🏋️", grad: "from-green-500 to-emerald-600", border: "border-green-500/30", ...gym },
        { id: "move", name: "Move", icon: "🏃", grad: "from-cyan-500 to-teal-600", border: "border-cyan-500/30", ...move },
        { id: "todo", name: "ToDo", icon: "📝", grad: "from-amber-500 to-orange-600", border: "border-amber-500/30", ...todo },
      ]);
      setHabits((h.data || []).map((x) => {
        const dates = new Set((hl.data || []).filter((l) => l.habit_id === x.id).map((l) => l.log_date));
        return { id: x.id, name: x.habit_name, icon: "✅", grad: "from-violet-500 to-purple-600", border: "border-violet-500/30", ...mk(dates) };
      }));
      setLoading(false);
    };
    load();
  }, []);

  const all = [...cats, ...habits];
  const total = all.reduce((a, b) => a + b.streak, 0);
  const activeCount = all.filter((x) => x.streak > 0).length;
  const best = all.reduce((b, x) => (x.streak > b.streak ? x : b), all[0] || null);
  const inDanger = all.filter((x) => x.broken >= 2);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-16 pb-24 max-w-4xl mx-auto">
      {/* 🌆 FIRE HERO */}
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 p-5 shadow-2xl shadow-orange-900/40">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-yellow-300/20 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="w-12 h-12 shrink-0 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-lg">🔥</span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black text-white" style={{ whiteSpace: "nowrap" }}>Your Streaks</h1>
            <p className="text-[10px] text-white/80 font-semibold">{activeCount} active • {total} total days</p>
          </div>
          {total > 0 && <div className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-xs font-black border border-white/20 shrink-0">🏆 {total}🔥</div>}
        </div>
      </div>

      {/* 🚨 RESCUE BANNER — streaks about to die */}
      {inDanger.length > 0 && (
        <div className="mb-5 bg-red-500/10 border-2 border-red-500/50 rounded-2xl p-4">
          <p className="text-xs font-black text-red-300 mb-2">🚨 STREAK EMERGENCY — RESCUE TODAY!</p>
          <div className="grid gap-1.5">
            {inDanger.map((x) => (
              <p key={x.id} className="text-[11px] font-bold text-red-200">
                💔 {x.icon} {x.name}: broke {x.broken}-day streak — do it TODAY to start a new one!
              </p>
            ))}
          </div>
        </div>
      )}

      {/* 🏆 BEST STREAK */}
      {!loading && best && best.streak > 0 && (
        <div className="mb-5 bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-2 border-amber-500/40 rounded-2xl p-4 flex items-center gap-3">
          <IconTile emoji={best.icon} gradient={`bg-gradient-to-br ${best.grad}`} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-amber-300">🏆 LONGEST STREAK</p>
            <p className="text-lg font-black text-white leading-tight">{best.name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-4xl font-black text-orange-400 leading-none">{best.streak}</p>
            <p className="text-[10px] text-amber-300 font-bold">days 🔥</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-2 animate-bounce">🔥</p>
          <p className="text-slate-400 text-sm">Counting your flames...</p>
        </div>
      ) : (
        <div className="grid gap-3 mb-5">
          {cats.map((c) => (
            <StreakCard key={c.id} row={c} />
          ))}
          {habits.length > 0 && (
            <>
              <p className="text-xs font-black text-slate-400 mt-2 mb-0">✅ HABIT STREAKS</p>
              {habits.map((h) => (
                <StreakCard key={h.id} row={h} />
              ))}
            </>
          )}
        </div>
      )}

      {/* 🔒 INFO */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
        <span className="shrink-0 w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-base">🔒</span>
        <div>
          <p className="text-xs font-black text-slate-300 mb-0.5">Streaks are permanent</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">Streaks lock in the moment you complete — deleting a task never removes earned streaks!</p>
        </div>
      </div>

      <Link href="/dashboard" className="inline-block mt-6 text-sm text-slate-400 hover:text-white press font-semibold">← Back to Dashboard</Link>
    </main>
  );
}

function StreakCard({ row }: { row: Row }) {
  const active = row.streak > 0;
  return (
    <div className={`bg-slate-900 border-2 rounded-2xl p-4 shadow-lg shadow-black/30 ${active ? row.border : "border-slate-800 opacity-70"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <IconTile emoji={row.icon} gradient={`bg-gradient-to-br ${row.grad}`} />
          <div className="min-w-0">
            <p className="font-black text-sm text-white">{row.name}</p>
            <p className={`text-[10px] font-bold mt-0.5 ${active ? "text-orange-300" : "text-slate-500"}`}>
              {active ? "Streak active 🔥" : "Start today!"}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-3xl font-black leading-none ${active ? "text-orange-400" : "text-slate-600"}`}>{row.streak}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-1">{row.streak === 1 ? "day" : "days"}</p>
        </div>
      </div>
      {row.broken >= 2 && (
        <div className="mt-3 bg-red-500/10 border border-red-500/40 rounded-xl p-2 text-center">
          <p className="text-[10px] font-black text-red-300">💔 broke {row.broken}-day streak — rescue it today!</p>
        </div>
      )}
    </div>
  );
}