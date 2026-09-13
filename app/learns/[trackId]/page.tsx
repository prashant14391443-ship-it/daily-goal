"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, Circle, ExternalLink, Target,
  ChevronDown, ChevronRight, Loader2, Rocket, Copy, Check
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getTrackById, buildSchedule, dayNumber, trackTotalHours, type TrackMilestone } from "@/lib/learningTracks";

type ProgressRow = {
  id: string; milestone_id: string; done_resources: string[];
  project_url: string | null; status: string;
};

const HOURS_OPTIONS = [0.5, 1, 1.5, 2, 3, 4];

export default function TrackDashboard() {
  const params = useParams();
  const track = getTrackById(params.trackId as string);

  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<{ hours_per_day: number; start_date: string } | null>(null);
  const [progress, setProgress] = useState<Record<string, ProgressRow>>({});
  const [hoursPick, setHoursPick] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id || null;
      setUid(id);
      if (id && track) {
        const { data: en } = await supabase.from("learning_enrollments")
          .select("*").eq("user_id", id).eq("track_id", track.id).maybeSingle();
        if (en) {
          setEnrollment({ hours_per_day: en.hours_per_day, start_date: en.start_date });
          const { data: pr } = await supabase.from("learning_progress")
            .select("*").eq("user_id", id).eq("track_id", track.id);
          const map: Record<string, ProgressRow> = {};
          (pr || []).forEach((r: any) => { map[r.milestone_id] = r; });
          setProgress(map);
        }
      }
      setLoading(false);
    };
    load();
  }, [track?.id]);

  if (!track) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-bold mb-3">Track not found</p>
          <Link href="/learns" className="text-xs text-indigo-300 underline">Back to Hub</Link>
        </div>
      </main>
    );
  }

  const schedule = buildSchedule(track, enrollment?.hours_per_day || hoursPick);
  const completedIds = Object.values(progress).filter((p) => p.status === "completed").map((p) => p.milestone_id);
  const currentSlot = schedule.find((s) => !completedIds.includes(s.milestone.id)) || schedule[schedule.length - 1];
  const pct = Math.round((completedIds.length / track.milestones.length) * 100);

  const startTrack = async () => {
    if (!uid) { alert("Please login first!"); return; }
    setBusy("start");
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("learning_enrollments").upsert({
      user_id: uid, track_id: track.id, hours_per_day: hoursPick, start_date: today,
    }, { onConflict: "user_id,track_id" });
    if (!error) setEnrollment({ hours_per_day: hoursPick, start_date: today });
    setBusy(null);
  };

  const ensureRow = async (m: TrackMilestone): Promise<ProgressRow | null> => {
    if (!uid) return null;
    if (progress[m.id]) return progress[m.id];
    const { data } = await supabase.from("learning_progress").insert({
      user_id: uid, track_id: track.id, milestone_id: m.id, done_resources: [], status: "in_progress",
    }).select().single();
    if (data) setProgress((p) => ({ ...p, [m.id]: data }));
    return data;
  };

  const toggleResource = async (m: TrackMilestone, rid: string) => {
    setBusy(m.id + rid);
    const row = await ensureRow(m);
    if (!row) { setBusy(null); return; }
    const has = row.done_resources.includes(rid);
    const next = has ? row.done_resources.filter((x) => x !== rid) : [...row.done_resources, rid];
    await supabase.from("learning_progress").update({ done_resources: next, updated_at: new Date().toISOString() }).eq("id", row.id);
    setProgress((p) => ({ ...p, [m.id]: { ...row, done_resources: next } }));
    setBusy(null);
  };

  const submitProject = async (m: TrackMilestone) => {
    if (!urlInput.trim()) { alert("Paste your GitHub or Vercel link first"); return; }
    setBusy(m.id + "proj");
    const row = await ensureRow(m);
    if (!row) { setBusy(null); return; }
    await supabase.from("learning_progress").update({
      project_url: urlInput.trim(), status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", row.id);
    setProgress((p) => ({ ...p, [m.id]: { ...row, project_url: urlInput.trim(), status: "completed" } }));
    setUrlInput("");
    setBusy(null);
  };

  const copyPrompt = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(id);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  if (loading) {
    return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center"><Loader2 className="animate-spin" /></main>;
  }

  if (!enrollment) {
    return (
      <main className="min-h-screen bg-slate-950 text-white px-4 pt-8 pb-24 max-w-2xl mx-auto">
        <Link href="/learns" className="flex items-center gap-1.5 text-xs text-slate-400 mb-5"><ArrowLeft size={13} /> Back to Hub</Link>
        <div className="rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-950 p-6 mb-5">
          <h1 className="text-xl font-black">{track.name}</h1>
          <p className="text-[12px] text-slate-400 mt-1">{track.tagline}</p>
        </div>

        <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6">
          <p className="text-sm font-black mb-1">Kitna time doge roz? 🕐</p>
          <p className="text-[11px] text-slate-500 mb-4">Isse tumhara personal schedule banega</p>
          <div className="grid grid-cols-6 gap-1.5 mb-5">
            {HOURS_OPTIONS.map((h) => (
              <button key={h} onClick={() => setHoursPick(h)}
                className={`py-2.5 rounded-xl border text-[11px] font-black ${hoursPick === h ? "border-indigo-400/50 bg-indigo-500/15 text-indigo-200" : "border-white/5 bg-slate-900 text-slate-400"}`}>
                {h}h
              </button>
            ))}
          </div>
          <button onClick={startTrack} disabled={busy !== null}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />} Start My Track
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-8 pb-24 max-w-2xl mx-auto">
      <Link href="/learns" className="flex items-center gap-1.5 text-xs text-slate-400 mb-5"><ArrowLeft size={13} /> Back to Hub</Link>

      <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-950 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base font-black">{track.name}</h1>
          <span className="px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/25 text-[9px] font-black text-violet-300">HINGLISH</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/[0.03] border border-white/5 py-2.5">
            <p className="text-sm font-black text-indigo-300">Day {dayNumber(enrollment.start_date)}</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">of {schedule[schedule.length - 1].endDay}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/5 py-2.5">
            <p className="text-sm font-black text-emerald-300">{pct}%</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">complete</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/5 py-2.5">
            <p className="text-sm font-black text-slate-200">{enrollment.hours_per_day}h</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">per day</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-teal-400/20 bg-teal-400/[0.05] p-4 mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-teal-300 mb-1">Aaj ka target 🎯</p>
        <p className="text-[13px] font-bold text-white">{currentSlot.milestone.title}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Next: {currentSlot.milestone.resources.find((r) => !(progress[currentSlot.milestone.id]?.done_resources || []).includes(r.id))?.title || "Project submit karo"}
        </p>
      </div>

      <div className="grid gap-2.5">
        {schedule.map((s) => {
          const m = s.milestone;
          const row = progress[m.id];
          const done = row?.status === "completed";
          const open = openId === m.id;
          const doneRes = row?.done_resources || [];
          return (
            <div key={m.id} className={`rounded-2xl border overflow-hidden ${done ? "border-emerald-500/25 bg-emerald-500/[0.04]" : "border-white/5 bg-white/[0.02]"}`}>
              <button onClick={() => setOpenId(open ? null : m.id)} className="w-full flex items-center gap-3 p-4 text-left">
                <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-[11px] font-black ${done ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
                  {done ? <CheckCircle2 size={16} /> : m.order}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-bold text-slate-100 truncate">{m.title}</span>
                  <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">Day {s.startDay}–{s.endDay} · {m.estimatedHours}h · {doneRes.length}/{m.resources.length} done</span>
                </span>
                {open ? <ChevronDown size={15} className="text-slate-500" /> : <ChevronRight size={15} className="text-slate-600" />}
              </button>

              {open && (
                <div className="px-4 pb-4">
                  <p className="text-[12px] text-slate-300 leading-relaxed mb-4">{m.summary}</p>

                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">1. Resources (Check off as you finish)</p>
                  <div className="grid gap-1.5 mb-5">
                    {m.resources.map((r) => {
                      const checked = doneRes.includes(r.id);
                      return (
                        <div key={r.id} className="flex items-center gap-2 rounded-xl bg-slate-900/60 border border-slate-800 px-3 py-2.5">
                          <button onClick={() => toggleResource(m, r.id)} className="shrink-0">
                            {busy === m.id + r.id ? <Loader2 size={15} className="animate-spin text-slate-400" /> : checked ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Circle size={16} className="text-slate-600" />}
                          </button>
                          <a href={r.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 flex items-center gap-2">
                            <span className={`text-[11px] font-bold truncate ${checked ? "text-slate-500 line-through" : "text-slate-200"}`}>{r.title}</span>
                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${r.lang === "hindi" ? "bg-orange-500/10 text-orange-300 border border-orange-500/25" : "bg-blue-500/10 text-blue-300 border border-blue-500/25"}`}>{r.lang}</span>
                          </a>
                          <a href={r.url} target="_blank" rel="noreferrer" className="shrink-0 text-slate-500"><ExternalLink size={13} /></a>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                    2. AI Coach Prompts <span className="text-[9px] text-violet-300 font-normal normal-case">(Copy & paste into ChatGPT / Gemini)</span>
                  </p>
                  <div className="grid gap-2 mb-5">
                    {m.aiCoachPrompts.map((prompt, i) => (
                      <div key={i} className="relative rounded-xl bg-violet-500/5 border border-violet-500/20 p-3 pr-12">
                        <p className="text-[11px] text-violet-100 leading-relaxed">{prompt}</p>
                        <button 
                          onClick={() => copyPrompt(prompt, `${m.id}-${i}`)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 transition-colors"
                          title="Copy prompt"
                        >
                          {copiedPrompt === `${m.id}-${i}` ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">3. Build & Ship Project</p>
                  <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3.5 mb-2">
                    <p className="text-[12px] font-bold text-white mb-1">{m.project.title}</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-2">{m.project.brief}</p>
                    <ul className="grid gap-1 mb-3">
                      {m.project.acceptanceCriteria.map((c, i) => (
                        <li key={i} className="text-[10px] text-slate-500 flex gap-1.5"><Target size={10} className="text-indigo-400 shrink-0 mt-0.5" /> {c}</li>
                      ))}
                    </ul>
                    {row?.project_url ? (
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-3 py-2">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <a href={row.project_url} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-emerald-300 truncate">{row.project_url}</a>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="Paste GitHub / Vercel link"
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-indigo-500" />
                        <button onClick={() => submitProject(m)} disabled={busy !== null}
                          className="shrink-0 px-3 py-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-[11px] font-black text-indigo-300 disabled:opacity-50">
                          {busy === m.id + "proj" ? <Loader2 size={13} className="animate-spin" /> : "Submit"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}