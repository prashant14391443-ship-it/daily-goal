"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { ListChecks, Plus, Trash2, Flame, Anchor, PartyPopper, Sparkles, X, Landmark, Clock, MapPin, Pencil } from "lucide-react";

type Habit = { id: string; habit_name: string; emoji: string; anchor: string; target_minutes: number; created_at: string; identity: string; cue_time: string; cue_place: string };

function toLocalISO(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${day}`; }

const ANCHORS = ["I wake up", "I brush my teeth", "I pour my morning tea/coffee", "I eat breakfast", "I eat lunch", "I eat dinner", "I finish work/school", "I get into bed"];
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
  const [view, setView] = useState<"today" | "add" | "review">("today");
  const [uid, setUid] = useState("");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [doneToday, setDoneToday] = useState<string[]>([]);
  const [doneYesterday, setDoneYesterday] = useState<string[]>([]);
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [anchor, setAnchor] = useState(ANCHORS[0]);
  const [anchorCustom, setAnchorCustom] = useState("");
  const [target, setTarget] = useState("10");
  const [identity, setIdentity] = useState("");
  const [cueTime, setCueTime] = useState("");
  const [cuePlace, setCuePlace] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [eName, setEName] = useState(""); const [eAnchor, setEAnchor] = useState(ANCHORS[0]); const [eAnchorCustom, setEAnchorCustom] = useState(""); const [eTarget, setETarget] = useState("10");
  const [eTime, setETime] = useState(""); const [ePlace, setEPlace] = useState(""); const [eIdentity, setEIdentity] = useState("");
  const [celebrate, setCelebrate] = useState<{ name: string; coins: number } | null>(null);
  const [reflWent, setReflWent] = useState(""); const [reflImprove, setReflImprove] = useState(""); const [reflGrateful, setReflGrateful] = useState("");
  const [reflSaved, setReflSaved] = useState(false);
  const today = toLocalISO(new Date());
  const yesterday = toLocalISO(new Date(Date.now() - 86400000));

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
    setDoneToday(all.filter((l) => l.log_date === today).map((l) => l.habit_id));
    setDoneYesterday(all.filter((l) => l.log_date === yesterday).map((l) => l.habit_id));
    const refData = ref.data as { went_well?: string; improve?: string; grateful?: string } | null;
    if (refData) { setReflWent(refData.went_well || ""); setReflImprove(refData.improve || ""); setReflGrateful(refData.grateful || ""); setReflSaved(true); }
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

  const addHabit = async (t?: { emoji: string; name: string; anchor: string; target: number; identity?: string }) => {
    const n = (t?.name || name).trim(); if (!n) return;
    const finalAnchor = t ? t.anchor : (anchor === "__custom" ? (anchorCustom.trim() || "I wake up") : anchor);
    const { data, error } = await supabase.from("habits").insert({
      user_id: uid, habit_name: n, emoji: t?.emoji || "✅", anchor: finalAnchor,
      target_minutes: t?.target || Number(target) || 10, identity: t?.identity || identity,
      cue_time: t ? "" : cueTime, cue_place: t ? "" : cuePlace,
    }).select().single();
    if (!error && data) setHabits([...habits, data as Habit]);
    setName(""); setIdentity(""); setCueTime(""); setCuePlace(""); setAnchorCustom(""); setAdding(false); setView("today");
  };

  const startEdit = (h: Habit) => {
    setEditId(h.id); setEName(h.habit_name); setETarget(String(h.target_minutes || 10));
    setETime(h.cue_time || ""); setEPlace(h.cue_place || ""); setEIdentity(h.identity || "");
    if (ANCHORS.includes(h.anchor)) { setEAnchor(h.anchor); setEAnchorCustom(""); }
    else { setEAnchor("__custom"); setEAnchorCustom(h.anchor); }
  };
  const saveEdit = async () => {
    if (!editId) return;
    const finalAnchor = eAnchor === "__custom" ? (eAnchorCustom.trim() || "I wake up") : eAnchor;
    const patch = { habit_name: eName.trim() || "Habit", anchor: finalAnchor, target_minutes: Number(eTarget) || 10, cue_time: eTime, cue_place: ePlace, identity: eIdentity };
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
  const doneCount = doneToday.length;
  const inputCls = "w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500";

  const AnchorSelect = ({ value, onChange, custom, onCustom }: { value: string; onChange: (v: string) => void; custom: string; onCustom: (v: string) => void }) => (
    <>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {ANCHORS.map((a) => (<option key={a}>After: {a}</option>))}
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
              <div className="flex justify-between text-xs font-black mb-2"><span className="text-slate-400">TODAY</span><span className="text-emerald-400">{doneCount}/{habits.length} done</span></div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${habits.length ? (doneCount / habits.length) * 100 : 0}%` }} /></div>
            </div>
          )}
          {atRisk.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-4">
              <p className="text-sm font-black text-amber-300 mb-1">⚠️ Don't miss twice!</p>
              <p className="text-xs text-amber-200/90">You missed {atRisk.map((h) => h.emoji).join(" ")} yesterday. Do the 2-min version now!</p>
            </div>
          )}
          <div className="grid gap-3">
            {habits.map((h) => {
              const done = doneToday.includes(h.id);
              return (
                <div key={h.id} className={`rounded-2xl p-4 border flex items-center gap-3 ${done ? "bg-emerald-500/10 border-emerald-500/40" : "bg-slate-900 border-slate-800"}`}>
                  <button onClick={() => toggle(h)} className={`w-14 h-14 shrink-0 rounded-2xl border-2 flex items-center justify-center text-2xl press ${done ? "bg-emerald-600 border-emerald-500" : "bg-slate-800 border-slate-700"}`}>{done ? "✓" : h.emoji}</button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-sm ${done ? "text-emerald-300 line-through" : "text-white"}`}>{h.habit_name}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><Anchor size={10} /> After {h.anchor} • {currentMin(h)} min</p>
                    {(h.cue_time || h.cue_place) && (
                      <p className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        {h.cue_time && <span className="flex items-center gap-0.5"><Clock size={10} />{h.cue_time}</span>}
                        {h.cue_place && <span className="flex items-center gap-0.5"><MapPin size={10} />{h.cue_place}</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {streaks[h.id] > 0 && <span className="flex items-center gap-0.5 text-[10px] font-black text-orange-400"><Flame size={11} />{streaks[h.id]}</span>}
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(h)} className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center"><Pencil size={12} /></button>
                      <button onClick={() => del(h.id)} className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-600 hover:text-red-400 flex items-center justify-center"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
            {habits.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                <p className="text-3xl mb-2">🌱</p>
                <p className="text-sm font-bold text-white mb-1">Start with ONE tiny habit</p>
                <p className="text-xs text-slate-400 mb-4">2 minutes, after something you already do.</p>
                <button onClick={() => setView("add")} className="press px-5 py-3 rounded-xl bg-violet-600 text-sm font-black">➕ Pick my first habit</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== ADD (create on top, templates below) ===== */}
      {view === "add" && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
            <p className="text-sm font-black text-white mb-2">Create habit</p>
            <div className="grid gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Habit name, e.g. Read 1 page" className={inputCls} />
              <input value={identity} onChange={(e) => setIdentity(e.target.value)} placeholder="Identity: I am someone who... (optional)" className={inputCls} />
              <div className="grid grid-cols-2 gap-2">
                <AnchorSelect value={anchor} onChange={setAnchor} custom={anchorCustom} onCustom={setAnchorCustom} />
                <input type="number" min="2" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Goal min" className={inputCls} />
              </div>
              <p className="text-[10px] text-slate-500 font-bold">Optional cue: time and place</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={cueTime} onChange={(e) => setCueTime(e.target.value)} placeholder="Time (e.g. 7:00 AM)" className={inputCls} />
                <input value={cuePlace} onChange={(e) => setCuePlace(e.target.value)} placeholder="Place (e.g. desk)" className={inputCls} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => addHabit()} className="press flex-1 py-3 rounded-xl bg-violet-600 text-sm font-black flex items-center justify-center gap-1.5">💾 Save habit</button>
                <button onClick={() => setAdding(false)} className="press px-4 rounded-xl bg-slate-800 text-slate-400"><X size={15} /></button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-sm font-black text-white mb-1">Choose a tiny habit</p>
            <p className="text-[10px] text-slate-500 mb-2">Tap one. You can edit time/place later.</p>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => addHabit(t)} className="press text-left bg-slate-800/60 border border-slate-700 rounded-xl p-2.5 hover:border-violet-500/40">
                  <p className="text-xs font-bold text-white">{t.emoji} {t.name}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">After {t.anchor}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ===== REVIEW ===== */}
      {view === "review" && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
            <p className="text-xs font-black text-slate-400 mb-2 flex items-center gap-1.5"><Landmark size={13} className="text-amber-400" /> EVENING REVIEW (1 min)</p>
            {reflSaved ? (
              <div className="bg-slate-800/60 rounded-xl p-3 text-xs text-slate-300 grid gap-1">
                <p>✅ Went well: {reflWent || "—"}</p>
                <p>🔧 Improve: {reflImprove || "—"}</p>
                <p>🙏 Grateful: {reflGrateful || "—"}</p>
              </div>
            ) : (
              <div className="grid gap-2">
                <input value={reflWent} onChange={(e) => setReflWent(e.target.value)} placeholder="What went well today?" className={inputCls} />
                <input value={reflImprove} onChange={(e) => setReflImprove(e.target.value)} placeholder="What to improve tomorrow?" className={inputCls} />
                <input value={reflGrateful} onChange={(e) => setReflGrateful(e.target.value)} placeholder="One thing you're grateful for" className={inputCls} />
                <button onClick={saveReflection} className="press py-2.5 rounded-xl bg-amber-600 text-sm font-black">Save review</button>
              </div>
            )}
          </div>
          {habits.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
              <p className="text-xs font-black text-slate-400 mb-2">📜 LAST 7 DAYS</p>
              <div className="min-w-[420px]">
                <div className="grid" style={{ gridTemplateColumns: "1fr repeat(7, 28px)" }}>
                  <div />
                  {last7.map((d) => (<div key={d} className="text-[9px] text-slate-500 font-black text-center">{d.slice(8)}</div>))}
                  {habits.map((h) => (
                    <div key={h.id} className="contents">
                      <div className="text-[10px] text-slate-300 font-bold truncate pr-2 py-1">{h.emoji} {h.habit_name}</div>
                      {last7.map((d) => (
                        <div key={d} className="flex items-center justify-center py-1"><span className={`w-3.5 h-3.5 rounded-full ${isDone(h.id, d) ? "bg-emerald-500" : "bg-slate-800"}`} /></div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* EDIT OVERLAY */}
      {editId && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 w-full max-w-sm grid gap-2">
            <p className="text-sm font-black text-white mb-1">✏️ Edit habit</p>
            <input value={eName} onChange={(e) => setEName(e.target.value)} className={inputCls} />
            <input value={eIdentity} onChange={(e) => setEIdentity(e.target.value)} placeholder="Identity (optional)" className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <AnchorSelect value={eAnchor} onChange={setEAnchor} custom={eAnchorCustom} onCustom={setEAnchorCustom} />
              <input type="number" min="2" value={eTarget} onChange={(e) => setETarget(e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={eTime} onChange={(e) => setETime(e.target.value)} placeholder="Time (e.g. 7:00 AM)" className={inputCls} />
              <input value={ePlace} onChange={(e) => setEPlace(e.target.value)} placeholder="Place" className={inputCls} />
            </div>
            <div className="flex gap-2 mt-1">
              <button onClick={saveEdit} className="press flex-1 py-2.5 rounded-xl bg-violet-600 text-sm font-black">Save</button>
              <button onClick={() => setEditId(null)} className="press px-4 rounded-xl bg-slate-800 text-slate-400"><X size={15} /></button>
            </div>
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