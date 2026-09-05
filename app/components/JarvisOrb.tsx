"use client";

import { Mic, Loader2, Volume2, AlertCircle } from "lucide-react";
import type { VoiceState } from "../hooks/jarvisVoice";

interface JarvisOrbProps {
  state: VoiceState;
  onClick: () => void;
}

export function JarvisOrb({ state, onClick }: JarvisOrbProps) {
  const getStateStyles = () => {
    switch (state) {
      case "listening":
        return "bg-gradient-to-br from-red-500 to-rose-600 shadow-[0_0_18px_rgba(239,68,68,0.5)]";
      case "thinking":
        return "bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-[0_0_18px_rgba(139,92,246,0.5)]";
      case "speaking":
        return "bg-gradient-to-br from-emerald-500 to-green-600 shadow-[0_0_18px_rgba(16,185,129,0.5)]";
      case "error":
        return "bg-gradient-to-br from-amber-500 to-orange-600";
      default:
        return "bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-900/30";
    }
  };

  const getIcon = () => {
    switch (state) {
      case "listening":
        return <Mic className="w-5 h-5 text-white animate-pulse" />;
      case "thinking":
        return <Loader2 className="w-5 h-5 text-white animate-spin" />;
      case "speaking":
        return <Volume2 className="w-5 h-5 text-white animate-pulse" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-white" />;
      default:
        return <Mic className="w-5 h-5 text-white" />;
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${getStateStyles()}`}
      aria-label="Voice assistant"
    >
      {state === "listening" && (
        <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
      )}
      <span className="relative z-10 flex items-center justify-center">{getIcon()}</span>
    </button>
  );
}