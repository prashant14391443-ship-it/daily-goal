"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { useRouter } from "next/navigation";
import { BookOpen, Flame, Bell, BellOff, Plus, Pencil, X, Check, AlarmClock } from "lucide-react";
import { ProgressRing, GradButton, EmptyState } from "@/app/components/ui";

type Session = {
  id: string;
  subject: string;
  topic: string | null;
  duration_minutes: number;
  completed: boolean;
  reminder_time: string | null;
  session_date: string;
};

function toLocalISO(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${day}`; }
function addDays(dateStr: string, days: number) { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + days); return toLocalISO(d); }
function calcStreak(dates: Set<string>, today: string) { let streak = 0; let cursor = dates.has(today) ? today : addDays(today, -1); while (dates.has(cursor)) { streak += 1; cursor = addDays(cursor, -1); } return streak; }

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
    if (!userId) { router.push("/login"); return; }
    const [rows, all] = await Promise.all([
      supabase.from("study_sessions").select("*").eq("user_id", userId).eq("session_date", selectedDate).order("created_at"),
      supabase.from("study_sessions").select("session_date").eq("user_id", userId).eq("completed", true),
    ]);
    setSessions(rows.data || []);
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
      sessions.forEach((s) => {
        if (!s.reminder_time || s.completed || s.session_date !== todayStr) return;
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
      user_id: userId, subject, topic: topic || null,
      duration_minutes: Number(minutes) || 0, session_date: date,
      reminder_time: reminderTime || null, completed: false,
    });
    setSubject(""); setTopic(""); setMinutes(""); setReminderTime("");
    await load(date);
  };

  const toggleSession = async (id: string, completed: boolean) => {
    await supabase.from("study_sessions").update({ completed: !completed }).eq("id", id);
    setSessions(sessions.map((s) => (s.id === id ? { ...s, completed: !completed } : s)));
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
    await supabase.from("study_sessions").update({
      subject: editSubject, topic: editTopic || null,
      duration_minutes: Number(editMinutes) || 0, reminder_time: editTime || null,
    }).eq("id", editingId);
    setEditingId(null);
    await load(date);
  };

  const total = sessions.reduce((s, r) => s + r.duration_minutes, 0);
  const doneCount = sessions.filter((s) => s.completed).length;
  const pct = sessions.length ? Math.round((doneCount / sessions.length) * 100) : 0;

  const inputCls = "w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-blue-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 CALM HERO */}
      <div className="relative mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-5 shadow-xl shadow-blue-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center">
            <BookOpen size={22} strokeWidth={2.2} className="text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Study Tracker</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5 flex items-center gap-1.5">
              {date === today ? "Today" : date} • {Math.floor(total / 60)}h {total % 60}m
              {streak > 0 && <span className="flex items-center gap-0.5 text-amber-300"><Flame size={11} /> {streak}</span>}
            </p>
          </div>
          <ProgressRing pct={pct} size={56} stroke={6} color="#ffffff" track="rgba(0,0,0,0.25)" />
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={toggleReminders}
          className={`press px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap border flex items-center gap-1.5 ${
            remindersOn ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-slate-900 border-slate-800 text-slate-500"
          }`}
        >
          {remindersOn ? <Bell size={13} /> : <BellOff size={13} />}
          {remindersOn ? "Reminders ON" : "Reminders OFF"}
        </button>
        <div className="flex-1 flex items-center gap-1.5 justify-end">
          <button onClick={() => setDate(addDays(date, -1))} className="press px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-400">←</button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="px-2 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs outline-none focus:border-blue-500" />
          <button onClick={() => setDate(addDays(date, 1))} className="press px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-400">→</button>
          {date !== today && (
            <button onClick={() => setDate(today)} className="press px-3 py-2 rounded-xl bg-blue-600 text-xs font-black">Today</button>
          )}
        </div>
      </div>

      {/* ADD FORM */}
      <form onSubmit={addSession} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 grid gap-3">
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (e.g. Math)" required className={inputCls} />
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (optional)" className={inputCls} />
        <div className="grid grid-cols-2 gap-3">
          <input type="number" min="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Minutes" required className={inputCls} />
          <div className="relative">
            {reminderTime === "" && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none flex items-center gap-1 text-sm"><AlarmClock size={13} /> Time</span>
            )}
            <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)}
              className={`${inputCls} ${reminderTime === "" ? "text-transparent" : ""}`} title="Reminder time (optional)" />
          </div>
        </div>
        <GradButton type="submit" gradient="from-blue-600 to-indigo-500" className="w-full py-3 text-sm">
          <span className="flex items-center justify-center gap-1.5"><Plus size={15} /> Add Session</span>
        </GradButton>
      </form>

      {/* SESSIONS */}
      <div className="grid gap-2">
        {sessions.map((s) => (
          <div key={s.id} className={`bg-slate-900 border rounded-2xl p-4 ${s.completed ? "border-green-500/20" : "border-slate-800"}`}>
            {editingId === s.id ? (
              <div className="flex flex-wrap gap-2">
                <input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="flex-1 min-w-[120px] p-2 rounded-xl bg-slate-800 border border-slate-700 text-sm" />
                <input value={editTopic} onChange={(e) => setEditTopic(e.target.value)} placeholder="Topic" className="flex-1 min-w-[120px] p-2 rounded-xl bg-slate-800 border border-slate-700 text-sm" />
                <input type="number" min="1" value={editMinutes} onChange={(e) => setEditMinutes(e.target.value)} className="w-20 p-2 rounded-xl bg-slate-800 border border-slate-700 text-sm" />
                <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-sm" />
                <button onClick={saveEdit} className="press px-4 py-2 rounded-xl bg-amber-600 text-sm font-black">Save</button>
                <button onClick={() => setEditingId(null)} className="press px-4 py-2 rounded-xl bg-slate-800 text-sm text-slate-400">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleSession(s.id, s.completed)}
                    className={`press w-7 h-7 rounded-md border-2 flex items-center justify-center shrink-0 ${
                      s.completed ? "bg-green-500 border-green-500" : "border-slate-700"
                    }`}
                  >
                    {s.completed && <Check size={14} strokeWidth={3} className="text-white" />}
                  </button>
                  <div className="min-w-0">
                    <p className={`font-bold text-sm truncate ${s.completed ? "line-through text-slate-500" : "text-white"}`}>
                      {s.subject}
                      {s.topic && <span className="text-slate-500"> — {s.topic}</span>}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                      {s.duration_minutes} min
                      {s.reminder_time && <span className="flex items-center gap-0.5"><AlarmClock size={10} /> {s.reminder_time.slice(0, 5)}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startEdit(s)} className="press w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400"><Pencil size={13} /></button>
                  <button onClick={() => deleteSession(s.id)} className="press w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-red-400"><X size={14} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl">
            <EmptyState emoji="😴📚" text="No sessions yet — plan your first study block!" />
          </div>
        )}
      </div>
    </main>
  );
}