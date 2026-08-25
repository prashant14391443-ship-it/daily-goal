"use client";
import React from "react";

// 🎨 Progress Ring (SVG)
export function ProgressRing({
  pct, size = 56, stroke = 5, color, track = "rgba(255,255,255,0.08)",
}: { pct: number; size?: number; stroke?: number; color: string; track?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        transform={`rotate(90 ${size / 2} ${size / 2})`} className="fill-white text-[10px] font-black">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

// 🎨 Gradient Icon Tile
export function IconTile({ emoji, gradient, size = "md" }: { emoji: string; gradient: string; size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "w-8 h-8 text-base" : size === "lg" ? "w-12 h-12 text-2xl" : "w-10 h-10 text-xl";
  return <div className={`${s} rounded-xl ${gradient} flex items-center justify-center shadow-lg`}>{emoji}</div>;
}

// 🎨 Card wrapper
export function SectionCard({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`bg-slate-900 rounded-2xl border border-slate-800 shadow-lg shadow-black/30 ${onClick ? "press cursor-pointer hover:border-slate-700 transition-colors" : ""} ${className}`}>
      {children}
    </div>
  );
}

// 🎨 Card title with icon tile
export function CardTitle({ emoji, gradient, title, action }: { emoji: string; gradient: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-black flex items-center gap-2">
        <IconTile emoji={emoji} gradient={gradient} size="sm" />
        {title}
      </h3>
      {action}
    </div>
  );
}

// 🎨 Gradient button
export function GradButton({ children, gradient, onClick, type = "button", className = "", disabled }: {
  children: React.ReactNode; gradient: string; onClick?: () => void; type?: "button" | "submit"; className?: string; disabled?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`press rounded-xl bg-gradient-to-r ${gradient} font-black text-white shadow-lg disabled:opacity-40 ${className}`}>
      {children}
    </button>
  );
}

// 🎨 Empty state with personality
export function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="text-center py-6">
      <p className="text-3xl mb-2">{emoji}</p>
      <p className="text-slate-500 text-sm">{text}</p>
    </div>
  );
}

// 🎨 Streak / badge chip
export function Chip({ children, color = "orange" }: { children: React.ReactNode; color?: "orange" | "green" | "violet" | "amber" }) {
  const map = {
    orange: "bg-orange-500/20 border-orange-500/40 text-orange-300",
    green: "bg-green-500/20 border-green-500/40 text-green-300",
    violet: "bg-violet-500/20 border-violet-500/40 text-violet-300",
    amber: "bg-amber-500/20 border-amber-500/40 text-amber-300",
  };
  return <span className={`inline-flex items-center gap-1 border text-[10px] font-black px-2 py-0.5 rounded-full ${map[color]}`}>{children}</span>;
}