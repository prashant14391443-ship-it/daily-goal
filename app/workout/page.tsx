"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProgressRing, IconTile, GradButton, EmptyState } from "@/app/components/ui";

type Workout = {
  id: string;
  workout_type: string;
  duration_minutes: number;
  completed: boolean;
  reminder_time: string | null;
  session_date: string;
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
  while (dates.has(cursor)) { streak += 1; cursor = addDays(cursor, -1); }
  return streak;
}

export default function WorkoutPage() {
  const today = toLocalISO(new Date());
  const [date, setDate] = useState(today);
  const [logs, setLogs] = useState<Workout[]>([]);
  const [streak, setStreak] = useState(0);
  const [remindersOn, setRemindersOn] = useState(false);
  const [workout, setWorkout] = useState("");
  const [minutes, setMinutes] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWorkout, setEditWorkout] = useState("");
  const [editMinutes, setEditMinutes] = useState("");
  const [editTime, setEditTime] = useState("");
  const notified = useRef<Set<string>>(new Set());
  const router = useRouter();

  const load = async (selectedDate: string) => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) { router.push("/login"); return; }
    const [rows, all] = await Promise.all([
      supabase.from("gym_logs").select("*").eq("user_id", userId).eq("session_date", selectedDate).order("created_at"),
      supabase.from("gym_logs").select("session_date").eq("user_id", userId).eq("completed", true),
    ]);
    setLogs(rows.data || []);
    setStreak(calcStreak(new Set((all.data || []).map((r) => r.session_date)), today));
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
      logs.forEach((l) => {
        if (!l.reminder_time || l.completed || l.session_date !== todayStr) return;
        const time = l.reminder_time.slice(0, 5);
        const key = `${l.id}-${todayStr}-${time}`;
        if (time === nowHM && !notified.current.has(key)) {
          notified.current.add(key);
          recordNotification("DAILY GOAL ⏰", `Time to: ${l.workout_type}`);
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("DAILY GOAL ⏰", { body: `Time to: ${l.workout_type}` });
          } else {
            alert(`DAILY GOAL ⏰ Time to: ${l.workout_type}`);
          }
        }
      });
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [logs, remindersOn]);

  const addLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    await supabase.from("gym_logs").insert({
      user_id: userId, workout_type: workout,
      duration_minutes: Number(minutes) || 0,
      session_date: date, reminder_time: reminderTime || null, completed: false,
    });
    setWorkout(""); setMinutes(""); setReminderTime("");
    await load(date);
  };

  const toggleLog = async (id: string, completed: boolean) => {
    await supabase.from("gym_logs").update({ completed: !completed }).eq("id", id);
    setLogs(logs.map((l) => (l.id === id ? { ...l, completed: !completed } : l)));
  };
  const deleteLog = async (id: string) => {
    await supabase.from("gym_logs").delete().eq("id", id);
    setLogs(logs.filter((l) => l.id !== id));
  };

  const startEdit = (l: Workout) => {
    setEditingId(l.id);
    setEditWorkout(l.workout_type);
    setEditMinutes(String(l.duration_minutes));
    setEditTime(l.reminder_time ? l.reminder_time.slice(0, 5) : "");
  };
  const saveEdit = async () => {
    if (!editingId) return;
    await supabase.from("gym_logs").update({
      workout_type: editWorkout,
      duration_minutes: Number(editMinutes) || 0,
      reminder_time: editTime || null,
    }).eq("id", editingId);
    setEditingId(null);
    await load(date);
  };

  const total = logs.reduce((s, r) => s + r.duration_minutes, 0);
  const doneCount = logs.filter((l) => l.completed).length;
  const pct = logs.length ? Math.round((doneCount / logs.length) * 100) : 0;

  const inputCls = "w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-emerald-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 HERO */}
      <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 p-4 shadow-2xl shadow-emerald-900/30">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-lg">🏋️</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight">Workout Log</h1>
            <p className="text-[10px] text-white/80 font-semibold">
              {date === today ? "Today" : date} • {total} min
              {streak > 0 && <span className="text-amber-200"> • 🔥 {streak}d streak</span>}
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
          ⏰ {remindersOn ? "Reminders ON" : "Reminders OFF"}
        </button>
        <div className="flex-1 flex items-center gap-1.5 justify-end">
          <button onClick={() => setDate(addDays(date, -1))} className="press px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm">←</button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="px-2 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs outline-none focus:border-emerald-500" />
          <button onClick={() => setDate(addDays(date, 1))} className="press px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm">→</button>
          {date !== today && (
            <button onClick={() => setDate(today)} className="press px-3 py-2 rounded-xl bg-emerald-600 text-xs font-black">Today</button>
          )}
        </div>
      </div>

      {/* COMPLETION BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 shadow-lg shadow-black/30">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs font-black text-slate-400">✅ DAY COMPLETION</p>
          <p className="text-xs font-black text-slate-300">{doneCount}/{logs.length} • {pct}%</p>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* ADD FORM */}
      <form onSubmit={addLog} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 grid gap-3 shadow-lg shadow-black/30">
        <div className="flex items-center gap-2 mb-1">
          <IconTile emoji="💪" gradient="bg-gradient-to-br from-emerald-500 to-green-600" size="sm" />
          <p className="font-black text-sm text-white">Log a workout</p>
        </div>
        <input value={workout} onChange={(e) => setWorkout(e.target.value)} placeholder="Workout (e.g. Pushups, Bench Press)" required className={inputCls} />
        <div className="grid grid-cols-2 gap-3">
          <input type="number" min="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Minutes" required className={inputCls} />
          <div className="relative">
            {reminderTime === "" && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">⏰ Time</span>
            )}
            <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)}
              className={`${inputCls} ${reminderTime === "" ? "text-transparent" : ""}`} title="Reminder time (optional)" />
          </div>
        </div>
        <GradButton type="submit" gradient="from-emerald-500 to-green-600" className="w-full py-3 text-sm">
          ➕ Add Workout
        </GradButton>
      </form>

      {/* WORKOUT LOGS */}
      <div className="grid gap-3">
        {logs.map((l) => (
          <div key={l.id} className={`bg-slate-900 border rounded-2xl p-4 shadow-lg shadow-black/30 ${l.completed ? "border-green-500/30" : "border-slate-800"}`}>
            {editingId === l.id ? (
              <div className="flex flex-wrap gap-2">
                <input value={editWorkout} onChange={(e) => setEditWorkout(e.target.value)}
                  className="flex-1 min-w-[120px] p-2 rounded-xl bg-slate-800 border border-slate-700 text-sm" />
                <input type="number" min="1" value={editMinutes} onChange={(e) => setEditMinutes(e.target.value)}
                  className="w-20 p-2 rounded-xl bg-slate-800 border border-slate-700 text-sm" />
                <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)}
                  className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-sm" />
                <button onClick={saveEdit} className="press px-4 py-2 rounded-xl bg-amber-600 text-sm font-black">Save</button>
                <button onClick={() => setEditingId(null)} className="press px-4 py-2 rounded-xl bg-slate-800 text-sm">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleLog(l.id, l.completed)}
                    className={`press w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 ${
                      l.completed ? "bg-green-500 border-green-500" : "border-slate-600"
                    }`}
                  >
                    {l.completed && <span className="text-xs text-white font-black">✓</span>}
                  </button>
                  <div className="min-w-0">
                    <p className={`font-bold text-sm truncate ${l.completed ? "line-through text-slate-500" : "text-white"}`}>
                      {l.workout_type}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      💪 {l.duration_minutes} min
                      {l.reminder_time && <span className="ml-2">⏰ {l.reminder_time.slice(0, 5)}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startEdit(l)} className="press text-amber-400 text-xs font-bold">Edit</button>
                  <button onClick={() => deleteLog(l.id)} className="press text-red-400 text-xs font-bold">✕</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {logs.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl">
            <EmptyState emoji="🏋️✨" text="No workouts on this date — log your first above!" />
          </div>
        )}
      </div>

      <Link href="/gym-log" className="inline-block mt-6 text-sm text-slate-400 hover:text-white press font-semibold">
        ← Back to Gym
      </Link>
    </main>
  );
}