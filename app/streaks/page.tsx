"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { IconTile, Chip } from "@/app/components/ui";

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const CATS = [
  { id: "study", icon: "📚", label: "Study", grad: "from-blue-500 to-indigo-600", border: "border-blue-500/30", ring: "#3b82f6" },
  { id: "workout", icon: "🏋️", label: "Workout", grad: "from-green-500 to-emerald-600", border: "border-green-500/30", ring: "#10b981" },
  { id: "move", icon: "🏃", label: "Move", grad: "from-cyan-500 to-teal-600", border: "border-cyan-500/30", ring: "#06b6d4" },
  { id: "habits", icon: "✅", label: "Habits", grad: "from-violet-500 to-purple-600", border: "border-violet-500/30", ring: "#a855f7" },
  { id: "todo", icon: "📝", label: "ToDo", grad: "from-amber-500 to-orange-600", border: "border-amber-500/30", ring: "#f59e0b" },
];

export default function StreaksPage() {
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) { setLoading(false); return; }
      const { data: rows } = await supabase
        .from("streak_ledger").select("category, day").eq("user_id", uid);
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
      setLoading(false);
    };
    load();
  }, []);

  const total = Object.values(streaks).reduce((a, b) => a + b, 0);
  const activeCount = Object.values(streaks).filter((s) => s > 0).length;
  const best = Object.entries(streaks).reduce(
    (acc, [cat, val]) => (val > acc.val ? { cat, val } : acc),
    { cat: "", val: 0 }
  );
  const bestCat = CATS.find((c) => c.id === best.cat);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 FIRE HERO */}
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 p-5 shadow-2xl shadow-orange-900/40">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-yellow-300/20 rounded-full blur-3xl" />
        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-rose-400/20 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="relative shrink-0">
            <span className="absolute inset-0 animate-pulse rounded-xl bg-yellow-300/30 blur-md" />
            <span className="relative w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-lg">🔥</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight">Your Streaks</h1>
            <p className="text-[10px] text-white/80 font-semibold">
              {activeCount} active • {total} total days
            </p>
          </div>
          {activeCount > 0 && (
            <div className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-xs font-black text-white border border-white/20">
              🏆 {total}🔥
            </div>
          )}
        </div>
      </div>

      {/* 🏆 BEST STREAK CARD */}
      {!loading && best.val > 0 && bestCat && (
        <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-2 border-amber-500/40 p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <IconTile emoji={bestCat.icon} gradient={bestCat.grad} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-amber-300">🏆 LONGEST STREAK</p>
              <p className="text-lg font-black text-white leading-tight">{bestCat.label}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-orange-400 leading-none">{best.val}</p>
              <p className="text-[10px] text-amber-300 font-bold">{best.val === 1 ? "day" : "days"} 🔥</p>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 STREAK CARDS */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-2 animate-bounce">🔥</p>
          <p className="text-slate-400 text-sm">Counting your flames...</p>
        </div>
      ) : (
        <div className="grid gap-3 mb-5">
          {CATS.map((c) => {
            const val = streaks[c.id] || 0;
            const active = val > 0;
            return (
              <div
                key={c.id}
                className={`press bg-slate-900 border-2 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-lg shadow-black/30 transition-all ${
                  active
                    ? `${c.border} hover:shadow-xl`
                    : "border-slate-800 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <IconTile emoji={c.icon} gradient={`bg-gradient-to-br ${c.grad}`} />
                  <div className="min-w-0">
                    <p className="font-black text-sm text-white">{c.label}</p>
                    <p className={`text-[10px] font-bold mt-0.5 ${active ? "text-orange-300" : "text-slate-500"}`}>
                      {active ? "Streak active 🔥" : "Start today!"}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-3xl font-black leading-none ${active ? "text-orange-400" : "text-slate-600"}`}>
                    {val}
                  </p>
                  <p className={`text-[10px] font-bold mt-1 ${active ? "text-slate-400" : "text-slate-600"}`}>
                    {val === 1 ? "day" : "days"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🔒 INFO CARD */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
        <span className="shrink-0 w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-base">🔒</span>
        <div>
          <p className="text-xs font-black text-slate-300 mb-0.5">Streaks are permanent</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Streaks lock in the moment you complete — deleting a task never removes earned streaks!
          </p>
        </div>
      </div>

      <Link href="/dashboard" className="inline-block mt-6 text-sm text-slate-400 hover:text-white press font-semibold">
        ← Back to Dashboard
      </Link>
    </main>
  );
}