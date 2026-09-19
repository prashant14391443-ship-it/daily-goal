"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { useRouter } from "next/navigation";
import { ListTodo, Flame, Bell, BellOff, Plus, Pencil, X, Check, AlarmClock, GripVertical, WifiOff } from "lucide-react";
import { ProgressRing, GradButton, EmptyState } from "@/app/components/ui";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { dbInsert, dbUpdate, dbDelete, dbLoad } from "@/lib/offlineWrite";
import { useRemindChip, remindOn } from "@/lib/reminders";

type Todo = {
  id: string;
  title: string;
  completed: boolean;
  reminder_time: string | null;
  task_date: string;
  sort_order: number | null;
};

function toLocalISO(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${day}`; }
function addDays(dateStr: string, days: number) { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + days); return toLocalISO(d); }
function calcStreak(dates: Set<string>, today: string) { let streak = 0; let cursor = dates.has(today) ? today : addDays(today, -1); while (dates.has(cursor)) { streak += 1; cursor = addDays(cursor, -1); } return streak; }

const inputCls = "w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-amber-500";

/* ---------- ONE SORTABLE ROW ---------- */
function TodoRow(props: {
  t: Todo;
  isEditing: boolean;
  editTitle: string;
  editTime: string;
  onEditTitle: (v: string) => void;
  onEditTime: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
}) {
  const { t, isEditing } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: t.id,
    disabled: isEditing,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`bg-slate-900 border rounded-2xl p-4 ${t.completed ? "border-green-500/20" : "border-slate-800"} ${
        isDragging ? "relative z-20 ring-2 ring-amber-500 shadow-2xl shadow-black/50" : ""
      }`}
    >
      {isEditing ? (
        <div className="flex flex-wrap gap-2">
          <input value={props.editTitle} onChange={(e) => props.onEditTitle(e.target.value)}
            className="flex-1 min-w-[150px] p-2 rounded-xl bg-slate-800 border border-slate-700 text-sm" />
          <input type="time" value={props.editTime} onChange={(e) => props.onEditTime(e.target.value)}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-sm" />
          <button onClick={props.onSave} className="press px-4 py-2 rounded-xl bg-amber-600 text-sm font-black">Save</button>
          <button onClick={props.onCancel} className="press px-4 py-2 rounded-xl bg-slate-800 text-sm text-slate-400">Cancel</button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              {...attributes}
              {...listeners}
              style={{ touchAction: "none" }}
              className="press w-8 h-8 shrink-0 rounded-lg bg-slate-800/70 border border-slate-700/60 flex items-center justify-center text-slate-500 active:text-amber-400 cursor-grab active:cursor-grabbing"
              aria-label={`Drag to reorder ${t.title}`}
            >
              <GripVertical size={15} />
            </button>
            <button
              onClick={props.onToggle}
              className={`press w-7 h-7 rounded-md border-2 flex items-center justify-center shrink-0 ${
                t.completed ? "bg-green-500 border-green-500" : "border-slate-700"
              }`}
            >
              {t.completed && <Check size={14} strokeWidth={3} className="text-white" />}
            </button>
            <div className="min-w-0">
              <p className={`font-bold text-sm truncate ${t.completed ? "line-through text-slate-500" : "text-white"}`}>{t.title}</p>
              <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                {t.task_date}
                {t.reminder_time && <span className="flex items-center gap-0.5"><AlarmClock size={10} /> {t.reminder_time.slice(0, 5)}</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={props.onStartEdit} className="press w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400"><Pencil size={13} /></button>
            <button onClick={props.onDelete} className="press w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-red-400"><X size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- PAGE ---------- */
export default function TodoPage() {
  const today = toLocalISO(new Date());
  const [date, setDate] = useState(today);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [streak, setStreak] = useState(0);
  const [newTask, setNewTask] = useState("");
  const [newTime, setNewTime] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTime, setEditTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  // 🌐 GLOBAL REMINDERS CHIP (ON = global, OFF = only ToDo)
  const { on: remindersOn, toggle: toggleRemindChip } = useRemindChip("todo");

  const toggleReminders = () => {
    const currentlyOff = !remindOn("todo");
    toggleRemindChip();
    if (currentlyOff && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const todosRef = useRef<Todo[]>([]);
  useEffect(() => { todosRef.current = todos; }, [todos]);

  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const load = async (selectedDate: string) => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) { router.push("/login"); return; }

    const { rows, fromCache: cache } = await dbLoad("tasks", (q) =>
      q.eq("user_id", userId).eq("category", "todo").eq("task_date", selectedDate)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      (r) => r.task_date === selectedDate && r.category === "todo"
    );
    setTodos(rows as Todo[]);
    setFromCache(cache);

    if (navigator.onLine) {
      const { data: allDone } = await supabase.from("tasks").select("task_date").eq("user_id", userId).eq("category", "todo").eq("completed", true);
      setStreak(calcStreak(new Set((allDone || []).map((r) => r.task_date)), today));
    }
  };

  useEffect(() => { load(date); }, [date]);

  useEffect(() => {
    if (!remindersOn) return;
    const check = () => {
      if (!remindOn("todo")) return;
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

  // 📴 OFFLINE-CAPABLE ADD
  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId || !newTask.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await dbInsert("tasks", {
        user_id: userId, title: newTask.trim(), task_date: date,
        category: "todo", reminder_time: newTime || null, completed: false,
        sort_order: todos.length,
      });
      const newItem: Todo = {
        id: res.id,
        user_id: userId,
        title: newTask.trim(),
        task_date: date,
        category: "todo",
        reminder_time: newTime || null,
        completed: false,
        sort_order: todos.length,
      } as any;
      setTodos((prev) => [...prev, newItem]);
      setNewTask(""); setNewTime("");
    } finally { setIsSubmitting(false); }
  };

  // 📴 OFFLINE-CAPABLE TOGGLE
  const toggleTodo = async (id: string, completed: boolean) => {
    await dbUpdate("tasks", id, { completed: !completed });
    setTodos(todos.map((t) => (t.id === id ? { ...t, completed: !completed } : t)));
  };

  // 📴 OFFLINE-CAPABLE DELETE
  const deleteTodo = async (id: string) => {
    await dbDelete("tasks", id);
    setTodos(todos.filter((t) => t.id !== id));
  };

  const startEdit = (t: Todo) => {
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditTime(t.reminder_time ? t.reminder_time.slice(0, 5) : "");
  };

  // 📴 OFFLINE-CAPABLE EDIT SAVE
  const saveEdit = async () => {
    if (!editingId) return;
    await dbUpdate("tasks", editingId, { title: editTitle, reminder_time: editTime || null });
    setTodos(todos.map((t) => t.id === editingId ? { ...t, title: editTitle, reminder_time: editTime || null } : t));
    setEditingId(null);
  };

  /* ----- DRAG & DROP REORDER (offline-capable) ----- */
  const persistOrder = async (changed: Todo[]) => {
    await Promise.all(
      changed.map((t) => dbUpdate("tasks", t.id, { sort_order: t.sort_order }))
    );
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = todos.findIndex((t) => t.id === active.id);
    const newIndex = todos.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(todos, oldIndex, newIndex).map((t, i) => ({ ...t, sort_order: i }));
    const changed = next.filter((t, i) => todos[i]?.id !== t.id);
    setTodos(next);
    void persistOrder(changed);
  };

  const doneCount = todos.filter((t) => t.completed).length;
  const pct = todos.length ? Math.round((doneCount / todos.length) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      <div className="relative mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 p-5 shadow-xl shadow-orange-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center">
            <ListTodo size={22} strokeWidth={2.2} className="text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Task Log</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5 flex items-center gap-1.5">
              {date === today ? "Today" : date} • Your daily plan
              {streak > 0 && <span className="flex items-center gap-0.5 text-amber-200"><Flame size={11} /> {streak}</span>}
            </p>
          </div>
          <ProgressRing pct={pct} size={56} stroke={6} color="#ffffff" track="rgba(0,0,0,0.25)" />
        </div>
      </div>

      {/* 📴 Offline indicator */}
      {fromCache && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
          <WifiOff size={13} /> You're offline — changes will sync when you reconnect.
        </div>
      )}

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
            className="px-2 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs outline-none focus:border-amber-500" />
          <button onClick={() => setDate(addDays(date, 1))} className="press px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-400">→</button>
          {date !== today && (
            <button onClick={() => setDate(today)} className="press px-3 py-2 rounded-xl bg-amber-600 text-xs font-black">Today</button>
          )}
        </div>
      </div>

      <form onSubmit={addTodo} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 grid gap-3">
        <input value={newTask} onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add to your daily plan (e.g. Finish project report)" required className={inputCls} />
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 relative">
            {newTime === "" && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none flex items-center gap-1 text-sm"><AlarmClock size={13} /> Time</span>
            )}
            <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)}
              className={`${inputCls} ${newTime === "" ? "text-transparent" : ""}`} title="Reminder time (optional)" />
          </div>
          <GradButton type="submit" gradient="from-amber-500 to-orange-600" disabled={isSubmitting} className="py-3 text-sm">
            <span className="flex items-center justify-center gap-1.5">{isSubmitting ? "Adding..." : <><Plus size={15} /> Add</>}</span>
          </GradButton>
        </div>
      </form>

      <p className="text-[10px] text-slate-500 font-semibold mb-2">Tip: hold the ⠿ handle on a task and drag it to any position — order is saved.</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="grid gap-2">
            {todos.map((t) => (
              <TodoRow
                key={t.id}
                t={t}
                isEditing={editingId === t.id}
                editTitle={editTitle}
                editTime={editTime}
                onEditTitle={setEditTitle}
                onEditTime={setEditTime}
                onSave={saveEdit}
                onCancel={() => setEditingId(null)}
                onToggle={() => toggleTodo(t.id, t.completed)}
                onDelete={() => deleteTodo(t.id)}
                onStartEdit={() => startEdit(t)}
              />
            ))}
            {todos.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl">
                <EmptyState emoji="📋✨" text="No plans yet — write your daily plan above!" />
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </main>
  );
}