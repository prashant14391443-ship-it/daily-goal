"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { useRouter } from "next/navigation";

type Session = {
  id: string;
  subject: string;
  topic: string | null;
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
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export default function StudyTracker() {
  const today = toLocalISO(new Date());
  const [date, setDate] = useState(today);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [streak, setStreak] = useState(0);
  const [remindersOn, setRemindersOn] = useState(false);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [minutes, setMinutes] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editMinutes, setEditMinutes] = useState("");
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
    const [rows, all] = await Promise.all([
      supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("session_date", selectedDate)
        .order("created_at"),
      supabase
        .from("study_sessions")
        .select("session_date")
        .eq("user_id", userId)
        .eq("completed", true),
    ]);
    setSessions(rows.data || []);
    setStreak(
      calcStreak(new Set((all.data || []).map((r) => r.session_date)), today)
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
      if (/Android/i.test(navigator.userAgent)) return;
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const nowHM = `${hh}:${mm}`;
      const todayStr = toLocalISO(now);

      sessions.forEach((s) => {
        if (!s.reminder_time || s.completed || s.session_date !== todayStr)
          return;
        const time = s.reminder_time.slice(0, 5);
        const key = `${s.id}-${todayStr}-${time}`;
        if (time === nowHM && !notified.current.has(key)) {
          notified.current.add(key);
          recordNotification("DAILY GOAL ⏰", `Time to: ${s.subject}`);
         
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("DAILY GOAL ⏰", { body: `Time to: ${s.subject}` });
          } else {
            alert(`DAILY GOAL ⏰ Time to: ${s.subject}`);
          }
        }
      });
    };

    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [sessions, remindersOn]);

  const addSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;

    await supabase.from("study_sessions").insert({
      user_id: userId,
      subject,
      topic: topic || null,
      duration_minutes: Number(minutes) || 0,
      session_date: date,
      reminder_time: reminderTime || null,
      completed: false,
    });
    setSubject("");
    setTopic("");
    setMinutes("");
    setReminderTime("");
    await load(date);
  };

  const toggleSession = async (id: string, completed: boolean) => {
    await supabase
      .from("study_sessions")
      .update({ completed: !completed })
      .eq("id", id);
    setSessions(
      sessions.map((s) => (s.id === id ? { ...s, completed: !completed } : s))
    );
  };

  const deleteSession = async (id: string) => {
    await supabase.from("study_sessions").delete().eq("id", id);
    setSessions(sessions.filter((s) => s.id !== id));
  };

  const startEdit = (s: Session) => {
    setEditingId(s.id);
    setEditSubject(s.subject);
    setEditTopic(s.topic || "");
    setEditMinutes(String(s.duration_minutes));
    setEditTime(s.reminder_time ? s.reminder_time.slice(0, 5) : "");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await supabase
      .from("study_sessions")
      .update({
        subject: editSubject,
        topic: editTopic || null,
        duration_minutes: Number(editMinutes) || 0,
        reminder_time: editTime || null,
      })
      .eq("id", editingId);
    setEditingId(null);
    await load(date);
  };

  const total = sessions.reduce((s, r) => s + r.duration_minutes, 0);
  const doneCount = sessions.filter((s) => s.completed).length;
  const pct = sessions.length
    ? Math.round((doneCount / sessions.length) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-xl">📚</span>
            Study Tracker
          </h1>
          <p className="text-slate-400">
            {date === today ? "Today" : date} • Total: {Math.floor(total / 60)}h {total % 60}m
            {streak > 0 && (
              <span className="text-orange-400"> • 🔥 {streak} day streak</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={toggleReminders}
            className={`px-2.5 py-2 rounded text-sm font-semibold whitespace-nowrap ${
              remindersOn ? "bg-green-700" : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            <span className="hidden md:inline">
              {remindersOn ? "⏰ Reminders ON" : "⏰ Reminders OFF"}
            </span>
            <span className="md:hidden">
              {remindersOn ? "⏰ Reminder" : "⏰ Reminder"}
            </span>
          </button>
          <button
            onClick={() => setDate(addDays(date, -1))}
            className="px-2 py-2 rounded bg-slate-800 hover:bg-slate-700"
          >
            ←
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="p-2 rounded bg-slate-800 border border-slate-700 text-sm"
          />
          <button
            onClick={() => setDate(addDays(date, 1))}
            className="px-2 py-2 rounded bg-slate-800 hover:bg-slate-700"
          >
            →
          </button>
          {date !== today && (
            <button
              onClick={() => setDate(today)}
              className="px-2.5 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm"
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
            {doneCount}/{sessions.length} • {pct}%
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <form
        onSubmit={addSession}
        className="bg-slate-900 p-6 rounded-lg mb-8 grid gap-4"
      >
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (e.g. Math)"
          required
          className="p-3 rounded bg-slate-800 border border-slate-700"
        />
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic (optional)"
          className="p-3 rounded bg-slate-800 border border-slate-700"
        />
        <input
          type="number"
          min="1"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="Minutes"
          required
          className="p-3 rounded bg-slate-800 border border-slate-700"
        />
        <div className="relative">
          {reminderTime === "" && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
              Time
            </span>
          )}
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className={`p-3 rounded bg-slate-800 border border-slate-700 w-full ${
              reminderTime === "" ? "text-transparent" : ""
            }`}
            title="Reminder time (optional)"
          />
        </div>
        <button className="px-6 py-3 rounded bg-blue-600 font-semibold hover:bg-blue-500">
          Add Session
        </button>
      </form>

      <div className="grid gap-4">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="bg-slate-900 p-4 rounded-lg flex items-center justify-between gap-4 flex-wrap"
          >
            {editingId === s.id ? (
              <div className="flex flex-wrap gap-2 flex-1">
                <input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="flex-1 min-w-[120px] p-2 rounded bg-slate-800 border border-slate-700"
                />
                <input
                  value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value)}
                  placeholder="Topic"
                  className="flex-1 min-w-[120px] p-2 rounded bg-slate-800 border border-slate-700"
                />
                <input
                  type="number"
                  min="1"
                  value={editMinutes}
                  onChange={(e) => setEditMinutes(e.target.value)}
                  className="w-20 p-2 rounded bg-slate-800 border border-slate-700"
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
                    onClick={() => toggleSession(s.id, s.completed)}
                    className={`w-5 h-5 rounded border flex items-center justify-center ${
                      s.completed
                        ? "bg-green-500 border-green-500"
                        : "bg-slate-800 border-slate-600"
                    }`}
                  >
                    {s.completed && <span className="text-xs text-white font-bold">✓</span>}
                  </button>
                  <div>
                    <p className={`font-semibold ${s.completed ? "line-through text-slate-500" : ""}`}>
                      {s.subject}
                      {s.topic && <span className="text-slate-400"> — {s.topic}</span>}
                    </p>
                    <p className="text-sm text-slate-400">
                      {s.duration_minutes} min
                      {s.reminder_time && (
                        <span className="ml-2">⏰ {s.reminder_time.slice(0, 5)}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => startEdit(s)}
                    className="text-yellow-400 hover:text-yellow-300 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteSession(s.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {sessions.length === 0 && (
          <p className="text-slate-400">No study sessions on this date.</p>
        )}
      </div>
    </main>
  );
}