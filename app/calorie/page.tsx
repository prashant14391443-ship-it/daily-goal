"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera, Zap, Lightbulb, Utensils, Sparkles } from "lucide-react";

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
  const [foodName, setFoodName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const compressImage = (file: File): Promise<string> => {
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
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const compressed = await compressImage(f);
      setImg(compressed);
    } catch {
      setError("Could not process image. Try again.");
    }
    setLoading(false);
  };

  const analyze = async () => {
    if (!img) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/calorie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: img, foodName: foodName || undefined, quantity: quantity || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not analyze. Try a clearer photo.");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 CALM HERO */}
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-red-500 via-rose-600 to-orange-600 p-5 shadow-xl shadow-rose-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center">
            <Camera size={22} strokeWidth={2.2} className="text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Calorie Scanner</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">
              Snap any food + optional details → accurate calories
            </p>
          </div>
        </div>
      </div>

      {/* 📷 UPLOAD */}
      <label className="press block bg-slate-900 border-2 border-dashed border-slate-700 hover:border-red-500/40 rounded-2xl p-8 text-center cursor-pointer transition-colors mb-4">
        <span className="w-14 h-14 mx-auto rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
          <Camera size={26} strokeWidth={2.2} />
        </span>
        <p className="mt-3 font-black text-sm text-slate-300">Tap to take / choose food photo</p>
        <input type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" disabled={loading} />
      </label>

      {img && (
        <div className="mb-5">
          <img src={img} alt="food" className="rounded-2xl max-h-72 w-full object-cover mb-4 border border-slate-800" />

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 grid gap-3">
            <p className="text-xs text-slate-500 font-black">📝 HELP AI UNDERSTAND (optional, more accurate)</p>
            <input
              type="text"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="Food name (e.g. Chicken biryani)"
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-red-500"
            />
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Quantity (e.g. 1 plate, 200g, 2 slices)"
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-red-500"
            />
          </div>

          <button
            onClick={analyze}
            disabled={loading}
            className="press w-full py-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-sm font-black text-red-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Zap size={15} />
            {loading ? "AI is reading your food..." : "Analyze Calories"}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-4">
          <p className="text-red-300 text-sm font-bold">❌ {error}</p>
        </div>
      )}

      {result && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 grid gap-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-lg font-black flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                <Utensils size={15} strokeWidth={2.2} />
              </span>
              {result.food}
            </h3>
            <span className="text-3xl font-black text-red-400">{result.calories} kcal</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 font-black mb-1">PROTEIN</p>
              <p className="font-black text-green-400">{result.protein}g</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 font-black mb-1">CARBS</p>
              <p className="font-black text-blue-400">{result.carbs}g</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 font-black mb-1">FAT</p>
              <p className="font-black text-yellow-400">{result.fat}g</p>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4">
            <p className="text-sm text-slate-300 flex items-start gap-2">
              <Lightbulb size={15} className="text-amber-400 shrink-0 mt-0.5" />
              {result.advice}
            </p>
          </div>

          <p className="text-[10px] text-slate-600 text-center font-black uppercase tracking-wider">
            Estimates for guidance only
          </p>
        </div>
      )}

      <Link href="/gym-log" className="inline-block mt-6 text-sm text-slate-500 hover:text-white press font-bold">
        ← Back to Gym
      </Link>
    </main>
  );
}