"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
    }
    
    setLoading(false); // Moved here so it always resets the button state
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
      <form onSubmit={handleLogin} className="bg-slate-900 p-8 rounded-lg w-full max-w-md flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-center mb-4">Login</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="p-3 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-blue-500" />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="p-3 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-blue-500" />
        <button type="submit" disabled={loading} className="p-3 rounded bg-blue-600 font-semibold hover:bg-blue-500 disabled:opacity-50">
          {loading ? "Logging in..." : "Login"}
        </button>
        <p className="text-center text-sm text-slate-400">
          Need an account? <Link href="/signup" className="text-blue-400 hover:underline">Sign Up</Link>
        </p>
      </form>
    </main>
  );
}