"use client";

import MoveTracker from "../MoveTracker";

export default function MovePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">🏃 Move Tracker</h1>
      <MoveTracker />
    </main>
  );
}