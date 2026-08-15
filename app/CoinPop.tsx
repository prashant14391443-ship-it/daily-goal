"use client";

import { useEffect, useState } from "react";
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

export default function CoinPop() {
  const [fly, setFly] = useState("");

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as { total: number; earned: number };
      if (d.earned > 0) {
        beep();
        setFly(`+${d.earned} 🪙`);
        setTimeout(() => setFly(""), 2200);
      }
    };
    window.addEventListener("dg-coins", on);
    return () => window.removeEventListener("dg-coins", on);
  }, []);

  if (!fly) return null;
  return createPortal(
    <div className="fixed inset-x-0 top-1/3 z-[120] flex justify-center pointer-events-none">
      <p className="text-5xl font-black text-amber-400 animate-bounce drop-shadow-2xl">{fly}</p>
    </div>,
    document.body
  );
}