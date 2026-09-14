"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { Ban, Plus, Trash2, Flame, Trophy, Coins, Clock, PartyPopper, RefreshCw, X } from "lucide-react";

type Bad = { id: string; name: string; emoji: string; cost_per: number; time_per: number; reason: string; replacement: string; created_at: string; reminder_time: string | null };
type Log = { id: string; bad_habit_id: string; log_date: string; clean: boolean };

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const REMIND_TIMES = ["06:00", "07:00", "08:00", "12:00", "17:00", "19:00", "20:00", "21:00", "22:00"];

const TEMPLATES = [
  { emoji: "📱", name: "Reels / short videos", cost: 0, time: 30, reason: "Steals my focus & sleep", replacement: "10 push-ups or read 1 page", remind: "21:00" },
  { emoji: "🚬", name: "Smoking", cost: 20, time: 0, reason: "Health + money", replacement: "chew gum, 5 deep breaths", remind: "19:00" },
  { emoji: "🥤", name: "Cold drink / sugar", cost: 50, time: 0, reason: "Health", replacement: "water / buttermilk", remind: "17:00" },
  { emoji: "🛒", name: "Ordering food", cost: 150, time: 0, reason: "Save money, eat clean", replacement: "home-cooked meal", remind: "20:00" },
  { emoji: "🌙", name: "Sleeping after 12", cost: 0, time: 60, reason: "Energy next day", replacement: "lights out 11 pm", remind: "22:00" },
  { emoji: "🎮", name: "Gaming binge", cost: 0, time: 60, reason: "Time for my goals", replacement: "20-min walk", remind: "21:00" },
];

const Label = ({ t }: { t: string }) => <span className="text-[10px] font-black text-slate-500">{t}</span>;

export default function QuitPage() {
  const today = toLocalISO(new Date());
  const [view, setView] = useState<"today" | "add" | "review">("today");
  const [uid, setUid] = useState("");
  const [habits, setHabits] = useState<Bad[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🚫");
  const [cost, setCost] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [replacement, setReplacement] = useState("");
  const [remTime, setRemTime] = useState("");
  const [pendingT, setPendingT] = useState<(typeof TEMPLATES)[number] | null>(null);
  const [pendingTime, setPendingTime] = useState("21:00");
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

  /* daily check-in nudge at each habit's reminder_time */
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      let fired: any = {}; try { fired = JSON.parse(localStorage.getItem("dg-quit-rem-fired") || "{}"); } catch {}
      if (fired.date !== today) fired = { date: today, keys: [] };
      let changed = false;
      habits.forEach((h) => {
        if (!h.reminder_time || h.reminder_time !== hm) return;
        if (todayLog(h.id)) return;
        const key = `q-${h.id}-${today}`;
        if (fired.keys.includes(key)) return;
        fired.keys.push(key); changed = true;
        recordNotification("💪 Check-in", `Did you stay clean from ${h.emoji} ${h.name} today? Tap to log.`);
      });
      if (changed) localStorage.setItem("dg-quit-rem-fired", JSON.stringify(fired));
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [habits, logs, today]);

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
    if (todayLog(h.id)) return;
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

  const addHabit = async (t?: { emoji: string; name: string; cost: number; time: number; reason: string; replacement: string; remind?: string }, timeOverride?: string | null) => {
    const n = (t?.name || name).trim(); if (!n) return;
    const safeCost = Number(t?.cost ?? cost ?? 0) || 0;
    const safeTime = Number(t?.time ?? time ?? 0) || 0;
    const finalRemind = t ? (timeOverride || null) : (remTime || null);
    const { data, error } = await supabase.from("bad_habits").insert({
      user_id: uid, name: n, emoji: (t?.emoji || emoji).trim() || "🚫",
      cost_per: safeCost, time_per: safeTime,
      reason: t?.reason || reason, replacement: t?.replacement || replacement,
      reminder_time: finalRemind,
    }).select().single();
    if (!error && data) setHabits([...habits, data as Bad]);
    setName(""); setReason(""); setReplacement(""); setCost(""); setTime(""); setEmoji("🚫"); setRemTime(""); setView("today");
  };

  const del = async (id: string) => { await supabase.from("bad_habits").delete().eq("id", id); setHabits(habits.filter((h) => h.id !== id)); };

  const fmtTime = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
  const inputCls = "w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-rose-500";
  const timeCls = inputCls + " [color-scheme:dark] text-slate-200";

  const last7 = Array.from({ length: 7 }, (_, i) => toLocalISO(new Date(Date.now() - (6 - i) * 86400000)));
  const isClean = (hid: string, d: string) => logs.some((l) => l.bad_habit_id === hid && l.log_date === d && l.clean);
  const isSlip = (hid: string, d: string) => logs.some((l) => l.bad_habit_id === hid && l.log_date === d && !l.clean);

  const cleanToday = habits.filter((h) => todayLog(h.id)?.clean).length;
  const totalClean = logs.filter((l) => l.clean).length;
  const savedRs = habits.reduce((a, h) => a + statsFor(h.id).total * h.cost_per, 0);
  const savedMin = habits.reduce((a, h) => a + statsFor(h.id).total * h.time_per, 0);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-red-600 to-orange-600 p-5 shadow-xl shadow-rose-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center"><Ban size={22} className="text-white" /></span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Bad Habit Breaker</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">Today: tap once. Add and review only when needed.</p>
          </div>
        </div>
      </div>

      {/* ✅ SAME 3-TAB SYSTEM AS HABIT LOG */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {(["today", "add", "review"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`press py-2.5 rounded-xl text-xs font-black border ${view === v ? "bg-rose-500/15 border-rose-500/30 text-rose-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
            {v === "today" ? "✅ Today" : v === "add" ? "➕ Add" : "📊 Review"}
          </button>
        ))}
      </div>

      {view === "today" && (
        <>
          {habits.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
              <div className="flex justify-between text-xs font-black mb-2"><span className="text-slate-400">TODAY</span><span className="text-emerald-400">{cleanToday}/{habits.length} clean</span></div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${habits.length ? (cleanToday / habits.length) * 100 : 0}%` }} /></div>
            </div>
          )}

          <div className="grid gap-3 mb-5">
            {habits.map((h) => {
              const stats = statsFor(h.id);
              const tLog = todayLog(h.id);
              return (
                <div key={h.id} className={`rounded-2xl p-4 border transition-all ${tLog?.clean ? "bg-emerald-500/10 border-emerald-500/40" : "bg-slate-900 border-slate-800"}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 shrink-0 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">{h.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm truncate">{h.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">Why: {h.reason} → <span className="text-emerald-400 font-bold">{h.replacement}</span></p>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex flex-wrap gap-x-2">
                        <span className="flex items-center gap-0.5 text-orange-400 font-black"><Flame size={10} />{stats.cur}</span>
                        <span className="flex items-center gap-0.5 text-yellow-400 font-black"><Trophy size={10} />{stats.best}</span>
                        {h.cost_per > 0 && <span className="flex items-center gap-0.5 text-emerald-400 font-black"><Coins size={10} />₹{stats.total * h.cost_per}</span>}
                        {h.time_per > 0 && <span className="flex items-center gap-0.5 text-blue-400 font-black"><Clock size={10} />{fmtTime(stats.total * h.time_per)}</span>}
                        {h.reminder_time && <span className="flex items-center gap-0.5 text-rose-400 font-black"><Clock size={10} />{h.reminder_time}</span>}
                      </p>
                    </div>
                    <button onClick={() => del(h.id)} className="text-slate-600 hover:text-red-400 p-1"><Trash2 size={13} /></button>
                  </div>
                  <div className="mt-3">
                    {tLog ? (
                      <div className="flex items-center justify-between bg-slate-950 rounded-xl p-2 border border-slate-800">
                        <span className={`text-xs font-bold ${tLog.clean ? "text-emerald-400" : "text-rose-400"}`}>
                          {tLog.clean ? "✅ Clean today" : "❌ Relapsed today"}
                        </span>
                        <button onClick={() => undo(h)} className="press text-[10px] text-slate-400 hover:text-white flex items-center gap-1"><RefreshCw size={10} /> Undo</button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => mark(h, true)} className="press py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-black hover:bg-emerald-500/20">I stayed clean</button>
                        <button onClick={() => mark(h, false)} className="press py-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-black hover:bg-rose-500/20">I slipped up</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {habits.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center"><p className="text-3xl mb-2">❤️‍🩹</p><p className="text-sm text-slate-400">No bad habits yet — check the Add tab to start!</p></div>
            )}
          </div>
        </>
      )}

      {view === "add" && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid gap-2 mb-4">
            <p className="text-xs font-black text-slate-400 mb-1 flex items-center gap-1.5"><Plus size={13} className="text-rose-400" /> CREATE CUSTOM HABIT</p>
            <div className="grid grid-cols-4 gap-2">
              <div className="grid gap-1"><Label t="EMOJI" /><input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} className={inputCls} /></div>
              <div className="col-span-3 grid gap-1"><Label t="HABIT NAME" /><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nail biting" className={inputCls} /></div>
            </div>
            <div className="grid gap-1"><Label t="WHY QUIT?" /><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Health" className={inputCls} /></div>
            <div className="grid gap-1"><Label t="REPLACE WITH" /><input value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder="e.g. Chew gum" className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1"><Label t="₹ EACH TIME" /><input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" className={inputCls} /></div>
              <div className="grid gap-1"><Label t="MIN EACH TIME" /><input type="number" value={time} onChange={(e) => setTime(e.target.value)} placeholder="0" className={inputCls} /></div>
            </div>
            {/* ✅ CLOCK SYSTEM — pick any exact time easily */}
            <div className="grid gap-1"><Label t="⏰ TIME (OPTIONAL)" /><input type="time" value={remTime} onChange={(e) => setRemTime(e.target.value)} className={timeCls} /></div>
            <button onClick={() => addHabit()} className="press w-full py-3 rounded-xl bg-rose-600 text-sm font-black mt-1">Add to Quit List</button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
            <p className="text-xs font-black text-slate-400 mb-1">QUICK START TEMPLATES</p>
            <p className="text-[10px] text-slate-500 font-bold mb-2">Tap → set check-in time → done</p>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => { setPendingTime(t.remind || "21:00"); setPendingT(t); }} className="press text-left bg-slate-800/60 border border-slate-700 rounded-xl p-2.5 hover:border-rose-500/40">
                  <p className="text-xs font-bold text-white">{t.emoji} {t.name}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Rep: {t.replacement}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {view === "review" && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
              <p className="text-xl font-black text-emerald-400">{totalClean}</p>
              <p className="text-[9px] text-slate-500 font-black mt-1">CLEAN DAYS</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
              <p className="text-xl font-black text-yellow-400">₹{savedRs}</p>
              <p className="text-[9px] text-slate-500 font-black mt-1">SAVED</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
              <p className="text-xl font-black text-blue-400">{fmtTime(savedMin)}</p>
              <p className="text-[9px] text-slate-500 font-black mt-1">TIME BACK</p>
            </div>
          </div>

          {habits.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 overflow-x-auto">
              <p className="text-xs font-black text-slate-400 mb-2">📜 Clean grid — last 7 days</p>
              <div className="min-w-[420px]">
                <div className="grid" style={{ gridTemplateColumns: "1fr repeat(7, 28px)" }}>
                  <div />
                  {last7.map((d) => (<div key={d} className="text-[9px] text-slate-500 font-black text-center">{d.slice(8)}</div>))}
                  {habits.map((h) => (
                    <div key={h.id} className="contents">
                      <div className="text-[10px] text-slate-300 font-bold truncate pr-2 py-1">{h.emoji} {h.name}</div>
                      {last7.map((d) => (
                        <div key={d} className="flex items-center justify-center py-1">
                          <span className={`w-3.5 h-3.5 rounded-full ${isClean(h.id, d) ? "bg-emerald-500" : isSlip(h.id, d) ? "bg-rose-500" : "bg-slate-800"}`} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ✅ TEMPLATE SHEET: quick picks + CLOCK for any exact time */}
      {pendingT && (
        <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-t-3xl p-5 pb-8">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-black text-white">⏰ Check-in time</p>
              <button onClick={() => setPendingT(null)} className="text-slate-500 press"><X size={16} /></button>
            </div>
            <p className="text-[11px] text-slate-400 font-bold mb-4">{pendingT.emoji} {pendingT.name} — when should we ask "did you stay clean?"</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {REMIND_TIMES.map((t) => (
                <button key={t} onClick={() => setPendingTime(t)} className={`press py-2.5 rounded-xl text-xs font-black border ${pendingTime === t ? "bg-rose-500/15 border-rose-500/40 text-rose-300" : "bg-slate-800 border-slate-700 text-slate-300"}`}>{t}</button>
              ))}
            </div>
            <div className="grid gap-1 mb-3"><Label t="OR PICK ANY TIME (CLOCK)" /><input type="time" value={pendingTime} onChange={(e) => setPendingTime(e.target.value)} className={timeCls} /></div>
            <div className="flex gap-2">
              <button onClick={() => { addHabit(pendingT, pendingTime || null); setPendingT(null); }} className="flex-1 press py-3 rounded-xl bg-rose-600 text-sm font-black">Add with {pendingTime || "no time"}</button>
              <button onClick={() => { addHabit(pendingT, null); setPendingT(null); }} className="press px-4 py-3 rounded-xl bg-slate-800 text-slate-400 text-xs font-black">Skip time</button>
            </div>
          </div>
        </div>
      )}

      {celebrate && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="text-center animate-bounce">
            <PartyPopper size={56} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-xl font-black text-white">{celebrate}</p>
            <p className="text-sm font-black text-emerald-300 mt-1">+15 🪙</p>
          </div>
        </div>
      )}

      <Link href="/routine-habits" className="inline-block mt-6 text-sm text-slate-500 hover:text-white press font-bold">← Back to Habits</Link>
    </main>
  );
}