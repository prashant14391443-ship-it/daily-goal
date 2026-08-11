"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Result = {
  name: string;
  bmr: number;
  tdee: number;
  calories: number;
  weeks: number;
  direction: "gain" | "loss" | "maintain";
  target: number;
};

export default function CalculatorPage() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState("1.375");
  const [target, setTarget] = useState("");
  const [pace, setPace] = useState("0.5");
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("dg-calc");
    if (!saved) return;
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
    } catch {
      // ignore
    }
  }, []);

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

  const inputCls =
    "p-3 rounded bg-slate-800 border border-slate-700 w-full";

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-xl">🎯</span>
          Goal & Calorie Calculator
        </h1>
        <p className="text-slate-400">
          Your personal plan: BMR → TDEE → daily calories → timeline
        </p>
      </div>

      <form
        onSubmit={calculate}
        className="bg-slate-900 p-6 rounded-lg mb-8 grid gap-4 md:grid-cols-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          className={inputCls}
        />
        <input
          type="number"
          min="10"
          max="90"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="Age"
          required
          className={inputCls}
        />
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className={inputCls}
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <input
          type="number"
          min="100"
          max="250"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          placeholder="Height (cm)"
          required
          className={inputCls}
        />
        <input
          type="number"
          min="25"
          max="250"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="Current weight (kg)"
          required
          className={inputCls}
        />
        <input
          type="number"
          min="25"
          max="250"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Target weight (kg)"
          required
          className={inputCls}
        />
        <select
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          className={inputCls}
        >
          <option value="1.2">Sedentary (little exercise)</option>
          <option value="1.375">Light (1-3 days/week)</option>
          <option value="1.55">Moderate (3-5 days/week)</option>
          <option value="1.725">High (6-7 days/week)</option>
          <option value="1.9">Athlete (2x per day)</option>
        </select>
        <select
          value={pace}
          onChange={(e) => setPace(e.target.value)}
          className={inputCls}
        >
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
            <p className="text-5xl font-extrabold text-blue-400">
              {result.calories}
            </p>
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
            <p className="text-xl font-bold">
              {result.weeks} weeks (~{Math.round(result.weeks / 4.33)} months)
            </p>
          </div>

          <p className="text-center text-sm text-green-400 font-semibold">
            {motivation(result)}
          </p>

          <p className="text-[10px] text-slate-500 text-center">
            Based on Mifflin-St Jeor formula. Estimates for guidance only.
          </p>
        </div>
      )}

      <Link
        href="/gym-log"
        className="inline-block mt-6 text-sm text-slate-400 hover:text-white"
      >
        ← Back to Gym
      </Link>
    </main>
  );
}