"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { Ban, Plus, Trash2, Flame, Trophy, Coins, Clock, PartyPopper, RefreshCw } from "lucide-react";

type Bad = { id: string; name: string; emoji: string; cost_per: number; time_per: number; reason: string; replacement: string; created_at: string };
type Log = { id: string; bad_habit_id: string; log_date: string; clean: boolean };

function toLocalISO(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${day}`; }

const TEMPLATES = [
  { emoji: "📱", name: "Reels / short videos", cost: 0, time: 30, reason: "Steals my focus & sleep", replacement: "10 push-ups or read 1 page" },
  { emoji: "🚬", name: "Smoking", cost: 20, time: 0, reason: "Health + money", replacement: "chew gum, 5 deep breaths" },
  { emoji: "🥤", name: "Cold drink / sugar", cost: 50, time: 0, reason: "Health", replacement: "water / buttermilk" },
  { emoji: "🛒", name: "Ordering food", cost: 150, time: 0, reason: "Save money, eat clean", replacement: "home-cooked meal" },
  { emoji: "🌙", name: "Sleeping after 12", cost: 0, time: 60, reason: "Energy next day", replacement: "lights out 11 pm" },
  { emoji: "🎮", name: "Gaming binge", cost: 0, time: 60, reason: "Time for my goals", replacement: "20-min walk" },
];

export default function QuitPage() {
  const today = toLocalISO(new Date());
  const [uid, setUid] = useState("");
  const [habits, setHabits] = useState<Bad[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [name, setName] = useState(""); 
  const [emoji, setEmoji] = useState("🚫");
  const [cost, setCost] = useState(""); 
  const [time, setTime] = useState("");
  const [reason, setReason] = useState(""); 
  const [replacement, setReplacement] = useState("");
  const [celebrate, setCelebrate] = useState<string | null>(null);

  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id; if (!id) return; setUid(id);
    const [h, lg] = await Promise.all([
      supabase.from("bad_habits").select("*").eq("user_id", id).order("created_at"),
      supabase.from("bad_habit_logs").select("*").eq("user_id", id),
    ]);
    setHabits((h.data as Bad[]) || []);
    setLogs((lg.data as Log[]) || []);
  };

  const statsFor = (id: string) => {
    const cleanDates = logs.filter((l) => l.bad_habit_id === id && l.clean).map((l) => String(l.log_date));
    const set = new Set(cleanDates);
    let cur = 0; const cursor = new Date();
    if (!set.has(toLocalISO(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (set.has(toLocalISO(cursor))) { cur++; cursor.setDate(cursor.getDate() - 1); }
    const sorted = [...new Set(cleanDates)].sort();
    let best = 0, run = 0, prev: string | null = null;
    for (const d of sorted) { 
      if (prev) { 
        const diff = Math.round((new Date(d).getTime() - new Date(prev).getTime()) / 86400000); 
        run = diff === 1 ? run + 1 : 1; 
      } else { run = 1; } 
      best = Math.max(best, run); prev = d; 
    }
    return { cur, best, total: cleanDates.length };
  };
  
  const todayLog = (id: string) => logs.find((l) => l.bad_habit_id === id && l.log_date === today);

  const award = async (h: Bad) => {
    const { error } = await supabase.from("coin_log").insert({ user_id: uid, action_key: `quit-clean-${h.id}-${today}`, coins: 15 });
    if (!error) {
      const { data: cur } = await supabase.from("user_coins").select("coins").eq("user_id", uid).maybeSingle();
      const total = (cur?.coins || 0) + 15;
      await supabase.from("user_coins").upsert({ user_id: uid, coins: total });
      window.dispatchEvent(new CustomEvent("dg-coins", { detail: { total, earned: 15 } }));
    }
  };

  const mark = async (h: Bad, clean: boolean) => {
    const { data, error } = await supabase.from("bad_habit_logs").insert({ user_id: uid, bad_habit_id: h.id, log_date: today, clean }).select().single();
    if (!error && data) {
      setLogs([...logs, data]);
      if (clean) {
        setCelebrate(`${h.emoji} ${h.name} — clean today!`);
        recordNotification("💪 Stayed clean!", `${h.emoji} ${h.name} → +15 🪙`);
        await award(h);
        setTimeout(() => setCelebrate(null), 1600);
      } else {
        recordNotification("🌱 One slip ≠ failure", `${h.emoji} ${h.name} — restart now. You've got this.`);
      }
    }
  };

  const undo = async (h: Bad) => {
    await supabase.from("bad_habit_logs").delete().eq("user_id", uid).eq("bad_habit_id", h.id).eq("log_date", today);
    setLogs(logs.filter((l) => !(l.bad_habit_id === h.id && l.log_date === today)));
  };

  const addHabit = async (t?: { emoji: string; name: string; cost: number; time: number; reason: string; replacement: string }) => {
    const n = (t?.name || name).trim(); if (!n) return;
    const safeCost = Number(t?.cost ?? cost ?? 0) || 0;
    const safeTime = Number(t?.time ?? time ?? 0) || 0;
    const { data, error } = await supabase.from("bad_habits").insert({
      user_id: uid, name: n, emoji: t?.emoji || emoji,
      cost_per: safeCost, time_per: safeTime,
      reason: t?.reason || reason, replacement: t?.replacement || replacement,
    }).select().single();
    if (!error && data) setHabits([...habits, data as Bad]);
    setName(""); setReason(""); setReplacement(""); setCost(""); setTime("");
  };

  const del = async (id: string) => { await supabase.from("bad_habits").delete().eq("id", id); setHabits(habits.filter((h) => h.id !== id)); };

  const fmtTime = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
  const inputCls = "w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-rose-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-red-600 to-orange-600 p-5 shadow-xl shadow-rose-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center"><Ban size={22} className="text-white" /></span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Bad Habit Breaker</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">Don't just remove — replace. Track clean days & money saved.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 mb-5">
        {habits.map((h) => {
          const stats = statsFor(h.id);
          const tLog = todayLog(h.id);
          return (
            <div key={h.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-black text-white text-sm">{h.emoji} {h.name}</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Why: {h.reason}</p>
                  <p className="text-[10px] text-emerald-400 font-bold">Replace with: {h.replacement}</p>
                </div>
                <button onClick={() => del(h.id)} className="text-slate-600 hover:text-red-400 p-1"><Trash2 size={13} /></button>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg text-[10px] font-black text-orange-400"><Flame size={12}/> Streak: {stats.cur}</span>
                <span className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg text-[10px] font-black text-yellow-400"><Trophy size={12}/> Best: {stats.best}</span>
                {h.cost_per > 0 && <span className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg text-[10px] font-black text-emerald-400"><Coins size={12}/> Saved: ₹{stats.total * h.cost_per}</span>}
                {h.time_per > 0 && <span className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg text-[10px] font-black text-blue-400"><Clock size={12}/> Saved: {fmtTime(stats.total * h.time_per)}</span>}
              </div>

              {tLog ? (
                <div className="flex items-center justify-between bg-slate-950 rounded-xl p-2 border border-slate-800">
                  <span className={`text-xs font-bold ${tLog.clean ? "text-emerald-400" : "text-rose-400"}`}>
                    {tLog.clean ? "✅ Clean today" : "❌ Relapsed today"}
                  </span>
                  <button onClick={() => undo(h)} className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"><RefreshCw size={10}/> Undo</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => mark(h, true)} className="py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-black hover:bg-emerald-500/20">I stayed clean</button>
                  <button onClick={() => mark(h, false)} className="py-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-black hover:bg-rose-500/20">I slipped up</button>
                </div>
              )}
            </div>
          );
        })}
        {habits.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-3xl mb-2">❤️‍🩹</p>
            <p className="text-sm text-slate-400">Ready to quit a bad habit? Start below.</p>
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
        <p className="text-xs font-black text-slate-400 mb-2 mt-2 flex items-center"><Plus size={12} className="mr-1 text-rose-400"/> CREATE CUSTOM HABIT</p>
        <div className="grid gap-2 mb-6">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Habit name (e.g. Nail biting)" className={inputCls} />
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why quit? (e.g. Health)" className={inputCls} />
          <input value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder="Replacement (e.g. Chew gum)" className={inputCls} />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Cost/time (₹)" className={inputCls} />
            <input type="number" value={time} onChange={(e) => setTime(e.target.value)} placeholder="Time lost/time (min)" className={inputCls} />
          </div>
          <button onClick={() => addHabit()} className="w-full py-3 rounded-xl bg-rose-600 text-sm font-black mt-1">Add to Quit List</button>
        </div>

        <p className="text-xs font-black text-slate-400 mb-2">QUICK START TEMPLATES</p>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t, i) => (
            <button key={i} onClick={() => addHabit(t)} className="text-left bg-slate-800/60 border border-slate-700 rounded-xl p-2.5 hover:border-rose-500/40">
              <p className="text-xs font-bold text-white">{t.emoji} {t.name}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">Rep: {t.replacement}</p>
            </button>
          ))}
        </div>
      </div>

      {celebrate && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="text-center animate-bounce">
            <PartyPopper size={56} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-xl font-black text-white">{celebrate}</p>
            <p className="text-sm font-black text-emerald-300 mt-1">+15 🪙</p>
          </div>
        </div>
      )}

      <Link href="/dashboard" className="inline-block mt-4 text-sm text-slate-500 hover:text-white font-bold">← Back to Dashboard</Link>
    </main>
  );
}