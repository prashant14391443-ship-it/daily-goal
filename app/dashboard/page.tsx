"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Task = { id: string; title: string; completed: boolean };
type DayStat = { date: string; value: number };
type Goals = {
  study_target: number;
  workout_target: number;
  habits_target: number;
};
type Countdown = {
  id: string;
  title: string;
  target_date: string;
  emoji: string;
};

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

function dayLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function daysLeft(target: string, today: string) {
  const t = new Date(target + "T00:00:00").getTime();
  const n = new Date(today + "T00:00:00").getTime();
  return Math.round((t - n) / 86400000);
}

function badgeColor(d: number) {
  if (d < 0) return "bg-slate-700 text-slate-300";
  if (d === 0) return "bg-red-600 text-white";
  if (d <= 7) return "bg-red-700 text-white";
  if (d <= 30) return "bg-orange-600 text-white";
  return "bg-green-700 text-white";
}

function ProgressBar({
  label,
  value,
  target,
  unit,
  color,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}) {
  const pct = Math.min(100, Math.round((value / Math.max(target, 1)) * 100));
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-slate-400">
          {value} / {target} {unit} • {pct}%
        </span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
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
  const [goals, setGoals] = useState<Goals>({
    study_target: 120,
    workout_target: 1,
    habits_target: 3,
  });
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalStudy, setGoalStudy] = useState("120");
  const [goalWorkout, setGoalWorkout] = useState("1");
  const [goalHabits, setGoalHabits] = useState("3");
  const [habitStreaks, setHabitStreaks] = useState<
    { name: string; streak: number }[]
  >([]);
  const [studyWeekData, setStudyWeekData] = useState<DayStat[]>([]);
  const [gymWeekData, setGymWeekData] = useState<DayStat[]>([]);
  const [habitsWeekData, setHabitsWeekData] = useState<DayStat[]>([]);
  const [chartMode, setChartMode] = useState<"study" | "gym" | "habits">("study");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [cdTitle, setCdTitle] = useState("");
  const [cdDate, setCdDate] = useState("");
  const [cdEmoji, setCdEmoji] = useState("📚");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) {
      router.push("/login");
      return;
    }

    const email = data.session?.user.email || "friend";
    const rawName = email.split("@")[0];
    setUserName(rawName.charAt(0).toUpperCase() + rawName.slice(1));

    const weekStart = addDays(today, -6);

    const [study, studyW, gym, gymW, habits, habitLogs, tasksRes, goalsRes, cdRes, todoRes] =
      await Promise.all([
        supabase
          .from("study_sessions")
          .select("duration_minutes")
          .eq("user_id", userId)
          .eq("session_date", today),
        supabase
          .from("study_sessions")
          .select("duration_minutes, session_date")
          .eq("user_id", userId)
          .gte("session_date", weekStart),
        supabase
          .from("gym_logs")
          .select("id")
          .eq("user_id", userId)
          .eq("session_date", today),
        supabase
          .from("gym_logs")
          .select("duration_minutes, session_date")
          .eq("user_id", userId)
          .gte("session_date", weekStart),
        supabase.from("habits").select("id, habit_name").eq("user_id", userId),
        supabase
          .from("habit_logs")
          .select("habit_id, log_date")
          .eq("user_id", userId)
          .eq("completed", true),
        supabase
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .eq("category", "general")
          .eq("task_date", today)
          .order("created_at"),
        supabase
          .from("user_goals")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("countdowns")
          .select("*")
          .eq("user_id", userId)
          .order("target_date"),
        supabase
          .from("tasks")
          .select("id, completed")
          .eq("user_id", userId)
          .eq("category", "todo")
          .eq("task_date", today),
      ]);

    setStudyMinutes(
      (study.data || []).reduce((s, r) => s + r.duration_minutes, 0)
    );
    setWorkouts((gym.data || []).length);

    if (goalsRes.data) {
      setGoals({
        study_target: goalsRes.data.study_target,
        workout_target: goalsRes.data.workout_target,
        habits_target: goalsRes.data.habits_target,
      });
      setGoalStudy(String(goalsRes.data.study_target));
      setGoalWorkout(String(goalsRes.data.workout_target));
      setGoalHabits(String(goalsRes.data.habits_target));
    }

    setHabitsDone(
      new Set(
        (habitLogs.data || [])
          .filter((l) => l.log_date === today)
          .map((l) => l.habit_id)
      ).size
    );

    const todoRows = todoRes.data || [];
    setTodoTotal(todoRows.length);
    setTodoDone(todoRows.filter((t) => t.completed).length);

    setHabitStreaks(
      (habits.data || []).map((h) => {
        const dates = new Set(
          (habitLogs.data || [])
            .filter((l) => l.habit_id === h.id)
            .map((l) => l.log_date)
        );
        return { name: h.habit_name, streak: calcStreak(dates, today) };
      })
    );

    const buildWeek = (
      rows: { session_date: string; duration_minutes: number }[] | null
    ) => {
      const days: DayStat[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = addDays(today, -i);
        const val = (rows || [])
          .filter((r) => r.session_date === d)
          .reduce((s, r) => s + r.duration_minutes, 0);
        days.push({ date: d, value: val });
      }
      return days;
    };

    setStudyWeekData(buildWeek(studyW.data));
    setGymWeekData(buildWeek(gymW.data));

    const habitDays: DayStat[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(today, -i);
      const count = new Set(
        (habitLogs.data || [])
          .filter((l) => l.log_date === d)
          .map((l) => l.habit_id)
      ).size;
      habitDays.push({ date: d, value: count });
    }
    setHabitsWeekData(habitDays);

    setTasks(tasksRes.data || []);
    setCountdowns(cdRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const saveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;

    const g: Goals = {
      study_target: Number(goalStudy) || 120,
      workout_target: Number(goalWorkout) || 1,
      habits_target: Number(goalHabits) || 3,
    };

    await supabase.from("user_goals").upsert({ user_id: userId, ...g });
    setGoals(g);
    setEditingGoals(false);
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId || !newTask.trim()) return;

    await supabase.from("tasks").insert({
      user_id: userId,
      title: newTask.trim(),
      task_date: today,
      category: "general",
    });
    setNewTask("");
    await load();
  };

  const toggleTask = async (id: string, completed: boolean) => {
    await supabase.from("tasks").update({ completed: !completed }).eq("id", id);
    setTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: !completed } : t))
    );
  };

  const deleteTask = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const addCountdown = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId || !cdTitle.trim() || !cdDate) return;

    await supabase.from("countdowns").insert({
      user_id: userId,
      title: cdTitle.trim(),
      target_date: cdDate,
      emoji: cdEmoji,
    });
    setCdTitle("");
    setCdDate("");
    await load();
  };

  const deleteCountdown = async (id: string) => {
    await supabase.from("countdowns").delete().eq("id", id);
    setCountdowns(countdowns.filter((c) => c.id !== id));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const weekData =
    chartMode === "study"
      ? studyWeekData
      : chartMode === "gym"
      ? gymWeekData
      : habitsWeekData;
  const maxVal = Math.max(...weekData.map((w) => w.value), 1);
  const barColor =
    chartMode === "study"
      ? "bg-blue-600 hover:bg-blue-500"
      : chartMode === "gym"
      ? "bg-green-600 hover:bg-green-500"
      : "bg-purple-600 hover:bg-purple-500";
  const unit = chartMode === "habits" ? "done" : "min";

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">
            {greeting}, {userName}! 👋
          </h1>
          <p className="text-slate-400">Here is your day at a glance — {today}</p>
        </div>
        <nav className="hidden md:flex flex-wrap gap-4 text-sm items-center">
          <Link href="/study-tracker" className="text-slate-300 hover:text-white">
            Study
          </Link>
          <Link href="/gym-log" className="text-slate-300 hover:text-white">
            Gym
          </Link>
          <Link href="/routine-habits" className="text-slate-300 hover:text-white">
            Habits
          </Link>
          <Link href="/todo" className="text-slate-300 hover:text-white">
            ToDo
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-500 px-4 py-1.5 rounded font-semibold"
          >
            Logout
          </button>
        </nav>
        <button
          onClick={handleLogout}
          className="md:hidden bg-red-600 hover:bg-red-500 px-4 py-1.5 rounded font-semibold text-sm"
        >
          Logout
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading your day...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-8">
            <Link
              href="/study-tracker"
              className="bg-slate-900 p-4 md:p-6 rounded-xl hover:bg-slate-800"
            >
              <h3 className="text-base md:text-lg font-bold text-blue-400 mb-2">📚 Study</h3>
              <p className="text-2xl md:text-3xl font-extrabold">
                {Math.floor(studyMinutes / 60)}h {studyMinutes % 60}m
              </p>
              <p className="text-xs md:text-sm text-slate-400 mt-1">today</p>
            </Link>

            <Link
              href="/gym-log"
              className="bg-slate-900 p-4 md:p-6 rounded-xl hover:bg-slate-800"
            >
              <h3 className="text-base md:text-lg font-bold text-green-400 mb-2">🏋️ Gym</h3>
              <p className="text-2xl md:text-3xl font-extrabold">{workouts}</p>
              <p className="text-xs md:text-sm text-slate-400 mt-1">workouts today</p>
            </Link>

            <Link
              href="/routine-habits"
              className="bg-slate-900 p-4 md:p-6 rounded-xl hover:bg-slate-800"
            >
              <h3 className="text-base md:text-lg font-bold text-purple-400 mb-2">✅ Habits</h3>
              <p className="text-2xl md:text-3xl font-extrabold">
                {habitsDone} / {goals.habits_target}
              </p>
              <p className="text-xs md:text-sm text-slate-400 mt-1">completed today</p>
            </Link>

            <Link
              href="/todo"
              className="bg-slate-900 p-4 md:p-6 rounded-xl hover:bg-slate-800"
            >
              <h3 className="text-base md:text-lg font-bold text-amber-400 mb-2">📝 ToDo</h3>
              <p className="text-2xl md:text-3xl font-extrabold">
                {todoDone} / {todoTotal}
              </p>
              <p className="text-xs md:text-sm text-slate-400 mt-1">done today</p>
            </Link>

            <div className="bg-slate-900 p-4 md:p-6 rounded-xl col-span-2 md:col-span-1">
              <h3 className="text-base md:text-lg font-bold text-orange-400 mb-2">🔥 Streaks</h3>
              {habitStreaks.length === 0 ? (
                <p className="text-xs text-slate-500">Add habits to build streaks.</p>
              ) : (
                <div className="grid gap-2 max-h-28 overflow-y-auto">
                  {habitStreaks.map((h) => (
                    <div key={h.name} className="flex justify-between text-xs md:text-sm">
                      <span className={h.streak > 0 ? "" : "text-slate-500"}>
                        {h.name}
                      </span>
                      <span className="text-orange-400 font-semibold">
                        {h.streak} 🔥
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-900 p-6 rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">🎯 Daily Goals</h3>
                <button
                  onClick={() => setEditingGoals(!editingGoals)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  {editingGoals ? "Close" : "Edit goals"}
                </button>
              </div>
              {editingGoals ? (
                <form onSubmit={saveGoals} className="grid gap-3">
                  <label className="text-sm flex justify-between items-center gap-2">
                    Study (min/day)
                    <input
                      type="number"
                      min="1"
                      value={goalStudy}
                      onChange={(e) => setGoalStudy(e.target.value)}
                      className="w-24 p-1 rounded bg-slate-800 border border-slate-700"
                    />
                  </label>
                  <label className="text-sm flex justify-between items-center gap-2">
                    Workouts/day
                    <input
                      type="number"
                      min="1"
                      value={goalWorkout}
                      onChange={(e) => setGoalWorkout(e.target.value)}
                      className="w-24 p-1 rounded bg-slate-800 border border-slate-700"
                    />
                  </label>
                  <label className="text-sm flex justify-between items-center gap-2">
                    Habits/day
                    <input
                      type="number"
                      min="1"
                      value={goalHabits}
                      onChange={(e) => setGoalHabits(e.target.value)}
                      className="w-24 p-1 rounded bg-slate-800 border border-slate-700"
                    />
                  </label>
                  <button className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm font-semibold">
                    Save goals
                  </button>
                </form>
              ) : (
                <div className="grid gap-4">
                  <ProgressBar
                    label="📚 Study"
                    value={studyMinutes}
                    target={goals.study_target}
                    unit="min"
                    color="bg-blue-600"
                  />
                  <ProgressBar
                    label="🏋️ Workouts"
                    value={workouts}
                    target={goals.workout_target}
                    unit=""
                    color="bg-green-600"
                  />
                  <ProgressBar
                    label="✅ Habits"
                    value={habitsDone}
                    target={goals.habits_target}
                    unit=""
                    color="bg-purple-600"
                  />
                </div>
              )}
            </div>

            <div className="bg-slate-900 p-6 rounded-xl">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-lg font-bold">📊 Last 7 days</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setChartMode("study")}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      chartMode === "study"
                        ? "bg-blue-600"
                        : "bg-slate-800 hover:bg-slate-700"
                    }`}
                  >
                    📚 Study
                  </button>
                  <button
                    onClick={() => setChartMode("gym")}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      chartMode === "gym"
                        ? "bg-green-600"
                        : "bg-slate-800 hover:bg-slate-700"
                    }`}
                  >
                    🏋️ Gym
                  </button>
                  <button
                    onClick={() => setChartMode("habits")}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      chartMode === "habits"
                        ? "bg-purple-600"
                        : "bg-slate-800 hover:bg-slate-700"
                    }`}
                  >
                    ✅ Habits
                  </button>
                </div>
              </div>
              <div className="flex gap-2 h-32 items-end">
                {weekData.map((w) => (
                  <div
                    key={w.date}
                    className="flex-1 h-full flex flex-col justify-end items-center gap-1"
                  >
                    <div
                      className={`w-full rounded-t ${barColor}`}
                      style={{
                        height: `${Math.max(
                          (w.value / maxVal) * 90,
                          w.value > 0 ? 8 : 2
                        )}%`,
                      }}
                      title={`${w.value} ${unit}`}
                    />
                    <span className="text-[10px] text-slate-400">
                      {dayLabel(w.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 p-6 rounded-xl">
              <h3 className="text-lg font-bold mb-4">📋 Today&apos;s Tasks</h3>
              <form onSubmit={addTask} className="flex gap-2 mb-4">
                <input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Add a task for today..."
                  className="flex-1 p-2 rounded bg-slate-800 border border-slate-700"
                />
                <button className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm font-semibold">
                  Add
                </button>
              </form>
              <div className="grid gap-2">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between bg-slate-800 p-2 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleTask(t.id, t.completed)}
                        className={`w-5 h-5 rounded border flex items-center justify-center ${
                          t.completed
                            ? "bg-green-500 border-green-500"
                            : "border-slate-600"
                        }`}
                      >
                        {t.completed && (
                          <span className="text-xs text-white">✓</span>
                        )}
                      </button>
                      <span
                        className={`text-sm ${
                          t.completed ? "line-through text-slate-500" : ""
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteTask(t.id)}
                      className="text-red-400 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="text-slate-500 text-sm">No tasks for today. Add one!</p>
                )}
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-xl">
              <h3 className="text-lg font-bold mb-4">⏳ Countdowns</h3>
              <form onSubmit={addCountdown} className="flex flex-wrap gap-2 mb-4">
                <input
                  value={cdTitle}
                  onChange={(e) => setCdTitle(e.target.value)}
                  placeholder="e.g. Math exam / Abs goal"
                  required
                  className="flex-1 min-w-[140px] p-2 rounded bg-slate-800 border border-slate-700"
                />
                <input
                  type="date"
                  value={cdDate}
                  onChange={(e) => setCdDate(e.target.value)}
                  required
                  className="p-2 rounded bg-slate-800 border border-slate-700"
                />
                <select
                  value={cdEmoji}
                  onChange={(e) => setCdEmoji(e.target.value)}
                  className="p-2 rounded bg-slate-800 border border-slate-700"
                >
                  <option value="📚">📚</option>
                  <option value="🏋️">🏋️</option>
                  <option value="✅">✅</option>
                  <option value="🎯"></option>
                  <option value="💼">💼</option>
                </select>
                <button className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm font-semibold">
                  Add
                </button>
              </form>
              <div className="grid gap-2">
                {countdowns.map((c) => {
                  const d = daysLeft(c.target_date, today);
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between bg-slate-800 p-3 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{c.emoji}</span>
                        <div>
                          <p className="text-sm font-semibold">{c.title}</p>
                          <p className="text-xs text-slate-400">{c.target_date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${badgeColor(d)}`}
                        >
                          {d < 0
                            ? "passed"
                            : d === 0
                            ? "TODAY! 🔥"
                            : `${d} days left`}
                        </span>
                        <button
                          onClick={() => deleteCountdown(c.id)}
                          className="text-red-400 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
                {countdowns.length === 0 && (
                  <p className="text-slate-500 text-sm">
                    No countdowns yet. Add your exam or fitness goal!
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}