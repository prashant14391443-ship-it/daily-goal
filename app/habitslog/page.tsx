"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { useRouter } from "next/navigation";
import { ListChecks, Flame, Bell, BellOff, Plus, Pencil, X, Check, AlarmClock } from "lucide-react";
import { ProgressRing, GradButton, EmptyState } from "@/app/components/ui";

type Habit = {
  id: string;
  habit_name: string;
  reminder_time: string | null;
};

function toLocalISO(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${day}`; }
function addDays(dateStr: string, days: number) { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + days); return toLocalISO(d); }
function calcStreak(dates: Set<string>, today: string) { let streak = 0; let cursor = dates.has(today) ? today : addDays(today, -1); while (dates.has(cursor)) { streak += 1; cursor = addDays(cursor, -1); } return streak; }

export default function RoutineHabits() {
  const today = toLocalISO(new Date());
  const [date, setDate] = useState(today);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [doneOnDate, setDoneOnDate] = useState<string[]>([]);
  const [allLogs, setAllLogs] = useState<{ habit_id: string; log_date: string }[]>([]);
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
    if (!userId) { router.push("/login"); return; }
    const [h, logs, done] = await Promise.all([
      supabase.from("habits").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("habit_logs").select("habit_id, log_date").eq("user_id", userId).eq("completed", true),
      supabase.from("habit_logs").select("habit_id").eq("user_id", userId).eq("log_date", date),
    ]);
    setHabits(h.data || []);
    setAllLogs(logs.data || []);
    setDoneOnDate((done.data || []).map((d) => d.habit_id));
  };

  useEffect(() => { load(); }, [date]);
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
      const doneToday = new Set(allLogs.filter((l) => l.log_date === todayStr).map((l) => l.habit_id));
      habits.forEach((h) => {
        if (!h.reminder_time) return;
        const t = h.reminder_time.slice(0, 5);
        const key = `${h.id}-${todayStr}-${t}`;
        if (t === nowHM && !doneToday.has(h.id) && !notified.current.has(key)) {
          notified.current.add(key);
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("DAILY GOAL ⏰", { body: `Time to: ${h.habit_name}` });
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
      user_id: userId, habit_name: newHabit, reminder_time: newTime || null,
    });
    setNewHabit(""); setNewTime("");
    await load();
  };

  const startEdit = (h: Habit) => {
    setEditingId(h.id);
    setEditName(h.habit_name);
    setEditTime(h.reminder_time ? h.reminder_time.slice(0, 5) : "");
  };
  const saveEdit = async () => {
    if (!editingId) return;
    await supabase.from("habits").update({ habit_name: editName, reminder_time: editTime || null }).eq("id", editingId);
    setEditingId(null);
    await load();
  };

  const toggleHabit = async (habitId: string) => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    const isDone = doneOnDate.includes(habitId);
    if (isDone) {
      await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("log_date", date);
    } else {
      await supabase.from("habit_logs").insert({
        user_id: userId, habit_id: habitId, log_date: date, completed: true,
      });
    }
    await load();
  };

  const deleteHabit = async (id: string) => {
    await supabase.from("habits").delete().eq("id", id);
    await load();
  };

  const streakFor = (habitId: string) => {
    const dates = new Set(allLogs.filter((l) => l.habit_id === habitId).map((l) => l.log_date));
    return calcStreak(dates, today);
  };

  const doneCount = doneOnDate.length;
  const pct = habits.length ? Math.round((doneCount / habits.length) * 100) : 0;

  const inputCls = "w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 CALM HERO */}
      <div className="relative mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-5 shadow-xl shadow-purple-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center">
            <ListChecks size={22} strokeWidth={2.2} className="text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Routine & Habits</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">
              {date === today ? "Today" : date} • {doneCount}/{habits.length} done
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
            className="px-2 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs outline-none focus:border-violet-500" />
          <button onClick={() => setDate(addDays(date, 1))} className="press px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-400">→</button>
          {date !== today && (
            <button onClick={() => setDate(today)} className="press px-3 py-2 rounded-xl bg-violet-600 text-xs font-black">Today</button>
          )}
        </div>
      </div>

      {/* ADD FORM */}
      <form onSubmit={addHabit} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 grid gap-3">
        <input value={newHabit} onChange={(e) => setNewHabit(e.target.value)}
          placeholder="New habit (e.g. Drink 2L water)" required className={inputCls} />
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 relative">
            {newTime === "" && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none flex items-center gap-1 text-sm"><AlarmClock size={13} /> Time</span>
            )}
            <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)}
              className={`${inputCls} ${newTime === "" ? "text-transparent" : ""}`} title="Reminder time (optional)" />
          </div>
          <GradButton type="submit" gradient="from-violet-600 to-fuchsia-600" className="py-3 text-sm">
            <span className="flex items-center justify-center gap-1"><Plus size={15} /> Add</span>
          </GradButton>
        </div>
      </form>

      {/* HABITS */}
      <div className="grid gap-2">
        {habits.map((h) => {
          const isDone = doneOnDate.includes(h.id);
          const streak = streakFor(h.id);
          return (
            <div key={h.id} className={`bg-slate-900 border rounded-2xl p-4 ${isDone ? "border-green-500/20" : "border-slate-800"}`}>
              {editingId === h.id ? (
                <div className="flex flex-wrap gap-2">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 min-w-[150px] p-2 rounded-xl bg-slate-800 border border-slate-700 text-sm" />
                  <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)}
                    className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-sm" />
                  <button onClick={saveEdit} className="press px-4 py-2 rounded-xl bg-amber-600 text-sm font-black">Save</button>
                  <button onClick={() => setEditingId(null)} className="press px-4 py-2 rounded-xl bg-slate-800 text-sm text-slate-400">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleHabit(h.id)}
                      className={`press w-8 h-8 rounded-md border-2 flex items-center justify-center shrink-0 ${
                        isDone ? "bg-green-500 border-green-500" : "border-slate-700"
                      }`}
                    >
                      {isDone && <Check size={15} strokeWidth={3} className="text-white" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`font-bold text-sm truncate ${isDone ? "line-through text-slate-500" : "text-white"}`}>
                        {h.habit_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {streak > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-orange-400 text-[10px] font-black">
                            <Flame size={11} /> {streak}d
                          </span>
                        )}
                        {h.reminder_time && (
                          <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-0.5"><AlarmClock size={10} /> {h.reminder_time.slice(0, 5)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEdit(h)} className="press w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400"><Pencil size={13} /></button>
                    <button onClick={() => deleteHabit(h.id)} className="press w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-red-400"><X size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {habits.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl">
            <EmptyState emoji="🌱" text="No habits yet — add your first small daily win above!" />
          </div>
        )}
      </div>
    </main>
  );
}