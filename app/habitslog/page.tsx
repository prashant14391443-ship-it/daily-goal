"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import {
  ListChecks,
  Plus,
  Trash2,
  Flame,
  Anchor,
  PartyPopper,
  Sparkles,
  X,
  Landmark,
  Clock,
  MapPin,
  Pencil,
  Save,
} from "lucide-react";

type Habit = {
  id: string;
  habit_name: string;
  emoji: string;
  anchor: string;
  target_minutes: number;
  created_at: string;
  identity: string;
  cue_time: string;
  cue_place: string;
};

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const ANCHORS = [
  "I wake up",
  "I brush my teeth",
  "I pour my morning tea/coffee",
  "I eat breakfast",
  "I eat lunch",
  "I eat dinner",
  "I finish work/school",
  "I get into bed",
];

const TEMPLATES = [
  { emoji: "💧", name: "Drink a glass of water", anchor: "I wake up", target: 2, identity: "fuels my body" },
  { emoji: "🛏️", name: "Make my bed", anchor: "I wake up", target: 2, identity: "starts clean" },
  { emoji: "📵", name: "No phone for 30 min", anchor: "I wake up", target: 30, identity: "controls attention" },
  { emoji: "🧘", name: "1-min deep breathing", anchor: "I brush my teeth", target: 2, identity: "stays calm" },
  { emoji: "📖", name: "Read 1 page", anchor: "I eat dinner", target: 5, identity: "reads daily" },
  { emoji: "🚶", name: "Walk 10 minutes", anchor: "I eat lunch", target: 10, identity: "moves daily" },
  { emoji: "🧹", name: "2-min tidy up", anchor: "I eat dinner", target: 2, identity: "keeps space clean" },
  { emoji: "✍️", name: "Write 1 journal line", anchor: "I get into bed", target: 2, identity: "reflects daily" },
  { emoji: "🙏", name: "Name 1 good thing", anchor: "I get into bed", target: 2, identity: "is grateful" },
  { emoji: "🌅", name: "Sleep by 11 pm", anchor: "I get into bed", target: 2, identity: "respects rest" },
];

export default function HabitLogPage() {
  const [view, setView] = useState<"today" | "add" | "review">("today");

  const [uid, setUid] = useState("");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [doneToday, setDoneToday] = useState<string[]>([]);
  const [doneYesterday, setDoneYesterday] = useState<string[]>([]);
  const [streaks, setStreaks] = useState<Record<string, number>>({});

  const [creating, setCreating] = useState(false);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✅");
  const [anchor, setAnchor] = useState(ANCHORS[0]);
  const [target, setTarget] = useState("10");
  const [identity, setIdentity] = useState("");
  const [cueTime, setCueTime] = useState("");
  const [cuePlace, setCuePlace] = useState("");

  const [celebrate, setCelebrate] = useState<{ name: string; coins: number } | null>(null);

  const [reflWent, setReflWent] = useState("");
  const [reflImprove, setReflImprove] = useState("");
  const [reflGrateful, setReflGrateful] = useState("");
  const [reflSaved, setReflSaved] = useState(false);

  const today = toLocalISO(new Date());
  const yesterday = toLocalISO(new Date(Date.now() - 86400000));

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id;
    if (!id) return;

    setUid(id);

    const [h, lg, ref] = await Promise.all([
      supabase.from("habits").select("*").eq("user_id", id).order("created_at"),
      supabase.from("habit_logs").select("*").eq("user_id", id).eq("completed", true),
      supabase.from("reflections").select("*").eq("user_id", id).eq("log_date", today).maybeSingle(),
    ]);

    const habitRows = (h.data as Habit[]) || [];
    const allLogs = (lg.data || []) as any[];

    setHabits(habitRows);
    setLogs(allLogs);
    setDoneToday(allLogs.filter((l) => l.log_date === today).map((l) => l.habit_id));
    setDoneYesterday(allLogs.filter((l) => l.log_date === yesterday).map((l) => l.habit_id));

    if (ref.data) {
      setReflWent(ref.data.went_well || "");
      setReflImprove(ref.data.improve || "");
      setReflGrateful(ref.data.grateful || "");
      setReflSaved(true);
    }

    const st: Record<string, number> = {};
    habitRows.forEach((hb) => {
      let s = 0;
      let cursor = new Date();

      const has = (date: string) =>
        allLogs.some((l) => l.habit_id === hb.id && l.log_date === date);

      if (!has(toLocalISO(cursor))) cursor.setDate(cursor.getDate() - 1);

      while (has(toLocalISO(cursor))) {
        s++;
        cursor.setDate(cursor.getDate() - 1);
      }

      st[hb.id] = s;
    });

    setStreaks(st);
  };

  const weeksSince = (createdAt: string) =>
    Math.floor((Date.now() - new Date(createdAt || Date.now()).getTime()) / (7 * 86400000));

  const currentMin = (h: Habit) => {
    const w = weeksSince(h.created_at);
    const ladder = [2, 5, 10];
    const base = w < 3 ? ladder[w] : h.target_minutes || 10;
    return Math.min(base, h.target_minutes || base);
  };

  const resetForm = () => {
    setName("");
    setEmoji("✅");
    setAnchor(ANCHORS[0]);
    setTarget("10");
    setIdentity("");
    setCueTime("");
    setCuePlace("");
  };

  const award = async (hb: Habit) => {
    const { error } = await supabase.from("coin_log").insert({
      user_id: uid,
      action_key: `habit-${hb.id}-${today}`,
      coins: 10,
    });

    if (!error) {
      const { data: cur } = await supabase
        .from("user_coins")
        .select("coins")
        .eq("user_id", uid)
        .maybeSingle();

      const total = (cur?.coins || 0) + 10;

      await supabase.from("user_coins").upsert({
        user_id: uid,
        coins: total,
      });

      window.dispatchEvent(
        new CustomEvent("dg-coins", {
          detail: { total, earned: 10 },
        })
      );
    }
  };

  const toggle = async (hb: Habit) => {
    if (doneToday.includes(hb.id)) {
      await supabase
        .from("habit_logs")
        .delete()
        .eq("user_id", uid)
        .eq("habit_id", hb.id)
        .eq("log_date", today);

      setDoneToday(doneToday.filter((x) => x !== hb.id));
      setLogs(logs.filter((l) => !(l.habit_id === hb.id && l.log_date === today)));
      return;
    }

    const { data, error } = await supabase
      .from("habit_logs")
      .insert({
        user_id: uid,
        habit_id: hb.id,
        log_date: today,
        completed: true,
      })
      .select()
      .single();

    if (!error && data) {
      setDoneToday([...doneToday, hb.id]);
      setLogs([...logs, data]);
      setCelebrate({ name: hb.habit_name, coins: 10 });

      recordNotification("🎉 Habit done!", `${hb.emoji} ${hb.habit_name} → +10 🪙`);
      await award(hb);

      setTimeout(() => setCelebrate(null), 1500);
    }
  };

  const addHabit = async (
    t?: { emoji: string; name: string; anchor: string; target: number; identity?: string }
  ) => {
    const n = (t?.name || name).trim();
    if (!n || !uid) return;

    const { data, error } = await supabase
      .from("habits")
      .insert({
        user_id: uid,
        habit_name: n,
        emoji: t?.emoji || emoji || "✅",
        anchor: t?.anchor || anchor,
        target_minutes: t?.target || Number(target) || 10,
        identity: t?.identity || identity || "",
        cue_time: t ? "" : cueTime,
        cue_place: t ? "" : cuePlace,
      })
      .select()
      .single();

    if (!error && data) {
      setHabits([...habits, data as Habit]);
      resetForm();
      setCreating(false);
      setView("today");
    }
  };

  const openEdit = (h: Habit) => {
    setEditHabit(h);
    setName(h.habit_name || "");
    setEmoji(h.emoji || "✅");
    setAnchor(h.anchor || ANCHORS[0]);
    setTarget(String(h.target_minutes || 10));
    setIdentity(h.identity || "");
    setCueTime(h.cue_time || "");
    setCuePlace(h.cue_place || "");
  };

  const cancelEdit = () => {
    setEditHabit(null);
    resetForm();
  };

  const saveEdit = async () => {
    if (!editHabit) return;

    const patch = {
      habit_name: name.trim() || editHabit.habit_name,
      emoji: emoji || "✅",
      anchor,
      target_minutes: Number(target) || 10,
      identity,
      cue_time: cueTime,
      cue_place: cuePlace,
    };

    const { data, error } = await supabase
      .from("habits")
      .update(patch)
      .eq("id", editHabit.id)
      .select()
      .single();

    if (!error && data) {
      setHabits(habits.map((h) => (h.id === editHabit.id ? (data as Habit) : h)));
      cancelEdit();
    }
  };

  const del = async (id: string) => {
    await supabase.from("habits").delete().eq("id", id);
    setHabits(habits.filter((h) => h.id !== id));
    setDoneToday(doneToday.filter((x) => x !== id));
    setLogs(logs.filter((l) => l.habit_id !== id));
  };

  const saveReflection = async () => {
    if (reflSaved || !uid) return;

    await supabase.from("reflections").insert({
      user_id: uid,
      log_date: today,
      went_well: reflWent,
      improve: reflImprove,
      grateful: reflGrateful,
    });

    setReflSaved(true);
    recordNotification("🏛️ Evening review done", "You reviewed today and prepared tomorrow.");
  };

  const atRisk = habits.filter(
    (h) =>
      (h.created_at || "").slice(0, 10) <= yesterday &&
      !doneYesterday.includes(h.id) &&
      !doneToday.includes(h.id)
  );

  const last7 = Array.from({ length: 7 }, (_, i) =>
    toLocalISO(new Date(Date.now() - (6 - i) * 86400000))
  );

  const isDone = (hid: string, d: string) =>
    logs.some((l) => l.habit_id === hid && l.log_date === d);

  const doneCount = doneToday.length;
  const progressPct = habits.length ? Math.round((doneCount / habits.length) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 p-5 shadow-xl shadow-purple-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center">
            <ListChecks size={22} className="text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight">Habit Log</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">
              Today: tap once. Add and review only when needed.
            </p>
          </div>
        </div>
      </div>

      {/* SIMPLE TABS */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <button
          onClick={() => setView("today")}
          className={`press py-2.5 rounded-xl text-xs font-black border ${
            view === "today"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-slate-900 border-slate-800 text-slate-400"
          }`}
        >
          ✅ Today
        </button>

        <button
          onClick={() => setView("add")}
          className={`press py-2.5 rounded-xl text-xs font-black border ${
            view === "add"
              ? "bg-violet-500/15 border-violet-500/30 text-violet-300"
              : "bg-slate-900 border-slate-800 text-slate-400"
          }`}
        >
          ➕ Add
        </button>

        <button
          onClick={() => setView("review")}
          className={`press py-2.5 rounded-xl text-xs font-black border ${
            view === "review"
              ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
              : "bg-slate-900 border-slate-800 text-slate-400"
          }`}
        >
          🏛️ Review
        </button>
      </div>

      {/* TODAY VIEW */}
      {view === "today" && (
        <>
          {habits.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black text-slate-400">TODAY</p>
                <p className="text-xs font-black text-emerald-400">
                  {doneCount}/{habits.length} done
                </p>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Focus only on today. One tap is enough.
              </p>
            </div>
          )}

          {atRisk.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-4">
              <p className="text-sm font-black text-amber-300 mb-1">
                ⚠️ Don't miss twice
              </p>
              <p className="text-xs text-amber-200/90">
                You missed {atRisk.map((h) => h.emoji).join(" ")} yesterday. Do the 2-min version now.
              </p>
            </div>
          )}

          <div className="grid gap-3">
            {habits.map((h) => {
              const done = doneToday.includes(h.id);

              return (
                <div
                  key={h.id}
                  className={`rounded-2xl p-4 border flex items-center gap-3 ${
                    done
                      ? "bg-emerald-500/10 border-emerald-500/40"
                      : "bg-slate-900 border-slate-800"
                  }`}
                >
                  <button
                    onClick={() => toggle(h)}
                    className={`w-14 h-14 shrink-0 rounded-2xl border-2 flex items-center justify-center text-2xl press ${
                      done
                        ? "bg-emerald-600 border-emerald-500"
                        : "bg-slate-800 border-slate-700"
                    }`}
                  >
                    {done ? "✓" : h.emoji}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-black text-sm truncate ${
                        done ? "text-emerald-300 line-through" : "text-white"
                      }`}
                    >
                      {h.habit_name}
                    </p>

                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Anchor size={10} />
                      After {h.anchor || "your cue"} • {currentMin(h)} min
                    </p>

                    {(h.cue_time || h.cue_place) && (
                      <p className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                        {h.cue_time && (
                          <span className="flex items-center gap-0.5">
                            <Clock size={10} />
                            {h.cue_time}
                          </span>
                        )}
                        {h.cue_place && (
                          <span className="flex items-center gap-0.5">
                            <MapPin size={10} />
                            {h.cue_place}
                          </span>
                        )}
                      </p>
                    )}

                    {h.identity && (
                      <p className="text-[10px] text-fuchsia-300 font-bold mt-0.5 truncate">
                        I am someone who {h.identity}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {streaks[h.id] > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-black text-orange-400">
                        <Flame size={11} />
                        {streaks[h.id]}
                      </span>
                    )}

                    <button
                      onClick={() => openEdit(h)}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>
              );
            })}

            {habits.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                <p className="text-3xl mb-2">🌱</p>
                <p className="text-sm font-black text-white mb-1">
                  Start with ONE tiny habit
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  2 minutes, after something you already do.
                </p>
                <button
                  onClick={() => setView("add")}
                  className="press px-5 py-3 rounded-xl bg-violet-600 text-sm font-black"
                >
                  Pick my first habit
                </button>
              </div>
            )}
          </div>

          {habits.length > 0 && (
            <button
              onClick={() => setView("add")}
              className="press w-full mt-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm font-black text-slate-300"
            >
              ➕ Add another habit
            </button>
          )}
        </>
      )}

      {/* ADD VIEW */}
      {view === "add" && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={15} className="text-violet-400" />
              <div>
                <p className="text-sm font-black text-white">Choose a tiny habit</p>
                <p className="text-[10px] text-slate-500">
                  Tap one. You can edit time/place later.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => addHabit(t)}
                  className="press text-left bg-slate-800/60 border border-slate-700 rounded-xl p-3 hover:border-violet-500/40"
                >
                  <p className="text-xs font-bold text-white">
                    {t.emoji} {t.name}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    After {t.anchor}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {!creating ? (
            <button
              onClick={() => {
                resetForm();
                setCreating(true);
              }}
              className="press w-full py-3.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-sm font-black text-violet-300 flex items-center justify-center gap-1.5"
            >
              <Plus size={15} />
              Create my own habit
            </button>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid gap-3">
              <p className="text-sm font-black text-white">Create habit</p>

              <div className="grid grid-cols-[70px_1fr] gap-2">
                <input
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="✅"
                  className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500 text-center"
                />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Habit name, e.g. Read 1 page"
                  className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <input
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                placeholder="Identity: I am someone who... e.g. reads daily"
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-fuchsia-500"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={anchor}
                  onChange={(e) => setAnchor(e.target.value)}
                  className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none"
                >
                  {ANCHORS.map((a) => (
                    <option key={a} value={a}>
                      After: {a}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="2"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="Goal min"
                  className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none"
                />
              </div>

              <p className="text-[10px] text-slate-500 font-bold">
                Optional cue: time and place
              </p>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="time"
                  value={cueTime}
                  onChange={(e) => setCueTime(e.target.value)}
                  className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none"
                />

                <input
                  value={cuePlace}
                  onChange={(e) => setCuePlace(e.target.value)}
                  placeholder="Place, e.g. desk"
                  className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => addHabit()}
                  className="press flex-1 py-2.5 rounded-xl bg-violet-600 text-sm font-black flex items-center justify-center gap-1.5"
                >
                  <Save size={14} />
                  Save habit
                </button>

                <button
                  onClick={() => {
                    setCreating(false);
                    resetForm();
                  }}
                  className="press px-4 rounded-xl bg-slate-800 text-slate-400"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* REVIEW VIEW */}
      {view === "review" && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
            <p className="text-xs font-black text-slate-400 mb-2 flex items-center gap-1.5">
              <Landmark size={13} className="text-amber-400" />
              EVENING REVIEW
            </p>

            <p className="text-[10px] text-slate-500 mb-3">
              Like your learning method: review, analyze, brain dump, prepare tomorrow.
            </p>

            {reflSaved ? (
              <div className="bg-slate-800/60 rounded-xl p-3 text-xs text-slate-300 grid gap-1">
                <p>✅ Went well: {reflWent || "—"}</p>
                <p>🔧 Improve: {reflImprove || "—"}</p>
                <p>🙏 Grateful: {reflGrateful || "—"}</p>
              </div>
            ) : (
              <div className="grid gap-2">
                <input
                  value={reflWent}
                  onChange={(e) => setReflWent(e.target.value)}
                  placeholder="What went well today?"
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-emerald-500"
                />

                <input
                  value={reflImprove}
                  onChange={(e) => setReflImprove(e.target.value)}
                  placeholder="What can I improve tomorrow?"
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-amber-500"
                />

                <input
                  value={reflGrateful}
                  onChange={(e) => setReflGrateful(e.target.value)}
                  placeholder="One thing I am grateful for"
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-fuchsia-500"
                />

                <button
                  onClick={saveReflection}
                  className="press py-2.5 rounded-xl bg-amber-600 text-sm font-black"
                >
                  Save review
                </button>
              </div>
            )}
          </div>

          {habits.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
              <p className="text-xs font-black text-slate-400 mb-2">
                📜 Last 7 days
              </p>

              <div className="min-w-[420px]">
                <div className="grid" style={{ gridTemplateColumns: "1fr repeat(7, 28px)" }}>
                  <div />

                  {last7.map((d) => (
                    <div
                      key={d}
                      className="text-[9px] text-slate-500 font-black text-center"
                    >
                      {d.slice(8)}
                    </div>
                  ))}

                  {habits.map((h) => (
                    <div key={h.id} className="contents">
                      <div className="text-[10px] text-slate-300 font-bold truncate pr-2 py-1">
                        {h.emoji} {h.habit_name}
                      </div>

                      {last7.map((d) => (
                        <div key={d} className="flex items-center justify-center py-1">
                          <span
                            className={`w-3.5 h-3.5 rounded-full ${
                              isDone(h.id, d) ? "bg-emerald-500" : "bg-slate-800"
                            }`}
                          />
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

      {/* EDIT MODAL */}
      {editHabit && (
        <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 pb-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-base font-black text-white">Edit habit</p>
                <p className="text-[10px] text-slate-500">
                  Change time, place, cue, goal, or identity.
                </p>
              </div>

              <button
                onClick={cancelEdit}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid gap-3">
              <div className="grid grid-cols-[70px_1fr] gap-2">
                <input
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none text-center"
                />

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none"
                />
              </div>

              <input
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                placeholder="Identity: I am someone who..."
                className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={anchor}
                  onChange={(e) => setAnchor(e.target.value)}
                  className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none"
                >
                  {ANCHORS.map((a) => (
                    <option key={a} value={a}>
                      After: {a}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="2"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="time"
                  value={cueTime}
                  onChange={(e) => setCueTime(e.target.value)}
                  className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none"
                />

                <input
                  value={cuePlace}
                  onChange={(e) => setCuePlace(e.target.value)}
                  placeholder="Place"
                  className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveEdit}
                  className="press flex-1 py-3 rounded-xl bg-violet-600 text-sm font-black flex items-center justify-center gap-1.5"
                >
                  <Save size={14} />
                  Save changes
                </button>

                <button
                  onClick={() => {
                    if (confirm("Delete this habit?")) {
                      del(editHabit.id);
                      cancelEdit();
                    }
                  }}
                  className="press px-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CELEBRATION */}
      {celebrate && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="text-center animate-bounce">
            <PartyPopper size={56} className="text-amber-400 mx-auto mb-2" />
            <p className="text-xl font-black text-white">{celebrate.name} ✓</p>
            <p className="text-sm font-black text-amber-300 mt-1">
              +{celebrate.coins} 🪙
            </p>
          </div>
        </div>
      )}

      <Link
        href="/habits"
        className="inline-block mt-6 text-sm text-slate-500 hover:text-white press font-bold"
      >
        ← Back to Habits
      </Link>
    </main>
  );
}