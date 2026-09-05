"use client";

import { Mic, MicOff, Loader2, Volume2, AlertCircle } from "lucide-react";
import type { VoiceState } from "@/app/hooks/JarvisVoice";

interface JarvisOrbProps {
  state: VoiceState;
  transcript: string;
  onClick: () => void;
  continuousMode: boolean;
  onToggleContinuous: () => void;
}

export function JarvisOrb({ 
  state, 
  transcript, 
  onClick, 
  continuousMode,
  onToggleContinuous 
}: JarvisOrbProps) {
  
  const getOrbStyles = () => {
    switch (state) {
      case "listening":
        return "bg-gradient-to-br from-red-500 to-rose-600 shadow-[0_0_60px_rgba(239,68,68,0.6)] scale-110";
      case "thinking":
        return "bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-[0_0_60px_rgba(139,92,246,0.6)] animate-pulse";
      case "speaking":
        return "bg-gradient-to-br from-emerald-500 to-green-600 shadow-[0_0_60px_rgba(16,185,129,0.6)] scale-105";
      case "error":
        return "bg-gradient-to-br from-amber-500 to-orange-600 shadow-[0_0_60px_rgba(245,158,11,0.6)]";
      default:
        return "bg-gradient-to-br from-slate-700 to-slate-800 shadow-[0_0_30px_rgba(51,65,85,0.5)] hover:shadow-[0_0_40px_rgba(139,92,246,0.4)] hover:scale-105";
    }
  };

  const getIcon = () => {
    switch (state) {
      case "listening":
        return <Mic className="w-8 h-8 text-white animate-pulse" />;
      case "thinking":
        return <Loader2 className="w-8 h-8 text-white animate-spin" />;
      case "speaking":
        return <Volume2 className="w-8 h-8 text-white" />;
      case "error":
        return <AlertCircle className="w-8 h-8 text-white" />;
      default:
        return <Mic className="w-8 h-8 text-slate-300" />;
    }
  };

  const getStatusText = () => {
    switch (state) {
      case "listening": return "Listening...";
      case "thinking": return "Thinking...";
      case "speaking": return "Speaking...";
      case "error": return "Try again";
      default: return continuousMode ? "Continuous ON" : "Tap to speak";
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Status Text */}
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {getStatusText()}
      </p>

      {/* The Orb */}
      <button
        onClick={onClick}
        className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer group ${getOrbStyles()}`}
        aria-label={state === "listening" ? "Stop listening" : "Start listening"}
      >
        {/* Outer ring animation when listening */}
        {state === "listening" && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
            <span className="absolute inset-2 rounded-full bg-red-500/20 animate-pulse" />
          </>
        )}
        
        {/* Speaking waveform */}
        {state === "speaking" && (
          <div className="absolute inset-0 flex items-center justify-center gap-1">
            <span className="w-1 h-6 bg-white/60 rounded-full animate-[pulse_0.5s_ease-in-out_infinite]" />
            <span className="w-1 h-10 bg-white/80 rounded-full animate-[pulse_0.7s_ease-in-out_infinite]" />
            <span className="w-1 h-8 bg-white/70 rounded-full animate-[pulse_0.6s_ease-in-out_infinite]" />
            <span className="w-1 h-12 bg-white/90 rounded-full animate-[pulse_0.8s_ease-in-out_infinite]" />
            <span className="w-1 h-7 bg-white/60 rounded-full animate-[pulse_0.5s_ease-in-out_infinite]" />
          </div>
        )}

        {/* Inner core */}
        <div className="relative z-10 w-16 h-16 rounded-full bg-slate-950/80 backdrop-blur-sm flex items-center justify-center border border-white/10 group-hover:border-white/30 transition-all">
          {getIcon()}
        </div>
      </button>

      {/* Live Transcript */}
      {transcript && (
        <div className="w-full max-w-md mx-auto px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
          <p className="text-sm text-slate-200 text-center italic">
            "{transcript}"
          </p>
        </div>
      )}

      {/* Continuous Mode Toggle */}
      <button
        onClick={onToggleContinuous}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
          continuousMode
            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30"
            : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        }`}
      >
        <Volume2 className="w-3.5 h-3.5" />
        {continuousMode ? "CONTINUOUS ON" : "CONTINUOUS OFF"}
      </button>
    </div>
  );
}