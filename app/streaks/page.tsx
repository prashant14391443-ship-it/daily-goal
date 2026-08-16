"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const CATS = [
  { id: "study", icon: "📚", label: "Study" },
  { id: "workout", icon: "🏋️", label: "Workout" },
  { id: "move", icon: "🏃", label: "Move" },
  { id: "habits", icon: "✅", label: "Habits" },
  { id: "todo", icon: "📝", label: "ToDo" },
];

export default function StreaksPage() {
  const [streaks, setStreaks] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) return;
      const { data: rows } = await supabase
        .from("streak_ledger")
        .select("category, day")
        .eq("user_id", uid);
      const byCat: Record<string, Set<string>> = {};
      (rows || []).forEach((r) => {
        if (!byCat[r.category]) byCat[r.category] = new Set();
        byCat[r.category].add(r.day);
      });
      const out: Record<string, number> = {};
      CATS.forEach((c) => {
        const days = byCat[c.id] || new Set<string>();
        let streak = 0;
        const cursor = new Date();
        if (!days.has(toLocalISO(cursor))) cursor.setDate(cursor.getDate() - 1);
        while (days.has(toLocalISO(cursor))) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        }
        out[c.id] = streak;
      });
      setStreaks(out);
    };
    load();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">🔥 Your Streaks</h1>
      <div className="grid gap-3 max-w-md">
        {CATS.map((c) => (
          <div
            key={c.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between"
          >
            <p className="font-bold">
              {c.icon} {c.label}
            </p>
            <p className="text-orange-400 font-black">
              {streaks[c.id] || 0} {streaks[c.id] === 1 ? "day" : "days"} 🔥
            </p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-500 mt-4">
        🔒 Streaks lock in the moment you complete — deleting a task never removes earned streaks!
      </p>
    </main>
  );
}