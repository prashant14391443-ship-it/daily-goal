"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { ListChecks, Plus, Trash2, Flame, Anchor, PartyPopper, Sparkles, X, Landmark, Clock, MapPin, Pencil, Bell, BellOff, ChevronLeft, ChevronRight } from "lucide-react";

type Habit = { id: string; habit_name: string; emoji: string; anchor: string; target_minutes: number; created_at: string; identity: string; cue_time: string; cue_place: string };

function toLocalISO(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${day}`; }
function shiftDate(dateStr: string, days: number) { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + days); return toLocalISO(d); }

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
  
  const [name, setName] = useState("");
  const [anchor, setAnchor] = useState(ANCHORS[0]);
  const [anchorCustom, setAnchorCustom] = useState("");
  const [target, setTarget] = useState("10");
  const [identity, setIdentity] = useState("");
  const [cueTime, setCueTime] = useState("");
  const [cuePlace, setCuePlace] = useState("");
  
  const [editId, setEditId] = useState<string | null>(null);
  const [eName, setEName] = useState(""); 
  const [eAnchor, setEAnchor] = useState(ANCHORS[0]); 
  const [eAnchorCustom, setEAnchorCustom] = useState(""); 
  const [eTarget, setETarget] = useState("10");
  const [eTime, setETime] = useState(""); 
  const [ePlace, setEPlace] = useState(""); 
  const [eIdentity, setEIdentity] = useState("");
  
  const [celebrate, setCelebrate] = useState<{ name: string; coins: number } | null>(null);
  const [reflWent, setReflWent] = useState(""); 
  const [reflImprove, setReflImprove] = useState(""); 
  const [reflGrateful, setReflGrateful] = useState("");
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
    const all = (lg.data || []) as any[];
    setLogs(all);
    if (ref && ref.data) { setReflWent(ref.data.went_well || ""); setReflImprove(ref.data.improve || ""); setReflGrateful(ref.data.grateful || ""); setReflSaved(true); }
    const st: Record<string, number> = {};
    ((h.data as Habit[]) || []).forEach((hb) => {
      let s = 0; let cursor = new Date();
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
      let fired: any = {}; try { fired = JSON.parse(localStorage.getItem("dg-habit-rem-fired") || "{}"); } catch {}
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

  const doneToday = logs.filter((l) => l.log_date === today).map((l) => l.habit_id);
  const doneYesterday = logs.filter((l) => l.log_date === yesterday).map((l) => l.habit_id);
  const doneView = logs.filter((l) => l.log_date === viewDate).map((l) => l.habit_id);

  const weeksSince = (c: string) => Math.floor((Date.now() - new Date(c || Date.now()).getTime()) / (7 * 86400000));
  const currentMin = (h: Habit) => { const w = Math.max(0, weeksSince(h.created_at)); const ladder = [2, 5, 10]; const base = w < 3 ? ladder[w] : (h.target_minutes || 10); return Math.min(base, h.target_minutes || base); };

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
      if (d === today) setStreaks({ ...streaks, [hb.id]: Math.max(0, (streaks[hb.id] || 1) - 1) });
      return;
    }
    const { data, error } = await supabase.from("habit_logs").insert({ user_id: uid, habit_id: hb.id, log_date: d, completed: true }).select().single();
    if (!error && data) {
      setLogs([...logs, data]);
      if (d === today) {
        setStreaks({ ...streaks, [hb.id]: (streaks[hb.id] || 0) + 1 });
        setCelebrate({ name: hb.habit_name, coins: 10 });
        recordNotification("🎉 Habit done!", `${hb.emoji} ${hb.habit_name} → +10 🪙`);
        await award(hb);
        setTimeout(() => setCelebrate(null), 1600);
      } else {
        recordNotification("📅 Logged", `${hb.emoji} ${hb.habit_name} for ${d}`);
      }
    }
  };

  const addHabit = async (t?: { emoji: string; name: string; anchor: string; target: number; identity?: string }) => {
    const n = (t?.name || name).trim(); if (!n) return;
    const finalAnchor = t ? t.anchor : (anchor === "__custom" ? (anchorCustom.trim() || "I wake up") : anchor);
    const { data, error } = await supabase.from("habits").insert({
      user_id: uid, habit_name: n, emoji: t?.emoji || "✅", anchor: finalAnchor,
      target_minutes: t?.target || Number(target) || 10, identity: t?.identity || identity,
      cue_time: (t ? null : cueTime) || null, cue_place: (t ? null : cuePlace) || null,
    }).select().single();
    if (!error && data) setHabits([...habits, data as Habit]);
    setName(""); setIdentity(""); setCueTime(""); setCuePlace(""); setAnchorCustom(""); setView("today");
  };

  const startEdit = (h: Habit) => {
    setEditId(h.id); setEName(h.habit_name); setETarget(String(h.target_minutes || 10));
    setETime(h.cue_time || ""); setEPlace(h.cue_place || ""); setEIdentity(h.identity || "");
    if (ANCHORS.includes(h.anchor)) { setEAnchor(h.anchor); setEAnchorCustom(""); } else { setEAnchor("__custom"); setEAnchorCustom(h.anchor); }
  };
  
  const saveEdit = async () => {
    if (!editId) return;
    const finalAnchor = eAnchor === "__custom" ? (eAnchorCustom.trim() || "I wake up") : eAnchor;
    const patch = { habit_name: eName.trim() || "Habit", anchor: finalAnchor, target_minutes: Number(eTarget) || 10, cue_time: eTime || null, cue_place: ePlace || null, identity: eIdentity };
    await supabase.from("habits").update(patch).eq("id", editId);
    setHabits(habits.map((h) => (h.id === editId ? { ...h, ...patch } : h)));
    setEditId(null);
  };
  
  const del = async (id: string) => { await supabase.from("habits").delete().eq("id", id); setHabits(habits.filter((h) => h.id !== id)); };

  const saveReflection = async () => {
    if (reflSaved) return;
    await supabase.from("reflections").insert({ user_id: uid, log_date: today, went_well: reflWent, improve: reflImprove, grateful: reflGrateful });
    setReflSaved(true);
    recordNotification("🏛️ Evening review done", "Marcus Aurelius would be proud.");
  };

  const atRisk = habits.filter((h) => (h.created_at || "").slice(0, 10) <= yesterday && !doneYesterday.includes(h.id) && !doneToday.includes(h.id));
  const last7 = Array.from({ length: 7 }, (_, i) => toLocalISO(new Date(Date.now() - (6 - i) * 86400000)));
  const isDone = (hid: string, d: string) => logs.some((l) => l.habit_id === hid && l.log_date === d);
  const doneCount = doneView.length;
  const inputCls = "w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500";

  const AnchorSelect = ({ value, onChange, custom, onCustom }: { value: string; onChange: (v: string) => void; custom: string; onCustom: (v: string) => void }) => (
    <>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {ANCHORS.map((a) => (<option key={a} value={a}>After: {a}</option>))}
        <option value="__custom">✏️ Write my own...</option>
      </select>
      {value === "__custom" && (<input value={custom} onChange={(e) => onCustom(e.target.value)} placeholder="e.g. while riding my cycle" className={inputCls} />)}
    </>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 p-5 shadow-xl shadow-purple-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <h1 className="text-lg font-black text-white leading-tight">Habit Log</h1>
          <p className="text-[11px] text-white/75 font-semibold mt-0.5">Today: tap once. Add and review only when needed.</p>
        </div>
      </div>

      {/* Reminders + Date picker */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button onClick={toggleReminders} className={`press flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border ${remindersOn ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}>
          {remindersOn ? <Bell size={13} /> : <BellOff size={13} />} {remindersOn ? "Reminders ON" : "Reminders OFF"}
        </button>
        {/* Removed time dropdown here */}
        <div className="flex-1" />
        <button onClick={() => setViewDate(shiftDate(viewDate, -1))} className="press w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center"><ChevronLeft size={15} /></button>
        <input type="date" value={viewDate} onChange={(e) => setViewDate(e.target.value || today)} className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs font-bold text-slate-300 outline-none" />
        <button onClick={() => setViewDate(shiftDate(viewDate, 1))} className="press w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center"><ChevronRight size={15} /></button>
      </div>
      {viewDate !== today && (<p className="text-center text-[10px] text-amber-300 font-black mb-3">📅 Viewing {viewDate} — tap ✓ to log for that day</p>)}

      <div className="grid grid-cols-3 gap-2 mb-5">
        {(["today", "add", "review"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`press py-2.5 rounded-xl text-xs font-black border ${view === v ? "bg-violet-500/15 border-violet-500/30 text-violet-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
            {v === "today" ? "✅ Today" : v === "add" ? "➕ Add" : "🏛️ Review"}
          </button>
        ))}
      </div>

      {/* ===== TODAY ===== */}
      {view === "today" && (
        <>
          {habits.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
              <div className="flex justify-between text-xs font-black mb-2"><span className="text-slate-400">{viewDate === today ? "TODAY" : viewDate}</span><span className="text-emerald-400">{doneCount}/{habits.length} done</span></div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${habits.length ? (doneCount / habits.length) * 100 : 0}%` }} /></div>
            </div>
          )}
          
          {viewDate === today && atRisk.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-4">
              <p className="text-sm font-black text-amber-300 mb-1">⚠️ Don't miss twice!</p>
              <p className="text-xs text-amber-200/90">You missed {atRisk.map((h) => h.emoji + " " + h.habit_name).join(", ")} yesterday. One miss is an accident — two is a new habit. Do the 2-min version now!</p>
            </div>
          )}

          <div className="grid gap-3 mb-5">
            {habits.map((h) => {
              const done = doneView.includes(h.id);
              if (editId === h.id) {
                return (
                  <div key={h.id} className="bg-slate-900 border border-slate-700 rounded-2xl p-4 grid gap-2">
                    <input value={eName} onChange={(e) => setEName(e.target.value)} className={inputCls} placeholder="Name" />
                    <input value={eIdentity} onChange={(e) => setEIdentity(e.target.value)} className={inputCls} placeholder="Identity" />
                    <AnchorSelect value={eAnchor} onChange={setEAnchor} custom={eAnchorCustom} onCustom={setEAnchorCustom} />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" min="2" value={eTarget} onChange={(e) => setETarget(e.target.value)} className={inputCls} placeholder="Target mins" />
                      <input type="time" value={eTime} onChange={(e) => setETime(e.target.value)} className={inputCls} />
                    </div>
                    <input value={ePlace} onChange={(e) => setEPlace(e.target.value)} className={inputCls} placeholder="Place cue" />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="flex-1 bg-emerald-600 text-white font-black py-2 rounded-xl text-sm">Save</button>
                      <button onClick={() => setEditId(null)} className="px-4 bg-slate-800 text-slate-400 rounded-xl"><X size={15} /></button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={h.id} className={`rounded-2xl p-4 border transition-all ${done ? "bg-emerald-500/10 border-emerald-500/40" : "bg-slate-900 border-slate-800"}`}>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggle(h)} className={`w-12 h-12 shrink-0 rounded-xl border-2 flex items-center justify-center text-2xl press ${done ? "bg-emerald-600 border-emerald-500" : "bg-slate-800 border-slate-700"}`}>{done ? "✓" : h.emoji}</button>
                    <div className="flex-1 min-w-0">
                      <p className={`font-black text-sm ${done ? "text-emerald-300 line-through" : "text-white"}`}>{h.habit_name}</p>
                      {h.identity && <p className="text-[10px] text-fuchsia-300 font-bold mt-0.5">🪪 I am someone who {h.identity}</p>}
                      {h.anchor && <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><Anchor size={10} /> After {h.anchor}</p>}
                      {(h.cue_time || h.cue_place) && (
                        <p className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          {h.cue_time && <span className="flex items-center gap-0.5"><Clock size={10} />{h.cue_time}</span>}
                          {h.cue_place && <span className="flex items-center gap-0.5"><MapPin size={10} />{h.cue_place}</span>}
                        </p>
                      )}
                      <p className="text-[10px] text-violet-300 font-bold mt-0.5">📈 Week {weeksSince(h.created_at) + 1} goal: {currentMin(h)} min (started at 2)</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {streaks[h.id] > 0 && <span className="flex items-center gap-0.5 text-[10px] font-black text-orange-400"><Flame size={11} />{streaks[h.id]}</span>}
                      <div className="flex gap-1.5 mt-1">
                        <button onClick={() => startEdit(h)} className="text-slate-500 hover:text-white p-1"><Pencil size={12} /></button>
                        <button onClick={() => del(h.id)} className="text-slate-600 hover:text-red-400 p-1"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {habits.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center"><p className="text-3xl mb-2">🌱</p><p className="text-sm text-slate-400">No habits yet — check the Add tab to start tiny!</p></div>
            )}
          </div>
        </>
      )}

      {/* ===== ADD HABITS ===== */}
      {view === "add" && (
        <>
          {/* Custom Habit First */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid gap-2 mb-4">
            <p className="text-xs font-black text-slate-400 mb-1 flex items-center gap-1.5"><Plus size={13} className="text-violet-400" /> CREATE CUSTOM HABIT</p>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Habit (e.g. Read 1 page)" className={inputCls} />
            <input value={identity} onChange={(e) => setIdentity(e.target.value)} placeholder="Identity: I am someone who... (e.g. reads daily)" className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-fuchsia-500" />
            <div className="grid grid-cols-2 gap-2">
              <AnchorSelect value={anchor} onChange={setAnchor} custom={anchorCustom} onCustom={setAnchorCustom} />
              <input type="number" min="2" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Goal min" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="time" value={cueTime} onChange={(e) => setCueTime(e.target.value)} className={inputCls} />
              <input value={cuePlace} onChange={(e) => setCuePlace(e.target.value)} placeholder="Place (e.g. desk)" className={inputCls} />
            </div>
            <button onClick={() => addHabit()} className="press py-2.5 rounded-xl bg-violet-600 text-sm font-black mt-1">Add custom habit</button>
          </div>
          
          {/* Templates Second */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
            <p className="text-xs font-black text-slate-400 mb-2 flex items-center gap-1.5"><Sparkles size={13} className="text-violet-400" /> ONE-TAP START (2-min version)</p>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => addHabit(t)} className="press text-left bg-slate-800/60 border border-slate-700 rounded-xl p-2.5 hover:border-violet-500/40">
                  <p className="text-xs font-bold text-white">{t.emoji} {t.name}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">After {t.anchor} • 🪪 {t.identity}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ===== EVENING REVIEW ===== */}
      {view === "review" && (
        <>
          {habits.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 overflow-x-auto">
              <p className="text-xs font-black text-slate-400 mb-2">📜 Franklin Grid — last 7 days</p>
              <div className="min-w-[420px]">
                <div className="grid" style={{ gridTemplateColumns: "1fr repeat(7, 28px)" }}>
                  <div />
                  {last7.map((d) => (<div key={d} className="text-[9px] text-slate-500 font-black text-center">{d.slice(8)}</div>))}
                  {habits.map((h) => (
                    <div key={h.id} className="contents">
                      <div className="text-[10px] text-slate-300 font-bold truncate pr-2 py-1">{h.emoji} {h.habit_name}</div>
                      {last7.map((d) => (
                        <div key={d} className="flex items-center justify-center py-1">
                          <span className={`w-3.5 h-3.5 rounded-full ${isDone(h.id, d) ? "bg-emerald-500" : "bg-slate-800"}`} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs font-black text-slate-400 mb-2 flex items-center gap-1.5"><Landmark size={13} className="text-amber-400" /> 🏛️ EVENING REVIEW (1 min)</p>
            {reflSaved ? (
              <div className="bg-slate-800/60 rounded-xl p-3 text-xs text-slate-300 grid gap-1">
                <p>✅ Went well: {reflWent || "—"}</p>
                <p>🔧 Improve: {reflImprove || "—"}</p>
                <p>🙏 Grateful: {reflGrateful || "—"}</p>
                <button onClick={() => setReflSaved(false)} className="text-[10px] text-amber-400 font-bold mt-2 text-left">Edit review</button>
              </div>
            ) : (
              <div className="grid gap-2">
                <input value={reflWent} onChange={(e) => setReflWent(e.target.value)} placeholder="What went well today?" className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-emerald-500" />
                <input value={reflImprove} onChange={(e) => setReflImprove(e.target.value)} placeholder="What to improve tomorrow?" className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-amber-500" />
                <input value={reflGrateful} onChange={(e) => setReflGrateful(e.target.value)} placeholder="One thing you're grateful for" className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-fuchsia-500" />
                <button onClick={saveReflection} className="press py-2.5 rounded-xl bg-amber-600 text-sm font-black">Save review</button>
              </div>
            )}
          </div>
        </>
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

      <Link href="/dashboard" className="inline-block mt-6 text-sm text-slate-500 hover:text-white press font-bold">← Back to Dashboard</Link>
    </main>
  );
}