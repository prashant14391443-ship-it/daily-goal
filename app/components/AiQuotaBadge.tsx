"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Quota = { used: number; limit: number; left: number; guest?: boolean };

export default function AiQuotaBadge() {
  const [quota, setQuota] = useState<Quota | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { if (mounted) setQuota(null); return; }
      try {
        const res = await fetch("/api/ai/quota", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const j = await res.json(); if (mounted) setQuota(j); }
      } catch {}
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  if (!quota) return null;

  if (quota.guest) {
    return (
      <Link
        href="/signup"
        className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-[10px] font-bold text-amber-300 backdrop-blur-sm"
      >
        <Lock size={11} /> Guest — sign up for AI
      </Link>
    );
  }

  const pct = Math.min(100, (quota.used / quota.limit) * 100);
  const isLow = quota.left <= 5;
  return (
    <div
      className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[10px] font-bold text-slate-300 backdrop-blur-sm"
      title={`${quota.left} AI units left today`}
    >
      <Sparkles size={11} className={isLow ? "text-amber-400" : "text-violet-400"} />
      <span className={isLow ? "text-amber-400" : "text-slate-200"}>{quota.left}</span>
      <span className="text-slate-500">/ {quota.limit}</span>
      <div className="w-10 h-1 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${isLow ? "bg-amber-500" : "bg-gradient-to-r from-violet-500 to-indigo-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}