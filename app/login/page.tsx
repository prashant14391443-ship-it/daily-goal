"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconTile, GradButton } from "@/app/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPass, setNewPass] = useState("");
  const [mode, setMode] = useState<"login" | "reset" | "newpass">("login");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else router.replace("/dashboard");
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/login",
    });
    setLoading(false);
    setMsg(
      error ? error.message : "📧 Reset link sent! Open your email on this device."
    );
  };

  const setNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setLoading(false);
    if (error) setError(error.message);
    else {
      setMsg("✅ Password updated! Now login.");
      setMode("login");
    }
  };

  const inputCls =
    "w-full p-3.5 pl-11 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm outline-none focus:border-violet-500 focus:bg-slate-800 transition-all";

  const titles = {
    login: { emoji: "🔓", title: "Welcome Back", sub: "Sign in to continue your streak" },
    reset: { emoji: "📧", title: "Reset Password", sub: "We'll email you a link" },
    newpass: { emoji: "🔑", title: "New Password", sub: "Choose something strong" },
  };
  const t = titles[mode];

  return (
    <main className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* 🌆 FULL-SCREEN GRADIENT BG */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-indigo-700 to-blue-800" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-fuchsia-500/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl" />

      {/* GLASS CARD */}
      <div className="relative w-full max-w-md bg-slate-950/70 backdrop-blur-2xl border border-white/10 rounded-3xl p-7 shadow-2xl">
        {/* LOGO + TITLE */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-xl shadow-amber-900/30 mb-4">
            <span className="text-3xl">🎯</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">{t.title}</h1>
          <p className="text-xs text-white/60 font-semibold">{t.sub}</p>
        </div>

        {/* MESSAGES */}
        {msg && (
          <div className="mb-4 bg-emerald-500/15 border border-emerald-400/40 rounded-xl p-3 flex items-start gap-2">
            <span className="text-emerald-300 text-sm">✅</span>
            <p className="text-xs font-semibold text-emerald-200 flex-1">{msg}</p>
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-500/15 border border-red-400/40 rounded-xl p-3 flex items-start gap-2">
            <span className="text-red-300 text-sm">❌</span>
            <p className="text-xs font-semibold text-red-200 flex-1">{error}</p>
          </div>
        )}

        {/* LOGIN */}
        {mode === "login" && (
          <form onSubmit={login} className="grid gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">📧</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className={inputCls}
              />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔒</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className={inputCls}
              />
            </div>
            <GradButton
              type="submit"
              gradient="from-violet-600 to-indigo-600"
              disabled={loading}
              className="w-full py-3.5 text-sm mt-1"
            >
              {loading ? "Signing in..." : "🔓 Login"}
            </GradButton>

            <button
              type="button"
              onClick={() => { setMsg(""); setError(""); setMode("reset"); }}
              className="press text-xs text-white/60 hover:text-white font-semibold mt-2"
            >
              Forgot password?
            </button>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] font-black text-white/40">OR</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <Link
              href="/signup"
              className="press w-full py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-black text-center hover:bg-white/15 transition-all"
            >
              ✨ Create new account
            </Link>
          </form>
        )}

        {/* RESET */}
        {mode === "reset" && (
          <form onSubmit={sendReset} className="grid gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">📧</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                required
                className={inputCls}
              />
            </div>
            <GradButton
              type="submit"
              gradient="from-amber-500 to-orange-600"
              disabled={loading}
              className="w-full py-3.5 text-sm"
            >
              {loading ? "Sending..." : "📧 Send Reset Link"}
            </GradButton>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="press text-xs text-white/60 hover:text-white font-semibold mt-2"
            >
              ← Back to login
            </button>
          </form>
        )}

        {/* NEW PASSWORD */}
        {mode === "newpass" && (
          <form onSubmit={setNew} className="grid gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔑</span>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="New password (min 6 characters)"
                required
                minLength={6}
                className={inputCls}
              />
            </div>
            <GradButton
              type="submit"
              gradient="from-emerald-500 to-green-600"
              disabled={loading}
              className="w-full py-3.5 text-sm"
            >
              {loading ? "Saving..." : "✅ Save New Password"}
            </GradButton>
          </form>
        )}

        {/* FOOTER MOTIVATION */}
        <div className="mt-6 pt-5 border-t border-white/10 text-center">
          <p className="text-[10px] font-black text-white/50">
            💪 Small daily wins = big life changes
          </p>
        </div>
      </div>
    </main>
  );
}