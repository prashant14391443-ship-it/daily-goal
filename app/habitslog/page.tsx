"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { ListChecks, Plus, Trash2, Flame, Anchor, PartyPopper, Sparkles, X } from "lucide-react";

type Habit = { id: string; habit_name: string; emoji: string; anchor: string; target_minutes: number; created_at: string };

function toLocalISO(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${day}`; }

const ANCHORS = ["I wake up", "I brush my teeth", "I pour my morning tea/coffee", "I eat breakfast", "I eat lunch", "I eat dinner", "I finish work/school", "I get into bed"];
const TEMPLATES = [
  { emoji: "💧", name: "Drink a glass of water", anchor: "I wake up", target: 2 },
  { emoji: "🛏️", name: "Make my bed", anchor: "I wake up", target: 2 },
  { emoji: "📵", name: "No phone for 30 min", anchor: "I wake up", target: 30 },
  { emoji: "🧘", name: "1-min deep breathing", anchor: "I brush my teeth", target: 2 },
  { emoji: "🦷", name: "Floss one tooth", anchor: "I brush my teeth", target: 2 },
  { emoji: "📖", name: "Read 1 page", anchor: "I eat dinner", target: 5 },
  { emoji: "🚶", name: "Walk 10 minutes", anchor: "I eat lunch", target: 10 },
  { emoji: "🧹", name: "2-min tidy up", anchor: "I eat dinner", target: 2 },
  { emoji: "✍️", name: "Write 1 journal line", anchor: "I get into bed", target: 2 },
  { emoji: "🙏", name: "Name 1 good thing today", anchor: "I get into bed", target: 2 },
  { emoji: "🌅", name: "Sleep by 11 pm", anchor: "I get into bed", target: 2 },
  { emoji: "🍳", name: "Protein at breakfast", anchor: "I eat breakfast", target: 2 },
];

export default function HabitLogPage() {
  const [uid, setUid] = useState("");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [doneToday, setDoneToday] = useState<string[]>([]);
  const [doneYesterday, setDoneYesterday] = useState<string[]>([]);
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✅");
  const [anchor, setAnchor] = useState(ANCHORS[0]);
  const [target, setTarget] = useState("10");
  const [celebrate, setCelebrate] = useState<{ name: string; coins: number } | null>(null);
  const today = toLocalISO(new Date());
  const yesterday = toLocalISO(new Date(Date.now() - 86400000));

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id; if (!id) return; setUid(id);
    const [h, logs] = await Promise.all([
      supabase.from("habits").select("*").eq("user_id", id).order("created_at"),
      supabase.from("habit_logs").select("*").eq("user_id", id).eq("completed", true),
    ]);
    setHabits((h.data as Habit[]) || []);
    const all = (logs.data || []) as any[];
    setDoneToday(all.filter((l) => l.log_date === today).map((l) => l.habit_id));
    setDoneYesterday(all.filter((l) => l.log_date === yesterday).map((l) => l.habit_id));
    const st: Record<string, number> = {};
    (h.data as Habit[] || []).forEach((hb) => {
      let s = 0; let cursor = new Date();
      const has = (d: string) => all.some((l) => l.habit_id === hb.id && l.log_date === d);
      if (!has(toLocalISO(cursor))) cursor.setDate(cursor.getDate() - 1);
      while (has(toLocalISO(cursor))) { s++; cursor.setDate(cursor.getDate() - 1); }
      st[hb.id] = s;
    });
    setStreaks(st);
  };

  const weeksSince = (c: string) => Math.floor((Date.now() - new Date(c || Date.now()).getTime()) / (7 * 86400000));
  const currentMin = (h: Habit) => {
    const w = weeksSince(h.created_at);
    const ladder = [2, 5, 10];
    const base = w < 3 ? ladder[w] : (h.target_minutes || 10);
    return Math.min(base, h.target_minutes || base);
  };

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
    if (doneToday.includes(hb.id)) {
      await supabase.from("habit_logs").delete().eq("user_id", uid).eq("habit_id", hb.id).eq("log_date", today);
      setDoneToday(doneToday.filter((x) => x !== hb.id));
      return;
    }
    const { data, error } = await supabase.from("habit_logs").insert({ user_id: uid, habit_id: hb.id, log_date: today, completed: true }).select().single();
    if (!error && data) {
      setDoneToday([...doneToday, hb.id]);
      setCelebrate({ name: hb.habit_name, coins: 10 });
      recordNotification("🎉 Habit done!", `${hb.emoji} ${hb.habit_name} → +10 🪙`);
      await award(hb);
      setTimeout(() => setCelebrate(null), 1600);
    }
  };

  const addHabit = async (t?: { emoji: string; name: string; anchor: string; target: number }) => {
    const e = t?.emoji || emoji; const n = (t?.name || name).trim(); const a = t?.anchor || anchor; const tg = t?.target || Number(target) || 10;
    if (!n) return;
    const { data, error } = await supabase.from("habits").insert({ user_id: uid, habit_name: n, emoji: e, anchor: a, target_minutes: tg }).select().single();
    if (!error && data) setHabits([...habits, data as Habit]);
    setName(""); setAdding(false);
  };
  const del = async (id: string) => { await supabase.from("habits").delete().eq("id", id); setHabits(habits.filter((h) => h.id !== id)); };

  const atRisk = habits.filter((h) => (h.created_at || "").slice(0, 10) <= yesterday && !doneYesterday.includes(h.id) && !doneToday.includes(h.id));

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 p-5 shadow-xl shadow-purple-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center"><ListChecks size={22} className="text-white" /></span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Habit Log</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">Start tiny • stack it • celebrate • never miss twice</p>
          </div>
        </div>
      </div>

      {atRisk.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-4">
          <p className="text-sm font-black text-amber-300 mb-1">⚠️ Don't miss twice!</p>
          <p className="text-xs text-amber-200/90">You missed {atRisk.map((h) => h.emoji + " " + h.habit_name).join(", ")} yesterday. One miss is an accident — two is a new habit. Do the 2-min version now!</p>
        </div>
      )}

      <div className="grid gap-3 mb-5">
        {habits.map((h) => {
          const done = doneToday.includes(h.id);
          const cur = currentMin(h);
          const w = weeksSince(h.created_at);
          return (
            <div key={h.id} className={`rounded-2xl p-4 border transition-all ${done ? "bg-emerald-500/10 border-emerald-500/40" : "bg-slate-900 border-slate-800"}`}>
              <div className="flex items-center gap-3">
                <button onClick={() => toggle(h)} className={`w-12 h-12 shrink-0 rounded-xl border-2 flex items-center justify-center text-2xl press ${done ? "bg-emerald-600 border-emerald-500" : "bg-slate-800 border-slate-700"}`}>
                  {done ? "✓" : h.emoji}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-black text-sm ${done ? "text-emerald-300 line-through" : "text-white"}`}>{h.habit_name}</p>
                  {h.anchor && <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><Anchor size={10} /> After {h.anchor}</p>}
                  <p className="text-[10px] text-violet-300 font-bold mt-0.5">📈 Week {w + 1} goal: {cur} min (started at 2)</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {streaks[h.id] > 0 && <span className="flex items-center gap-0.5 text-[10px] font-black text-orange-400"><Flame size={11} />{streaks[h.id]}</span>}
                  <button onClick={() => del(h.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          );
        })}
        {habits.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-3xl mb-2">🌱</p>
            <p className="text-sm text-slate-400">No habits yet — tap a template below to start tiny!</p>
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
        <p className="text-xs font-black text-slate-400 mb-2 flex items-center gap-1.5"><Sparkles size={13} className="text-violet-400" /> ONE-TAP START (2-min version)</p>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t, i) => (
            <button key={i} onClick={() => addHabit(t)} className="press text-left bg-slate-800/60 border border-slate-700 rounded-xl p-2.5 hover:border-violet-500/40">
              <p className="text-xs font-bold text-white">{t.emoji} {t.name}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">After {t.anchor}</p>
            </button>
          ))}
        </div>
      </div>

      {!adding ? (
        <button onClick={() => setAdding(true)} className="press w-full py-3.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-sm font-black text-violet-300 flex items-center justify-center gap-1.5">
          <Plus size={15} /> Create my own habit
        </button>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Habit (e.g. Read 1 page)" className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500" />
          <div className="grid grid-cols-2 gap-2">
            <select value={anchor} onChange={(e) => setAnchor(e.target.value)} className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none">
              {ANCHORS.map((a) => <option key={a}>After: {a}</option>)}
            </select>
            <input type="number" min="2" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Goal min" className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => addHabit()} className="press flex-1 py-2.5 rounded-xl bg-violet-600 text-sm font-black">Add habit</button>
            <button onClick={() => setAdding(false)} className="press px-4 rounded-xl bg-slate-800 text-slate-400"><X size={15} /></button>
          </div>
        </div>
      )}

      {celebrate && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="text-center animate-bounce">
            <PartyPopper size={56} className="text-amber-400 mx-auto mb-2" />
            <p className="text-xl font-black text-white">{celebrate.name} ✓</p>
            <p className="text-sm font-black text-amber-300 mt-1">+{celebrate.coins} 🪙</p>
          </div>
        </div>
      )}

      <Link href="/habits" className="inline-block mt-6 text-sm text-slate-500 hover:text-white press font-bold">← Back to Habits</Link>
    </main>
  );
}