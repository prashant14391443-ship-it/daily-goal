"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/dashboard");
      } else {
        setChecked(true);
      }
    };
    check();
  }, [router]);

  if (!checked)
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400 text-sm animate-pulse">🎯 Loading Daily Goal...</p>
      </main>
    );

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
          className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 font-bold text-center hover:opacity-90 transition-opacity press shadow-lg shadow-violet-500/20"
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

      <div className="fixed bottom-8 text-xs text-slate-600">
        Built with 💜 for students
      </div>
    </main>
  );
}