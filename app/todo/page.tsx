"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Todo = {
  id: string;
  title: string;
  completed: boolean;
  reminder_time: string | null;
  task_date: string;
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

export default function TodoPage() {
  const today = toLocalISO(new Date());
  const [date, setDate] = useState(today);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [streak, setStreak] = useState(0);
  const [remindersOn, setRemindersOn] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newTime, setNewTime] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTime, setEditTime] = useState("");
  const notified = useRef<Set<string>>(new Set());
  const router = useRouter();

  const load = async (selectedDate: string) => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) {
      router.push("/login");
      return;
    }
    const [rows, allDone] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("category", "todo")
        .eq("task_date", selectedDate)
        .order("created_at"),
      supabase
        .from("tasks")
        .select("task_date")
        .eq("user_id", userId)
        .eq("category", "todo")
        .eq("completed", true),
    ]);
    setTodos(rows.data || []);
    setStreak(
      calcStreak(new Set((allDone.data || []).map((r) => r.task_date)), today)
    );
  };

  useEffect(() => {
    load(date);
  }, [date]);

  useEffect(() => {
    setRemindersOn(localStorage.getItem("dg-reminders") === "1");
  }, []);

  const toggleReminders = () => {
    if (remindersOn) {
      localStorage.removeItem("dg-reminders");
      setRemindersOn(false);
      return;
    }
    localStorage.setItem("dg-reminders", "1");
    setRemindersOn(true);
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  useEffect(() => {
    if (!remindersOn) return;

    const check = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const nowHM = `${hh}:${mm}`;
      const todayStr = toLocalISO(now);

      todos.forEach((t) => {
        if (!t.reminder_time || t.completed || t.task_date !== todayStr)
          return;
        const time = t.reminder_time.slice(0, 5);
        const key = `${t.id}-${todayStr}-${time}`;
        if (time === nowHM && !notified.current.has(key)) {
          notified.current.add(key);
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("DAILY GOAL ⏰", { body: `Time to: ${t.title}` });
          } else {
            alert(`DAILY GOAL ⏰ Time to: ${t.title}`);
          }
        }
      });
    };

    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [todos, remindersOn]);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId || !newTask.trim()) return;

    await supabase.from("tasks").insert({
      user_id: userId,
      title: newTask.trim(),
      task_date: date,
      category: "todo",
      reminder_time: newTime || null,
    });
    setNewTask("");
    setNewTime("");
    await load(date);
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    await supabase.from("tasks").update({ completed: !completed }).eq("id", id);
    setTodos(todos.map((t) => (t.id === id ? { ...t, completed: !completed } : t)));
  };

  const deleteTodo = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    setTodos(todos.filter((t) => t.id !== id));
  };

  const startEdit = (t: Todo) => {
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditTime(t.reminder_time ? t.reminder_time.slice(0, 5) : "");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await supabase
      .from("tasks")
      .update({ title: editTitle, reminder_time: editTime || null })
      .eq("id", editingId);
    setEditingId(null);
    await load(date);
  };

  const doneCount = todos.filter((t) => t.completed).length;
  const pct = todos.length ? Math.round((doneCount / todos.length) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-xl">📝</span>
            To-Do List
          </h1>
          <p className="text-slate-400">
            {date === today ? "Today" : date} • Your daily plan
            {streak > 0 && (
              <span className="text-orange-400"> • 🔥 {streak} day streak</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleReminders}
            className={`px-3 py-2 rounded text-sm font-semibold ${
              remindersOn ? "bg-green-700" : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            {remindersOn ? "🔔 Reminders ON" : "🔕 Reminders OFF"}
          </button>
          <button
            onClick={() => setDate(addDays(date, -1))}
            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700"
          >
            ←
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="p-2 rounded bg-slate-800 border border-slate-700"
          />
          <button
            onClick={() => setDate(addDays(date, 1))}
            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700"
          >
            →
          </button>
          {date !== today && (
            <button
              onClick={() => setDate(today)}
              className="px-3 py-2 rounded bg-amber-600 hover:bg-amber-500 text-sm"
            >
              Today
            </button>
          )}
        </div>
      </div>

      <div className="mb-8">
        <div className="flex justify-between text-sm mb-1 text-slate-400">
          <span>✅ Day completion</span>
          <span>
            {doneCount}/{todos.length} • {pct}%
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-amber-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <form
        onSubmit={addTodo}
        className="bg-slate-900 p-6 rounded-lg mb-8 flex flex-wrap gap-4"
      >
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add to your daily plan (e.g. Finish project report)"
          required
          className="flex-1 min-w-[200px] p-3 rounded bg-slate-800 border border-slate-700"
        />
        <div className="relative flex items-center">
          {newTime === "" && (
            <span className="absolute left-3 text-slate-500 pointer-events-none">
                                time
            </span>
          )}
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className={`p-3 rounded bg-slate-800 border border-slate-700 w-full ${
              newTime === "" ? "text-transparent" : ""
            }`}
            title="Reminder time (optional)"
          />
        </div>
        <button className="px-6 rounded bg-amber-600 font-semibold hover:bg-amber-500">
          Add
        </button>
      </form>

      <div className="grid gap-4">
        {todos.map((t) => (
          <div
            key={t.id}
            className="bg-slate-900 p-4 rounded-lg flex items-center justify-between gap-4 flex-wrap"
          >
            {editingId === t.id ? (
              <div className="flex flex-wrap gap-2 flex-1">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 min-w-[150px] p-2 rounded bg-slate-800 border border-slate-700"
                />
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="p-2 rounded bg-slate-800 border border-slate-700"
                />
                <button
                  onClick={saveEdit}
                  className="px-4 py-2 rounded bg-yellow-600 hover:bg-yellow-500 text-sm font-semibold"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleTodo(t.id, t.completed)}
                    className={`w-5 h-5 rounded border flex items-center justify-center ${
                      t.completed
                        ? "bg-green-500 border-green-500"
                        : "bg-slate-800 border-slate-600"
                    }`}
                  >
                    {t.completed && <span className="text-xs text-white font-bold">✓</span>}
                  </button>
                  <div>
                    <p className={`font-semibold ${t.completed ? "line-through text-slate-500" : ""}`}>
                      {t.title}
                    </p>
                    <p className="text-sm text-slate-400">
                      {t.task_date}
                      {t.reminder_time && (
                        <span className="ml-2">⏰ {t.reminder_time.slice(0, 5)}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => startEdit(t)}
                    className="text-yellow-400 hover:text-yellow-300 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTodo(t.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {todos.length === 0 && (
          <p className="text-slate-400">No plans for this date yet. Write your daily plan above!</p>
        )}
      </div>
    </main>
  );
}