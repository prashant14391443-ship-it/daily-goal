"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// 📴 Synchronous cached-session check — works with zero network
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
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const cached = hasCachedSession();
    setHasSession(cached);
    setReady(true);

    if (cached) {
      // Logged in → go straight to dashboard (no intermediate screens)
      if (navigator.onLine) {
        supabase.auth
          .getSession()
          .then(({ data }) => {
            if (data.session) router.replace("/dashboard");
            else setHasSession(false); // session expired → show landing
          })
          .catch(() => router.replace("/dashboard"));
      } else {
        router.replace("/dashboard");
      }
    }
  }, [router]);

  // 🎯 FIRST PAINT (server HTML + pre-decision): neutral dark screen with your icon.
  // No Login/Sign Up flash, no "Opening your dashboard..." text — feels like the splash continuing.
  if (!ready || hasSession) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <img src="/icon.svg" alt="" draggable={false} className="w-28 h-28 select-none" />
      </main>
    );
  }

  // Logged-out users only, after decision: the landing page
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