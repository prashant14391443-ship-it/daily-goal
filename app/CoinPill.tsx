"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CoinPill() {
  const [coins, setCoins] = useState(0);
  const [fly, setFly] = useState("");
  const prevRef = useRef(0);

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
      prevRef.current = c?.coins || 0;
      setCoins(c?.coins || 0);
    };
    load();
    const on = (e: Event) => {
      const total = (e as CustomEvent).detail as number;
      const gained = total - prevRef.current;
      prevRef.current = total;
      setCoins(total);
      if (gained > 0) {
        setFly(`+${gained} 🪙`);
        setTimeout(() => setFly(""), 2000);
      }
    };
    window.addEventListener("dg-coins", on);
    return () => window.removeEventListener("dg-coins", on);
  }, []);

  const rank =
    coins >= 1000 ? "🦸 Hero" : coins >= 500 ? "🥇 Gold" : coins >= 100 ? "🥈 Silver" : "🥉 Bronze";

  return (
    <span className="relative order-last ml-2 flex items-center gap-1 bg-amber-500/20 border border-amber-400/50 text-amber-300 px-2 py-0.5 rounded-lg text-xs font-black">
      {fly && (
        <span className="absolute -top-7 right-0 text-lg font-black text-amber-400 animate-bounce drop-shadow-lg whitespace-nowrap">
          {fly}
        </span>
      )}
      🪙 {coins} • {rank}
    </span>
  );
}