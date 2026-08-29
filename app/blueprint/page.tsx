"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ScrollText, Sparkles, Save, Download, Copy, Pencil, Trash2, Dumbbell, Utensils, Moon, Lightbulb, Trophy, AlertTriangle } from "lucide-react";

type Ex = { day: string; name: string; sets: number; reps: string; rest: string; cues: string; mistakes: string };
type Blueprint = {
  title: string;
  split: { day: string; focus: string }[];
  exercises: Ex[];
  topExercises?: string[];
  topMistakes?: string[];
  progression: string;
  nutrition: { calories: number; protein: number; foods: string[]; tip: string };
  recovery: { sleep: string; water: string; deload: string };
  tips: string[];
};

const POOL: Record<string, { h: string; g: string; r: string }[]> = {
  chest: [{h:"Push-ups",g:"Bench press",r:"8-12"},{h:"Incline push-ups",g:"Incline bench",r:"8-12"},{h:"Diamond push-ups",g:"Cable fly",r:"10-12"},{h:"Pike push-ups",g:"Dips",r:"8-12"}],
  back: [{h:"Pull-ups",g:"Barbell row",r:"6-10"},{h:"Chin-ups",g:"Lat pulldown",r:"6-10"},{h:"Superman hold",g:"Deadlift",r:"6-8"},{h:"Inverted rows",g:"Seated row",r:"10-12"}],
  shoulders: [{h:"Pike push-ups",g:"Overhead press",r:"8-12"},{h:"Lateral raises (bottles)",g:"Lateral raises",r:"12-15"},{h:"Handstand hold",g:"Face pulls",r:"30s"},{h:"Wall slides",g:"Rear-delt fly",r:"12-15"}],
  biceps: [{h:"Chin-ups",g:"Barbell curls",r:"8-12"},{h:"Hammer curls (bottles)",g:"Hammer curls",r:"10-12"},{h:"Towel curls",g:"Incline curls",r:"10-12"},{h:"Chin-up hold",g:"Preacher curls",r:"20s"}],
  triceps: [{h:"Diamond push-ups",g:"Skull crushers",r:"8-12"},{h:"Bench dips",g:"Rope pushdown",r:"10-15"},{h:"Close-grip push-ups",g:"Close-grip bench",r:"8-12"},{h:"Overhead extension (bottle)",g:"Overhead extension",r:"10-12"}],
  forearms: [{h:"Dead hang",g:"Dead hang",r:"30s"},{h:"Farmer carry (bottles)",g:"Farmer carry",r:"40m"},{h:"Wrist curls (bottles)",g:"Wrist curls",r:"15-20"},{h:"Towel hang",g:"Reverse curls",r:"20s"}],
  legs: [{h:"Weighted squats",g:"Back squat",r:"8-12"},{h:"Lunges",g:"Romanian deadlift",r:"10"},{h:"Step-ups",g:"Leg press",r:"10"},{h:"Calf raises",g:"Calf raises",r:"15-20"}],
  abs: [{h:"Hanging leg raises",g:"Hanging leg raises",r:"10-15"},{h:"Plank",g:"Ab-wheel",r:"45s"},{h:"Bicycle crunch",g:"Cable crunch",r:"15-20"},{h:"Leg raises",g:"Hanging knee raises",r:"12-15"}],
  arms: [{h:"Chin-ups",g:"Barbell curls",r:"8-12"},{h:"Bench dips",g:"Skull crushers",r:"10-12"},{h:"Hammer curls (bottles)",g:"Hammer curls",r:"10-12"},{h:"Diamond push-ups",g:"Rope pushdown",r:"8-12"}],
  full: [{h:"Push-ups",g:"Bench press",r:"8-12"},{h:"Pull-ups",g:"Barbell row",r:"6-10"},{h:"Weighted squats",g:"Back squat",r:"8-12"},{h:"Plank",g:"Ab-wheel",r:"45s"},{h:"Pike push-ups",g:"Overhead press",r:"8-12"},{h:"Lunges",g:"Romanian deadlift",r:"10"}],
  run: [{h:"Brisk run intervals",g:"Treadmill intervals",r:"20min"},{h:"Tempo run",g:"Tempo run",r:"15min"},{h:"Hill sprints",g:"Incline sprints",r:"6x"},{h:"Strides",g:"Strides",r:"4x"}],
};
const GOAL_FOCUS: Record<string, string[]> = {
  "Build muscle": ["chest","back","legs","full"],
  "Lose fat": ["full","legs","full","abs"],
  "Build abs": ["abs","abs","full","abs"],
  "Build chest": ["chest","chest","shoulders","chest"],
  "Build back": ["back","back","biceps","back"],
  "Biceps": ["biceps","back","arms","biceps"],
  "Triceps": ["triceps","chest","arms","triceps"],
  "Forearms": ["forearms","back","arms","forearms"],
  "Upper body": ["chest","back","shoulders","arms"],
  "Lower body": ["legs","legs","abs","legs"],
  "Improve running": ["run","legs","abs","run"],
  "Full physique": ["chest","back","legs","full"],
};
const VEG_FOODS = ["Soya chunks — 52g/100g","Paneer — 18g/100g","Chana — 19g/100g","Moong dal — 24g/100g","Toor dal — 22g/100g","Rajma — 24g/100g","Curd — 10g/100g","Milk — 3.4g/100ml","Peanuts — 26g/100g","Oats — 13g/100g","Tofu — 8g/100g","Sprouts — 9g/100g"];
const NONVEG_FOODS = ["Chicken breast — 31g/100g","Eggs — 6g/egg","Fish — 22g/100g","Soya chunks — 52g/100g","Paneer — 18g/100g","Dal — 22g/100g","Curd — 10g/100g","Milk — 3.4g/100ml","Peanuts — 26g/100g","Oats — 13g/100g"];

export default function BlueprintPage() {
  const [goal, setGoal] = useState("Build muscle");
  const [days, setDays] = useState("4");
  const [level, setLevel] = useState("Beginner");
  const [equipment, setEquipment] = useState("Full gym");
  const [perSession, setPerSession] = useState("5");
  const [diet, setDiet] = useState("Vegetarian");
  const [autoCal, setAutoCal] = useState<number | null>(null);
  const [direction, setDirection] = useState("maintain");
  const [autoWeight, setAutoWeight] = useState(0);
  const [autoActivity, setAutoActivity] = useState("1.375");
  const [bp, setBp] = useState<Blueprint | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState(false);
  const [saved, setSaved] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("dg-calc") || "null");
      if (p?.result) { setAutoCal(p.result.calories); setDirection(p.result.direction); }
      if (p?.weight) setAutoWeight(Number(p.weight) || 0);
      if (p?.activity) setAutoActivity(p.activity);
    } catch {}
    loadSaved();
  }, []);

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };
  const proteinFactor = Number(autoActivity) <= 1.2 ? 1 : Number(autoActivity) <= 1.55 ? 1.5 : 2;
  const proteinTarget = autoWeight > 0 ? Math.round(autoWeight * proteinFactor) : Math.round(70 * proteinFactor);

  const loadSaved = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    const { data: rows } = await supabase.from("blueprints").select("*").eq("user_id", uid).order("created_at", { ascending: false });
    setSaved(rows || []);
  };

  const buildOffline = (): Blueprint => {
    const home = equipment.startsWith("Home") || equipment.startsWith("Dumbbells");
    const focuses = GOAL_FOCUS[goal] || GOAL_FOCUS["Full physique"];
    const dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat"];
    const n = Number(days);
    const split = Array.from({ length: n }, (_, i) => ({ day: dayNames[i], focus: focuses[i % focuses.length] }));
    const exercises: Ex[] = [];
    split.forEach((s) => {
      const pool = POOL[s.focus] || POOL.full;
      for (let k = 0; k < Number(perSession); k++) {
        const e = pool[k % pool.length];
        exercises.push({ day: s.day, name: home ? e.h : e.g, sets: 3, reps: e.r, rest: "60-90s", cues: "", mistakes: "" });
      }
    });
    const cal = autoCal || 2200;
    return {
      title: `${goal} Blueprint (${n} days)`,
      split, exercises,
      topExercises: home ? ["Push-ups","Pull-ups","Weighted squats","Pike push-ups","Plank"] : ["Squat","Bench press","Deadlift","Barbell row","Overhead press"],
      topMistakes: ["Bad form — lifting too heavy with wrong technique","Not consistent — skipping workouts or meals","No progressive overload — same weight forever"],
      progression: "Progressive overload: add 1 rep or a little weight every week.",
      nutrition: { calories: cal, protein: proteinTarget, foods: diet !== "Non-vegetarian" ? VEG_FOODS : NONVEG_FOODS, tip: `Protein = ${autoWeight || 70}kg × ${proteinFactor} = ${proteinTarget}g. Drink 3-4 L water.` },
      recovery: { sleep: "7-9 hours", water: "3-4 litres", deload: "Every 4-6 weeks, halve volume" },
      tips: ["Progressive overload every week","Protein with every meal","Slow eccentric (2-3s down)","Warm up before lifting","Watch tutorials or record yourself to check your form"],
    };
  };

  const generate = async () => {
    setBusy(true); setError(""); setBp(null); setEdit(false);
    try {
      const res = await fetch("/api/blueprint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal, days, level, equipment, perSession, calories: autoCal, direction, diet, weight: autoWeight, pf: proteinFactor }) });
      const d = await res.json();
      if (!res.ok || !d.split) throw 0;
      setBp(d);
    } catch {
      setBp(buildOffline());
      notify("🌐 AI busy — using built-in best plan");
    }
    setBusy(false);
  };

  const setEx = (i: number, patch: Partial<Ex>) => setBp((b) => (b ? { ...b, exercises: b.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)) } : b));
  const setNut = (patch: Partial<Blueprint["nutrition"]>) => setBp((b) => (b ? { ...b, nutrition: { ...b.nutrition, ...patch } } : b));

  const save = async () => {
    if (!bp) return;
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return notify("⚠️ Login first");
    const { error } = await supabase.from("blueprints").insert({ user_id: uid, title: bp.title, goal, days: Number(days), data: bp });
    notify(error ? "⚠️ Save failed" : "💾 Blueprint saved!");
    await loadSaved();
  };
  const del = async (id: string) => { await supabase.from("blueprints").delete().eq("id", id); setSaved(saved.filter((s) => s.id !== id)); notify("🗑 Deleted"); };
  const open = (s: any) => { setBp(s.data); setEdit(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const download = () => {
    if (!bp) return;
    let t = `🏋️ ${bp.title}\n${"=".repeat(40)}\n\n🏆 TOP EXERCISES YOU NEED\n${(bp.topExercises||[]).map((x)=>`• ${x}`).join("\n")}\n\n⚠️ TOP 3 MISTAKES TO AVOID\n${(bp.topMistakes||[]).map((x)=>`• ${x}`).join("\n")}\n\nWEEKLY SPLIT\n`;
    bp.split.forEach((s) => (t += `• ${s.day} — ${s.focus}\n`));
    t += `\nWORKOUTS\n`;
    bp.split.forEach((s) => {
      t += `\n[${s.day} • ${s.focus}]\n`;
      bp.exercises.filter((e) => e.day === s.day).forEach((e) => {
        t += `  ${e.name} — ${e.sets} sets × ${e.reps}, rest ${e.rest}\n`;
        if (e.cues) t += `    ✔ ${e.cues}\n`;
        if (e.mistakes) t += `    ✖ Avoid: ${e.mistakes}\n`;
      });
    });
    t += `\nPROGRESSION\n${bp.progression}\n\nNUTRITION (${bp.nutrition.calories} kcal • ${bp.nutrition.protein}g protein)\n${bp.nutrition.foods.map((f)=>`• ${f}`).join("\n")}\n${bp.nutrition.tip}\n\nRECOVERY\nSleep: ${bp.recovery.sleep}\nWater: ${bp.recovery.water}\nDeload: ${bp.recovery.deload}\n\nKEY TIPS\n${bp.tips.map((x)=>`• ${x}`).join("\n")}\n`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([t], { type: "text/plain" }));
    a.download = "blueprint.txt";
    a.click();
    notify("⬇️ Downloaded!");
  };
  const copy = () => { if (!bp) return; navigator.clipboard.writeText(bp.title + "\n" + bp.exercises.map((e) => `${e.day}: ${e.name} ${e.sets}×${e.reps}`).join("\n")); notify("📋 Copied!"); };

  const inputCls = "w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-indigo-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-600 p-5 shadow-xl shadow-violet-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center"><ScrollText size={22} className="text-white" /></span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Master Blueprint</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">Full personalized plan — exercises, food, tips</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 grid gap-3 grid-cols-2">
        <select value={goal} onChange={(e) => setGoal(e.target.value)} className={inputCls}>
          {["Build muscle", "Lose fat", "Build abs", "Build chest", "Build back", "Biceps", "Triceps", "Forearms", "Upper body", "Lower body", "Improve running", "Full physique"].map((g) => <option key={g}>{g}</option>)}
        </select>
        <select value={days} onChange={(e) => setDays(e.target.value)} className={inputCls}>
          {["3", "4", "5", "6"].map((d) => <option key={d} value={d}>{d} days/week</option>)}
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls}>
          {["Beginner", "Intermediate", "Advanced"].map((l) => <option key={l}>{l}</option>)}
        </select>
        <select value={equipment} onChange={(e) => setEquipment(e.target.value)} className={inputCls}>
          {["Full gym", "Dumbbells only", "Home (no equipment)"].map((q) => <option key={q}>{q}</option>)}
        </select>
        <select value={perSession} onChange={(e) => setPerSession(e.target.value)} className={inputCls}>
          {["3", "4", "5", "6"].map((n) => <option key={n} value={n}>{n} exercises/session</option>)}
        </select>
        <select value={diet} onChange={(e) => setDiet(e.target.value)} className={inputCls}>
          {["Vegetarian", "Non-vegetarian", "Vegan"].map((d) => <option key={d}>{d}</option>)}
        </select>
        <button onClick={generate} disabled={busy} className="press col-span-2 py-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-sm font-black text-indigo-300 disabled:opacity-50 flex items-center justify-center gap-1.5">
          <Sparkles size={15} /> {busy ? "Building…" : "Build Blueprint"}
        </button>
      </div>
      {autoCal && <p className="text-[10px] text-slate-500 font-bold -mt-3 mb-4">🎯 Goal Calculator: {autoCal} kcal • protein {proteinTarget}g ({direction})</p>}
      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 mb-4 text-center"><p className="text-sm font-bold text-red-300">❌ {error}</p></div>}
      {msg && <p className="text-center text-xs font-bold text-indigo-300 mb-3">{msg}</p>}

      {bp && (
        <div className="grid gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-base text-white flex-1 min-w-0">{bp.title}</h3>
            <button onClick={() => setEdit(!edit)} className="press px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-black text-slate-300 flex items-center gap-1"><Pencil size={12} /> {edit ? "Done" : "Edit"}</button>
            <button onClick={save} className="press px-3 py-2 rounded-lg bg-amber-600/20 border border-amber-500/30 text-xs font-black text-amber-300 flex items-center gap-1"><Save size={12} /> Save</button>
            <button onClick={download} className="press px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-black text-slate-300 flex items-center gap-1"><Download size={12} /></button>
            <button onClick={copy} className="press px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-black text-slate-300 flex items-center gap-1"><Copy size={12} /></button>
          </div>

          {(bp.topExercises || []).length > 0 && (
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4">
              <p className="text-xs font-black text-amber-400 mb-2 flex items-center gap-1.5"><Trophy size={14} /> TOP EXERCISES YOU NEED</p>
              <div className="flex flex-wrap gap-1.5">
                {bp.topExercises!.map((x, i) => <span key={i} className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-black">{x}</span>)}
              </div>
            </div>
          )}

          {(bp.topMistakes || []).length > 0 && (
            <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-4">
              <p className="text-xs font-black text-red-400 mb-2 flex items-center gap-1.5"><AlertTriangle size={14} /> TOP 3 MISTAKES TO AVOID</p>
              <ul className="space-y-1">{bp.topMistakes!.map((m, i) => <li key={i} className="text-xs text-slate-300">✖ {m}</li>)}</ul>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs font-black text-slate-400 mb-3 flex items-center gap-1.5"><Dumbbell size={14} /> WEEKLY SPLIT</p>
            <div className="grid grid-cols-2 gap-2">
              {bp.split.map((s, i) => (
                <div key={i} className="bg-slate-800/60 rounded-xl p-3"><p className="font-black text-indigo-300 text-sm">{s.day}</p><p className="text-xs text-slate-300">{s.focus}</p></div>
              ))}
            </div>
          </div>

          {bp.split.map((s, di) => (
            <div key={di} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="font-black text-base text-white mb-3">{s.day} — {s.focus}</p>
              <div className="grid gap-2">
                {bp.exercises.filter((e) => e.day === s.day).map((e, ei) => {
                  const gi = bp.exercises.indexOf(e);
                  return (
                    <div key={ei} className="bg-slate-800/60 rounded-xl p-3">
                      <p className="font-bold text-sm text-white mb-1">{e.name}</p>
                      {edit ? (
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          <input type="number" value={e.sets} onChange={(ev) => setEx(gi, { sets: Number(ev.target.value) })} className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs" />
                          <input value={e.reps} onChange={(ev) => setEx(gi, { reps: ev.target.value })} className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs" />
                          <input value={e.rest} onChange={(ev) => setEx(gi, { rest: ev.target.value })} className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs" />
                        </div>
                      ) : (
                        <p className="text-xs text-indigo-300 font-black mb-1">{e.sets} sets × {e.reps} • rest {e.rest}</p>
                      )}
                      {e.cues && <p className="text-[11px] text-green-400">✔ {e.cues}</p>}
                      {e.mistakes && <p className="text-[11px] text-red-400">✖ Avoid: {e.mistakes}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs font-black text-slate-400 mb-2 flex items-center gap-1.5"><Lightbulb size={14} /> PROGRESSION</p>
            {edit ? <textarea value={bp.progression} onChange={(e) => setBp({ ...bp, progression: e.target.value })} rows={2} className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-sm" /> : <p className="text-sm text-slate-200">{bp.progression}</p>}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs font-black text-slate-400 mb-2 flex items-center gap-1.5"><Utensils size={14} /> NUTRITION — {bp.nutrition.calories} kcal • {bp.nutrition.protein}g protein</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {edit ? (
                <>
                  <input type="number" value={bp.nutrition.calories} onChange={(e) => setNut({ calories: Number(e.target.value) })} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-sm" />
                  <input type="number" value={bp.nutrition.protein} onChange={(e) => setNut({ protein: Number(e.target.value) })} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-sm" />
                </>
              ) : (
                <>
                  <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[10px] text-slate-500 font-black">CALORIES</p><p className="font-black text-indigo-300">{bp.nutrition.calories}</p></div>
                  <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[10px] text-slate-500 font-black">PROTEIN</p><p className="font-black text-green-400">{bp.nutrition.protein}g</p></div>
                </>
              )}
            </div>
            <p className="text-[10px] font-black text-slate-500 mb-1">BEST FOODS + PROTEIN</p>
            <ul className="space-y-1 mb-2">{bp.nutrition.foods.map((f, i) => <li key={i} className="text-xs text-slate-300">• {f}</li>)}</ul>
            <p className="text-[11px] text-slate-400">{bp.nutrition.tip}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs font-black text-slate-400 mb-2 flex items-center gap-1.5"><Moon size={14} /> RECOVERY</p>
            <p className="text-xs text-slate-300">😴 {bp.recovery.sleep}</p>
            <p className="text-xs text-slate-300">💧 {bp.recovery.water}</p>
            <p className="text-xs text-slate-300">📉 {bp.recovery.deload}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs font-black text-slate-400 mb-2">🔑 KEY TIPS</p>
            {edit ? (
              <textarea value={bp.tips.join("\n")} onChange={(e) => setBp({ ...bp, tips: e.target.value.split("\n") })} rows={5} className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-sm" />
            ) : (
              <ul className="space-y-1">{bp.tips.map((t, i) => <li key={i} className="text-xs text-slate-300">• {t}</li>)}</ul>
            )}
          </div>
        </div>
      )}

      {saved.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mt-5">
          <p className="text-xs font-black text-slate-400 mb-3">💾 SAVED BLUEPRINTS ({saved.length})</p>
          <div className="grid gap-2">
            {saved.map((s) => (
              <div key={s.id} className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                <button onClick={() => open(s)} className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold text-white truncate">{s.title}</p>
                  <p className="text-[10px] text-slate-500">{s.goal} • {s.days} days/week</p>
                </button>
                <button onClick={() => del(s.id)} className="w-8 h-8 shrink-0 rounded-lg bg-slate-900 border border-slate-700 text-red-400 flex items-center justify-center"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link href="/gym-log" className="inline-block mt-6 text-sm text-slate-500 hover:text-white press font-bold">← Back to Gym</Link>
    </main>
  );
}