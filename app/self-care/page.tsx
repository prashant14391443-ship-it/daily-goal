"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { SELF_CARE_TEMPLATES, CATEGORIES, type SelfCareTemplate, type Category } from "@/lib/selfcare";
import { Plus, Trash2, Flame, PartyPopper, X, Clock, HeartHandshake, Phone } from "lucide-react";

type SCHabit = { id: string; habit_name: string; emoji: string; anchor: string; target_minutes: number; created_at: string; cue_time: string | null; category: string; audience: string };

function toLocalISO(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${day}`; }

const ANCHORS = ["I wake up", "I brush my teeth", "I eat breakfast", "I eat lunch", "I eat dinner", "I finish work/school", "I get into bed"];
const REMIND_TIMES = ["06:00", "07:00", "08:00", "12:00", "17:00", "19:00", "20:00", "21:00", "22:00"];
const MODES = [{ id: "all", label: "Everyone" }, { id: "men", label: "For Him" }, { id: "women", label: "For Her" }] as const;

const Label = ({ t }: { t: string }) => <span className="text-[10px] font-black text-slate-500">{t}</span>;

export default function SelfCarePage() {
  const today = toLocalISO(new Date());
  const [mode, setMode] = useState<"all" | "men" | "women">("all");
  const [view, setView] = useState<"today" | "add" | "review">("today");
  const [cat, setCat] = useState<"all" | Category>("all");
  const [uid, setUid] = useState("");
  const [habits, setHabits] = useState<SCHabit[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [streaks, setStreaks] = useState<Record<string, number>>({});

  const [name, setName] = useState("");
  const [anchor, setAnchor] = useState(ANCHORS[0]);
  const [target, setTarget] = useState("5");
  const [cueTime, setCueTime] = useState("");
  const [catNew, setCatNew] = useState<Category>("move");

  const [pendingT, setPendingT] = useState<SelfCareTemplate | null>(null);
  const [pendingTime, setPendingTime] = useState("07:00");
  const [celebrate, setCelebrate] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id; if (!id) return; setUid(id);
    const [h, lg] = await Promise.all([
      supabase.from("habits").select("*").eq("user_id", id).eq("category", "selfcare").order("created_at"),
      supabase.from("habit_logs").select("*").eq("user_id", id).eq("completed", true),
    ]);
    setHabits((h.data as SCHabit[]) || []);
    const all = (lg.data || []) as any[];
    setLogs(all);
    const st: Record<string, number> = {};
    ((h.data as SCHabit[]) || []).forEach((hb) => {
      let s = 0; let cursor = new Date();
      const has = (d: string) => all.some((l) => l.habit_id === hb.id && l.log_date === d);
      if (!has(toLocalISO(cursor))) cursor.setDate(cursor.getDate() - 1);
      while (has(toLocalISO(cursor))) { s++; cursor.setDate(cursor.getDate() - 1); }
      st[hb.id] = s;
    });
    setStreaks(st);
  };

  /* check-in nudge for rituals that have a time */
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      let fired: any = {}; try { fired = JSON.parse(localStorage.getItem("dg-selfcare-rem-fired") || "{}"); } catch {}
      if (fired.date !== today) fired = { date: today, keys: [] };
      let changed = false;
      habits.forEach((h) => {
        if (!h.cue_time || h.cue_time !== hm) return;
        if (logs.some((l) => l.habit_id === h.id && l.log_date === today)) return;
        const key = `sc-${h.id}-${today}`;
        if (fired.keys.includes(key)) return;
        fired.keys.push(key); changed = true;
        recordNotification("🧖 Self-care check-in", `${h.emoji} ${h.habit_name} — 2 minutes now?`);
      });
      if (changed) localStorage.setItem("dg-selfcare-rem-fired", JSON.stringify(fired));
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [habits, logs, today]);

  const audOk = (a: string) => (mode === "all" ? a === "all" : a === "all" || a === mode);
  const visible = habits.filter((h) => audOk(h.audience) && (cat === "all" || h.category === cat));
  const templates = SELF_CARE_TEMPLATES.filter((t) => (mode === "all" ? t.audience === "all" : t.audience === "all" || t.audience === mode) && (cat === "all" || t.category === cat));

  const doneToday = logs.filter((l) => l.log_date === today).map((l) => l.habit_id);
  const last7 = Array.from({ length: 7 }, (_, i) => toLocalISO(new Date(Date.now() - (6 - i) * 86400000)));
  const isDone = (hid: string, d: string) => logs.some((l) => l.habit_id === hid && l.log_date === d);

  const award = async (hb: SCHabit) => {
    const { error } = await supabase.from("coin_log").insert({ user_id: uid, action_key: `habit-${hb.id}-${today}`, coins: 10 });
    if (!error) {
      const { data: cur } = await supabase.from("user_coins").select("coins").eq("user_id", uid).maybeSingle();
      const total = (cur?.coins || 0) + 10;
      await supabase.from("user_coins").upsert({ user_id: uid, coins: total });
      window.dispatchEvent(new CustomEvent("dg-coins", { detail: { total, earned: 10 } }));
    }
  };

  const toggle = async (hb: SCHabit) => {
    if (doneToday.includes(hb.id)) {
      await supabase.from("habit_logs").delete().eq("user_id", uid).eq("habit_id", hb.id).eq("log_date", today);
      setLogs(logs.filter((l) => !(l.habit_id === hb.id && l.log_date === today)));
      setStreaks({ ...streaks, [hb.id]: Math.max(0, (streaks[hb.id] || 1) - 1) });
      return;
    }
    const { data, error } = await supabase.from("habit_logs").insert({ user_id: uid, habit_id: hb.id, log_date: today, completed: true }).select().single();
    if (!error && data) {
      setLogs([...logs, data]);
      setStreaks({ ...streaks, [hb.id]: (streaks[hb.id] || 0) + 1 });
      setCelebrate(`${hb.emoji} ${hb.habit_name} ✓`);
      recordNotification("🧖 Self-care done!", `${hb.emoji} ${hb.habit_name} → +10 🪙`);
      await award(hb);
      setTimeout(() => setCelebrate(null), 1600);
    }
  };

  const addHabit = async (t?: SelfCareTemplate, timeOverride?: string | null) => {
    const n = (t?.name || name).trim(); if (!n) return;
    const { data, error } = await supabase.from("habits").insert({
      user_id: uid,
      habit_name: n,
      emoji: t?.emoji || "🧖",
      anchor: t?.anchor || anchor,
      target_minutes: t?.target || Number(target) || 5,
      identity: null,
      cue_time: t ? (timeOverride || null) : (cueTime || null),
      cue_place: null,
      category: "selfcare",
      audience: t ? t.audience : mode === "all" ? "all" : mode,
      ...(t ? {} : { category_extra: undefined }),
    }).select().single();
    if (!error && data) setHabits([...habits, data as SCHabit]);
    setName(""); setCueTime(""); setView("today");
  };

  const del = async (id: string) => { await supabase.from("habits").delete().eq("id", id); setHabits(habits.filter((h) => h.id !== id)); };

  const catEmoji = (c: string) => CATEGORIES.find((x) => x.id === c)?.emoji || "🧖";
  const echo = SELF_CARE_TEMPLATES[new Date().getDate() % SELF_CARE_TEMPLATES.length];

  const doneCount = visible.filter((h) => doneToday.includes(h.id)).length;
  const weekCells = visible.length * 7;
  const weekDone = visible.reduce((a, h) => a + last7.filter((d) => isDone(h.id, d)).length, 0);
  const score = weekCells ? Math.round((weekDone / weekCells) * 100) : 0;

  const inputCls = "w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-teal-500";
  const timeCls = inputCls + " [color-scheme:dark] text-slate-200";

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* HERO */}
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 via-emerald-600 to-cyan-600 p-5 shadow-xl shadow-teal-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center"><HeartHandshake size={22} className="text-white" /></span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight">Self-Care</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">Ancient wisdom • modern science • 2-minute rituals</p>
          </div>
        </div>
      </div>

      {/* MODE TOGGLE */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {MODES.map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)} className={`press py-2.5 rounded-xl text-xs font-black border ${mode === m.id ? "bg-teal-500/15 border-teal-500/30 text-teal-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* CATEGORY CHIPS */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        <button onClick={() => setCat("all")} className={`press px-2.5 py-1.5 rounded-lg text-[10px] font-black border ${cat === "all" ? "bg-teal-500/15 border-teal-500/30 text-teal-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} className={`press px-2.5 py-1.5 rounded-lg text-[10px] font-black border ${cat === c.id ? "bg-teal-500/15 border-teal-500/30 text-teal-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* TABS */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {(["today", "add", "review"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`press py-2.5 rounded-xl text-xs font-black border ${view === v ? "bg-teal-500/15 border-teal-500/30 text-teal-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
            {v === "today" ? "✅ Today" : v === "add" ? "➕ Add" : "📊 Review"}
          </button>
        ))}
      </div>

      {view === "today" && (
        <>
          {visible.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
              <div className="flex justify-between text-xs font-black mb-2"><span className="text-slate-400">TODAY&apos;S SELF-CARE</span><span className="text-emerald-400">{doneCount}/{visible.length} done</span></div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${visible.length ? (doneCount / visible.length) * 100 : 0}%` }} /></div>
            </div>
          )}

          {/* ANCIENT ECHO OF THE DAY */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
            <p className="text-[10px] font-black text-amber-400 mb-1">🏛️ ANCIENT ECHO OF THE DAY</p>
            <p className="text-xs text-slate-300 font-bold">{echo.ancient}</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1">🔬 {echo.why}</p>
          </div>

          <div className="grid gap-3 mb-5">
            {visible.map((h) => {
              const done = doneToday.includes(h.id);
              return (
                <div key={h.id} className={`rounded-2xl p-4 border transition-all ${done ? "bg-emerald-500/10 border-emerald-500/40" : "bg-slate-900 border-slate-800"}`}>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggle(h)} className={`w-12 h-12 shrink-0 rounded-xl border-2 flex items-center justify-center text-2xl press ${done ? "bg-emerald-600 border-emerald-500" : "bg-slate-800 border-slate-700"}`}>{done ? "✓" : h.emoji}</button>
                    <div className="flex-1 min-w-0">
                      <p className={`font-black text-sm truncate ${done ? "text-emerald-300 line-through" : "text-white"}`}>{h.habit_name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {catEmoji(h.category)} After {h.anchor}
                        {h.cue_time ? ` • ⏰ ${h.cue_time}` : ""}
                        {" • "}{h.target_minutes} min
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {streaks[h.id] > 0 && <span className="flex items-center gap-0.5 text-[10px] font-black text-orange-400"><Flame size={11} />{streaks[h.id]}</span>}
                      <button onClick={() => del(h.id)} className="text-slate-600 hover:text-red-400 p-1"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
            {visible.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center"><p className="text-3xl mb-2">🧖</p><p className="text-sm text-slate-400">No rituals here yet — check the Add tab!</p></div>
            )}
          </div>
        </>
      )}

      {view === "add" && (
        <>
          {/* CUSTOM RITUAL */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid gap-2 mb-4">
            <p className="text-xs font-black text-slate-400 mb-1 flex items-center gap-1.5"><Plus size={13} className="text-teal-400" /> CREATE YOUR OWN RITUAL</p>
            <div className="grid gap-1"><Label t="NAME" /><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 5-min sun with tea" className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label t="AFTER (ANCHOR)" />
                <select value={anchor} onChange={(e) => setAnchor(e.target.value)} className={inputCls}>
                  {ANCHORS.map((a) => (<option key={a} value={a}>After: {a}</option>))}
                </select>
              </div>
              <div className="grid gap-1"><Label t="MINUTES" /><input type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} className={inputCls} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label t="CATEGORY" />
                <select value={catNew} onChange={(e) => setCatNew(e.target.value as Category)} className={inputCls}>
                  {CATEGORIES.map((c) => (<option key={c.id} value={c.id}>{c.emoji} {c.label}</option>))}
                </select>
              </div>
              <div className="grid gap-1"><Label t="⏰ TIME (OPTIONAL)" /><input type="time" value={cueTime} onChange={(e) => setCueTime(e.target.value)} className={timeCls} /></div>
            </div>
            <button onClick={() => addHabit()} className="press py-2.5 rounded-xl bg-teal-600 text-sm font-black mt-1">Add ritual</button>
          </div>

          {/* TEMPLATE PACKS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
            <p className="text-xs font-black text-slate-400 mb-1">RITUAL PACK — {MODES.find((m) => m.id === mode)?.label.toUpperCase()}</p>
            <p className="text-[10px] text-slate-500 font-bold mb-2">Tap → see why it works → pick time → done</p>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((t, i) => (
                <button key={i} onClick={() => { setPendingTime(t.time); setPendingT(t); }} className="press text-left bg-slate-800/60 border border-slate-700 rounded-xl p-2.5 hover:border-teal-500/40">
                  <p className="text-xs font-bold text-white">{t.emoji} {t.name}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">{catEmoji(t.category)} {t.category} • after {t.anchor.toLowerCase()}</p>
                </button>
              ))}
              {templates.length === 0 && (<p className="col-span-2 text-[10px] text-slate-500 font-bold text-center py-4">Nothing in this category for this mode — try another chip.</p>)}
            </div>
          </div>
        </>
      )}

      {view === "review" && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
            <div className="flex justify-between text-xs font-black mb-2"><span className="text-slate-400">WEEKLY SELF-CARE SCORE</span><span className="text-teal-300">{score}%</span></div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full" style={{ width: `${score}%` }} /></div>
            <div className="grid gap-2 mt-3">
              {CATEGORIES.filter((c) => visible.some((h) => h.category === c.id)).map((c) => {
                const ids = visible.filter((h) => h.category === c.id).map((h) => h.id);
                const done = logs.filter((l) => ids.includes(l.habit_id) && last7.includes(l.log_date)).length;
                const pct = ids.length ? Math.round((done / (ids.length * 7)) * 100) : 0;
                return (
                  <div key={c.id}>
                    <div className="flex justify-between text-[10px] font-black mb-1"><span className="text-slate-400">{c.emoji} {c.label.toUpperCase()}</span><span className="text-slate-500">{pct}%</span></div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>

          {visible.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 overflow-x-auto">
              <p className="text-xs font-black text-slate-400 mb-2">📜 Last 7 days</p>
              <div className="min-w-[420px]">
                <div className="grid" style={{ gridTemplateColumns: "1fr repeat(7, 28px)" }}>
                  <div />
                  {last7.map((d) => (<div key={d} className="text-[9px] text-slate-500 font-black text-center">{d.slice(8)}</div>))}
                  {visible.map((h) => (
                    <div key={h.id} className="contents">
                      <div className="text-[10px] text-slate-300 font-bold truncate pr-2 py-1">{h.emoji} {h.habit_name}</div>
                      {last7.map((d) => (
                        <div key={d} className="flex items-center justify-center py-1">
                          <span className={`w-3.5 h-3.5 rounded-full ${isDone(h.id, d) ? "bg-teal-500" : "bg-slate-800"}`} />
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

      {/* HELPLINE */}
      <a href="tel:14416" className="press flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
        <span className="w-9 h-9 shrink-0 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><Phone size={16} /></span>
        <div>
          <p className="text-xs font-black text-white">Need to talk? Tele-MANAS 14416</p>
          <p className="text-[10px] text-slate-500 font-bold">Free • 24×7 • Govt of India mental-health support</p>
        </div>
      </a>

      {/* TIME SHEET with WHY + ANCIENT */}
      {pendingT && (
        <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-t-3xl p-5 pb-8">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-black text-white">{pendingT.emoji} {pendingT.name}</p>
              <button onClick={() => setPendingT(null)} className="text-slate-500 press"><X size={16} /></button>
            </div>
            <p className="text-[11px] text-slate-300 font-bold mb-1">🔬 {pendingT.why}</p>
            <p className="text-[11px] text-amber-300/90 font-bold mb-4">🏛️ {pendingT.ancient}</p>
            <p className="text-[10px] font-black text-slate-500 mb-2">QUICK PICK</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {REMIND_TIMES.map((t) => (
                <button key={t} onClick={() => setPendingTime(t)} className={`press py-2.5 rounded-xl text-xs font-black border ${pendingTime === t ? "bg-teal-500/15 border-teal-500/40 text-teal-300" : "bg-slate-800 border-slate-700 text-slate-300"}`}>{t}</button>
              ))}
            </div>
            <div className="grid gap-1 mb-3"><Label t="OR PICK ANY TIME (CLOCK)" /><input type="time" value={pendingTime} onChange={(e) => setPendingTime(e.target.value)} className={timeCls} /></div>
            <div className="flex gap-2">
              <button onClick={() => { addHabit(pendingT, pendingTime || null); setPendingT(null); }} className="flex-1 press py-3 rounded-xl bg-teal-600 text-sm font-black">Add with {pendingTime || "no time"}</button>
              <button onClick={() => { addHabit(pendingT, null); setPendingT(null); }} className="press px-4 py-3 rounded-xl bg-slate-800 text-slate-400 text-xs font-black">Skip time</button>
            </div>
          </div>
        </div>
      )}

      {celebrate && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="text-center animate-bounce">
            <PartyPopper size={56} className="text-teal-400 mx-auto mb-2" />
            <p className="text-xl font-black text-white">{celebrate}</p>
            <p className="text-sm font-black text-amber-300 mt-1">+10 🪙</p>
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-600 font-bold text-center mt-2">Self-care rituals are habits, not medical advice.</p>
      <Link href="/routine-habits" className="inline-block mt-3 text-sm text-slate-500 hover:text-white press font-bold">← Back to Habits</Link>
    </main>
  );
}