"use client";

import Link from "next/link";

export default function GymHub() {
  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-green-600/20 border border-green-500/40 flex items-center justify-center text-xl">🏋️</span>
          Gym
        </h1>
        <p className="text-slate-400">Choose your tool</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/workout"
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center hover:bg-slate-800"
        >
          <span className="text-4xl">🏋️</span>
          <h3 className="font-bold mt-3">Workout Log</h3>
          <p className="text-xs text-slate-400 mt-1">
            Add workouts, tick & build streaks
          </p>
        </Link>

        <Link
          href="/calorie"
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center hover:bg-slate-800"
        >
          <span className="text-4xl">📷</span>
          <h3 className="font-bold mt-3">Calorie Scanner</h3>
          <p className="text-xs text-slate-400 mt-1">
            Photo of food → instant calories
          </p>
        </Link>

        <Link
          href="/calculator"
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center hover:bg-slate-800"
        >
          <span className="text-4xl">🎯</span>
          <h3 className="font-bold mt-3">Goal Calculator</h3>
          <p className="text-xs text-slate-400 mt-1">
            BMR, TDEE & daily calorie plan
          </p>
        </Link>

        <Link
          href="/running"
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center hover:bg-slate-800"
        >
          <span className="text-4xl">🏃</span>
          <h3 className="font-bold mt-3">Running Calculator</h3>
          <p className="text-xs text-slate-400 mt-1">
            Speed, pace & race predictions
          </p>
        </Link>

        <Link
          href="/move"
          className="bg-slate-900 border-2 border-green-500/50 rounded-xl p-6 text-center hover:bg-slate-800"
        >
          <span className="text-4xl">🛰️</span>
          <h3 className="font-bold mt-3 text-green-400">Auto Tracker</h3>
          <p className="text-xs text-slate-400 mt-1">
            GPS: walk, run, ride, hike — Strava style!
          </p>
        </Link>
      </div>
    </main>
  );
}