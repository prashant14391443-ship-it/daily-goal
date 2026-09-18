"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// 📴 Synchronous cached-session check — works with ZERO network, zero waiting
function hasCachedSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          const token = parsed?.access_token || parsed?.currentSession?.access_token;
          if (token) return true;
        }
      }
    }
  } catch {}
  return false;
}

export default function Home() {
  const router = useRouter();
  // Decided SYNCHRONOUSLY during first render → SSR HTML is already the final UI
  const [cached] = useState(() =>
    typeof window !== "undefined" ? hasCachedSession() : false
  );

  useEffect(() => {
    if (!cached) return;
    let alive = true;
    if (navigator.onLine) {
      // Online: verify session is still valid, then go
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (alive && data.session) router.replace("/dashboard");
        })
        .catch(() => {});
    } else {
      // 📴 Offline: trust the cached session — dashboard will show cached data
      router.replace("/dashboard");
    }
    return () => {
      alive = false;
    };
  }, [cached, router]);

  // Logged-in: brief redirect notice (never an infinite gate)
  if (cached) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400 text-sm animate-pulse">🎯 Opening your dashboard...</p>
      </main>
    );
  }

  // Logged-out: landing page renders INSTANTLY (this exact HTML is what SSR sends)
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <p className="text-6xl mb-4">🎯</p>
        <h1 className="text-5xl font-black">
          DAILY <span className="t-grad">GOAL</span>
        </h1>
        <p className="text-slate-400 text-center mt-4 max-w-sm">
          Your productivity dashboard for study, gym and habits.
        </p>
      </div>

      <div className="flex gap-3 w-full max-w-xs">
        <Link
          href="/login"
          className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-violet-600 px-5 py-3 font-bold text-center hover:opacity-90 transition-opacity press shadow-lg shadow-violet-500/20"
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-5 py-3 font-bold text-center hover:bg-slate-700 transition-colors press"
        >
          Sign Up
        </Link>
      </div>

      <nav className="flex flex-wrap gap-4 justify-center text-sm text-slate-400">
        <Link href="/pricing" className="hover:text-white transition-colors">
          Pricing
        </Link>
      </nav>

      <div className="fixed bottom-8 text-xs text-slate-600">Built with 💜 for students</div>
    </main>
  );
}