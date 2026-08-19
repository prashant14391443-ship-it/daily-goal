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
        router.replace("/dashboard"); // logged in → straight to dashboard
      } else {
        setChecked(true); // guest → show landing
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
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-5xl font-extrabold">
        DAILY <span className="text-fuchsia-400">GOAL</span>
      </h1>
      <p className="text-slate-400 text-center">
        Your productivity dashboard for study, gym and habits.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-blue-600 px-5 py-2 font-semibold hover:bg-blue-500"
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-slate-800 px-5 py-2 font-semibold hover:bg-slate-700"
        >
          Sign Up
        </Link>
      </div>
      <nav className="flex flex-wrap gap-4 justify-center text-sm text-slate-300">
        <Link href="/pricing" className="hover:text-white">Pricing</Link>
      </nav>
    </main>
  );
}