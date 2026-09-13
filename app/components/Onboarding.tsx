"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { writeGoal, type GoalKey } from "@/lib/goal";
import { Code2, Target, Dumbbell, RefreshCw, Mic, ArrowRight } from "lucide-react";

const OPTIONS: { key: GoalKey; icon: any; label: string; sub: string; cta: string; href: string }[] = [
  { key: "job", icon: Code2, label: "Get a tech job", sub: "Web Dev · DSA · App Dev tracks", cta: "Browse tracks", href: "/learns" },
  { key: "exam", icon: Target, label: "Crack an exam", sub: "Mocks, PYQs & smart revision", cta: "Open Mock Tests", href: "/exam" },
  { key: "fit", icon: Dumbbell, label: "Get fit & strong", sub: "Workouts, calories & progress", cta: "Open Gym", href: "/gym-log" },
  { key: "habits", icon: RefreshCw, label: "Build daily habits", sub: "Small wins every single day", cta: "Open Habits", href: "/routine-habits" },
  { key: "english", icon: Mic, label: "Improve English", sub: "Speak with AI & real people", cta: "Practice Speaking", href: "/english" },
];

export default function Onboarding() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [picked, setPicked] = useState<GoalKey | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id || null;
      setUid(id);
      if (!id) return;
      let done = false;
      try { done = localStorage.getItem("dg-onboarded-" + id) === "1"; } catch {}
      setShow(!done);
    })();
  }, []);

  const choose = (key: GoalKey) => {
    if (!uid) return;
    writeGoal(uid, key);
    try { localStorage.setItem("dg-onboarded-" + uid, "1"); } catch {}
    setPicked(key);
  };
  const finish = (href?: string) => { setShow(false); if (href) router.push(href); };

  if (!show || !uid) return null;
  const chosen = OPTIONS.find((o) => o.key === picked);

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-white/10 p-6">
        {!chosen ? (
          <>
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-300 mb-1">Welcome</p>
            <h2 className="text-lg font-black text-white mb-1">What&apos;s your #1 goal right now?</h2>
            <p className="text-[11px] text-slate-400 mb-4">We&apos;ll shape your Daily Quest around it.</p>
            <div className="grid gap-2">
              {OPTIONS.map((o) => {
                const Icon = o.icon;
                return (
                  <button key={o.key} onClick={() => choose(o.key)}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left hover:border-violet-400/40 hover:bg-violet-500/10 transition-colors">
                    <span className="w-9 h-9 shrink-0 rounded-lg bg-violet-500/10 text-violet-300 flex items-center justify-center"><Icon size={16} /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-bold text-white">{o.label}</span>
                      <span className="block text-[10px] text-slate-500">{o.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => finish()} className="mt-3 w-full text-center text-[11px] font-bold text-slate-500 hover:text-white">Skip for now</button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-black text-white mb-1">Nice choice! 🎯</h2>
            <p className="text-[11px] text-slate-400 mb-4">Your Daily Quest now prioritizes this. Ready for your first step?</p>
            <button onClick={() => finish(chosen!.href)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-sm font-black text-white flex items-center justify-center gap-2">
              {chosen!.cta} <ArrowRight size={16} />
            </button>
            <button onClick={() => finish()} className="mt-2 w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300">Explore on my own</button>
          </>
        )}
      </div>
    </div>
  );
}