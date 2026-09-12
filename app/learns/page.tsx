"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Code2, Rocket, ChevronRight, Clock, Target, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TRACKS, trackTotalHours } from "@/lib/learningTracks";

type Enrollment = { track_id: string; start_date: string };

export default function LearnsHub() {
  const [uid, setUid] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id || null;
      setUid(id);
      if (id) {
        const { data: en } = await supabase.from("learning_enrollments").select("track_id, start_date").eq("user_id", id);
        setEnrollments(en || []);

        const prog: Record<string, number> = {};
        for (const e of en || []) {
          const { data: pr } = await supabase.from("learning_progress")
            .select("status").eq("user_id", id).eq("track_id", e.track_id).eq("status", "completed");
          prog[e.track_id] = (pr || []).length;
        }
        setProgress(prog);
      }
    };
    load();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-8 pb-24 max-w-3xl mx-auto">
      <Link href="/study" className="flex items-center gap-1.5 text-xs text-slate-400 mb-5">
        <ArrowLeft size={13} /> Back to Study
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center">
            <Rocket size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-black">Learn & Build</h1>
            <p className="text-[11px] text-slate-500 font-semibold">Structured tracks · Real projects · Hinglish + English</p>
          </div>
        </div>
      </div>

      {/* Quick intro */}
      <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.04] p-4 mb-6">
        <p className="text-[12px] text-slate-300 leading-relaxed">
          <span className="font-bold text-white">No random videos.</span> Pick a track below, follow the milestones in order, build real projects, and take quizzes. Everything you need to go from zero to job-ready.
        </p>
      </div>

      {/* Tracks list */}
      <div className="grid gap-3">
        {TRACKS.map((track) => {
          const isEnrolled = enrollments.some((e) => e.track_id === track.id);
          const completedCount = progress[track.id] || 0;
          const totalMilestones = track.milestones.length;
          const pct = Math.round((completedCount / totalMilestones) * 100);

          return (
            <Link key={track.id} href={`/learns/${track.id}`} className="block">
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:border-indigo-400/30 hover:bg-white/[0.04] transition-all">
                <div className="flex items-start gap-3 mb-3">
                  <span className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-400/20 flex items-center justify-center">
                    <Code2 size={18} className="text-indigo-300" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-black text-white mb-0.5">{track.name}</h2>
                    <p className="text-[11px] text-slate-400">{track.tagline}</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-600 shrink-0 mt-1" />
                </div>

                {/* Stats row */}
                <div className="flex gap-2 mb-3 flex-wrap">
                  <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-slate-300 flex items-center gap-1">
                    <Target size={10} /> {totalMilestones} milestones
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-slate-300 flex items-center gap-1">
                    <Clock size={10} /> {trackTotalHours(track)}h total
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/25 text-[10px] font-black text-violet-300">
                    HINGLISH
                  </span>
                </div>

                {/* Progress or CTA */}
                {isEnrolled ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-slate-400">Your progress</p>
                      <p className="text-[10px] font-black text-indigo-300">{completedCount}/{totalMilestones} · {pct}%</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-indigo-300">
                      <CheckCircle2 size={12} /> Continue Learning →
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300">
                    <Rocket size={12} /> Start Track →
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Coming soon teaser */}
      <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-5 text-center">
        <p className="text-[12px] font-bold text-slate-400 mb-1">More tracks coming soon</p>
        <p className="text-[11px] text-slate-500">Python, App Development, Cybersecurity, Data Science…</p>
      </div>
    </main>
  );
}