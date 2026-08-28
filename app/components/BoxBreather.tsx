"use client";
import { useEffect, useState } from "react";
import { Wind, X } from "lucide-react";

const PHASES = [
  { name: "Inhale", scale: 1.25 },
  { name: "Hold", scale: 1.25 },
  { name: "Exhale", scale: 0.8 },
  { name: "Hold", scale: 0.8 },
];

export default function BoxBreather({
  seconds = 60,
  autoStart = false,
  onDone,
  onCancel,
}: {
  seconds?: number;
  autoStart?: boolean;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [running, setRunning] = useState(autoStart);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, [running]);

  useEffect(() => {
    if (tick > 0 && tick >= seconds) {
      setRunning(false);
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, seconds]);

  const cyclePos = tick % 16;
  const phaseIdx = Math.floor(cyclePos / 4);
  const count = 4 - (cyclePos % 4);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6">
      <button
        onClick={() => { setRunning(false); onCancel?.(); }}
        className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
      >
        <X size={18} />
      </button>
      <p className="text-xs font-black text-indigo-400 mb-6 flex items-center gap-1.5"><Wind size={14} /> CALM WARM-UP • {Math.max(0, seconds - tick)}s</p>
      <div className="relative w-48 h-48 flex items-center justify-center mb-4">
        <div className="absolute inset-0 rounded-full bg-indigo-500/10" />
        <div
          className="w-32 h-32 rounded-full bg-indigo-500/30 border-2 border-indigo-400/50 flex items-center justify-center"
          style={{
            transform: `scale(${running ? PHASES[phaseIdx].scale : 1})`,
            transition: "transform 4s ease-in-out",
          }}
        >
          <span className="text-center">
            <span className="block text-sm font-black text-white">{running ? PHASES[phaseIdx].name : "Ready"}</span>
            {running && <span className="block text-2xl font-black text-indigo-300">{count}</span>}
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-400">{running ? "Follow the circle…" : tick > 0 ? "✨ Calmed. Ready to focus." : "Tap start to calm your nervous system"}</p>
      {!running && tick === 0 && (
        <button onClick={() => setRunning(true)} className="mt-6 px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-black">Start</button>
      )}
    </div>
  );
}