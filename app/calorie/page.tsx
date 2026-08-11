"use client";

import { useState } from "react";
import Link from "next/link";

type Result = {
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  advice: string;
};

export default function CaloriePage() {
  const [img, setImg] = useState<string | null>(null);
  const [details, setDetails] = useState(""); // State for manual context
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => setImg(String(reader.result));
    reader.readAsDataURL(f);
  };

  const analyze = async () => {
    if (!img) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/calorie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send both the image and the manual details to the backend
        body: JSON.stringify({ image: img, details }), 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      setResult(data);
    } catch {
      setError("Could not analyze. Try a clearer, closer photo.");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-xl">📷</span>
          Calorie Scanner
        </h1>
        <p className="text-slate-400">Snap any food → get calories instantly</p>
      </div>

      <label className="block bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-red-500 mb-4 transition-colors">
        <span className="text-4xl">📷</span>
        <p className="mt-2 font-semibold">Tap to take / choose food photo</p>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
          className="hidden"
        />
      </label>

      {img && (
        <div className="mb-6 animate-in fade-in duration-300">
          <img
            src={img}
            alt="food"
            className="rounded-xl max-h-72 w-full object-cover mb-4 border border-slate-700"
          />
          
          {/* New optional manual input field */}
          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-1">
              Help the AI (Optional)
            </label>
            <input
              type="text"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="e.g., 200g of rice, 1 tbsp olive oil..."
              className="w-full p-3 rounded bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <button
            onClick={analyze}
            disabled={loading}
            className="w-full py-3 rounded bg-red-600 hover:bg-red-500 font-semibold disabled:opacity-50 transition-colors"
          >
            {loading ? "🤖 AI is reading your food..." : "⚡ Analyze Calories"}
          </button>
        </div>
      )}

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {result && (
        <div className="bg-slate-900 rounded-xl p-6 grid gap-4 border border-slate-800 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-xl font-bold">🍽️ {result.food}</h3>
            <span className="text-3xl font-extrabold text-red-400">
              {result.calories} kcal
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-800 rounded p-3 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Protein</p>
              <p className="font-bold text-green-400">{result.protein}g</p>
            </div>
            <div className="bg-slate-800 rounded p-3 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Carbs</p>
              <p className="font-bold text-blue-400">{result.carbs}g</p>
            </div>
            <div className="bg-slate-800 rounded p-3 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Fat</p>
              <p className="font-bold text-yellow-400">{result.fat}g</p>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 mt-2">
            <p className="text-sm text-slate-300">💡 {result.advice}</p>
          </div>
          <p className="text-[10px] text-slate-500 text-center uppercase tracking-wider">
            Estimates for guidance only
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