"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Habit = {
  id: string;
  habit_name: string;
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

export default function RoutineHabits() {
  const today = toLocalISO(new Date());
  const [date, setDate] = useState(today);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [doneOnDate, setDoneOnDate] = useState<string[]>([]);
  const [allLogs, setAllLogs] = useState<
    { habit_id: string; log_date: string }[]
  >([]);
  const [newHabit, setNewHabit] = useState("");
  const [newTime, setNewTime] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTime, setEditTime] = useState("");
  const [remindersOn, setRemindersOn] = useState(false);
  const router = useRouter();
  const notified = useRef<Set<string>>(new Set());

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) {
      router.push("/login");
      return;
    }

    const [h, logs, done] = await Promise.all([
      supabase
        .from("habits")
        .select("*")
        .eq("user_id", userId)
        .order("created_at"),
      supabase
        .from("habit_logs")
        .select("habit_id, log_date")
        .eq("user_id", userId)
        .eq("completed", true),
      supabase
        .from("habit_logs")
        .select("habit_id")
        .eq("user_id", userId)
        .eq("log_date", date),
    ]);

    setHabits(h.data || []);
    setAllLogs(logs.data || []);
    setDoneOnDate((done.data || []).map((d) => d.habit_id));
  };

  useEffect(() => {
    load();
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

      const doneToday = new Set(
        allLogs.filter((l) => l.log_date === todayStr).map((l) => l.habit_id)
      );

      habits.forEach((h) => {
        if (!h.reminder_time) return;
        const t = h.reminder_time.slice(0, 5);
        const key = `${h.id}-${todayStr}-${t}`;
        if (t === nowHM && !doneToday.has(h.id) && !notified.current.has(key)) {
          notified.current.add(key);
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("DAILY GOAL ⏰", {
              body: `Time to: ${h.habit_name}`,
            });
          } else {
            alert(`DAILY GOAL ⏰ Time to: ${h.habit_name}`);
          }
        }
      });
    };

    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [remindersOn, habits, allLogs]);

  const addHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;

    await supabase.from("habits").insert({
      user_id: userId,
      habit_name: newHabit,
      reminder_time: newTime || null,
    });
    setNewHabit("");
    setNewTime("");
    await load();
  };

  const startEdit = (h: Habit) => {
    setEditingId(h.id);
    setEditName(h.habit_name);
    setEditTime(h.reminder_time ? h.reminder_time.slice(0, 5) : "");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await supabase
      .from("habits")
      .update({ habit_name: editName, reminder_time: editTime || null })
      .eq("id", editingId);
    setEditingId(null);
    await load();
  };

  const toggleHabit = async (habitId: string) => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;

    const isDone = doneOnDate.includes(habitId);
    if (isDone) {
      await supabase
        .from("habit_logs")
        .delete()
        .eq("habit_id", habitId)
        .eq("log_date", date);
    } else {
      await supabase.from("habit_logs").insert({
        user_id: userId,
        habit_id: habitId,
        log_date: date,
        completed: true,
      });
    }
    await load();
  };

  const deleteHabit = async (id: string) => {
    await supabase.from("habits").delete().eq("id", id);
    await load();
  };

  const streakFor = (habitId: string) => {
    const dates = new Set(
      allLogs.filter((l) => l.habit_id === habitId).map((l) => l.log_date)
    );
    return calcStreak(dates, today);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-xl">✅</span>
            Routine & Habits
          </h1>
          <p className="text-slate-400">{date === today ? "Today" : date}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleReminders}
            className={`px-3 py-2 rounded text-sm font-semibold ${
              remindersOn
                ? "bg-green-700"
                : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            <span className="hidden md:inline"><span className="hidden md:inline">{remindersOn ? "🔔 Reminders ON" : "🔕 Reminders OFF"}</span>
            <span className="md:hidden">{remindersOn ? "🔔" : "🔕"}</span></span>
            <span className="md:hidden">{remindersOn ? "🔔" : "🔕"}</span>
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
              className="px-3 py-2 rounded bg-purple-600 hover:bg-purple-500 text-sm"
            >
              Today
            </button>
          )}
        </div>
      </div>

      <form
        onSubmit={addHabit}
        className="bg-slate-900 p-6 rounded-lg mb-8 flex flex-wrap gap-4"
      >
        <input
          value={newHabit}
          onChange={(e) => setNewHabit(e.target.value)}
          placeholder="New habit (e.g. Drink 2L water)"
          required
          className="flex-1 min-w-[200px] p-3 rounded bg-slate-800 border border-slate-700"
        />
        <div className="relative">
          {newTime === "" && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
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
        <button
          type="submit"
          className="px-6 rounded bg-purple-600 font-semibold hover:bg-purple-500"
        >
          Add Habit
        </button>
      </form>

      <div className="grid gap-4">
        {habits.map((h) => {
          const isDone = doneOnDate.includes(h.id);
          const streak = streakFor(h.id);
          return (
            <div
              key={h.id}
              className="bg-slate-900 p-4 rounded-lg flex items-center justify-between gap-4 flex-wrap"
            >
              {editingId === h.id ? (
                <div className="flex flex-wrap gap-2 flex-1">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="p-2 rounded bg-slate-800 border border-slate-700"
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
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleHabit(h.id)}
                      className={`w-7 h-7 rounded border-2 flex items-center justify-center ${
                        isDone
                          ? "bg-green-500 border-green-500"
                          : "bg-slate-800 border-slate-600"
                      }`}
                    >
                      {isDone && (
                        <span className="text-white text-sm font-bold">✓</span>
                      )}
                    </button>
                    <div>
                      <span
                        className={`text-lg ${
                          isDone ? "line-through text-slate-500" : ""
                        }`}
                      >
                        {h.habit_name}
                      </span>
                      <p className="text-xs text-slate-400">
                        {streak > 0 && (
                          <span className="text-orange-400">
                            🔥 {streak} day streak
                          </span>
                        )}
                        {h.reminder_time && (
                          <span className="ml-2">
                            ⏰ {h.reminder_time.slice(0, 5)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => startEdit(h)}
                      className="text-yellow-400 hover:text-yellow-300 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteHabit(h.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
        {habits.length === 0 && (
          <p className="text-slate-400">
            No habits yet. Add your first one above!
          </p>
        )}
      </div>
    </main>
  );
}