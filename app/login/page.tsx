"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Target, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Check, Key, Flame, Trophy, Sparkles, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPass, setNewPass] = useState("");
  const [showPass, setShowPass] = useState(false);
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
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("unconfirmed")) {
        setError("📬 Please check your email and click the confirmation link first, then log in again.");
      } else {
        setError(error.message);
      }
    }
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
      error ? error.message : "Reset link sent! Open your email on this device."
    );
  };

  const setNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setLoading(false);
    if (error) setError(error.message);
    else {
      setMsg("Password updated! Now log in.");
      setMode("login");
      setNewPass("");
    }
  };

  // Password strength (for newpass mode)
  const strength = newPass.length === 0 ? 0 : newPass.length < 6 ? 1 : newPass.length < 10 ? 2 : 3;
  const strengthLabel = ["", "Weak", "Good", "Strong"][strength];
  const strengthColor = ["bg-slate-700", "bg-red-500", "bg-amber-500", "bg-emerald-500"][strength];

  const titles = {
    login: { title: "Welcome back", sub: "Sign in to continue your streak", icon: Lock, color: "text-violet-400" },
    reset: { title: "Reset password", sub: "We'll email you a secure link", icon: Mail, color: "text-amber-400" },
    newpass: { title: "New password", sub: "Choose something strong (min 6 chars)", icon: Key, color: "text-emerald-400" },
  };
  const t = titles[mode];
  const TitleIcon = t.icon;

  const inputCls =
    "w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder:text-slate-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Ambient gradient blobs (match signup) */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-900/30">
            <Target size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1">
            Daily<span className="text-violet-400">Goal</span>
          </h1>
          <p className="text-sm text-slate-400 font-medium">Build the life you want, one day at a time</p>
        </div>

        {/* Form card */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl shadow-black/40">
          {/* Mode header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
              <TitleIcon size={20} className={t.color} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white mb-0.5">{t.title}</h2>
              <p className="text-xs text-slate-400 font-medium">{t.sub}</p>
            </div>
          </div>

          {/* Messages */}
          {msg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 mb-4 flex items-start gap-2">
              <Check size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-emerald-300 font-medium flex-1">{msg}</p>
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300 font-medium flex-1">{error}</p>
            </div>
          )}
          {error && error.includes("confirmation link") && (
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                const { error } = await supabase.auth.resend({ type: "signup", email });
                setLoading(false);
                if (!error) setMsg("✅ Confirmation email resent! Check your inbox.");
                else setError(error.message);
              }}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/20 transition-colors mb-4 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Resend confirmation email"}
            </button>
          )}

          {/* LOGIN MODE */}
          {mode === "login" && (
            <form onSubmit={login} className="grid gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className={`${inputCls} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setMsg(""); setError(""); setMode("reset"); }}
                  className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30 mt-1"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Log in
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-wide">or</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              <Link
                href="/signup"
                className="w-full py-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 hover:bg-slate-800 text-slate-200 text-sm font-bold text-center transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={15} />
                Create new account
              </Link>
            </form>
          )}

          {/* RESET MODE */}
          {mode === "reset" && (
            <form onSubmit={sendReset} className="grid gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className={inputCls}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-900/30 mt-1"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send reset link
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setMsg(""); setError(""); setMode("login"); }}
                className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-semibold transition-colors mt-2"
              >
                <ArrowLeft size={12} />
                Back to login
              </button>
            </form>
          )}

          {/* NEW PASSWORD MODE */}
          {mode === "newpass" && (
            <form onSubmit={setNew} className="grid gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">New password</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={`${inputCls} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {newPass.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      <div className={`h-1 flex-1 rounded-full ${strength >= 1 ? strengthColor : "bg-slate-700"}`} />
                      <div className={`h-1 flex-1 rounded-full ${strength >= 2 ? strengthColor : "bg-slate-700"}`} />
                      <div className={`h-1 flex-1 rounded-full ${strength >= 3 ? strengthColor : "bg-slate-700"}`} />
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold">{strengthLabel}</p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 mt-1"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save new password
                    <Check size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Value props */}
        {mode === "login" && (
          <div className="mt-6 grid grid-cols-3 gap-2">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center">
              <Flame size={18} className="mx-auto mb-1.5 text-orange-400" />
              <p className="text-[10px] font-semibold text-slate-300">Build streaks</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center">
              <Trophy size={18} className="mx-auto mb-1.5 text-amber-400" />
              <p className="text-[10px] font-semibold text-slate-300">Earn badges</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center">
              <Sparkles size={18} className="mx-auto mb-1.5 text-violet-400" />
              <p className="text-[10px] font-semibold text-slate-300">AI coach</p>
            </div>
          </div>
        )}

        {/* Trust footer */}
        <p className="text-center text-[10px] text-slate-600 mt-6 font-medium">
          <Check size={10} className="inline mr-1" />
          Free forever • Your data is private & secure
        </p>
      </div>
    </main>
  );
}