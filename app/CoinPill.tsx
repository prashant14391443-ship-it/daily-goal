"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createPortal } from "react-dom";

function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 988;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.start(t);
    osc.stop(t + 0.4);
  } catch {
    // no audio
  }
}

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
        beep();
        setFly(`+${gained} 🪙`);
        setTimeout(() => setFly(""), 2200);
      }
    };
    window.addEventListener("dg-coins", on);
    return () => window.removeEventListener("dg-coins", on);
  }, []);

  const rank =
    coins >= 1000 ? "🦸 Hero" : coins >= 500 ? "🥇 Gold" : coins >= 100 ? "🥈 Silver" : "🥉 Bronze";

  return (
    <>
      {fly &&
        createPortal(
          <div className="fixed inset-x-0 top-1/3 z-[120] flex justify-center pointer-events-none">
            <p className="text-5xl font-black text-amber-400 animate-bounce drop-shadow-2xl">
              {fly}
            </p>
          </div>,
          document.body
        )}
      <span className="bg-fuchsia-600/40 border border-fuchsia-400/50 text-fuchsia-100 px-3 py-1 rounded-lg text-xs font-bold">
        🪙 {coins} • {rank}
      </span>
    </>
  );
}