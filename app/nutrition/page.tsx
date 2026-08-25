"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProgressRing, IconTile, GradButton, Chip } from "@/app/components/ui";

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
  { key: "breakfast", icon: "🌅", label: "Breakfast", grad: "from-amber-500 to-orange-600", border: "border-amber-500/30" },
  { key: "lunch", icon: "☀️", label: "Lunch", grad: "from-orange-500 to-red-600", border: "border-orange-500/30" },
  { key: "dinner", icon: "🌙", label: "Dinner", grad: "from-indigo-500 to-violet-600", border: "border-indigo-500/30" },
  { key: "snacks", icon: "🍿", label: "Snacks", grad: "from-pink-500 to-rose-600", border: "border-pink-500/30" },
  { key: "extra", icon: "➕", label: "Extra Meals", grad: "from-slate-500 to-slate-700", border: "border-slate-500/30" },
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
    if (!uid) { router.push("/login"); return; }
    const [l, gl, gym] = await Promise.all([
      supabase.from("nutrition_logs").select("*").eq("user_id", uid).eq("log_date", today).order("created_at"),
      supabase.from("user_goals").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("gym_logs").select("duration_minutes").eq("user_id", uid).eq("session_date", today),
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

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setFoodName(""); setCal(""); setPro(""); setCarb(""); setFat("");
  };

  const pick = (q: typeof QUICK_FOODS[0]) => {
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
    const { data: inserted, error } = await supabase.from("nutrition_logs").insert({
      user_id: uid, log_date: today, meal,
      food_name: foodName.trim(),
      calories: Number(cal) || 0,
      protein: Number(pro) || 0,
      carbs: Number(carb) || 0,
      fat: Number(fat) || 0,
    }).select().single();
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

  const calPct = Math.min(100, Math.round((eaten / Math.max(goals.calorie_target, 1)) * 100));
  const net = eaten - burn;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-2 animate-bounce">🍽️</p>
          <p className="text-slate-400 text-sm">Loading nutrition...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 HERO */}
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 p-5 shadow-2xl shadow-emerald-900/30">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-yellow-400/20 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight">Nutrition</h1>
            <p className="text-[10px] text-white/80 font-semibold">
              {eaten} / {goals.calorie_target} cal • {Math.max(goals.calorie_target - eaten, 0)} left
            </p>
          </div>
          <ProgressRing pct={calPct} size={64} stroke={7} color="#ffffff" track="rgba(0,0,0,0.25)" />
        </div>
        {burn > 0 && (
          <div className="relative mt-3 flex items-center gap-2">
            <span className="text-[10px] font-black text-white/70">🏋️ burned</span>
            <span className="text-xs font-black text-orange-300">−{burn} cal</span>
            <span className="text-[10px] font-black text-white/70">• net</span>
            <span className={`text-xs font-black ${net > goals.calorie_target ? "text-red-300" : "text-emerald-300"}`}>
              {net} cal
            </span>
          </div>
        )}
      </div>

      {/* 🎯 MACRO CARDS */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-slate-900 border border-green-500/30 rounded-2xl p-3 shadow-lg shadow-black/30">
          <div className="flex items-center gap-2 mb-2">
            <IconTile emoji="🍗" gradient="bg-gradient-to-br from-green-500 to-emerald-600" size="sm" />
            <p className="text-[10px] font-black text-slate-400">PROTEIN</p>
          </div>
          <p className="text-xl font-black text-white">{tPro}<span className="text-xs text-slate-500">/{goals.protein_target}g</span></p>
          <div className="h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" style={{ width: `${Math.min(100, (tPro / goals.protein_target) * 100)}%` }} />
          </div>
        </div>
        <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-3 shadow-lg shadow-black/30">
          <div className="flex items-center gap-2 mb-2">
            <IconTile emoji="🍞" gradient="bg-gradient-to-br from-blue-500 to-indigo-600" size="sm" />
            <p className="text-[10px] font-black text-slate-400">CARBS</p>
          </div>
          <p className="text-xl font-black text-white">{tCarb}<span className="text-xs text-slate-500">/{goals.carbs_target}g</span></p>
          <div className="h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: `${Math.min(100, (tCarb / goals.carbs_target) * 100)}%` }} />
          </div>
        </div>
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-3 shadow-lg shadow-black/30">
          <div className="flex items-center gap-2 mb-2">
            <IconTile emoji="🧈" gradient="bg-gradient-to-br from-amber-500 to-orange-600" size="sm" />
            <p className="text-[10px] font-black text-slate-400">FAT</p>
          </div>
          <p className="text-xl font-black text-white">{tFat}<span className="text-xs text-slate-500">/{goals.fat_target}g</span></p>
          <div className="h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: `${Math.min(100, (tFat / goals.fat_target) * 100)}%` }} />
          </div>
        </div>
        <div className="bg-slate-900 border border-violet-500/30 rounded-2xl p-3 shadow-lg shadow-black/30">
          <div className="flex items-center gap-2 mb-2">
            <IconTile emoji="🎯" gradient="bg-gradient-to-br from-violet-500 to-fuchsia-600" size="sm" />
            <p className="text-[10px] font-black text-slate-400">TARGETS</p>
          </div>
          <button
            onClick={() => setEditingGoals(!editingGoals)}
            className="press w-full mt-1 px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/40 text-violet-300 text-xs font-black"
          >
            {editingGoals ? "✖ Close" : "✏️ Edit Goals"}
          </button>
        </div>
      </div>

      {/* ✏️ EDIT GOALS FORM */}
      {editingGoals && (
        <form onSubmit={saveGoals} className="bg-slate-900 border border-violet-500/30 rounded-2xl p-4 mb-5 grid grid-cols-2 gap-2 shadow-lg shadow-black/30">
          <input type="number" value={gCal} onChange={(e) => setGCal(e.target.value)} placeholder="calories" className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500" />
          <input type="number" value={gPro} onChange={(e) => setGPro(e.target.value)} placeholder="protein g" className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500" />
          <input type="number" value={gCarb} onChange={(e) => setGCarb(e.target.value)} placeholder="carbs g" className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500" />
          <input type="number" value={gFat} onChange={(e) => setGFat(e.target.value)} placeholder="fat g" className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500" />
          <GradButton type="submit" gradient="from-violet-600 to-fuchsia-600" className="col-span-2 py-3 text-sm">
            💾 Save Targets
          </GradButton>
        </form>
      )}

      {/* 🍽️ MEAL SECTIONS */}
      <div className="grid gap-4">
        {MEALS.map((m) => {
          const mealLogs = logs.filter((l) => l.meal === m.key);
          const mealCal = mealLogs.reduce((s, l) => s + l.calories, 0);
          const isOpen = addingMeal === m.key;
          return (
            <div key={m.key} className={`bg-slate-900 border-2 rounded-2xl p-4 shadow-lg shadow-black/30 transition-all ${isOpen ? m.border : "border-slate-800"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <IconTile emoji={m.icon} gradient={`bg-gradient-to-br ${m.grad}`} />
                  <div>
                    <p className="font-black text-sm text-white">{m.label}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{mealLogs.length} items • {mealCal} cal</p>
                  </div>
                </div>
                <button
                  onClick={() => { setAddingMeal(isOpen ? null : m.key); resetForm(); }}
                  className={`press px-3 py-1.5 rounded-lg text-xs font-black border-2 transition-all ${
                    isOpen
                      ? "bg-red-500/20 border-red-500/40 text-red-300"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:border-emerald-500/40"
                  }`}
                >
                  {isOpen ? "✕ Cancel" : "+ Add"}
                </button>
              </div>

              {/* MEAL ITEMS */}
              {mealLogs.length > 0 && (
                <div className="grid gap-1.5 mb-3">
                  {mealLogs.map((l) => (
                    <div key={l.id} className="flex justify-between items-center bg-slate-800/60 rounded-xl p-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate">{l.food_name}</p>
                        <div className="flex gap-2 mt-0.5">
                          <Chip color="green">P{l.protein}</Chip>
                          <Chip color="violet">C{l.carbs}</Chip>
                          <Chip color="amber">F{l.fat}</Chip>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-black text-white">{l.calories} cal</span>
                        <button onClick={() => del(l.id)} className="press text-red-400 text-xs font-black">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {mealLogs.length === 0 && !isOpen && (
                <div className="text-center py-3 text-[10px] text-slate-500 font-bold">No {m.label.toLowerCase()} logged yet</div>
              )}

              {/* ADD FORM */}
              {isOpen && (
                <form onSubmit={(e) => addFood(e, m.key)} className="grid gap-3 mt-3 pt-3 border-t border-slate-800">
                  {/* Quick pick chips */}
                  <div>
                    <p className="text-[10px] font-black text-slate-400 mb-1.5">⚡ QUICK PICK:</p>
                    <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
                      {QUICK_FOODS.slice(0, 10).map((q, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => pick(q)}
                          className="press shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-emerald-500/40 text-[10px] font-bold text-slate-300 whitespace-nowrap"
                        >
                          {q.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    placeholder="Food name"
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-emerald-500"
                  />
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <p className="text-[9px] font-black text-slate-500 mb-1">CAL</p>
                      <input type="number" value={cal} onChange={(e) => setCal(e.target.value)} placeholder="0" className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-green-500 mb-1">P (g)</p>
                      <input type="number" value={pro} onChange={(e) => setPro(e.target.value)} placeholder="0" className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-green-500" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-blue-500 mb-1">C (g)</p>
                      <input type="number" value={carb} onChange={(e) => setCarb(e.target.value)} placeholder="0" className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-amber-500 mb-1">F (g)</p>
                      <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="0" className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-amber-500" />
                    </div>
                  </div>
                  <GradButton type="submit" gradient="from-emerald-500 to-green-600" className="w-full py-3 text-sm">
                    💾 Save {m.label}
                  </GradButton>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}