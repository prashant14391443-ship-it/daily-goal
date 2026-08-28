"use client";
import Link from "next/link";
import { Dumbbell, Camera, Target, Footprints, Satellite } from "lucide-react";

export default function GymHub() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-16 pb-24 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center">
            <Dumbbell size={22} strokeWidth={2.2} />
          </span>
          <h1 className="text-2xl font-black text-white" style={{ whiteSpace: "nowrap" }}>Gym</h1>
        </div>
        <p className="text-[11px] text-slate-500 font-semibold mt-2">Choose your tool</p>
      </div>

      {/* CALM CARDS */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/workout" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="w-9 h-9 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center mb-4">
            <Dumbbell size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">Workout Log</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Add workouts, tick & build streaks</p>
        </Link>

        <Link href="/calorie" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
            <Camera size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">Calorie Scanner</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Photo of food → instant calories</p>
        </Link>

        <Link href="/calculator" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
            <Target size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">Goal Calculator</p>
          <p className="text-[10px] text-slate-500 mt-0.5">BMR, TDEE & daily calorie plan</p>
        </Link>

        <Link href="/running" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
            <Footprints size={18} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">Running Calculator</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Speed, pace & race predictions</p>
        </Link>

             <Link href="/move" className="press bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors col-span-2">
        <div className="w-11 h-11 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-6">
          <Dumbbell size={20} />
        </div>
        <p className="font-bold text-green-400 text-sm leading-tight">Auto Tracker</p>
        <p className="text-xs text-slate-400 mt-1">GPS: walk, run, ride, hike — auto calories!</p>
      </Link>
      </div>
    </main>
  );
}