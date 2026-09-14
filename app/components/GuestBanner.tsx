"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { leaveGuest } from "@/lib/guest";
import { X } from "lucide-react";

export default function GuestBanner() {
  const router = useRouter();
  const [guest, setGuest] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setGuest(!!data.session?.user?.is_anonymous);
    })();
  }, []);

  if (!guest || hidden) return null;

  return (
    <div className="mx-4 mt-3 mb-1 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 flex items-center gap-3">
      <span className="w-9 h-9 shrink-0 rounded-xl bg-amber-500/20 flex items-center justify-center text-base">👻</span>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-black text-amber-200">Guest mode — exploring freely</p>
        <p className="text-[10px] text-amber-200/70">Nothing is kept. Create a free account to save your progress.</p>
      </div>
      <button onClick={() => { setHidden(true); router.push("/login"); }}
        className="shrink-0 px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-600 text-[10px] font-black text-white">
        Save progress
      </button>
      <button onClick={async () => { await leaveGuest(); router.push("/login"); }}
        className="shrink-0 px-2 py-2 rounded-xl bg-slate-800 border border-slate-700 text-[10px] font-black text-slate-300">
        Leave
      </button>
      <button onClick={() => setHidden(true)} className="shrink-0 text-slate-500"><X size={14} /></button>
    </div>
  );
}