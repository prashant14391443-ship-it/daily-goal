"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
import { MOOD_EMOJIS, getMoodLogs, getTodayMood, logMood, getJournals, addJournal, deleteJournal } from "@/lib/mind";
import { ArrowLeft, Heart, Wind, PenLine, PhoneCall, Trash2 } from "lucide-react";

const PHASES = [
  { name: "Inhale", scale: 1.25 },
  { name: "Hold", scale: 1.25 },
  { name: "Exhale", scale: 0.8 },
  { name: "Hold", scale: 0.8 },
];

function isoOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function MindPage() {
  const [uid, setUid] = useState("guest");
  const [todayMood, setTodayMood] = useState<number | null>(null);
  const [week, setWeek] = useState<{ day: string; mood: number | null }[]>([]);
  const [note, setNote] = useState("");
  const [journals, setJournals] = useState<ReturnType<typeof getJournals>>([]);
  const [sos, setSos] = useState(false);
    const [insight, setInsight] = useState<{ pos: number; low: number; pct: number } | null>(null);

  // breathing
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = (id: string) => {
    setTodayMood(getTodayMood(id));
    setJournals(getJournals(id));
    const logs = getMoodLogs(id);
    const days: { day: string; mood: number | null }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const iso = isoOf(d);
      const log = logs.find((l) => l.date === iso);
      days.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }), mood: log ? log.mood : null });
    }
    setWeek(days);
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id || "guest";
      setUid(id);
      refresh(id);
      loadInsight(id);
    };
    load();
  }, []);

  // Deep-link to breathing when user arrives from dashboard 😞
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#breathing") {
      setTimeout(() => {
        document.getElementById("breathing")?.scrollIntoView({ behavior: "smooth", block: "center" });
        setRunning(true);
        setTick(0);
      }, 400);
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, [running]);

  const cyclePos = tick % 16;
  const phaseIdx = Math.floor(cyclePos / 4);
  const count = 4 - (cyclePos % 4);
  const cycles = Math.floor(tick / 16);

  const pickMood = (m: number) => { logMood(uid, m); setTodayMood(m); refresh(uid); };

  // Correlate mood with task completion
  const loadInsight = async (id: string) => {
    const logs = getMoodLogs(id);
    if (logs.length < 3) { setInsight(null); return; }
    const today = isoOf(new Date());
    const weekStart = addDays(today, -30);
    const { data } = await supabase
      .from("tasks")
      .select("task_date, completed")
      .eq("user_id", id)
      .eq("completed", true)
      .gte("task_date", weekStart);
    if (!data || data.length === 0) { setInsight(null); return; }
    const byDate: Record<string, number> = {};
    data.forEach((r) => { byDate[r.task_date] = (byDate[r.task_date] || 0) + 1; });
    let posSum = 0, posN = 0, lowSum = 0, lowN = 0;
    logs.forEach((l) => {
      const done = byDate[l.date] || 0;
      if (l.mood >= 2) { posSum += done; posN++; }
      else { lowSum += done; lowN++; }
    });
    if (posN === 0 || lowN === 0) { setInsight(null); return; }
    const pos = +(posSum / posN).toFixed(1);
    const low = +(lowSum / lowN).toFixed(1);
    const pct = low === 0 ? 0 : Math.round(((pos - low) / Math.max(low, 1)) * 100);
    setInsight({ pos, low, pct });
  };
  const saveNote = (e: React.FormEvent) => { e.preventDefault(); if (!note.trim()) return; addJournal(uid, note.trim()); setNote(""); setJournals(getJournals(uid)); };

  const toggleBreathing = () => {
    if (running) {
      setRunning(false);
      setTick(0);
    } else {
      setRunning(true);
      setTick(0);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-24 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-colors">
          <ArrowLeft size={18} className="text-slate-300" />
        </Link>
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Heart size={20} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Mind Care</h1>
          <p className="text-xs text-slate-400">A calm mind learns 2-3x better</p>
        </div>
      </div>

      {/* Check-in */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-4">
        <p className="text-xs font-black text-slate-400 mb-3">HOW ARE YOU FEELING?</p>
        <div className="flex justify-between gap-2">
          {MOOD_EMOJIS.map((e, i) => (
            <button key={i} onClick={() => pickMood(i)} className={`flex-1 py-3 rounded-xl text-2xl border transition-all ${todayMood === i ? "bg-indigo-500/20 border-indigo-500/50 scale-105" : "bg-slate-800 border-slate-700 hover:border-slate-600"}`}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Week chart */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-4">
        <p className="text-xs font-black text-slate-400 mb-3">THIS WEEK</p>
        <div className="flex justify-between gap-1 h-20 items-end">
          {week.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-sm">{d.mood !== null ? MOOD_EMOJIS[d.mood] : "·"}</span>
              <div
                className={`w-full rounded-t-md ${d.mood !== null ? "bg-indigo-500/60" : "bg-slate-800"}`}
                style={{ height: d.mood !== null ? `${((d.mood + 1) / 4) * 60 + 10}%` : "6%" }}
              />
              <span className="text-[9px] text-slate-500">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Insight: mood ↔ productivity */}
      {insight && (
        <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-2xl p-5 mb-4">
          <p className="text-xs font-black text-indigo-400 mb-1">💡 YOUR DATA SAYS</p>
          <p className="text-sm font-bold text-white leading-snug mb-3">
            {insight.pct > 0
              ? `You complete ${insight.pct}% more tasks on positive-mood days.`
              : `Your mood and tasks are closely linked. Keep logging!`}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/60 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 font-semibold">🙂😄 days</p>
              <p className="text-xl font-black text-emerald-400">{insight.pos}</p>
              <p className="text-[10px] text-slate-500">tasks / day</p>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 font-semibold">😞😐 days</p>
              <p className="text-xl font-black text-rose-400">{insight.low}</p>
              <p className="text-[10px] text-slate-500">tasks / day</p>
            </div>
          </div>
        </div>
      )}

      {/* Breathing */}
      <div id="breathing" className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-4 flex flex-col items-center">
        <p className="text-xs font-black text-slate-400 mb-4 flex items-center gap-1.5 self-start">
          <Wind size={14} className="text-indigo-400" /> BOX BREATHING
        </p>
        <div className="relative w-40 h-40 flex items-center justify-center mb-4">
          <div className="absolute inset-0 rounded-full bg-indigo-500/10" />
          <div
            className="w-28 h-28 rounded-full bg-indigo-500/30 border-2 border-indigo-400/50 flex items-center justify-center"
            style={{
              transform: `scale(${running ? PHASES[phaseIdx].scale : 1})`,
              transition: "transform 4s ease-in-out",
            }}
          >
            <span className="text-center">
              <span className="block text-sm font-black text-white">{running ? PHASES[phaseIdx].name : "Ready"}</span>
              {running && <span className="block text-lg font-black text-indigo-300">{count}</span>}
            </span>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mb-3">
          {running ? `Cycle ${cycles + 1} — follow the circle` : "60-120 sec calms your nervous system"}
        </p>
        <button
          onClick={toggleBreathing}
          className={`px-6 py-2.5 rounded-xl text-sm font-black transition-colors ${
            running ? "bg-slate-800 text-slate-300" : "bg-indigo-600 hover:bg-indigo-500 text-white"
          }`}
        >
          {running ? "Stop" : "Start"}
        </button>
      </div>

      {/* Journal */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-4">
        <p className="text-xs font-black text-slate-400 mb-3 flex items-center gap-1.5">
          <PenLine size={14} className="text-indigo-400" /> BRAIN DUMP (private)
        </p>
        <form onSubmit={saveNote} className="grid gap-2 mb-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="What's on your mind? Get it out of your head…"
            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-indigo-500 resize-none"
          />
          <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-black self-start transition-colors">
            Save
          </button>
        </form>
        <div className="grid gap-2">
          {journals.slice(0, 5).map((j) => (
            <div key={j.id} className="flex items-start justify-between gap-2 bg-slate-800/60 rounded-xl p-3">
              <p className="text-xs text-slate-300 leading-relaxed">{j.text}</p>
              <button
                onClick={() => {
                  deleteJournal(uid, j.id);
                  setJournals(getJournals(uid));
                }}
                className="text-slate-600 hover:text-rose-400 shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SOS */}
      <button
        onClick={() => setSos(!sos)}
        className="w-full py-3 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-300 text-sm font-black flex items-center justify-center gap-2 transition-colors"
      >
        <PhoneCall size={15} /> I'm overwhelmed right now
      </button>
      {sos && (
        <div className="mt-3 bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5">
          <p className="text-sm font-bold text-white mb-2">You're not alone. Try this:</p>
          <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1 mb-4">
            <li>Start the Box Breathing above (60 sec).</li>
            <li>Name 5 things you see, 4 you feel, 3 you hear.</li>
            <li>Message or call someone you trust.</li>
          </ol>
          <p className="text-xs font-black text-slate-400 mb-1">Free helplines (India):</p>
          <p className="text-xs text-slate-300">
            Tele-MANAS: <b>14416</b> • iCall: <b>9152987821</b> • Vandrevala: <b>1860 2662 345</b>
          </p>
        </div>
      )}
    </main>
  );
}