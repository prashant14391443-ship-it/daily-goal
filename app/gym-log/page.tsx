"use client";
import Link from "next/link";
import { IconTile } from "@/app/components/ui";

export default function GymHub() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-16 pb-24 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <IconTile emoji="🏋️" gradient="bg-gradient-to-br from-green-500 to-emerald-600" size="lg" />
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-white leading-tight">Gym</h1>
          <p className="text-[10px] text-slate-400 font-semibold">Choose your tool</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/workout" className="press bg-slate-900 border border-green-500/30 rounded-2xl p-4 text-center shadow-lg shadow-black/30">
          <IconTile emoji="🏋️" gradient="bg-gradient-to-br from-green-500 to-emerald-600" />
          <p className="font-black text-sm mt-3 text-white">Workout Log</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Add workouts, tick & build streaks</p>
        </Link>
        <Link href="/calorie" className="press bg-slate-900 border border-amber-500/30 rounded-2xl p-4 text-center shadow-lg shadow-black/30">
          <IconTile emoji="📷" gradient="bg-gradient-to-br from-amber-500 to-orange-600" />
          <p className="font-black text-sm mt-3 text-white">Calorie Scanner</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Photo of food → instant calories</p>
        </Link>
        <Link href="/calculator" className="press bg-slate-900 border border-rose-500/30 rounded-2xl p-4 text-center shadow-lg shadow-black/30">
          <IconTile emoji="🎯" gradient="bg-gradient-to-br from-rose-500 to-red-600" />
          <p className="font-black text-sm mt-3 text-white">Goal Calculator</p>
          <p className="text-[10px] text-slate-400 mt-0.5">BMR, TDEE & daily calorie plan</p>
        </Link>
        <Link href="/running" className="press bg-slate-900 border border-blue-500/30 rounded-2xl p-4 text-center shadow-lg shadow-black/30">
          <IconTile emoji="🏃" gradient="bg-gradient-to-br from-blue-500 to-indigo-600" />
          <p className="font-black text-sm mt-3 text-white">Running Calculator</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Speed, pace & race predictions</p>
        </Link>
        <Link href="/move" className="press col-span-2 bg-slate-900 border-2 border-green-500/50 rounded-2xl p-4 text-center shadow-lg shadow-green-900/20">
          <IconTile emoji="🛰️" gradient="bg-gradient-to-br from-green-500 to-teal-600" />
          <p className="font-black text-sm mt-3 text-green-400">Auto Tracker</p>
          <p className="text-[10px] text-slate-400 mt-0.5">GPS: walk, run, ride, hike — auto calories!</p>
        </Link>
      </div>
    </main>
  );
}