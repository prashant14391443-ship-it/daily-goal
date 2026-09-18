"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function readCachedCoins(): number {
  if (typeof window === "undefined") return 0;
  try { return Number(localStorage.getItem("dg-coins-v1")) || 0; } catch { return 0; }
}

export default function CoinPill() {
  // 📴 Instant paint: last known coins from device (no 0 → 1021 flash)
  const [coins, setCoins] = useState(readCachedCoins);

  useEffect(() => {
    const save = (v: number) => {
      setCoins(v);
      try { localStorage.setItem("dg-coins-v1", String(v)); } catch {}
    };

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) return;
      const { data: c } = await supabase
        .from("user_coins")
        .select("coins")
        .eq("user_id", uid)
        .maybeSingle();
      save(c?.coins || 0);
    };
    load();

    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as { total: number };
      save(d.total);
    };
    window.addEventListener("dg-coins", on);
    return () => window.removeEventListener("dg-coins", on);
  }, []);

  const rank =
    coins >= 1000 ? "🦸 Hero" : coins >= 500 ? "🥇 Gold" : coins >= 100 ? "🥈 Silver" : "🥉 Bronze";

  return (
    <span className="bg-slate-900/80 backdrop-blur border border-amber-400/30 px-3 py-1 rounded-lg text-xs font-bold">
      🪙 {coins} • {rank}
    </span>
  );
}