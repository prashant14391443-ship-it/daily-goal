"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPass, setNewPass] = useState("");
  const [mode, setMode] = useState<"login" | "reset" | "newpass">("login");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      if (window.location.hash.includes("type=recovery")) {
        setMode("newpass");
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/dashboard");
    };
    check();
  }, [router]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else router.replace("/dashboard");
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/login",
    });
    setMsg(
      error
        ? error.message
        : "📧 Reset link sent! Open your email on this device."
    );
  };

  const setNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // FIXED: Changed updatePassword to updateUser
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) setError(error.message);
    else {
      setMsg("✅ Password updated! Now login.");
      setMode("login");
    }
  };

  const inputCls =
    "w-full p-3 rounded bg-slate-800 border border-slate-700 text-white placeholder-slate-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-xl p-8">
        <h1 className="text-3xl font-bold text-center mb-2">🎯 DAILY GOAL</h1>
        <p className="text-slate-400 text-center text-sm mb-6">
          {mode === "login" && "Welcome back!"}
          {mode === "reset" && "Enter your email to reset password"}
          {mode === "newpass" && "Set your new password"}
        </p>

        {msg && (
          <p className="text-green-400 text-sm bg-green-600/10 border border-green-500/30 rounded p-3 mb-4">
            {msg}
          </p>
        )}
        {error && (
          <p className="text-red-400 text-sm bg-red-600/10 border border-red-500/30 rounded p-3 mb-4">
            ❌ {error}
          </p>
        )}

        {mode === "login" && (
          <form onSubmit={login} className="grid gap-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className={inputCls}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className={inputCls}
            />
            <button className="py-3 rounded bg-blue-600 hover:bg-blue-500 font-semibold">
              🔓 Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMsg("");
                setError("");
                setMode("reset");
              }}
              className="text-sm text-slate-400 hover:text-white underline"
            >
              Forgot password?
            </button>
            <p className="text-sm text-slate-400 text-center">
              New here?{" "}
              <Link href="/signup" className="text-blue-400 underline">
                Create account
              </Link>
            </p>
          </form>
        )}

        {mode === "reset" && (
          <form onSubmit={sendReset} className="grid gap-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              required
              className={inputCls}
            />
            <button className="py-3 rounded bg-blue-600 hover:bg-blue-500 font-semibold">
              📧 Send Reset Link
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-sm text-slate-400 hover:text-white"
            >
              ← Back to login
            </button>
          </form>
        )}

        {mode === "newpass" && (
          <form onSubmit={setNew} className="grid gap-4">
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="New password (min 6 characters)"
              required
              minLength={6}
              className={inputCls}
            />
            <button className="py-3 rounded bg-green-600 hover:bg-green-500 font-semibold">
              ✅ Save New Password
            </button>
          </form>
        )}
      </div>
    </main>
  );
}