"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CoinPill() {
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) return;
      const { data: c } = await supabase
        .from("user_coins")
        .select("coins")
        .eq("user_id", uid)
        .maybeSingle();
      setCoins(c?.coins || 0);
    };
    load();
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as { total: number };
      setCoins(d.total);
    };
    window.addEventListener("dg-coins", on);
    return () => window.removeEventListener("dg-coins", on);
  }, []);

  const rank =
    coins >= 1000 ? "🦸 Hero" : coins >= 500 ? "🥇 Gold" : coins >= 100 ? "🥈 Silver" : "🥉 Bronze";

  return (
    <span className="bg-fuchsia-600/40 border border-fuchsia-400/50 text-fuchsia-100 px-3 py-1 rounded-lg text-xs font-bold">
      🪙 {coins} • {rank}
    </span>
  );
}