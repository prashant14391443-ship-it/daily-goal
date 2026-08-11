"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Log = {
  id: string;
  workout_type: string;
  duration_minutes: number;
  notes: string | null;
  session_date: string;
  completed: boolean;
  reminder_time: string | null;
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

export default function GymLog() {
  const today = toLocalISO(new Date());
  const [date, setDate] = useState(today);
  const [logs, setLogs] = useState<Log[]>([]);
  const [streak, setStreak] = useState(0);
  const [remindersOn, setRemindersOn] = useState(false);
  const [workoutType, setWorkoutType] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const notified = useRef<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    setRemindersOn(
      "Notification" in window &&
        Notification.permission === "granted" &&
        localStorage.getItem("dg-reminders") === "1"
    );
  }, []);

  const load = async (selectedDate: string) => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) {
      router.push("/login");
      return;
    }
    const [rows, allDone] = await Promise.all([
      supabase
        .from("gym_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("session_date", selectedDate)
        .order("created_at", { ascending: false }),
      supabase
        .from("gym_logs")
        .select("session_date")
        .eq("user_id", userId)
        .eq("completed", true),
    ]);
    setLogs(rows.data || []);
    setStreak(calcStreak(new Set((allDone.data || []).map((r) => r.session_date)), today));
  };

  useEffect(() => {
    load(date);
  }, [date]);

  const toggleReminders = async () => {
    if (remindersOn) {
      localStorage.removeItem("dg-reminders");
      setRemindersOn(false);
      return;
    }
    if (!("Notification" in window)) {
      alert("This browser does not support notifications.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      localStorage.setItem("dg-reminders", "1");
      setRemindersOn(true);
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

      logs.forEach((l) => {
        if (!l.reminder_time || l.completed || l.session_date !== todayStr)
          return;
        const time = l.reminder_time.slice(0, 5);
        const key = `${l.id}-${todayStr}-${time}`;
        if (time === nowHM && !notified.current.has(key)) {
          notified.current.add(key);
          new Notification("DAILY GOAL ⏰", {
            body: `Time to: ${l.workout_type}`,
          });
        }
      });
    };

    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [logs, remindersOn]);

  const toggleComplete = async (id: string, completed: boolean) => {
    await supabase
      .from("gym_logs")
      .update({ completed: !completed })
      .eq("id", id);
    setLogs(logs.map((l) => (l.id === id ? { ...l, completed: !completed } : l)));
  };

  const resetForm = () => {
    setWorkoutType("");
    setDuration("");
    setNotes("");
    setReminderTime("");
    setEditingId(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;

    if (editingId) {
      await supabase
        .from("gym_logs")
        .update({
          workout_type: workoutType,
          duration_minutes: Number(duration),
          notes,
          session_date: date,
          reminder_time: reminderTime || null,
        })
        .eq("id", editingId);
    } else {
      await supabase.from("gym_logs").insert({
        user_id: userId,
        workout_type: workoutType,
        duration_minutes: Number(duration),
        notes,
        session_date: date,
        reminder_time: reminderTime || null,
      });
    }
    resetForm();
    await load(date);
    setLoading(false);
  };

  const startEdit = (l: Log) => {
    setEditingId(l.id);
    setWorkoutType(l.workout_type);
    setDuration(String(l.duration_minutes));
    setNotes(l.notes || "");
    setReminderTime(l.reminder_time ? l.reminder_time.slice(0, 5) : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteLog = async (id: string) => {
    await supabase.from("gym_logs").delete().eq("id", id);
    if (editingId === id) resetForm();
    await load(date);
  };

  const totalMinutes = logs.reduce((sum, l) => sum + l.duration_minutes, 0);
  const doneCount = logs.filter((l) => l.completed).length;
  const pct = logs.length ? Math.round((doneCount / logs.length) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">🏋️ Gym Log</h1>
          <p className="text-slate-400">
            {date === today ? "Today" : date} • Total:{" "}
            {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
            {streak > 0 && (
              <span className="text-orange-400"> • 🔥 {streak} day streak</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleReminders}
            className={`px-3 py-2 rounded text-sm font-semibold ${
              remindersOn
                ? "bg-green-700 cursor-pointer"
                : "bg-slate-800 hover:bg-slate-700"
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
              className="px-3 py-2 rounded bg-green-600 hover:bg-green-500 text-sm"
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
            {doneCount}/{logs.length} • {pct}%
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-600 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <form
        onSubmit={submit}
        className="bg-slate-900 p-6 rounded-lg mb-8 grid grid-cols-1 md:grid-cols-5 gap-4"
      >
        <input
          value={workoutType}
          onChange={(e) => setWorkoutType(e.target.value)}
          placeholder="Workout (e.g. Chest)"
          required
          className="p-3 rounded bg-slate-800 border border-slate-700"
        />
        <input
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          type="number"
          min="1"
          placeholder="Minutes"
          required
          className="p-3 rounded bg-slate-800 border border-slate-700"
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="p-3 rounded bg-slate-800 border border-slate-700"
        />
        <input
          type="time"
          value={reminderTime}
          onChange={(e) => setReminderTime(e.target.value)}
          className="p-3 rounded bg-slate-800 border border-slate-700"
          title="Reminder time (optional)"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 p-3 rounded font-semibold disabled:opacity-50 ${
              editingId
                ? "bg-yellow-600 hover:bg-yellow-500"
                : "bg-green-600 hover:bg-green-500"
            }`}
          >
            {loading ? "Saving..." : editingId ? "Save Changes" : "Add Workout"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="p-3 rounded bg-slate-700 hover:bg-slate-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="grid gap-4">
        {logs.map((l) => (
          <div
            key={l.id}
            className={`bg-slate-900 p-4 rounded-lg flex items-center justify-between gap-4 ${
              editingId === l.id ? "ring-2 ring-yellow-500" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleComplete(l.id, l.completed)}
                className={`w-5 h-5 rounded border flex items-center justify-center ${
                  l.completed
                    ? "bg-green-500 border-green-500"
                    : "bg-slate-800 border-slate-600"
                }`}
              >
                {l.completed && (
                  <span className="text-xs text-white font-bold">✓</span>
                )}
              </button>
              <div>
                <p
                  className={`font-semibold ${
                    l.completed ? "line-through text-slate-500" : ""
                  }`}
                >
                  {l.workout_type}{" "}
                  <span className="text-slate-400">({l.duration_minutes} min)</span>
                </p>
                <p className="text-sm text-slate-400">
                  {l.session_date}
                  {l.notes && <span className="italic"> • {l.notes}</span>}
                  {l.reminder_time && (
                    <span className="ml-2">⏰ {l.reminder_time.slice(0, 5)}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => startEdit(l)}
                className="text-yellow-400 hover:text-yellow-300 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => deleteLog(l.id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <p className="text-slate-400">No workouts on this date. Get moving! 💪</p>
        )}
      </div>
    </main>
  );
}