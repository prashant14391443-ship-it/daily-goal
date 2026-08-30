"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ScrollText, Sparkles, Save, Download, Copy, Pencil, Trash2, Dumbbell, Utensils, Moon, Lightbulb, Trophy, AlertTriangle } from "lucide-react";

type Ex = { day: string; name: string; sets: number; reps: string; rest: string; cues: string; mistakes: string };
type Blueprint = {
  title: string; split: { day: string; focus: string }[]; exercises: Ex[];
  topExercises?: string[]; topMistakes?: string[]; progression: string;
  nutrition: { calories: number; protein: number; foods: string[]; tip: string };
  recovery: { sleep: string; water: string; deload: string }; tips: string[];
};
type PE = { h: string; g: string; sets: number; reps: string; rest: string; cue: string; mis: string };

const POOL: Record<string, PE[]> = {
  chest: [
    {h:"Push-ups",g:"Bench Press",sets:4,reps:"8-12",rest:"90s",cue:"feet flat, elbows ~45°, squeeze at top",mis:"flaring elbows, bouncing"},
    {h:"Incline push-ups",g:"Incline DB Press",sets:3,reps:"8-12",rest:"90s",cue:"upper chest, shoulder blades together",mis:"shrugging shoulders"},
    {h:"Diamond push-ups",g:"Cable Fly",sets:3,reps:"10-15",rest:"60s",cue:"hands close, slow 2s down",mis:"letting hips sag"},
    {h:"Pike push-ups",g:"Dips",sets:3,reps:"8-12",rest:"90s",cue:"lean forward, deep stretch",mis:"half reps"},
  ],
  back: [
    {h:"Pull-ups",g:"Barbell Row",sets:4,reps:"6-10",rest:"90s",cue:"pull chest to bar, squeeze blades",mis:"swinging / kipping"},
    {h:"Chin-ups",g:"Lat Pulldown",sets:3,reps:"8-12",rest:"90s",cue:"elbows drive down to hips",mis:"pulling with biceps only"},
    {h:"Superman hold",g:"Deadlift",sets:3,reps:"6-8",rest:"2min",cue:"neutral spine, hinge at hips",mis:"rounding lower back"},
    {h:"Inverted rows",g:"Seated Row",sets:3,reps:"10-12",rest:"75s",cue:"squeeze shoulder blades",mis:"using momentum"},
  ],
  shoulders: [
    {h:"Pike push-ups",g:"Overhead Press",sets:4,reps:"8-12",rest:"90s",cue:"tight core, bar over head",mis:"arching back"},
    {h:"Lateral raises (bottles)",g:"Lateral Raises",sets:3,reps:"12-15",rest:"60s",cue:"lead with elbows, slight bend",mis:"swinging heavy"},
    {h:"Handstand hold",g:"Face Pulls",sets:3,reps:"30s",rest:"60s",cue:"push floor away, ribs down",mis:"head poking forward"},
    {h:"Wall slides",g:"Rear-delt Fly",sets:3,reps:"12-15",rest:"60s",cue:"glide up, keep back flat",mis:"shrugging"},
  ],
  biceps: [
    {h:"Chin-ups",g:"Barbell Curls",sets:3,reps:"8-12",rest:"75s",cue:"elbows pinned to sides",mis:"swinging the weight"},
    {h:"Hammer curls (bottles)",g:"Hammer Curls",sets:3,reps:"10-12",rest:"60s",cue:"neutral grip, slow lower",mis:"using shoulders"},
    {h:"Towel curls",g:"Incline Curls",sets:3,reps:"10-12",rest:"60s",cue:"full stretch at bottom",mis:"half range"},
    {h:"Chin-up hold",g:"Preacher Curls",sets:2,reps:"20s",rest:"60s",cue:"squeeze hard at top",mis:"letting elbows drift"},
  ],
  triceps: [
    {h:"Diamond push-ups",g:"Skull Crushers",sets:3,reps:"8-12",rest:"75s",cue:"elbows tucked, lower slow",mis:"elbows flaring"},
    {h:"Bench dips",g:"Rope Pushdown",sets:3,reps:"10-15",rest:"60s",cue:"shoulders down, lock out",mis:"shoulder shrug"},
    {h:"Close-grip push-ups",g:"Close-grip Bench",sets:3,reps:"8-12",rest:"90s",cue:"elbows graze ribs",mis:"bouncing off chest"},
    {h:"Overhead extension (bottle)",g:"Overhead Extension",sets:3,reps:"10-12",rest:"60s",cue:"stretch behind head",mis:"flaring elbows"},
  ],
  forearms: [
    {h:"Dead hang",g:"Dead Hang",sets:3,reps:"30s",rest:"60s",cue:"full grip, shoulders active",mis:"loose hanging"},
    {h:"Farmer carry (bottles)",g:"Farmer Carry",sets:3,reps:"40m",rest:"60s",cue:"tall posture, squeeze handle",mis:"slouching"},
    {h:"Wrist curls (bottles)",g:"Wrist Curls",sets:3,reps:"15-20",rest:"45s",cue:"full wrist range",mis:"rushing"},
    {h:"Towel hang",g:"Reverse Curls",sets:2,reps:"20s",rest:"60s",cue:"crush the towel",mis:"using momentum"},
  ],
  legs: [
    {h:"Weighted squats",g:"Back Squat",sets:4,reps:"8-12",rest:"2min",cue:"chest up, knees track toes",mis:"heels lifting"},
    {h:"Lunges",g:"Romanian Deadlift",sets:3,reps:"10/leg",rest:"90s",cue:"long stride, back knee down",mis:"short step"},
    {h:"Step-ups",g:"Leg Press",sets:3,reps:"10",rest:"90s",cue:"drive through heel",mis:"pushing off back leg"},
    {h:"Calf raises",g:"Calf Raises",sets:4,reps:"15-20",rest:"45s",cue:"pause + squeeze at top",mis:"bouncing"},
  ],
  abs: [
    {h:"Hanging leg raises",g:"Hanging Leg Raises",sets:3,reps:"10-15",rest:"60s",cue:"curl pelvis up, no swing",mis:"using momentum"},
    {h:"Plank",g:"Ab-wheel",sets:3,reps:"45s",rest:"45s",cue:"neutral spine, hips level",mis:"hip drop"},
    {h:"Bicycle crunch",g:"Cable Crunch",sets:3,reps:"15-20",rest:"45s",cue:"elbow to opposite knee",mis:"pulling neck"},
    {h:"Leg raises",g:"Hanging Knee Raises",sets:3,reps:"12-15",rest:"45s",cue:"lower slow, no swing",mis:"arching back"},
  ],
  arms: [
    {h:"Chin-ups",g:"Barbell Curls",sets:3,reps:"8-12",rest:"75s",cue:"elbows pinned",mis:"swinging"},
    {h:"Bench dips",g:"Skull Crushers",sets:3,reps:"10-12",rest:"75s",cue:"elbows tucked",mis:"flaring"},
    {h:"Hammer curls (bottles)",g:"Hammer Curls",sets:3,reps:"10-12",rest:"60s",cue:"slow lower",mis:"rushing"},
    {h:"Diamond push-ups",g:"Rope Pushdown",sets:3,reps:"8-12",rest:"60s",cue:"lock out hard",mis:"half reps"},
  ],
  upper: [
    {h:"Push-ups",g:"Bench Press",sets:4,reps:"8-12",rest:"90s",cue:"elbows ~45°",mis:"flaring"},
    {h:"Pull-ups",g:"Barbell Row",sets:4,reps:"6-10",rest:"90s",cue:"squeeze blades",mis:"swinging"},
    {h:"Pike push-ups",g:"Overhead Press",sets:3,reps:"8-12",rest:"90s",cue:"core tight",mis:"arching"},
    {h:"Chin-ups",g:"Barbell Curls",sets:3,reps:"8-12",rest:"75s",cue:"elbows pinned",mis:"swinging"},
    {h:"Bench dips",g:"Skull Crushers",sets:3,reps:"10-12",rest:"60s",cue:"lock out",mis:"shrug"},
  ],
  push: [
    {h:"Push-ups",g:"Bench Press",sets:4,reps:"8-12",rest:"90s",cue:"elbows ~45°, squeeze",mis:"flaring, bounce"},
    {h:"Pike push-ups",g:"Overhead Press",sets:3,reps:"8-12",rest:"90s",cue:"bar over head",mis:"arching"},
    {h:"Incline push-ups",g:"Incline DB Press",sets:3,reps:"8-12",rest:"90s",cue:"blades together",mis:"shrug"},
    {h:"Diamond push-ups",g:"Cable Fly",sets:3,reps:"10-15",rest:"60s",cue:"slow down",mis:"hip sag"},
    {h:"Lateral raises (bottles)",g:"Lateral Raises",sets:3,reps:"12-15",rest:"60s",cue:"lead with elbows",mis:"swinging"},
  ],
  pull: [
    {h:"Pull-ups",g:"Barbell Row",sets:4,reps:"6-10",rest:"90s",cue:"chest to bar",mis:"kipping"},
    {h:"Chin-ups",g:"Lat Pulldown",sets:3,reps:"8-12",rest:"90s",cue:"elbows down",mis:"biceps only"},
    {h:"Superman hold",g:"Deadlift",sets:3,reps:"6-8",rest:"2min",cue:"hinge at hips",mis:"round back"},
    {h:"Hammer curls (bottles)",g:"Hammer Curls",sets:3,reps:"10-12",rest:"60s",cue:"slow lower",mis:"rushing"},
    {h:"Inverted rows",g:"Seated Row",sets:3,reps:"10-12",rest:"75s",cue:"squeeze blades",mis:"momentum"},
  ],
  full: [
    {h:"Push-ups",g:"Bench Press",sets:3,reps:"8-12",rest:"90s",cue:"elbows ~45°",mis:"flaring"},
    {h:"Pull-ups",g:"Barbell Row",sets:3,reps:"6-10",rest:"90s",cue:"squeeze blades",mis:"swinging"},
    {h:"Weighted squats",g:"Back Squat",sets:3,reps:"8-12",rest:"2min",cue:"knees track toes",mis:"heels up"},
    {h:"Plank",g:"Ab-wheel",sets:3,reps:"45s",rest:"45s",cue:"hips level",mis:"hip drop"},
    {h:"Pike push-ups",g:"Overhead Press",sets:3,reps:"8-12",rest:"90s",cue:"core tight",mis:"arching"},
  ],
  run: [
    {h:"Brisk run intervals",g:"Treadmill intervals",sets:1,reps:"20min",rest:"-",cue:"easy pace, talk test",mis:"going too hard"},
    {h:"Tempo run",g:"Tempo run",sets:1,reps:"15min",rest:"-",cue:"comfortably hard",mis:"sprinting"},
    {h:"Hill sprints",g:"Incline sprints",sets:6,reps:"20s",rest:"60s",cue:"drive knees, tall",mis:"overstriding"},
    {h:"Strides",g:"Strides",sets:4,reps:"60m",rest:"45s",cue:"relaxed speed",mis:"tensing up"},
  ],
};
const FOCUS_POOL: Record<string, string> = {
  chest:"chest", back:"back", legs:"legs", full:"full", abs:"abs", shoulders:"shoulders",
  arms:"arms", biceps:"biceps", triceps:"triceps", forearms:"forearms", run:"run",
  "Chest":"chest","Back":"back","Legs":"legs","Shoulders":"shoulders","Arms":"arms","Abs":"abs",
  "Upper body":"upper","Lower body":"legs",
  "Push (chest/shoulders/triceps)":"push","Pull (back/biceps)":"pull","Full body":"full",
};
const FOCUS_OPTIONS = ["Chest","Back","Legs","Shoulders","Arms","Abs","Upper body","Lower body","Push (chest/shoulders/triceps)","Pull (back/biceps)","Full body"];
const GOAL_FOCUS: Record<string, string[]> = {
  "Build muscle": ["chest","back","legs","full"], "Lose fat": ["full","legs","full","abs"],
  "Build abs": ["abs","abs","full","abs"], "Build chest": ["chest","chest","shoulders","chest"],
  "Build back": ["back","back","biceps","back"], "Biceps": ["biceps","back","arms","biceps"],
  "Triceps": ["triceps","chest","arms","triceps"], "Forearms": ["forearms","back","arms","forearms"],
  "Upper body": ["chest","back","shoulders","arms"], "Lower body": ["legs","legs","abs","legs"],
  "Improve running": ["run","legs","abs","run"], "Full physique": ["chest","back","legs","full"],
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
  const [splitStyle, setSplitStyle] = useState("Auto (best for my days)");
  const [useAI, setUseAI] = useState(false);
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

  const buildSplit = (n: number) => {
    const dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat"];
    const daysArr = dayNames.slice(0, n);
    const pick = (arr: string[]) => daysArr.map((d, i) => ({ day: d, focus: arr[i % arr.length] }));
    if (splitStyle === "Upper / Lower") return pick(["Upper body","Lower body"]);
    if (splitStyle === "Push / Pull / Legs") return pick(["Push (chest/shoulders/triceps)","Pull (back/biceps)","Legs"]);
    if (splitStyle === "Full body") return pick(["Full body"]);
    if (splitStyle === "Body-part split") return pick(["Chest","Back","Legs","Shoulders","Arms","Abs"]);
    const specific = !["Full physique","Build muscle","Lose fat"].includes(goal);
    if (specific) return pick(GOAL_FOCUS[goal] || ["Chest","Back","Legs","Full body"]);
    if (n <= 3) return pick(["Full body"]);
    if (n === 4) return pick(["Upper body","Lower body"]);
    if (n === 5) return pick(["Push (chest/shoulders/triceps)","Pull (back/biceps)","Legs","Upper body","Lower body"]);
    return pick(["Push (chest/shoulders/triceps)","Pull (back/biceps)","Legs"]);
  };

  const makeDayExercises = (day: string, focus: string): Ex[] => {
    const home = equipment.startsWith("Home") || equipment.startsWith("Dumbbells");
    const pool = POOL[FOCUS_POOL[focus] || "full"] || POOL.full;
    return Array.from({ length: Number(perSession) }, (_, k) => {
      const e = pool[k % pool.length];
      return { day, name: home ? e.h : e.g, sets: e.sets, reps: e.reps, rest: e.rest, cues: e.cue, mistakes: e.mis };
    });
  };

  const buildOffline = (): Blueprint => {
    const n = Number(days);
    const split = buildSplit(n);
    const exercises: Ex[] = [];
    split.forEach((s) => exercises.push(...makeDayExercises(s.day, s.focus)));
    const home = equipment.startsWith("Home") || equipment.startsWith("Dumbbells");
    const cal = autoCal || 2200;
    return {
      title: `${goal} Blueprint (${n} days)`, split, exercises,
      topExercises: home ? ["Push-ups","Pull-ups","Weighted squats","Pike push-ups","Plank"] : ["Squat","Bench press","Deadlift","Barbell row","Overhead press"],
      topMistakes: ["Bad form — lifting too heavy with wrong technique","Not consistent — skipping workouts or meals","No progressive overload — same weight forever"],
      progression: "Progressive overload: add 1 rep or 2.5kg each week once you hit the top of the rep range.",
      nutrition: { calories: cal, protein: proteinTarget, foods: diet !== "Non-vegetarian" ? VEG_FOODS : NONVEG_FOODS, tip: `Protein = ${autoWeight || 70}kg × ${proteinFactor} = ${proteinTarget}g. Drink 3-4 L water.` },
      recovery: { sleep: "7-9 hours", water: "3-4 litres", deload: "Every 4-6 weeks, halve volume" },
      tips: ["Progressive overload every week","Protein with every meal","Slow eccentric (2-3s down)","Warm up before lifting","Watch tutorials or record yourself to check your form"],
    };
  };

  const generate = async () => {
    setBusy(true); setError(""); setBp(null); setEdit(false);
    if (!useAI) { setBp(buildOffline()); notify("📘 Built-in best plan (recommended)"); setBusy(false); return; }
    try {
      const res = await fetch("/api/blueprint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal, days, level, equipment, perSession, calories: autoCal, direction, diet, weight: autoWeight, pf: proteinFactor, splitStyle }) });
      const d = await res.json().catch(() => null);
      if (res.ok && d && d.split) { setBp(d); } else { setBp(buildOffline()); notify("🌐 " + (d?.error || "AI failed — built-in plan")); }
    } catch { setBp(buildOffline()); notify("🌐 AI busy — built-in plan"); }
    setBusy(false);
  };

  const setEx = (i: number, patch: Partial<Ex>) => setBp((b) => (b ? { ...b, exercises: b.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)) } : b));
  const setNut = (patch: Partial<Blueprint["nutrition"]>) => setBp((b) => (b ? { ...b, nutrition: { ...b.nutrition, ...patch } } : b));
  const setFocus = (i: number, focus: string) => {
    setBp((b) => {
      if (!b) return b;
      const day = b.split[i].day;
      const split = b.split.map((s, j) => (j === i ? { ...s, focus } : s));
      const exercises = [...b.exercises.filter((e) => e.day !== day), ...makeDayExercises(day, focus)];
      return { ...b, split, exercises };
    });
  };

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
    let t = `🏋️ ${bp.title}\n${"=".repeat(40)}\n\n🏆 TOP EXERCISES\n${(bp.topExercises||[]).map((x)=>`• ${x}`).join("\n")}\n\n⚠️ TOP 3 MISTAKES\n${(bp.topMistakes||[]).map((x)=>`• ${x}`).join("\n")}\n\nWEEKLY SPLIT\n`;
    bp.split.forEach((s) => (t += `• ${s.day} — ${s.focus}\n`));
    t += `\nWORKOUTS\n`;
    bp.split.forEach((s) => {
      t += `\n[${s.day} • ${s.focus}]\n`;
      bp.exercises.filter((e) => e.day === s.day).forEach((e) => {
        t += `  ${e.name} — ${e.sets} sets × ${e.reps}, rest ${e.rest}\n    ✔ ${e.cues}\n    ✖ Avoid: ${e.mistakes}\n`;
      });
    });
    t += `\nPROGRESSION\n${bp.progression}\n\nNUTRITION (${bp.nutrition.calories} kcal • ${bp.nutrition.protein}g)\n${bp.nutrition.foods.map((f)=>`• ${f}`).join("\n")}\n${bp.nutrition.tip}\n\nRECOVERY\nSleep: ${bp.recovery.sleep}\nWater: ${bp.recovery.water}\nDeload: ${bp.recovery.deload}\n\nKEY TIPS\n${bp.tips.map((x)=>`• ${x}`).join("\n")}\n`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([t], { type: "text/plain" }));
    a.download = "blueprint.txt"; a.click();
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
          {["Build muscle","Lose fat","Build abs","Build chest","Build back","Biceps","Triceps","Forearms","Upper body","Lower body","Improve running","Full physique"].map((g) => <option key={g}>{g}</option>)}
        </select>
        <select value={days} onChange={(e) => setDays(e.target.value)} className={inputCls}>
          {["3","4","5","6"].map((d) => <option key={d} value={d}>{d} days/week</option>)}
        </select>
        <select value={splitStyle} onChange={(e) => setSplitStyle(e.target.value)} className={`${inputCls} col-span-2`}>
          {["Auto (best for my days)","Upper / Lower","Push / Pull / Legs","Full body","Body-part split"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls}>
          {["Beginner","Intermediate","Advanced"].map((l) => <option key={l}>{l}</option>)}
        </select>
        <select value={equipment} onChange={(e) => setEquipment(e.target.value)} className={inputCls}>
          {["Full gym","Dumbbells only","Home (no equipment)"].map((q) => <option key={q}>{q}</option>)}
        </select>
        <select value={perSession} onChange={(e) => setPerSession(e.target.value)} className={inputCls}>
          {["3","4","5","6"].map((n) => <option key={n} value={n}>{n} exercises/session</option>)}
        </select>
        <select value={diet} onChange={(e) => setDiet(e.target.value)} className={inputCls}>
          {["Vegetarian","Non-vegetarian","Vegan"].map((d) => <option key={d}>{d}</option>)}
        </select>
        <button onClick={() => setUseAI(!useAI)} className={`press col-span-2 py-2.5 rounded-xl text-xs font-black border ${useAI ? "bg-fuchsia-600/20 border-fuchsia-500/30 text-fuchsia-300" : "bg-slate-800 border-slate-700 text-slate-300"}`}>
          {useAI ? "✨ AI version: ON (experimental)" : "📘 Built-in best plan: ON (recommended)"}
        </button>
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
              <div className="flex flex-wrap gap-1.5">{bp.topExercises!.map((x, i) => <span key={i} className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-black">{x}</span>)}</div>
            </div>
          )}
          {(bp.topMistakes || []).length > 0 && (
            <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-4">
              <p className="text-xs font-black text-red-400 mb-2 flex items-center gap-1.5"><AlertTriangle size={14} /> TOP 3 MISTAKES TO AVOID</p>
              <ul className="space-y-1">{bp.topMistakes!.map((m, i) => <li key={i} className="text-xs text-slate-300">✖ {m}</li>)}</ul>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs font-black text-slate-400 mb-3 flex items-center gap-1.5"><Dumbbell size={14} /> WEEKLY SPLIT {edit && <span className="text-[9px] text-indigo-300">(change any day)</span>}</p>
            <div className="grid grid-cols-2 gap-2">
              {bp.split.map((s, i) => (
                <div key={i} className="bg-slate-800/60 rounded-xl p-3">
                  <p className="font-black text-indigo-300 text-sm mb-1">{s.day}</p>
                  {edit ? (
                    <select value={s.focus} onChange={(ev) => setFocus(i, ev.target.value)} className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs outline-none">
                      {FOCUS_OPTIONS.map((f) => <option key={f}>{f}</option>)}
                    </select>
                  ) : (<p className="text-xs text-slate-300">{s.focus}</p>)}
                </div>
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
                      ) : (<p className="text-xs text-indigo-300 font-black mb-1">{e.sets} sets × {e.reps} • rest {e.rest}</p>)}
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
            <p className="text-[10px] font-black text-slate-500 mb-1">BEST FOODS + PROTEIN/100g</p>
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
            ) : (<ul className="space-y-1">{bp.tips.map((t, i) => <li key={i} className="text-xs text-slate-300">• {t}</li>)}</ul>)}
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