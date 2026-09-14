"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Code2, Database, Shield, Cpu, Smartphone, Cloud, Gamepad2, Bot, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TRACKS } from "@/lib/learningTracks";

const ICONS: Record<string, any> = {
  "web-dev": Code2, "python-data": Database, "cyber-sec": Shield, "dsa-java": Cpu,
  "app-dev": Smartphone, "devops-cloud": Cloud, "game-dev": Gamepad2,
};
const GRADS: Record<string, string> = {
  "web-dev": "from-indigo-500 to-violet-600", "python-data": "from-emerald-500 to-teal-600",
  "cyber-sec": "from-rose-500 to-red-600", "dsa-java": "from-amber-500 to-orange-600",
  "app-dev": "from-sky-500 to-blue-600", "devops-cloud": "from-cyan-500 to-teal-600",
  "game-dev": "from-violet-500 to-indigo-600",
};

export default function LearnsHub() {
  const [progress, setProgress] = useState<Record<string, { done: number; total: number }>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) return;
      const { data: rows } = await supabase.from("learning_progress").select("track_id, status").eq("user_id", uid);
      const map: Record<string, { done: number; total: number }> = {};
      TRACKS.forEach((t) => (map[t.id] = { done: 0, total: t.milestones.length }));
      (rows || []).forEach((r: any) => {
        if (!map[r.track_id]) map[r.track_id] = { done: 0, total: 0 };
        if (r.status === "completed") map[r.track_id].done += 1;
      });
      setProgress(map);
    };
    load();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-8 pb-24 max-w-3xl mx-auto">
      <Link href="/study" className="flex items-center gap-1.5 text-xs text-slate-400 mb-5"><ArrowLeft size={13} /> Back to Study</Link>

      <div className="flex items-center gap-3 mb-4">
        <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center"><Code2 size={20} /></span>
        <div>
          <h1 className="text-xl font-black">Learn & Build</h1>
          <p className="text-[11px] text-slate-500 font-semibold">Structured tracks · real projects · AI coach</p>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-violet-400/20 bg-violet-500/[0.06] px-4 py-3 mb-6">
        <Bot size={15} className="text-violet-300 shrink-0 mt-0.5" />
        <p className="text-[11px] text-violet-100/80 leading-relaxed">
          <span className="font-black text-white">AI = tumhara senior dev.</span> Har milestone me ready-made ChatGPT / Gemini prompts — stuck ho, samajhna ho, code review chahiye: pehle AI se pucho, phir build karo.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TRACKS.map((t) => {
          const Icon = ICONS[t.id] || Code2;
          const grad = GRADS[t.id] || "from-indigo-500 to-violet-600";
          const p = progress[t.id] || { done: 0, total: t.milestones.length };
          const pct = Math.round((p.done / Math.max(p.total, 1)) * 100);
          return (
            <Link key={t.id} href={`/learns/${t.id}`}
              className="group relative aspect-square rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between hover:border-white/15 hover:bg-white/[0.05] transition-all overflow-hidden">
              <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${grad} opacity-15 blur-2xl group-hover:opacity-35 transition-opacity pointer-events-none`} />
              <span className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-lg`}>
                <Icon size={20} className="text-white" />
              </span>
              <div className="relative">
                <p className="text-[13px] font-black text-white leading-tight mb-1">{t.name.split("(")[0].trim()}</p>
                <p className="text-[10px] text-slate-500 font-semibold mb-2">{t.milestones.length} milestones</p>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${grad}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}