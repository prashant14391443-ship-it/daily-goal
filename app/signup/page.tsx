"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
    } else {
      // Since email confirmation is disabled, user is logged in automatically.
      // Redirect them straight to your dashboard or home page:
      router.push("/"); 
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
      <form onSubmit={handleSignup} className="bg-slate-900 p-8 rounded-lg w-full max-w-md flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-center mb-4">Create Account</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="p-3 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-blue-500" />
        <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required className="p-3 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-blue-500" />
        <button type="submit" disabled={loading} className="p-3 rounded bg-blue-600 font-semibold hover:bg-blue-500 disabled:opacity-50">
          {loading ? "Creating..." : "Sign Up"}
        </button>
        <p className="text-center text-sm text-slate-400">
          Already have an account? <Link href="/login" className="text-blue-400 hover:underline">Login</Link>
        </p>
      </form>
    </main>
  );
}