"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  { name: "🥜 Peanuts (30g)", cal: 170, p: 7, c: 5, f: 14 },
  { name: "🍵 Chai (1 cup)", cal: 70, p: 2, c: 10, f: 2 },
  { name: "🍿 Namkeen (30g)", cal: 160, p: 3, c: 15, f: 10 },
  { name: "🍛 Paneer butter masala", cal: 280, p: 12, c: 14, f: 20 },
  { name: "🍗 Chicken curry (1 bowl)", cal: 220, p: 22, c: 8, f: 12 },
  { name: "🥗 Salad (1 plate)", cal: 60, p: 2, c: 12, f: 0 },
  { name: "🍦 Ice cream (1 scoop)", cal: 200, p: 4, c: 24, f: 10 },
  { name: "🥤 Cold drink (1 can)", cal: 140, p: 0, c: 39, f: 0 },
];

const MEALS = [
  { key: "breakfast", icon: "🌅", label: "Breakfast" },
  { key: "lunch", icon: "☀️", label: "Lunch" },
  { key: "dinner", icon: "🌙", label: "Dinner" },
  { key: "snacks", icon: "🍿", label: "Snacks" },
  { key: "extra", icon: "➕", label: "Extra Meals" },
];

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function NutritionPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [goals, setGoals] = useState({
    calorie_target: 2000,
    protein_target: 120,
    carbs_target: 250,
    fat_target: 70,
  });
  const [editingGoals, setEditingGoals] = useState(false);
  const [gCal, setGCal] = useState("2000");
  const [gPro, setGPro] = useState("120");
  const [gCarb, setGCarb] = useState("250");
  const [gFat, setGFat] = useState("70");
  const [addingMeal, setAddingMeal] = useState<string | null>(null);
  const [foodName, setFoodName] = useState("");
  const [cal, setCal] = useState("");
  const [pro, setPro] = useState("");
  const [carb, setCarb] = useState("");
  const [fat, setFat] = useState("");
  const [burn, setBurn] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const today = toLocalISO(new Date());

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) {
      router.push("/login");
      return;
    }
    const [l, gl, gym] = await Promise.all([
      supabase
        .from("nutrition_logs")
        .select("*")
        .eq("user_id", uid)
        .eq("log_date", today)
        .order("created_at"),
      supabase.from("user_goals").select("*").eq("user_id", uid).maybeSingle(),
      supabase
        .from("gym_logs")
        .select("duration_minutes")
        .eq("user_id", uid)
        .eq("session_date", today),
    ]);
    setLogs((l.data as Log[]) || []);
    if (gl.data) {
      setGoals({
        calorie_target: gl.data.calorie_target ?? 2000,
        protein_target: gl.data.protein_target ?? 120,
        carbs_target: gl.data.carbs_target ?? 250,
        fat_target: gl.data.fat_target ?? 70,
      });
      setGCal(String(gl.data.calorie_target ?? 2000));
      setGPro(String(gl.data.protein_target ?? 120));
      setGCarb(String(gl.data.carbs_target ?? 250));
      setGFat(String(gl.data.fat_target ?? 70));
    }
    const mins = (gym.data || []).reduce((s, r) => s + r.duration_minutes, 0);
    setBurn(Math.round(mins * 8));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const saveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    const next = {
      calorie_target: Number(gCal) || 2000,
      protein_target: Number(gPro) || 120,
      carbs_target: Number(gCarb) || 250,
      fat_target: Number(gFat) || 70,
    };
    await supabase.from("user_goals").upsert({ user_id: uid, ...next });
    setGoals(next);
    setEditingGoals(false);
  };

  const eaten = logs.reduce((s, l) => s + l.calories, 0);
  const tPro = logs.reduce((s, l) => s + l.protein, 0);
  const tCarb = logs.reduce((s, l) => s + l.carbs, 0);
  const tFat = logs.reduce((s, l) => s + l.fat, 0);

  const Bar = ({
    label,
    value,
    target,
    color,
  }: {
    label: string;
    value: number;
    target: number;
    color: string;
  }) => {
    const pct = Math.min(100, Math.round((value / Math.max(target, 1)) * 100));
    return (
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span>{label}</span>
          <span className="text-slate-400">
            {value} / {target} • {pct}%
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${color} ${pct >= 100 ? "bar-full" : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  if (loading)
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        <p className="text-slate-400">Loading nutrition...</p>
      </main>
    );

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black">🍽️ Nutrition</h1>
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">
          ← Back
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg">🔥 Calories</h2>
          <button
            onClick={() => setEditingGoals(!editingGoals)}
            className="px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/40 text-violet-300 text-xs font-bold"
          >
            {editingGoals ? "✖ Close" : "✏️ Edit Targets"}
          </button>
        </div>

        {editingGoals ? (
          <form onSubmit={saveGoals} className="grid grid-cols-2 gap-2 mb-4">
            <input type="number" value={gCal} onChange={(e) => setGCal(e.target.value)} placeholder="calories" className="p-2 rounded bg-slate-800 border border-slate-700 text-sm" />
            <input type="number" value={gPro} onChange={(e) => setGPro(e.target.value)} placeholder="protein g" className="p-2 rounded bg-slate-800 border border-slate-700 text-sm" />
            <input type="number" value={gCarb} onChange={(e) => setGCarb(e.target.value)} placeholder="carbs g" className="p-2 rounded bg-slate-800 border border-slate-700 text-sm" />
            <input type="number" value={gFat} onChange={(e) => setGFat(e.target.value)} placeholder="fat g" className="p-2 rounded bg-slate-800 border border-slate-700 text-sm" />
            <button className="col-span-2 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-bold">
              💾 Save Targets
            </button>
          </form>
        ) : (
          <>
            <p className="text-3xl font-black mb-1">
              {eaten} <span className="text-base text-slate-400 font-semibold">/ {goals.calorie_target} cal</span>
            </p>
            <p className="text-xs text-slate-400 mb-4">
              {Math.max(goals.calorie_target - eaten, 0)} cal left • 🏋️ gym burn ≈ {burn} cal •{" "}
              <span className={eaten - burn > goals.calorie_target ? "text-red-400 font-bold" : "text-green-400 font-bold"}>
                net ≈ {eaten - burn} cal
              </span>
            </p>
          </>
        )}

        <div className="grid gap-3">
          <Bar label="🍗 Protein" value={tPro} target={goals.protein_target} color="bg-green-500" />
          <Bar label="🍞 Carbs" value={tCarb} target={goals.carbs_target} color="bg-blue-500" />
          <Bar label="🧈 Fat" value={tFat} target={goals.fat_target} color="bg-amber-500" />
        </div>
      </div>

      <div className="grid gap-4">
        {MEALS.map((m) => (
          <div key={m.key} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold">
                {m.icon} {m.label}
              </h3>
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

            {logs
              .filter((l) => l.meal === m.key)
              .map((l) => (
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
                  <option value="" disabled>
                    ⚡ Quick pick common food…
                  </option>
                  {QUICK_FOODS.map((q, i) => (
                    <option key={i} value={i}>
                      {q.name} — {q.cal} cal
                    </option>
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
    </main>
  );
}