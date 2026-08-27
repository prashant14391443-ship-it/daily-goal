"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Dumbbell, ListChecks, ListTodo, Mic, Flame } from "lucide-react";
import CoinPill from "@/app/CoinPill";
import DraggableAIBubble from "@/app/components/DraggableAIBubble";

type Task = { id: string; title: string; completed: boolean };
type DayStat = { date: string; value: number };
type Goals = { study_target: number; workout_target: number; habits_target: number };
type Countdown = { id: string; title: string; target_date: string; emoji: string };

function toLocalISO(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${day}`; }
function addDays(dateStr: string, days: number) { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + days); return toLocalISO(d); }
function calcStreak(dates: Set<string>, today: string) { let streak = 0; let cursor = dates.has(today) ? today : addDays(today, -1); while (dates.has(cursor)) { streak += 1; cursor = addDays(cursor, -1); } return streak; }
function brokenStreak(dates: Set<string>, today: string) { if (dates.has(today) || dates.has(addDays(today, -1))) return 0; let len = 0; let cursor = addDays(today, -2); while (dates.has(cursor)) { len += 1; cursor = addDays(cursor, -1); } return len; }
function dayLabel(dateStr: string) { return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" }); }
function daysLeft(target: string, today: string) { return Math.round((new Date(target + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000); }
function badgeColor(d: number) { if (d < 0) return "bg-slate-700 text-slate-300"; if (d === 0) return "bg-red-600 text-white"; if (d <= 7) return "bg-red-700 text-white"; if (d <= 30) return "bg-orange-600 text-white"; return "bg-green-700 text-white"; }

function ProgressRing({ pct, size = 56, stroke = 5, color, track = "rgba(255,255,255,0.08)" }: { pct: number; size?: number; stroke?: number; color: string; track?: string }) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r; const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" transform={`rotate(90 ${size / 2} ${size / 2})`} className="fill-white text-[10px] font-black">{Math.round(pct)}%</text>
    </svg>
  );
}
function IconTile({ emoji, gradient }: { emoji: string; gradient: string }) { return <div className={`w-8 h-8 rounded-lg ${gradient} flex items-center justify-center text-base shadow-md`}>{emoji}</div>; }

// 🎨 CALM STAT CARD — line icon + thin bar (design #1 discipline)
function StatCard({ href, icon: Icon, tint, bar, label, value, sub, streak, pct }: { href: string; icon: any; tint: string; bar: string; label: string; value: string; sub: string; streak: number; pct: number }) {
  return (
    <Link href={href} className="press bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <div className="flex items-start justify-between mb-4">
        <span className={`w-9 h-9 rounded-lg ${tint} flex items-center justify-center`}><Icon size={18} strokeWidth={2.2} /></span>
        {streak > 0 && <span className="flex items-center gap-0.5 text-[10px] font-black text-orange-400"><Flame size={12} /> {streak}</span>}
      </div>
      <p className="text-xs font-semibold text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-black text-white leading-none mb-1 truncate">{value}</p>
      <p className="text-[10px] text-slate-500 mb-3">{sub}</p>
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </Link>
  );
}

function ProgressBar({ label, value, target, unit, color }: { label: string; value: number; target: number; unit: string; color: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(target, 1)) * 100)); const full = pct >= 100;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="font-semibold text-slate-400">{label}</span>
        <span className={full ? "text-green-400 font-black" : "text-slate-500 font-semibold"}>{value} / {target} {unit} • {pct}% {full ? "🎉" : ""}</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export default function Dashboard() {
  const today = toLocalISO(new Date());
  const [userName, setUserName] = useState("friend");
  const [studyMinutes, setStudyMinutes] = useState(0);
  const [workouts, setWorkouts] = useState(0);
  const [habitsDone, setHabitsDone] = useState(0);
  const [todoDone, setTodoDone] = useState(0);
  const [todoTotal, setTodoTotal] = useState(0);
  const [studyStreak, setStudyStreak] = useState(0);
  const [gymStreak, setGymStreak] = useState(0);
  const [todoStreak, setTodoStreak] = useState(0);
  const [studyBroken, setStudyBroken] = useState(0);
  const [gymBroken, setGymBroken] = useState(0);
  const [todoBroken, setTodoBroken] = useState(0);
  const [habitBroken, setHabitBroken] = useState<{ name: string; broken: number }[]>([]);
  const [goals, setGoals] = useState<Goals>({ study_target: 120, workout_target: 1, habits_target: 3 });
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalStudy, setGoalStudy] = useState("120");
  const [goalWorkout, setGoalWorkout] = useState("1");
  const [goalHabits, setGoalHabits] = useState("3");
  const [habitStreaks, setHabitStreaks] = useState<{ name: string; streak: number }[]>([]);
  const [studyWeekData, setStudyWeekData] = useState<DayStat[]>([]);
  const [gymWeekData, setGymWeekData] = useState<DayStat[]>([]);
  const [habitsWeekData, setHabitsWeekData] = useState<DayStat[]>([]);
  const [chartMode, setChartMode] = useState<"study" | "gym" | "habits" | "todo">("study");
  const [todoWeekData, setTodoWeekData] = useState<DayStat[]>([]);
  const [todoWeekTotals, setTodoWeekTotals] = useState<Record<string, number>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [cdTitle, setCdTitle] = useState("");
  const [cdDate, setCdDate] = useState("");
  const [cdEmoji, setCdEmoji] = useState("📚");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [moveStreak, setMoveStreak] = useState(0);

  useEffect(() => {
    const loadMove = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) return;
      const { data: rows } = await supabase.from("gym_logs").select("session_date").eq("user_id", uid).eq("completed", true).not("activity_type", "is", null);
      if (!rows || rows.length === 0) return;
      const days = [...new Set(rows.map((r) => r.session_date))];
      const isDay = (d: Date) => days.includes(toLocalISO(d));
      let streak = 0; const cursor = new Date();
      if (!isDay(cursor)) cursor.setDate(cursor.getDate() - 1);
      while (isDay(cursor)) { streak++; cursor.setDate(cursor.getDate() - 1); }
      setMoveStreak(streak);
    };
    loadMove();
  }, []);

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) { router.push("/login"); return; }
    const meta = (data.session?.user.user_metadata || {}) as { display_name?: string };
    const rawName = meta.display_name || (data.session?.user.email || "friend").split("@")[0];
    setUserName(rawName.charAt(0).toUpperCase() + rawName.slice(1));
    const weekStart = addDays(today, -6);
    const [study, studyW, gym, gymW, habits, habitLogs, tasksRes, goalsRes, cdRes, todoRes, studyDoneRes, gymDoneRes, todoDoneRes, todoWeekRes] = await Promise.all([
      supabase.from("study_sessions").select("duration_minutes").eq("user_id", userId).eq("session_date", today).eq("completed", true),
      supabase.from("study_sessions").select("duration_minutes, session_date").eq("user_id", userId).gte("session_date", weekStart),
      supabase.from("gym_logs").select("id").eq("user_id", userId).eq("session_date", today).eq("completed", true),
      supabase.from("gym_logs").select("duration_minutes, session_date").eq("user_id", userId).gte("session_date", weekStart),
      supabase.from("habits").select("id, habit_name").eq("user_id", userId),
      supabase.from("habit_logs").select("habit_id, log_date").eq("user_id", uidSafe(userId)).eq("completed", true),
      supabase.from("tasks").select("*").eq("user_id", userId).eq("category", "general").eq("task_date", today).order("created_at"),
      supabase.from("user_goals").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("countdowns").select("*").eq("user_id", userId).order("target_date"),
      supabase.from("tasks").select("id, completed").eq("user_id", userId).eq("category", "todo").eq("task_date", today),
      supabase.from("study_sessions").select("session_date").eq("user_id", userId).eq("completed", true),
      supabase.from("gym_logs").select("session_date").eq("user_id", userId).eq("completed", true),
      supabase.from("tasks").select("task_date").eq("user_id", userId).eq("category", "todo").eq("completed", true),
      supabase.from("tasks").select("task_date, completed").eq("user_id", userId).eq("category", "todo").gte("task_date", weekStart),
    ]);
    setStudyMinutes((study.data || []).reduce((s, r) => s + r.duration_minutes, 0));
    setWorkouts((gym.data || []).length);
    if (goalsRes.data) {
      setGoals({ study_target: goalsRes.data.study_target, workout_target: goalsRes.data.workout_target, habits_target: goalsRes.data.habits_target });
      setGoalStudy(String(goalsRes.data.study_target)); setGoalWorkout(String(goalsRes.data.workout_target)); setGoalHabits(String(goalsRes.data.habits_target));
    }
    setHabitsDone(new Set((habitLogs.data || []).filter((l) => l.log_date === today).map((l) => l.habit_id)).size);
    const todoRows = todoRes.data || [];
    setTodoTotal(todoRows.length); setTodoDone(todoRows.filter((t) => t.completed).length);
    const studyDates = new Set((studyDoneRes.data || []).map((r) => r.session_date));
    const gymDates = new Set((gymDoneRes.data || []).map((r) => r.session_date));
    const todoDates = new Set((todoDoneRes.data || []).map((r) => r.task_date));
    setStudyStreak(calcStreak(studyDates, today)); setGymStreak(calcStreak(gymDates, today)); setTodoStreak(calcStreak(todoDates, today));
    setStudyBroken(brokenStreak(studyDates, today)); setGymBroken(brokenStreak(gymDates, today)); setTodoBroken(brokenStreak(todoDates, today));
    setHabitBroken((habits.data || []).map((h) => { const dates = new Set((habitLogs.data || []).filter((l) => l.habit_id === h.id).map((l) => l.log_date)); return { name: h.habit_name, broken: brokenStreak(dates, today) }; }));
    setHabitStreaks((habits.data || []).map((h) => { const dates = new Set((habitLogs.data || []).filter((l) => l.habit_id === h.id).map((l) => l.log_date)); return { name: h.habit_name, streak: calcStreak(dates, today) }; }));
    const buildWeek = (rows: { session_date: string; duration_minutes: number }[] | null) => { const days: DayStat[] = []; for (let i = 6; i >= 0; i--) { const d = addDays(today, -i); days.push({ date: d, value: (rows || []).filter((r) => r.session_date === d).reduce((s, r) => s + r.duration_minutes, 0) }); } return days; };
    setStudyWeekData(buildWeek(studyW.data)); setGymWeekData(buildWeek(gymW.data));
    const habitDays: DayStat[] = [];
    for (let i = 6; i >= 0; i--) { const d = addDays(today, -i); habitDays.push({ date: d, value: new Set((habitLogs.data || []).filter((l) => l.log_date === d).map((l) => l.habit_id)).size }); }
    setHabitsWeekData(habitDays);
    const todoDays: DayStat[] = []; const totals: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) { const d = addDays(today, -i); const rows = (todoWeekRes.data || []).filter((t) => t.task_date === d); totals[d] = rows.length; todoDays.push({ date: d, value: rows.filter((t) => t.completed).length }); }
    setTodoWeekData(todoDays); setTodoWeekTotals(totals);
    setTasks(tasksRes.data || []); setCountdowns(cdRes.data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    const g: Goals = { study_target: Number(goalStudy) || 120, workout_target: Number(goalWorkout) || 1, habits_target: Number(goalHabits) || 3 };
    const { error } = await supabase.from("user_goals").upsert({ user_id: userId, ...g });
    if (error) { alert("Could not save goals: " + error.message); return; }
    setGoals(g); setEditingGoals(false);
  };
  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId || !newTask.trim()) return;
    await supabase.from("tasks").insert({ user_id: userId, title: newTask.trim(), task_date: today, category: "general" });
    setNewTask(""); await load();
  };
  const toggleTask = async (id: string, completed: boolean) => { await supabase.from("tasks").update({ completed: !completed }).eq("id", id); setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !completed } : t))); };
  const deleteTask = async (id: string) => { await supabase.from("tasks").delete().eq("id", id); setTasks(tasks.filter((t) => t.id !== id)); };
  const addCountdown = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId || !cdTitle.trim() || !cdDate) return;
    await supabase.from("countdowns").insert({ user_id: userId, title: cdTitle.trim(), target_date: cdDate, emoji: cdEmoji });
    setCdTitle(""); setCdDate(""); await load();
  };
  const deleteCountdown = async (id: string) => { await supabase.from("countdowns").delete().eq("id", id); setCountdowns(countdowns.filter((c) => c.id !== id)); };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const greetText = `${greeting}, ${userName}! 👋`;
  const greetSize = Math.max(15, Math.min(26, Math.round(430 / greetText.length)));
  const studyPct = Math.min(100, Math.round((studyMinutes / Math.max(goals.study_target, 1)) * 100));
  const gymPct = Math.min(100, Math.round((workouts / Math.max(goals.workout_target, 1)) * 100));
  const habitsPct = Math.min(100, Math.round((habitsDone / Math.max(goals.habits_target, 1)) * 100));
  const generalDone = tasks.filter((t) => t.completed).length;
  const todoAllDone = todoDone + generalDone; const todoAllTotal = todoTotal + tasks.length;
  const todoPct = todoAllTotal > 0 ? Math.min(100, Math.round((todoAllDone / todoAllTotal) * 100)) : 0;
  const overallPct = Math.round((studyPct + gymPct + habitsPct + todoPct) / 4);
  const motivation = overallPct >= 100 ? "⚡ BATMAN MODE: COMPLETE!" : overallPct >= 75 ? "Keep it up, champion!" : overallPct >= 50 ? "Better than yesterday!" : overallPct >= 25 ? "Good start, keep pushing!" : "Rise, hero — start NOW!";
  const maxStreak = Math.max(studyStreak, gymStreak, moveStreak, todoStreak);
  const maxBroken = Math.max(studyBroken, gymBroken, todoBroken, ...habitBroken.map((b) => b.broken), 0);
  const weekData = chartMode === "study" ? studyWeekData : chartMode === "gym" ? gymWeekData : chartMode === "todo" ? todoWeekData : habitsWeekData;
  const barColor = chartMode === "study" ? "from-blue-600 to-blue-400" : chartMode === "gym" ? "from-green-600 to-green-400" : chartMode === "todo" ? "from-amber-600 to-amber-400" : "from-violet-600 to-violet-400";
  const dailyTarget = chartMode === "study" ? goals.study_target : chartMode === "gym" ? goals.workout_target : goals.habits_target;

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-20 pb-24 max-w-4xl mx-auto">
      {/* 🌆 CALM HERO */}
      <div className="relative mb-3 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-purple-700 p-5 shadow-xl shadow-fuchsia-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-white/70">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</p>
            <span className="text-sm">🦇</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="font-black text-white leading-tight" style={{ fontSize: greetSize, whiteSpace: "nowrap" }}>{greetText}</h1>
              <p className="text-xs font-semibold text-white/75 mt-1.5">{motivation}</p>
            </div>
            <ProgressRing pct={overallPct} size={64} stroke={6} color="#fbbf24" track="rgba(0,0,0,0.3)" />
          </div>
        </div>
      </div>
      <div className="flex items-center px-1 mb-5">
        <span className="scale-90 origin-left"><CoinPill /></span>
      </div>
      <DraggableAIBubble />

      {/* 📊 CALM STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard href="/study-tracker" icon={BookOpen} tint="bg-blue-500/10 text-blue-400" bar="bg-blue-500" label="Study" value={`${Math.floor(studyMinutes / 60)}h ${studyMinutes % 60}m`} sub={studyMinutes === 0 ? "Start with 25 min" : "studied today"} streak={studyStreak} pct={studyPct} />
        <StatCard href="/gym-log" icon={Dumbbell} tint="bg-green-500/10 text-green-400" bar="bg-green-500" label="Gym" value={String(workouts)} sub={workouts === 0 ? "Crush a workout" : "workouts today"} streak={gymStreak} pct={gymPct} />
        <StatCard href="/routine-habits" icon={ListChecks} tint="bg-violet-500/10 text-violet-400" bar="bg-violet-500" label="Habits" value={`${habitsDone}/${goals.habits_target}`} sub={habitsDone === 0 ? "Pick one easy habit" : "completed today"} streak={habitStreaks.reduce((m, h) => Math.max(m, h.streak), 0)} pct={habitsPct} />
        <StatCard href="/todo" icon={ListTodo} tint="bg-amber-500/10 text-amber-400" bar="bg-amber-500" label="To-do" value={`${todoDone}/${todoTotal}`} sub={todoDone === 0 ? "One small task" : "done today"} streak={todoStreak} pct={todoPct} />
        <StatCard href="/speaking" icon={Mic} tint="bg-teal-500/10 text-teal-400" bar="bg-teal-500" label="English" value="Talk live" sub="Practice speaking" streak={0} pct={0} />
        <Link href="/streaks" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-start justify-between mb-4">
            <span className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center"><Flame size={18} strokeWidth={2.2} /></span>
            <span className="text-xl font-black text-orange-400">{maxStreak}</span>
          </div>
          <p className="text-xs font-semibold text-slate-400 mb-1">Streak</p>
          <p className="text-xl font-black text-white leading-none mb-1">{maxStreak} days</p>
          <p className={`text-[10px] ${maxBroken >= 2 ? "text-red-400 font-black" : "text-slate-500"}`}>
            {maxBroken >= 2 ? "💔 rescue today!" : "tap to see all"}
          </p>
        </Link>
      </div>

      {loading ? <p className="text-slate-500 text-sm">Loading your day...</p> : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
            <div className="press bg-slate-900 p-5 rounded-2xl border border-slate-800 cursor-pointer hover:border-violet-500/40" onClick={() => router.push("/daily-goals")}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black flex items-center gap-2"><IconTile emoji="🎯" gradient="bg-violet-600/20" />Daily Goals</h3>
                <button onClick={(e) => { e.stopPropagation(); setEditingGoals(!editingGoals); }} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold press">{editingGoals ? "Close" : "Edit"}</button>
              </div>
              {editingGoals ? (
                <form onSubmit={saveGoals} onClick={(e) => e.stopPropagation()} className="grid gap-3">
                  <label className="text-sm flex justify-between items-center gap-2">Study (min/day)<input type="number" min="1" value={goalStudy} onChange={(e) => setGoalStudy(e.target.value)} className="w-24 p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm" /></label>
                  <label className="text-sm flex justify-between items-center gap-2">Workouts/day<input type="number" min="1" value={goalWorkout} onChange={(e) => setGoalWorkout(e.target.value)} className="w-24 p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm" /></label>
                  <label className="text-sm flex justify-between items-center gap-2">Habits/day<input type="number" min="1" value={goalHabits} onChange={(e) => setGoalHabits(e.target.value)} className="w-24 p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm" /></label>
                  <button className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-black press">Save goals</button>
                </form>
              ) : (
                <div className="grid gap-3">
                  <ProgressBar label="Study" value={studyMinutes} target={goals.study_target} unit="min" color="bg-blue-500" />
                  <ProgressBar label="Workouts" value={workouts} target={goals.workout_target} unit="" color="bg-green-500" />
                  <ProgressBar label="Habits" value={habitsDone} target={goals.habits_target} unit="" color="bg-violet-500" />
                  <ProgressBar label="To-do" value={todoDone} target={todoTotal} unit="" color="bg-amber-500" />
                </div>
              )}
            </div>
            <div className="press bg-slate-900 p-5 rounded-2xl border border-slate-800 cursor-pointer hover:border-emerald-500/40" onClick={() => router.push("/weekly")}>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-sm font-black flex items-center gap-2"><IconTile emoji="📊" gradient="bg-emerald-600/20" />Last 7 days</h3>
                <div className="flex gap-1.5 flex-wrap">
                  {(["study", "gym", "habits", "todo"] as const).map((m) => {
                    const active = chartMode === m;
                    const color = m === "study" ? "bg-blue-600" : m === "gym" ? "bg-green-600" : m === "habits" ? "bg-violet-600" : "bg-amber-600";
                    const lbl = m === "study" ? "Study" : m === "gym" ? "Gym" : m === "habits" ? "Habits" : "To-do";
                    return <button key={m} onClick={(e) => { e.stopPropagation(); setChartMode(m); }} className={`px-2.5 py-1 rounded-lg text-[10px] font-black press ${active ? color + " text-white" : "bg-slate-800 text-slate-500"}`}>{lbl}</button>;
                  })}
                </div>
              </div>
              <div className="flex gap-2 h-32 items-end">
                {weekData.map((w) => {
                  const pct = chartMode === "todo" ? (todoWeekTotals[w.date] ? Math.min(100, Math.round((w.value / todoWeekTotals[w.date]) * 100)) : 0) : Math.min(100, Math.round((w.value / Math.max(dailyTarget, 1)) * 100));
                  return (
                    <div key={w.date} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
                      {pct > 0 && <span className="text-[9px] text-slate-500 font-bold">{pct}%</span>}
                      <div className={`w-full rounded-t-lg bg-gradient-to-t ${barColor}`} style={{ height: `${Math.max(pct * 0.8, w.value > 0 ? 10 : 3)}%` }} />
                      <span className="text-[9px] text-slate-500 font-semibold">{dayLabel(w.date)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
              <h3 className="text-sm font-black mb-4 flex items-center gap-2"><IconTile emoji="📋" gradient="bg-amber-600/20" />Today&apos;s Tasks</h3>
              <form onSubmit={addTask} className="flex gap-2 mb-4">
                <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add a task for today..." className="flex-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500" />
                <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-black press">Add</button>
              </form>
              <div className="grid gap-2 max-h-72 overflow-y-auto">
                {tasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between bg-slate-800/60 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleTask(t.id, t.completed)} className={`w-6 h-6 rounded-md border-2 flex items-center justify-center press ${t.completed ? "bg-green-500 border-green-500" : "border-slate-600"}`}>{t.completed && <span className="text-xs text-white font-black">✓</span>}</button>
                      <span className={`text-sm ${t.completed ? "line-through text-slate-500" : ""}`}>{t.title}</span>
                    </div>
                    <button onClick={() => deleteTask(t.id)} className="text-red-400 text-xs press">✕</button>
                  </div>
                ))}
                {tasks.length === 0 && <div className="text-center py-6"><p className="text-3xl mb-2">📭</p><p className="text-slate-500 text-sm">No tasks yet — add your first!</p></div>}
              </div>
            </div>
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
              <h3 className="text-sm font-black mb-4 flex items-center gap-2"><IconTile emoji="⏳" gradient="bg-red-600/20" />Countdowns</h3>
              <form onSubmit={addCountdown} className="flex flex-wrap gap-2 mb-4">
                <input value={cdTitle} onChange={(e) => setCdTitle(e.target.value)} placeholder="e.g. Math exam" required className="flex-1 min-w-[140px] p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500" />
                <input type="date" value={cdDate} onChange={(e) => setCdDate(e.target.value)} required className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500" />
                <select value={cdEmoji} onChange={(e) => setCdEmoji(e.target.value)} className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500">
                  <option value="📚">📚</option><option value="🏋️">🏋️</option><option value="✅">✅</option><option value="🎯"></option><option value="💼">💼</option>
                </select>
                <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-sm font-black press">Add</button>
              </form>
              <div className="grid gap-2 max-h-72 overflow-y-auto">
                {countdowns.map((c) => {
                  const d = daysLeft(c.target_date, today);
                  return (
                    <div key={c.id} className="flex items-center justify-between bg-slate-800/60 p-3 rounded-xl">
                      <div className="flex items-center gap-3"><span className="text-xl">{c.emoji}</span><div><p className="text-sm font-bold">{c.title}</p><p className="text-[10px] text-slate-500">{c.target_date}</p></div></div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${badgeColor(d)}`}>{d < 0 ? "passed" : d === 0 ? "TODAY! 🔥" : `${d}d left`}</span>
                        <button onClick={() => deleteCountdown(c.id)} className="text-red-400 text-xs press">✕</button>
                      </div>
                    </div>
                  );
                })}
                {countdowns.length === 0 && <div className="text-center py-6"><p className="text-3xl mb-2">🎯</p><p className="text-slate-500 text-sm">Add your exam or goal date!</p></div>}
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function uidSafe(u: string) { return u; }