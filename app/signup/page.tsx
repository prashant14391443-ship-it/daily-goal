"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Target, Mail, Lock, Eye, EyeOff, Sparkles, Flame, Trophy, ArrowRight, Check } from "lucide-react";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
    } else {
      router.push("/");
    }
    setLoading(false);
  };

  // Password strength
  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ["", "Weak", "Good", "Strong"][strength];
  const strengthColor = ["bg-slate-700", "bg-red-500", "bg-amber-500", "bg-emerald-500"][strength];

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Ambient gradient blobs */}
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
        <form
          onSubmit={handleSignup}
          className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl shadow-black/40"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-1">Create your account</h2>
            <p className="text-sm text-slate-400">Free forever. No credit card needed.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 flex items-start gap-2">
              <span className="text-red-400 text-xs font-bold mt-0.5">!</span>
              <p className="text-red-300 text-sm font-medium flex-1">{error}</p>
            </div>
          )}

          {/* Email */}
          <div className="mb-3">
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPass ? "text" : "password"}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full pl-10 pr-12 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
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
            {password.length > 0 && (
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

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating your account...
              </>
            ) : (
              <>
                Create account
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {/* Login link */}
          <p className="text-center text-sm text-slate-400 mt-5">
            Already have an account?{" "}
            <Link href="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
              Log in
            </Link>
          </p>
        </form>

        {/* Value props */}
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

        {/* Trust */}
        <p className="text-center text-[10px] text-slate-600 mt-6 font-medium">
          <Check size={10} className="inline mr-1" />
          Free forever • No credit card • Cancel anytime
        </p>
      </div>
    </main>
  );
}