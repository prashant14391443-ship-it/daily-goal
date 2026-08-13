"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Result = {
  name: string;
  bmr: number;
  tdee: number;
  calories: number;
  weeks: number;
  direction: "gain" | "loss" | "maintain";
  target: number;
};

type Log = {
  id: string;
  meal: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

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

const MEALS = [
  { key: "breakfast", icon: "🌅", label: "Breakfast" },
  { key: "lunch", icon: "☀️", label: "Lunch" },
  { key: "dinner", icon: "🌙", label: "Dinner" },
  { key: "snacks", icon: "🍿", label: "Snacks" },
];

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  const [addingMeal, setAddingMeal] = useState<string | null>(null);
  const [foodName, setFoodName] = useState("");
  const [cal, setCal] = useState("");
  const [pro, setPro] = useState("");
  const [carb, setCarb] = useState("");
  const [fat, setFat] = useState("");
  const today = toLocalISO(new Date());

  useEffect(() => {
    const saved = localStorage.getItem("dg-calc");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setName(p.name || "");
        setAge(p.age || "");
        setGender(p.gender || "male");
        setHeight(p.height || "");
        setWeight(p.weight || "");
        setActivity(p.activity || "1.375");
        setTarget(p.target || "");
        setPace(p.pace || "0.5");
        setResult(p.result || null);
      } catch {}
    }
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    const { data: logs } = await supabase
      .from("nutrition_logs")
      .select("*")
      .eq("user_id", uid)
      .eq("log_date", today)
      .order("created_at");
    setLogs((logs as Log[]) || []);
  };

  const calculate = (e: React.FormEvent) => {
    e.preventDefault();
    const w = Number(weight);
    const h = Number(height);
    const a = Number(age);
    const t = Number(target);

    const bmr = Math.round(
      gender === "male"
        ? 10 * w + 6.25 * h - 5 * a + 5
        : 10 * w + 6.25 * h - 5 * a - 161
    );
    const tdee = Math.round(bmr * Number(activity));
    const diff = t - w;
    const direction: Result["direction"] =
      diff > 0 ? "gain" : diff < 0 ? "loss" : "maintain";
    const adjust = Number(pace) === 0.5 ? 500 : 1000;
    const calories = Math.round(
      direction === "gain"
        ? tdee + adjust
        : direction === "loss"
        ? Math.max(tdee - adjust, 1200)
        : tdee
    );
    const weeks = Math.round(Math.abs(diff) / Number(pace));

    const r: Result = { name, bmr, tdee, calories, weeks, direction, target: t };
    setResult(r);
    localStorage.setItem(
      "dg-calc",
      JSON.stringify({ name, age, gender, height, weight, activity, target, pace, result: r })
    );
  };

  const motivation = (r: Result) => {
    if (r.direction === "loss")
      return `${r.name}, in ${r.weeks} weeks you will be lighter, stronger and prouder. Every healthy meal is a win! 💪`;
    if (r.direction === "gain")
      return `${r.name}, ${r.weeks} weeks of good food and lifting = a bigger, stronger you. Eat up! 🏋️`;
    return `${r.name}, you are at your goal weight — keep crushing it to stay there! 🔥`;
  };

  const inputCls = "p-3 rounded bg-slate-800 border border-slate-700 w-full";

  const resetForm = () => {
    setFoodName("");
    setCal("");
    setPro("");
    setCarb("");
    setFat("");
  };

  const pick = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const q = QUICK_FOODS[Number(e.target.value)];
    if (!q) return;
    setFoodName(q.name);
    setCal(String(q.cal));
    setPro(String(q.p));
    setCarb(String(q.c));
    setFat(String(q.f));
  };

  const addFood = async (e: React.FormEvent, meal: string) => {
    e.preventDefault();
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid || !foodName.trim() || !cal) return;
    const { data: inserted, error } = await supabase
      .from("nutrition_logs")
      .insert({
        user_id: uid,
        log_date: today,
        meal,
        food_name: foodName.trim(),
        calories: Number(cal) || 0,
        protein: Number(pro) || 0,
        carbs: Number(carb) || 0,
        fat: Number(fat) || 0,
      })
      .select()
      .single();
    if (!error && inserted) setLogs([...logs, inserted as Log]);
    setAddingMeal(null);
    resetForm();
  };

  const del = async (id: string) => {
    await supabase.from("nutrition_logs").delete().eq("id", id);
    setLogs(logs.filter((l) => l.id !== id));
  };

  const eaten = logs.reduce((s, l) => s + l.calories, 0);
  const tPro = logs.reduce((s, l) => s + l.protein, 0);
  const tCarb = logs.reduce((s, l) => s + l.carbs, 0);
  const tFat = logs.reduce((s, l) => s + l.fat, 0);

  const proTarget = result ? Math.round(result.calories * 0.3 / 4) : 120;
  const carbTarget = result ? Math.round(result.calories * 0.5 / 4) : 250;
  const fatTarget = result ? Math.round(result.calories * 0.2 / 9) : 70;

  const Bar = ({ label, value, target, color }: { label: string; value: number; target: number; color: string }) => {
    const pct = Math.min(100, Math.round((value / Math.max(target, 1)) * 100));
    return (
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span>{label}</span>
          <span className="text-slate-400">{value} / {target} • {pct}%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-xl">🎯</span>
          Goal & Calorie Calculator
        </h1>
        <p className="text-slate-400">Calculate your plan + track daily meals</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("calc")}
          className={`flex-1 py-3 rounded-lg font-bold text-sm ${
            tab === "calc" ? "bg-blue-600" : "bg-slate-800"
          }`}
        >
          🧮 Calculate Plan
        </button>
        <button
          onClick={() => setTab("track")}
          className={`flex-1 py-3 rounded-lg font-bold text-sm ${
            tab === "track" ? "bg-green-600" : "bg-slate-800"
          }`}
        >
          🍽️ Track Daily
        </button>
      </div>

      {tab === "calc" && (
        <>
          <form onSubmit={calculate} className="bg-slate-900 p-6 rounded-lg mb-8 grid gap-4 md:grid-cols-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required className={inputCls} />
            <input type="number" min="10" max="90" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" required className={inputCls} />
            <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls}>
              <option value="male">Male</option>
              <option value="female">Female</option>
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
              <option value="1">Fast pace (1 kg/week)</option>
            </select>
            <button className="md:col-span-2 py-3 rounded bg-blue-600 hover:bg-blue-500 font-semibold">
              🧮 Calculate My Plan
            </button>
          </form>

          {result && (
            <div className="bg-slate-900 rounded-xl p-6 grid gap-5">
              <div className="text-center">
                <p className="text-slate-400 text-sm">Your daily calorie target</p>
                <p className="text-5xl font-extrabold text-blue-400">{result.calories}</p>
                <p className="text-sm text-slate-400">kcal / day</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-800 rounded p-3">
                  <p className="text-xs text-slate-400">BMR</p>
                  <p className="font-bold">{result.bmr}</p>
                </div>
                <div className="bg-slate-800 rounded p-3">
                  <p className="text-xs text-slate-400">TDEE</p>
                  <p className="font-bold">{result.tdee}</p>
                </div>
                <div className="bg-slate-800 rounded p-3">
                  <p className="text-xs text-slate-400">Goal</p>
                  <p className="font-bold">{result.target} kg</p>
                </div>
              </div>
              <div className="bg-slate-800 rounded p-4 text-center">
                <p className="text-sm text-slate-400">⏳ Estimated time to goal</p>
                <p className="text-xl font-bold">{result.weeks} weeks (~{Math.round(result.weeks / 4.33)} months)</p>
              </div>
              <p className="text-center text-sm text-green-400 font-semibold">{motivation(result)}</p>
              <p className="text-[10px] text-slate-500 text-center">Based on Mifflin-St Jeor formula. Estimates for guidance only.</p>
            </div>
          )}
        </>
      )}

      {tab === "track" && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
            <p className="text-3xl font-black mb-1">
              {eaten} <span className="text-base text-slate-400 font-semibold">/ {result?.calories || 2000} cal</span>
            </p>
            <p className="text-xs text-slate-400 mb-4">
              {Math.max((result?.calories || 2000) - eaten, 0)} cal left today
            </p>
            <div className="grid gap-3">
              <Bar label="🍗 Protein" value={tPro} target={proTarget} color="bg-green-500" />
              <Bar label="🍞 Carbs" value={tCarb} target={carbTarget} color="bg-blue-500" />
              <Bar label="🧈 Fat" value={tFat} target={fatTarget} color="bg-amber-500" />
            </div>
          </div>

          <div className="grid gap-4">
            {MEALS.map((m) => (
              <div key={m.key} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold">{m.icon} {m.label}</h3>
                  <button
                    onClick={() => {
                      setAddingMeal(addingMeal === m.key ? null : m.key);
                      resetForm();
                    }}
                    className="px-3 py-1 rounded-lg bg-violet-600/20 border border-violet-500/40 text-violet-300 text-xs font-bold"
                  >
                    + Add
                  </button>
                </div>

                {logs.filter((l) => l.meal === m.key).map((l) => (
                  <div key={l.id} className="flex justify-between items-center bg-slate-800 rounded p-2 mb-1 text-sm">
                    <span>{l.food_name}</span>
                    <span className="flex items-center gap-3 text-slate-400">
                      <span className="text-white font-semibold">{l.calories} cal</span>
                      <span className="text-[10px]">P{l.protein} C{l.carbs} F{l.fat}</span>
                      <button onClick={() => del(l.id)} className="text-red-400">✕</button>
                    </span>
                  </div>
                ))}

                {addingMeal === m.key && (
                  <form onSubmit={(e) => addFood(e, m.key)} className="grid gap-2 mt-2">
                    <select onChange={pick} defaultValue="" className="p-2 rounded bg-slate-800 border border-slate-700 text-sm">
                      <option value="" disabled>⚡ Quick pick common food…</option>
                      {QUICK_FOODS.map((q, i) => (
                        <option key={i} value={i}>{q.name} — {q.cal} cal</option>
                      ))}
                    </select>
                    <input value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder="Food name" className="p-2 rounded bg-slate-800 border border-slate-700 text-sm" />
                    <div className="grid grid-cols-4 gap-2">
                      <input type="number" value={cal} onChange={(e) => setCal(e.target.value)} placeholder="cal" className="p-2 rounded bg-slate-800 border border-slate-700 text-sm" />
                      <input type="number" value={pro} onChange={(e) => setPro(e.target.value)} placeholder="P g" className="p-2 rounded bg-slate-800 border border-slate-700 text-sm" />
                      <input type="number" value={carb} onChange={(e) => setCarb(e.target.value)} placeholder="C g" className="p-2 rounded bg-slate-800 border border-slate-700 text-sm" />
                      <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="F g" className="p-2 rounded bg-slate-800 border border-slate-700 text-sm" />
                    </div>
                    <button className="py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-bold">
                      💾 Save
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <Link href="/gym-log" className="inline-block mt-6 text-sm text-slate-400 hover:text-white">
        ← Back to Gym
      </Link>
    </main>
  );
}