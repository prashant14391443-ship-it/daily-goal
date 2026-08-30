"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { ListChecks, Plus, Trash2, Flame, Anchor, PartyPopper, X, Landmark, Clock, MapPin, Pencil, Bell, BellOff, ChevronLeft, ChevronRight } from "lucide-react";

type Habit = { id: string; habit_name: string; emoji: string; anchor: string; target_minutes: number; created_at: string; identity: string; cue_time: string; cue_place: string };
function toLocalISO(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${day}`; }
function shiftDate(s: string, n: number) { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return toLocalISO(d); }

const ANCHORS = ["I wake up", "I brush my teeth", "I pour my morning tea/coffee", "I eat breakfast", "I eat lunch", "I eat dinner", "I finish work/school", "I get into bed"];
const REMIND_TIMES = ["06:00", "07:00", "08:00", "12:00", "17:00", "19:00", "20:00", "21:00", "22:00"];
const TEMPLATES = [
  { emoji: "💧", name: "Drink a glass of water", anchor: "I wake up", target: 2, identity: "I fuel my body" },
  { emoji: "🛏️", name: "Make my bed", anchor: "I wake up", target: 2, identity: "I am disciplined" },
  { emoji: "📵", name: "No phone for 30 min", anchor: "I wake up", target: 30, identity: "I control my attention" },
  { emoji: "🧘", name: "1-min deep breathing", anchor: "I brush my teeth", target: 2, identity: "I am calm" },
  { emoji: "📖", name: "Read 1 page", anchor: "I eat dinner", target: 5, identity: "I am a reader" },
  { emoji: "🚶", name: "Walk 10 minutes", anchor: "I eat lunch", target: 10, identity: "I am an active person" },
  { emoji: "🧹", name: "2-min tidy up", anchor: "I eat dinner", target: 2, identity: "I keep my space clean" },
  { emoji: "✍️", name: "Write 1 journal line", anchor: "I get into bed", target: 2, identity: "I reflect daily" },
  { emoji: "🙏", name: "Name 1 good thing today", anchor: "I get into bed", target: 2, identity: "I am grateful" },
  { emoji: "🌅", name: "Sleep by 11 pm", anchor: "I get into bed", target: 2, identity: "I respect my rest" },
];

export default function HabitLogPage() {
  const today = toLocalISO(new Date());
  const yesterday = toLocalISO(new Date(Date.now() - 86400000));
  const [view, setView] = useState<"today" | "add" | "review">("today");
  const [viewDate, setViewDate] = useState(today);
  const [remindersOn, setRemindersOn] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("dg-habit-rem") === "1" : false));
  const [remindTime, setRemindTime] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("dg-habit-rem-time") || "20:00" : "20:00"));
  const [uid, setUid] = useState("");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [name, setName] = useState(""); const [anchor, setAnchor] = useState(ANCHORS[0]); const [anchorCustom, setAnchorCustom] = useState("");
  const [target, setTarget] = useState("10"); const [identity, setIdentity] = useState(""); const [cueTime, setCueTime] = useState(""); const [cuePlace, setCuePlace] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [eName, setEName] = useState(""); const [eAnchor, setEAnchor] = useState(ANCHORS[0]); const [eAnchorCustom, setEAnchorCustom] = useState(""); const [eTarget, setETarget] = useState("10");
  const [eTime, setETime] = useState(""); const [ePlace, setEPlace] = useState(""); const [eIdentity, setEIdentity] = useState("");
  const [celebrate, setCelebrate] = useState<{ name: string; coins: number } | null>(null);
  const [reflWent, setReflWent] = useState(""); const [reflImprove, setReflImprove] = useState(""); const [reflGrateful, setReflGrateful] = useState("");
  const [reflSaved, setReflSaved] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id; if (!id) return; setUid(id);
    const [h, lg, ref] = await Promise.all([
      supabase.from("habits").select("*").eq("user_id", id).order("created_at"),
      supabase.from("habit_logs").select("*").eq("user_id", id).eq("completed", true),
      supabase.from("reflections").select("*").eq("user_id", id).eq("log_date", today).maybeSingle(),
    ]);
    setHabits((h.data as Habit[]) || []);
    const all = (lg.data || []) as any[]; setLogs(all);
    const reflection = (ref.data as { went_well?: string; improve?: string; grateful?: string } | null) ?? null;
    if (reflection) {
      setReflWent(reflection.went_well || "");
      setReflImprove(reflection.improve || "");
      setReflGrateful(reflection.grateful || "");
      setReflSaved(true);
    }
    const st: Record<string, number> = {};
    ((h.data as Habit[]) || []).forEach((hb) => {
      let s = 0; const cursor = new Date();
      const has = (d: string) => all.some((l) => l.habit_id === hb.id && l.log_date === d);
      if (!has(toLocalISO(cursor))) cursor.setDate(cursor.getDate() - 1);
      while (has(toLocalISO(cursor))) { s++; cursor.setDate(cursor.getDate() - 1); }
      st[hb.id] = s;
    });
    setStreaks(st);
  };

  useEffect(() => {
    if (!remindersOn) return;
    const check = () => {
      const now = new Date();
      const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (hm !== remindTime) return;
      let fired: any = {}; try { fired = JSON.parse(localStorage.getItem("dg-habit-rem-fired") || "{}"); } catch { fired = {}; }
      if (fired.date !== today) fired = { date: today, keys: [] };
      const key = "daily-" + today;
      if (fired.keys.includes(key)) return;
      const left = habits.length - logs.filter((l) => l.log_date === today).length;
      if (left > 0) { fired.keys.push(key); localStorage.setItem("dg-habit-rem-fired", JSON.stringify(fired)); recordNotification("🔔 Habit reminder", `${left} habit(s) left today — don't miss twice!`); }
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [remindersOn, remindTime, habits, logs, today]);

  const toggleReminders = () => { const v = !remindersOn; setRemindersOn(v); localStorage.setItem("dg-habit-rem", v ? "1" : "0"); };
  const changeRemindTime = (t: string) => { setRemindTime(t); localStorage.setItem("dg-habit-rem-time", t); };

  const doneToday = logs.filter((l) => l.log_date === today).map((l) => l.habit_id);
  const doneYesterday = logs.filter((l) => l.log_date === yesterday).map((l) => l.habit_id);
  const doneView = logs.filter((l) => l.log_date === viewDate).map((l) => l.habit_id);

  const weeksSince = (c: string) => Math.floor((Date.now() - new Date(c || String(Date.now())).getTime()) / (7 * 86400000));
  const currentMin = (h: Habit) => { const w = weeksSince(h.created_at); const ladder = [2, 5, 10]; const base = w < 3 ? ladder[w] : (h.target_minutes || 10); return Math.min(base, h.target_minutes || base); };

  const award = async (hb: Habit) => {
    const { error } = await supabase.from("coin_log").insert({ user_id: uid, action_key: `habit-${hb.id}-${today}`, coins: 10 });
    if (!error) {
      const { data: cur } = await supabase.from("user_coins").select("coins").eq("user_id", uid).maybeSingle();
      const total = (cur?.coins || 0) + 10;
      await supabase.from("user_coins").upsert({ user_id: uid, coins: total });
      window.dispatchEvent(new CustomEvent("dg-coins", { detail: { total, earned: 10 } }));
    }
  };

  const toggle = async (hb: Habit) => {
    const d = viewDate;
    if (doneView.includes(hb.id)) {
      await supabase.from("habit_logs").delete().eq("user_id", uid).eq("habit_id", hb.id).eq("log_date", d);
      setLogs(logs.filter((l) => !(l.habit_id === hb.id && l.log_date === d)));
      return;
    }
    const { data, error } = await supabase.from("habit_logs").insert({ user_id: uid, habit_id: hb.id, log_date: d, completed: true }).select().single();
    if (!error && data) {
      setLogs([...logs, data]);
      if (d === today) {
        setCelebrate({ name: hb.habit_name, coins: 10 });
        recordNotification("🎉 Habit done!", `${hb.emoji} ${hb.habit_name} → +10 🪙`);
        await award(hb);
        setTimeout(() => setCelebrate(null), 1600);
      } else recordNotification("📅 Logged", `${hb.emoji} ${hb.habit_name} for ${d}`);
    }
  };

  const addHabit = async (t?: { emoji: string; name: string; anchor: string; target: number; identity?: string }) => {
    const n = (t?.name || name).trim(); if (!n) return;
    const finalAnchor = t ? t.anchor : (anchor === "__custom" ? (anchorCustom.trim() || "I wake up") : anchor);
    const { data, error } = await supabase.from("habits").insert({
      user_id: uid, habit_name: n, emoji: t?.emoji || "✅", anchor: finalAnchor,
      target_minutes: t?.target || Number(target) || 10, identity: t?.identity || identity,
      cue_time: t ? "" : cueTime, cue_place: t ? "" : cuePlace,
    }).select().single();
    if (!error && data) setHabits([...habits, data as Habit]);
    setName(""); setIdentity(""); setCueTime(""); setCuePlace("");
    setAnchor(ANCHORS[0]); setAnchorCustom(""); setTarget("10");
    setView("today");
  };

  const saveEdit = async (id: string) => {
    const n = eName.trim(); if (!n) return;
    const finalAnchor = eAnchor === "__custom" ? (eAnchorCustom.trim() || "I wake up") : eAnchor;
    const { error } = await supabase.from("habits").update({
      habit_name: n,
      anchor: finalAnchor,
      target_minutes: Number(eTarget) || 10,
      cue_time: eTime,
      cue_place: ePlace,
      identity: eIdentity,
    }).eq("id", id).eq("user_id", uid);

    if (!error) {
      setHabits(habits.map((hb) => hb.id === id ? {
        ...hb,
        habit_name: n,
        anchor: finalAnchor,
        target_minutes: Number(eTarget) || 10,
        cue_time: eTime,
        cue_place: ePlace,
        identity: eIdentity,
      } : hb));
      setEditId(null);
    }
  };

  const deleteHabit = async (id: string) => {
    const { error } = await supabase.from("habits").delete().eq("id", id).eq("user_id", uid);
    if (!error) {
      setHabits(habits.filter((hb) => hb.id !== id));
      setLogs(logs.filter((l) => l.habit_id !== id));
      setEditId(null);
    }
  };

  const addTemplate = (templ: (typeof TEMPLATES)[number]) => {
    setName(templ.name); setAnchor(templ.anchor); setTarget(String(templ.target)); setIdentity(templ.identity);
    setView("add");
  };

  const todayCount = habits.filter((hb) => doneToday.includes(hb.id)).length;
  const totalCount = habits.length;

  const saveReflection = async () => {
    if (!uid) return;
    const payload = { user_id: uid, log_date: today, went_well: reflWent.trim(), improve: reflImprove.trim(), grateful: reflGrateful.trim() };
    const { error } = await supabase.from("reflections").upsert(payload, { onConflict: "user_id,log_date" });
    if (!error) setReflSaved(true);
  };

  const toggleReview = () => setView(view === "review" ? "today" : "review");

  return (
    <main className="min-h-screen bg-[#f6f6f2] text-stone-800">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Habit log</p>
            <h1 className="text-3xl font-semibold">Daily goals</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setView("today")} className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-400 hover:bg-stone-50">
              Today
            </button>
          </div>
        </header>
      </div>
    </main>
  );
}
