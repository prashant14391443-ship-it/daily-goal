"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Target, Calculator, UtensilsCrossed, Pencil, Camera, Save, RefreshCw, Plus, Flame, Zap, X } from "lucide-react";

type Result = {
  name: string; bmr: number; tdee: number; calories: number; weeks: number;
  direction: "gain" | "loss" | "maintain"; target: number;
};
type Log = { id: string; meal: string; food_name: string; calories: number; protein: number; carbs: number; fat: number };
type ScanResult = { food: string; calories: number; protein: number; carbs: number; fat: number };
type Meal = { key: string; icon: string; label: string };

const BASE_MEALS: Meal[] = [
  { key: "breakfast", icon: "🌅", label: "Breakfast" },
  { key: "lunch", icon: "☀️", label: "Lunch" },
  { key: "dinner", icon: "🌙", label: "Dinner" },
  { key: "snacks", icon: "🍿", label: "Snacks" },
];

const QUICK_FOODS = [
  { name: "🫓 Roti (1 pc)", cal: 120, p: 4, c: 20, f: 3 },
  { name: "🍚 White rice (1 cup)", cal: 200, p: 4, c: 45, f: 1 },
  { name: "🥛 Milk (1 glass)", cal: 150, p: 8, c: 12, f: 8 },
  { name: "🍌 Banana", cal: 105, p: 1, c: 27, f: 0 },
  { name: "🍗 Chicken (100g)", cal: 165, p: 31, c: 0, f: 4 },
  { name: "🥚 Egg (1 pc)", cal: 78, p: 6, c: 1, f: 5 },
  { name: "🫘 Dal (1 bowl)", cal: 160, p: 9, c: 27, f: 2 },
  { name: "🥔 Aloo sabzi (1 bowl)", cal: 150, p: 3, c: 20, f: 7 },
  { name: "🍞 Bread (2 slices)", cal: 160, p: 5, c: 30, f: 2 },
  { name: "🥣 Oats (1 bowl)", cal: 150, p: 5, c: 27, f: 3 },
  { name: "🧀 Paneer (50g)", cal: 130, p: 9, c: 2, f: 10 },
  { name: "🍎 Apple", cal: 95, p: 0, c: 25, f: 0 },
];

function toLocalISO(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${day}`; }

function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 1024;
        let { width, height } = img;
        if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } }
        else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function CalculatorPage() {
  const [tab, setTab] = useState<"calc" | "track">("calc");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState("1.375");
  const [target, setTarget] = useState("");
  const [pace, setPace] = useState("0.5");
  const [result, setResult] = useState<Result | null>(null);

  const [logs, setLogs] = useState<Log[]>([]);
  const [meals, setMeals] = useState<Meal[]>(() => {
    if (typeof window === "undefined") return BASE_MEALS;
    try { const extra = JSON.parse(localStorage.getItem("dg-meals") || "[]"); return [...BASE_MEALS, ...extra]; } catch { return BASE_MEALS; }
  });
  const [addingMeal, setAddingMeal] = useState<string | null>(null);
  const [foodName, setFoodName] = useState("");
  const [qty, setQty] = useState("1");
  const [customFood, setCustomFood] = useState(false);
  const [picked, setPicked] = useState<{ cal: number; p: number; c: number; f: number } | null>(null);
  const [scanName, setScanName] = useState("");
  const [scanQty, setScanQty] = useState("");
  const [cal, setCal] = useState("");
  const [pro, setPro] = useState("");
  const [carb, setCarb] = useState("");
  const [fat, setFat] = useState("");
  const [scanMeal, setScanMeal] = useState<string | null>(null);
  const [scanImg, setScanImg] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const today = toLocalISO(new Date());

  useEffect(() => {
    const saved = localStorage.getItem("dg-calc");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setName(p.name || ""); setAge(p.age || ""); setGender(p.gender || "male");
        setHeight(p.height || ""); setWeight(p.weight || ""); setActivity(p.activity || "1.375");
        setTarget(p.target || ""); setPace(p.pace || "0.5"); setResult(p.result || null);
      } catch {}
    }
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLogs = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    const { data: rows } = await supabase.from("nutrition_logs").select("*").eq("user_id", uid).eq("log_date", today).order("created_at");
    setLogs((rows as Log[]) || []);
  };

  const calculate = (e: React.FormEvent) => {
    e.preventDefault();
    const w = Number(weight), h = Number(height), a = Number(age), t = Number(target);
    const bmr = Math.round(gender === "male" ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161);
    const tdee = Math.round(bmr * Number(activity));
    const diff = t - w;
    const direction: Result["direction"] = diff > 0 ? "gain" : diff < 0 ? "loss" : "maintain";
    const adjust = Number(pace) === 0.5 ? 500 : 1000;
    const calories = Math.round(direction === "gain" ? tdee + adjust : direction === "loss" ? Math.max(tdee - adjust, 1200) : tdee);
    const weeks = Math.round(Math.abs(diff) / Number(pace));
    const r: Result = { name, bmr, tdee, calories, weeks, direction, target: t };
    setResult(r);
    localStorage.setItem("dg-calc", JSON.stringify({ name, age, gender, height, weight, activity, target, pace, result: r }));
  };

  const motivation = (r: Result) => {
    if (r.direction === "loss") return `${r.name}, in ${r.weeks} weeks you will be lighter, stronger and prouder. Every healthy meal is a win! 💪`;
    if (r.direction === "gain") return `${r.name}, ${r.weeks} weeks of good food and lifting = a bigger, stronger you. Eat up! 🏋️`;
    return `${r.name}, you are at your goal weight — keep crushing it to stay there! 🔥`;
  };

  const resetForm = () => { setFoodName(""); setQty("1"); setCustomFood(false); setPicked(null); setCal(""); setPro(""); setCarb(""); setFat(""); };
  const applyMacros = (q: { cal: number; p: number; c: number; f: number }, qtyStr: string) => {
    const n = Number(qtyStr) || 1;
    setCal(String(Math.round(q.cal * n))); setPro(String(Math.round(q.p * n)));
    setCarb(String(Math.round(q.c * n))); setFat(String(Math.round(q.f * n)));
  };
  const pick = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === "custom") { setCustomFood(true); setPicked(null); setFoodName(""); return; }
    const q = QUICK_FOODS[Number(v)];
    if (!q) return;
    setCustomFood(false); setPicked(q); setFoodName(q.name); applyMacros(q, qty);
  };
  const onQty = (v: string) => { setQty(v); if (picked && !customFood) applyMacros(picked, v); };

  const insertLog = async (meal: string, entry: Omit<Log, "id" | "meal">) => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    const { data: inserted, error } = await supabase.from("nutrition_logs").insert({ user_id: uid, log_date: today, meal, ...entry }).select().single();
    if (!error && inserted) setLogs((l) => [...l, inserted as Log]);
  };
  const addFood = async (e: React.FormEvent, meal: string) => {
    e.preventDefault();
    if (!foodName.trim() || !cal) return;
    await insertLog(meal, { food_name: foodName.trim() + (picked && Number(qty) > 1 ? " × " + qty.trim() : ""), calories: Number(cal) || 0, protein: Number(pro) || 0, carbs: Number(carb) || 0, fat: Number(fat) || 0 });
    setAddingMeal(null); resetForm();
  };
  const del = async (id: string) => { await supabase.from("nutrition_logs").delete().eq("id", id); setLogs(logs.filter((l) => l.id !== id)); };

  const onScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setScanError(""); setScanResult(null);
    setScanImg(await compressImage(f));
  };
  const analyze = async () => {
    if (!scanImg) return;
    setScanLoading(true); setScanError("");
    try {
      const res = await fetch("/api/calorie", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: scanImg, foodName: scanName || undefined, quantity: scanQty || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setScanResult(data);
    } catch (err) { setScanError(err instanceof Error ? err.message : "Could not analyze. Try a clearer photo."); }
    setScanLoading(false);
  };
  const num = (v: unknown) => { const n = Number(String(v ?? 0).replace(/[^\d.]/g, "")); return Number.isFinite(n) ? Math.round(n) : 0; };
  const saveScan = async () => {
    if (!scanResult || !scanMeal) return;
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    const { data: inserted, error } = await supabase.from("nutrition_logs").insert({ user_id: uid, log_date: today, meal: scanMeal, food_name: "📷 " + (scanResult.food || "Scanned food"), calories: num(scanResult.calories), protein: num(scanResult.protein), carbs: num(scanResult.carbs), fat: num(scanResult.fat) }).select().single();
    if (error) { alert("Could not save: " + error.message); return; }
    if (inserted) setLogs((l) => [...l, inserted as Log]);
    setScanMeal(null); setScanImg(null); setScanResult(null);
  };
  const addMealSection = () => {
    const label = prompt("New meal section name (e.g. Evening Chai):");
    if (!label || !label.trim()) return;
    const item: Meal = { key: "custom-" + Date.now(), icon: "🍽️", label: label.trim() };
    const next = [...meals, item];
    setMeals(next);
    localStorage.setItem("dg-meals", JSON.stringify(next.filter((m) => m.key.startsWith("custom-"))));
  };

  const eaten = logs.reduce((s, l) => s + l.calories, 0);
  const tPro = logs.reduce((s, l) => s + l.protein, 0);
  const tCarb = logs.reduce((s, l) => s + l.carbs, 0);
  const tFat = logs.reduce((s, l) => s + l.fat, 0);
  const proteinFactor = activity === "1.2" ? 1.2 : activity === "1.375" ? 1.4 : activity === "1.55" ? 1.6 : activity === "1.725" ? 1.9 : 2.2;
  const wKg = Number(weight) || 0;
  const proTarget = wKg > 0 ? Math.round(wKg * proteinFactor) : 120;
  const carbTarget = result ? Math.round((result.calories * 0.5) / 4) : 250;
  const fatTarget = result ? Math.round((result.calories * 0.2) / 9) : 70;

  const inputCls = "w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-blue-500 transition-colors";
  const Bar = ({ label, value, target, color }: { label: string; value: number; target: number; color: string }) => {
    const pct = Math.min(100, Math.round((value / Math.max(target, 1)) * 100));
    return (
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="font-bold text-slate-400">{label}</span>
          <span className="font-black text-slate-300">{value} / {target} • {pct}%</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} /></div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 p-5 shadow-xl shadow-indigo-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center"><Target size={22} strokeWidth={2.2} className="text-white" /></span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Goal & Calorie Calculator</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">Calculate your plan + track daily meals</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab("calc")} className={`press flex-1 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-1.5 border transition-all ${tab === "calc" ? "bg-blue-500/15 border-blue-500/30 text-blue-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
          <Calculator size={15} /> Calculate Plan
        </button>
        <button onClick={() => setTab("track")} className={`press flex-1 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-1.5 border transition-all ${tab === "track" ? "bg-green-500/15 border-green-500/30 text-green-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
          <UtensilsCrossed size={15} /> Track Daily
        </button>
      </div>

      {tab === "calc" && (
        <>
          <form onSubmit={calculate} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-5 grid gap-3 md:grid-cols-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required className={inputCls} />
            <input type="number" min="10" max="90" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" required className={inputCls} />
            <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls}>
              <option value="male">Male</option><option value="female">Female</option>
            </select>
            <input type="number" min="100" max="250" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Height (cm)" required className={inputCls} />
            <input type="number" min="25" max="250" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Current weight (kg)" required className={inputCls} />
            <input type="number" min="25" max="250" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target weight (kg)" required className={inputCls} />
            <select value={activity} onChange={(e) => setActivity(e.target.value)} className={inputCls}>
              <option value="1.2">Sedentary (little exercise)</option>
              <option value="1.375">Light (1-3 days/week)</option>
              <option value="1.55">Moderate (3-5 days/week)</option>
              <option value="1.725">High (6-7 days/week)</option>
              <option value="1.9">Athlete (2x per day)</option>
            </select>
            <select value={pace} onChange={(e) => setPace(e.target.value)} className={inputCls}>
              <option value="0.5">Steady pace (0.5 kg/week)</option>
              <option value="1">Fast pace (1 kg/week) — aggressive, short-term</option>
            </select>
            <button className="md:col-span-2 press py-3.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-sm font-black text-blue-300 flex items-center justify-center gap-1.5">
              <Calculator size={15} /> Calculate My Plan
            </button>
          </form>

          {result && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 grid gap-5">
              <div className="text-center">
                <p className="text-xs text-slate-500 font-black uppercase tracking-wider">Your daily calorie target</p>
                <p className="text-5xl font-black text-blue-400 mt-2">{result.calories}</p>
                <p className="text-sm text-slate-400 font-bold">kcal / day</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[10px] text-slate-500 font-black">BMR</p><p className="font-black text-white mt-1">{result.bmr}</p></div>
                <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[10px] text-slate-500 font-black">TDEE</p><p className="font-black text-white mt-1">{result.tdee}</p></div>
                <div className="bg-slate-800/60 rounded-xl p-3"><p className="text-[10px] text-slate-500 font-black">GOAL</p><p className="font-black text-white mt-1">{result.target} kg</p></div>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-4 text-center">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Estimated time to goal</p>
                <p className="text-xl font-black text-white mt-1">{result.weeks} weeks (~{Math.round(result.weeks / 4.33)} months)</p>
              </div>
              <p className="text-center text-sm text-green-400 font-bold">{motivation(result)}</p>
              {result.direction === "loss" && Number(pace) === 1 && (
                <p className="text-center text-[11px] text-amber-400 font-bold">⚠️ 1 kg/week is aggressive. If it feels too hard, switch to steady pace (0.5 kg/week).</p>
              )}
              <p className="text-[10px] text-slate-600 text-center font-bold">Based on Mifflin-St Jeor formula. Estimates for guidance only.</p>
            </div>
          )}
        </>
      )}

      {tab === "track" && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-5">
            <p className="text-4xl font-black mb-1">{eaten} <span className="text-base text-slate-500 font-bold">/ {result?.calories || 2000} cal</span></p>
            <p className="text-xs text-slate-500 font-bold mb-4">{Math.max((result?.calories || 2000) - eaten, 0)} cal left today</p>
            <div className="grid gap-3">
              <Bar label="Protein" value={tPro} target={proTarget} color="bg-green-500" />
              <Bar label="Carbs" value={tCarb} target={carbTarget} color="bg-blue-500" />
              <Bar label="Fat" value={tFat} target={fatTarget} color="bg-amber-500" />
            </div>
          </div>

          <div className="grid gap-4">
            {meals.map((m) => (
              <div key={m.key} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-black text-base text-white flex items-center gap-2"><span className="text-lg">{m.icon}</span>{m.label}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { setAddingMeal(addingMeal === m.key ? null : m.key); setScanMeal(null); resetForm(); }} className="press px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[10px] font-black flex items-center gap-1"><Pencil size={11} /> Add</button>
                    <button onClick={() => { setScanMeal(scanMeal === m.key ? null : m.key); setAddingMeal(null); setScanImg(null); setScanResult(null); setScanError(""); setScanName(""); setScanQty(""); }} className="press px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] font-black flex items-center gap-1"><Camera size={11} /> Scan</button>
                  </div>
                </div>

                {logs.filter((l) => l.meal === m.key).map((l) => (
                  <div key={l.id} className="flex justify-between items-center bg-slate-800/60 rounded-xl p-2.5 mb-1.5 text-sm">
                    <span className="text-white font-bold truncate flex-1 mr-2">{l.food_name}</span>
                    <span className="flex items-center gap-2 text-slate-400 shrink-0">
                      <span className="text-white font-black">{l.calories} cal</span>
                      <span className="text-[10px] font-bold">P{l.protein} C{l.carbs} F{l.fat}</span>
                      <button onClick={() => del(l.id)} className="press w-6 h-6 rounded-md bg-slate-900 text-red-400 flex items-center justify-center"><X size={12} /></button>
                    </span>
                  </div>
                ))}

                {addingMeal === m.key && (
                  <form onSubmit={(e) => addFood(e, m.key)} className="grid gap-2 mt-3 bg-slate-800/40 rounded-xl p-3">
                    <select onChange={pick} defaultValue="" className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500">
                      <option value="" disabled>Choose food...</option>
                      {QUICK_FOODS.map((q, i) => (<option key={i} value={i}>{q.name} — {q.cal} cal</option>))}
                      <option value="custom">Other (type name)</option>
                    </select>
                    {customFood && (<input value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder="Food name" className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500" />)}
                    <input type="number" min="1" value={qty} onChange={(e) => onQty(e.target.value)} placeholder="Quantity (×)" className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500" />
                    <div className="grid grid-cols-4 gap-2">
                      <input type="number" value={cal} onChange={(e) => setCal(e.target.value)} placeholder="cal" className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500" />
                      <input type="number" value={pro} onChange={(e) => setPro(e.target.value)} placeholder="P g" className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500" />
                      <input type="number" value={carb} onChange={(e) => setCarb(e.target.value)} placeholder="C g" className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500" />
                      <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="F g" className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500" />
                    </div>
                    <button className="press py-2.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-sm font-black text-violet-300 flex items-center justify-center gap-1.5"><Save size={14} /> Save</button>
                  </form>
                )}

                {scanMeal === m.key && (
                  <div className="grid gap-2 mt-3 bg-slate-800/40 rounded-xl p-3">
                    {!scanImg ? (
                      <label className="press block bg-slate-800 border-2 border-dashed border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-red-500/50 transition-colors">
                        <Camera size={28} className="mx-auto text-red-400 mb-2" />
                        <p className="text-sm font-black text-slate-300">Tap to take food photo</p>
                        <input type="file" accept="image/*" capture="environment" onChange={onScanFile} className="hidden" />
                      </label>
                    ) : (
                      <>
                        <img src={scanImg} alt="food" className="rounded-xl max-h-40 w-full object-cover border border-slate-700" />
                        <input value={scanName} onChange={(e) => setScanName(e.target.value)} placeholder="Food name (optional, more accurate)" className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-red-500" />
                        <input value={scanQty} onChange={(e) => setScanQty(e.target.value)} placeholder="Quantity (e.g. 1 plate, 200g)" className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-red-500" />
                        {!scanResult ? (
                          <button onClick={analyze} disabled={scanLoading} className="press py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-sm font-black text-red-300 disabled:opacity-50 flex items-center justify-center gap-1.5">
                            <Zap size={14} />{scanLoading ? "AI is reading your food..." : "Analyze Calories"}
                          </button>
                        ) : (
                          <div className="bg-slate-800/60 rounded-xl p-4 text-sm">
                            <p className="font-black text-white">{scanResult.food}</p>
                            <p className="text-3xl font-black text-red-400 my-2">{num(scanResult.calories)} kcal</p>
                            <div className="grid grid-cols-3 gap-2 text-center mb-3">
                              <div className="bg-slate-900 rounded-lg p-2.5"><p className="text-[10px] text-slate-500 font-black">PROTEIN</p><p className="font-black text-green-400 mt-0.5">{num(scanResult.protein)}g</p></div>
                              <div className="bg-slate-900 rounded-lg p-2.5"><p className="text-[10px] text-slate-500 font-black">CARBS</p><p className="font-black text-blue-400 mt-0.5">{num(scanResult.carbs)}g</p></div>
                              <div className="bg-slate-900 rounded-lg p-2.5"><p className="text-[10px] text-slate-500 font-black">FAT</p><p className="font-black text-yellow-400 mt-0.5">{num(scanResult.fat)}g</p></div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={saveScan} className="press flex-1 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-xs font-black text-green-300 flex items-center justify-center gap-1.5"><Save size={13} /> Add to {m.label}</button>
                              <button onClick={() => { setScanImg(null); setScanResult(null); }} className="press px-4 py-2.5 rounded-xl bg-slate-700 text-xs font-black text-slate-300 flex items-center gap-1.5"><RefreshCw size={13} /> Retake</button>
                            </div>
                          </div>
                        )}
                        {scanError && <p className="text-red-400 text-xs font-bold text-center">❌ {scanError}</p>}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}

            <button onClick={addMealSection} className="press py-4 rounded-2xl border-2 border-dashed border-slate-700 text-slate-500 hover:text-white hover:border-violet-500/50 text-sm font-black flex items-center justify-center gap-2 transition-colors">
              <Plus size={16} /> Add New Meal Section
            </button>
          </div>
        </>
      )}

      <Link href="/gym-log" className="inline-block mt-6 text-sm text-slate-500 hover:text-white press font-bold">← Back to Gym</Link>
    </main>
  );
}