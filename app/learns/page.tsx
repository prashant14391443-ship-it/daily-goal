"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Code2, Clock, Sparkles, ChevronRight, Bot } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TRACKS, trackTotalHours } from "@/lib/learningTracks";

export default function LearnsHub() {
  const [uid, setUid] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState<Record<string, boolean>>({});
  const [doneCounts, setDoneCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id || null;
      setUid(id);
      if (!id) return;
      const { data: en } = await supabase.from("learning_enrollments").select("track_id").eq("user_id", id);
      const enMap: Record<string, boolean> = {};
      (en || []).forEach((e: any) => { enMap[e.track_id] = true; });
      setEnrolled(enMap);
      const { data: pr } = await supabase.from("learning_progress")
        .select("track_id").eq("user_id", id).eq("status", "completed");
      const counts: Record<string, number> = {};
      (pr || []).forEach((p: any) => { counts[p.track_id] = (counts[p.track_id] || 0) + 1; });
      setDoneCounts(counts);
    };
    load();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-8 pb-24 max-w-3xl mx-auto">
      <Link href="/study" className="flex items-center gap-1.5 text-xs text-slate-400 mb-5">
        <ArrowLeft size={13} /> Back to Study
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <Code2 size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-black">Learn & Build</h1>
          <p className="text-[11px] text-slate-500 font-semibold">Structured tracks · real projects · AI coach</p>
        </div>
      </div>

      {/* AI philosophy banner */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-violet-400/20 bg-violet-500/[0.06] px-4 py-3 mb-6">
        <Bot size={15} className="text-violet-300 shrink-0 mt-0.5" />
        <p className="text-[11px] text-violet-100/80 leading-relaxed">
          <span className="font-black text-white">AI = tumhara senior dev.</span> Har milestone me ready-made ChatGPT / Gemini prompts milenge — stuck ho, samajhna ho, code review chahiye: pehle AI se pucho, phir build karo.
        </p>
      </div>

      <div className="grid gap-3">
        {TRACKS.map((t) => {
          const isEn = enrolled[t.id];
          const done = doneCounts[t.id] || 0;
          const pct = Math.round((done / t.milestones.length) * 100);
          return (
            <Link key={t.id} href={`/learns/${t.id}`}
              className="block rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:border-indigo-400/30 hover:bg-white/[0.04] transition-all">
              <div className="flex items-start gap-3">
                <span className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-400/20 flex items-center justify-center">
                  <Code2 size={18} className="text-indigo-300" />
                </span>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-black text-white">{t.name}</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t.tagline}</p>
                </div>
                <ChevronRight size={18} className="text-slate-600 shrink-0 mt-1" />
              </div>

              <div className="flex gap-2 mt-4 flex-wrap">
                <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-slate-300">{t.milestones.length} milestones</span>
                <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-slate-300 flex items-center gap-1"><Clock size={10} /> {trackTotalHours(t)}h</span>
                <span className="px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/25 text-[10px] font-black text-violet-300">HINGLISH</span>
              </div>

              {isEn ? (
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                    <span>Progress</span><span className="text-indigo-300">{done}/{t.milestones.length} · {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-[11px] font-black text-indigo-300 flex items-center gap-1.5">
                  <Sparkles size={12} /> Start Track →
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </main>
  );
}