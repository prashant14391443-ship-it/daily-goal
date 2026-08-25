"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { useRouter } from "next/navigation";
import { ProgressRing, IconTile, GradButton, EmptyState } from "@/app/components/ui";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todosRef = useRef<Todo[]>([]);
  useEffect(() => { todosRef.current = todos; }, [todos]);

  const router = useRouter();

  const load = async (selectedDate: string) => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) { router.push("/login"); return; }
    const [rows, allDone] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", userId).eq("category", "todo").eq("task_date", selectedDate).order("created_at"),
      supabase.from("tasks").select("task_date").eq("user_id", userId).eq("category", "todo").eq("completed", true),
    ]);
    setTodos(rows.data || []);
    setStreak(calcStreak(new Set((allDone.data || []).map((r) => r.task_date)), today));
  };

  useEffect(() => { load(date); }, [date]);
  useEffect(() => { setRemindersOn(localStorage.getItem("dg-reminders") === "1"); }, []);

  const toggleReminders = () => {
    if (remindersOn) { localStorage.removeItem("dg-reminders"); setRemindersOn(false); return; }
    localStorage.setItem("dg-reminders", "1");
    setRemindersOn(true);
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  };

  useEffect(() => {
    if (!remindersOn) return;
    const check = () => {
      if (/Android/i.test(navigator.userAgent)) return;
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const nowHM = `${hh}:${mm}`;
      const todayStr = toLocalISO(now);
      const cache = JSON.parse(sessionStorage.getItem("dg-notified") || "[]");
      todosRef.current.forEach((t) => {
        if (!t.reminder_time || t.completed || t.task_date !== todayStr) return;
        const time = t.reminder_time.slice(0, 5);
        const key = `${t.id}-${todayStr}-${time}`;
        if (time === nowHM && !cache.includes(key)) {
          cache.push(key);
          if (cache.length > 50) cache.shift();
          sessionStorage.setItem("dg-notified", JSON.stringify(cache));
          recordNotification("DAILY GOAL ⏰", `Time to: ${t.title}`);
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
  }, [remindersOn]);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId || !newTask.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await supabase.from("tasks").insert({
        user_id: userId, title: newTask.trim(), task_date: date,
        category: "todo", reminder_time: newTime || null,
      });
      setNewTask(""); setNewTime("");
      await load(date);
    } finally { setIsSubmitting(false); }
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
    await supabase.from("tasks").update({ title: editTitle, reminder_time: editTime || null }).eq("id", editingId);
    setEditingId(null);
    await load(date);
  };

  const doneCount = todos.filter((t) => t.completed).length;
  const pct = todos.length ? Math.round((doneCount / todos.length) * 100) : 0;

  const inputCls = "w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-amber-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 HERO */}
      <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 p-4 shadow-2xl shadow-orange-900/30">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-lg">📝</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight">Task Log</h1>
            <p className="text-[10px] text-white/80 font-semibold">
              {date === today ? "Today" : date} • Your daily plan
              {streak > 0 && <span className="text-amber-200"> • 🔥 {streak} day streak</span>}
            </p>
          </div>
          <ProgressRing pct={pct} size={56} stroke={6} color="#ffffff" track="rgba(0,0,0,0.25)" />
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={toggleReminders}
          className={`press px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap border ${
            remindersOn ? "bg-green-600/20 border-green-500/40 text-green-300" : "bg-slate-900 border-slate-800 text-slate-400"
          }`}
        >
          {remindersOn ? "🔔 Reminders ON" : "🔕 Reminders OFF"}
        </button>
        <div className="flex-1 flex items-center gap-1.5 justify-end">
          <button onClick={() => setDate(addDays(date, -1))} className="press px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm">←</button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="px-2 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs outline-none focus:border-amber-500" />
          <button onClick={() => setDate(addDays(date, 1))} className="press px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm">→</button>
          {date !== today && (
            <button onClick={() => setDate(today)} className="press px-3 py-2 rounded-xl bg-amber-600 text-xs font-black">Today</button>
          )}
        </div>
      </div>

      {/* ADD FORM */}
      <form onSubmit={addTodo} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 grid gap-3 shadow-lg shadow-black/30">
        <input value={newTask} onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add to your daily plan (e.g. Finish project report)" required className={inputCls} />
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 relative">
            {newTime === "" && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">⏰ Time</span>
            )}
            <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)}
              className={`${inputCls} ${newTime === "" ? "text-transparent" : ""}`} title="Reminder time (optional)" />
          </div>
          <GradButton type="submit" gradient="from-amber-500 to-orange-600" disabled={isSubmitting} className="py-3 text-sm">
            {isSubmitting ? "Adding..." : "➕ Add"}
          </GradButton>
        </div>
      </form>

      {/* TODOS */}
      <div className="grid gap-3">
        {todos.map((t) => (
          <div key={t.id} className={`bg-slate-900 border rounded-2xl p-4 shadow-lg shadow-black/30 ${t.completed ? "border-green-500/30" : "border-slate-800"}`}>
            {editingId === t.id ? (
              <div className="flex flex-wrap gap-2">
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 min-w-[150px] p-2 rounded-xl bg-slate-800 border border-slate-700 text-sm" />
                <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)}
                  className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-sm" />
                <button onClick={saveEdit} className="press px-4 py-2 rounded-xl bg-amber-600 text-sm font-black">Save</button>
                <button onClick={() => setEditingId(null)} className="press px-4 py-2 rounded-xl bg-slate-800 text-sm">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleTodo(t.id, t.completed)}
                    className={`press w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 ${
                      t.completed ? "bg-green-500 border-green-500" : "border-slate-600"
                    }`}
                  >
                    {t.completed && <span className="text-xs text-white font-black">✓</span>}
                  </button>
                  <div className="min-w-0">
                    <p className={`font-bold text-sm truncate ${t.completed ? "line-through text-slate-500" : "text-white"}`}>
                      {t.title}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      {t.task_date}
                      {t.reminder_time && <span className="ml-2">⏰ {t.reminder_time.slice(0, 5)}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startEdit(t)} className="press text-amber-400 text-xs font-bold">Edit</button>
                  <button onClick={() => deleteTodo(t.id)} className="press text-red-400 text-xs font-bold">✕</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {todos.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl">
            <EmptyState emoji="📋✨" text="No plans yet — write your daily plan above!" />
          </div>
        )}
      </div>
    </main>
  );
}