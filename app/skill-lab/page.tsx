"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { SKILLS, type Skill, type Day } from "@/lib/skills";
import { GraduationCap, Target, Trophy, Calendar, Clock, Sparkles, CheckCircle2, Lock, Flame, X, ArrowRight } from "lucide-react";

type Enroll = { skill_id: string; started_at: string; deadline: string | null };
type Progress = { skill_id: string; day_num: number; done_date: string; reflection: string | null };

function toLocalISO(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${day}`; }
function addDays(dateStr: string, n: number) { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + n); return toLocalISO(d); }

export default function SkillLabPage() {
  const today = toLocalISO(new Date());
  const [uid, setUid] = useState("");
  const [enrolls, setEnrolls] = useState<Enroll[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [view, setView] = useState<"browse" | "today" | "badges">("browse");
  const [openSkill, setOpenSkill] = useState<Skill | null>(null);
  const [openDay, setOpenDay] = useState<Day | null>(null);
  const [refl, setRefl] = useState("");
  const [deadlineDraft, setDeadlineDraft] = useState(addDays(today, 7));

  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id; if (!id) return; setUid(id);
    const [e, p] = await Promise.all([
      supabase.from("skill_enroll").select("*").eq("user_id", id),
      supabase.from("skill_progress").select("*").eq("user_id", id),
    ]);
    setEnrolls((e.data as Enroll[]) || []);
    setProgress((p.data as Progress[]) || []);
  };

  const isEnrolled = (sid: string) => enrolls.some((e) => e.skill_id === sid);
  const progressFor = (sid: string) => progress.filter((p) => p.skill_id === sid).map((p) => p.day_num);
  const highestDone = (sid: string) => { const done = progressFor(sid); return done.length ? Math.max(...done) : 0; };
  const isUnlocked = (sid: string, day: number) => day <= highestDone(sid) + 1;
  const isGraduated = (sid: string) => highestDone(sid) >= 7;

  const enroll = async (s: Skill) => {
    const { error } = await supabase.from("skill_enroll").upsert({ user_id: uid, skill_id: s.id, started_at: today, deadline: deadlineDraft });
    if (!error) { setEnrolls([...enrolls, { skill_id: s.id, started_at: today, deadline: deadlineDraft }]); setOpenSkill(null); recordNotification("🎓 Enrolled!", `You started ${s.emoji} ${s.name} — finish by ${deadlineDraft}`); }
  };

  const completeDay = async (s: Skill, day: Day) => {
    const { error } = await supabase.from("skill_progress").upsert({ user_id: uid, skill_id: s.id, day_num: day.num, done_date: today, reflection: refl || null });
    if (!error) {
      setProgress([...progress.filter((p) => !(p.skill_id === s.id && p.day_num === day.num)), { skill_id: s.id, day_num: day.num, done_date: today, reflection: refl || null }]);
      setRefl(""); setOpenDay(null);
      if (day.num === 7) {
        recordNotification("🏆 Skill mastered!", `${s.emoji} ${s.name} — you graduated. Badge earned.`);
        await supabase.from("coin_log").insert({ user_id: uid, action_key: `skill-grad-${s.id}`, coins: 50 });
        const { data: cur } = await supabase.from("user_coins").select("coins").eq("user_id", uid).maybeSingle();
        const total = (cur?.coins || 0) + 50;
        await supabase.from("user_coins").upsert({ user_id: uid, coins: total });
        window.dispatchEvent(new CustomEvent("dg-coins", { detail: { total, earned: 50 } }));
      } else {
        recordNotification("✅ Day done!", `${s.emoji} ${s.name} Day ${day.num}/7 complete — +10 🪙`);
        await supabase.from("coin_log").insert({ user_id: uid, action_key: `skill-day-${s.id}-${day.num}`, coins: 10 });
        const { data: cur } = await supabase.from("user_coins").select("coins").eq("user_id", uid).maybeSingle();
        const total = (cur?.coins || 0) + 10;
        await supabase.from("user_coins").upsert({ user_id: uid, coins: total });
        window.dispatchEvent(new CustomEvent("dg-coins", { detail: { total, earned: 10 } }));
      }
    }
  };

  const todayTasks = enrolls
    .filter((e) => !isGraduated(e.skill_id))
    .map((e) => {
      const s = SKILLS.find((x) => x.id === e.skill_id)!;
      const next = highestDone(e.skill_id) + 1;
      return { s, day: s.days.find((d) => d.num === next)!, enroll: e };
    });

  const graduated = enrolls.filter((e) => isGraduated(e.skill_id)).map((e) => SKILLS.find((x) => x.id === e.skill_id)!);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 p-5 shadow-xl shadow-orange-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center"><GraduationCap size={22} className="text-white" /></span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight">Skill Lab</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">7-day paths • real mental models • graduate into habits</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        {([
          { id: "browse", label: "🎓 Skills" },
          { id: "today", label: "🧰 Today" },
          { id: "badges", label: "🏅 Badges" },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setView(t.id)} className={`press py-2.5 rounded-xl text-xs font-black border ${view === t.id ? "bg-amber-500/15 border-amber-500/30 text-amber-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {view === "browse" && (
        <div className="grid gap-3">
          {SKILLS.map((s) => {
            const enrolled = isEnrolled(s.id);
            const done = highestDone(s.id);
            return (
              <button key={s.id} onClick={() => { setDeadlineDraft(addDays(today, 7)); setOpenSkill(s); }} className="press text-left bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-amber-500/40 transition-all">
                <div className="flex items-start gap-3">
                  <span className="w-12 h-12 shrink-0 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-2xl">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-white truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5 line-clamp-2">{s.tagline}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${enrolled ? (done === 7 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-300") : "bg-slate-800 border-slate-700 text-slate-500"}`}>
                        {enrolled ? (done === 7 ? `✓ GRADUATED` : `Day ${done}/7`) : "7 days • 10–15 min/day"}
                      </span>
                      <ArrowRight size={12} className="text-slate-600" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {view === "today" && (
        <>
          {todayTasks.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
              <p className="text-3xl mb-2">🌱</p>
              <p className="text-sm text-slate-400">Nothing to do today — enroll in a skill from the Skills tab!</p>
            </div>
          )}
          <div className="grid gap-3">
            {todayTasks.map(({ s, day, enroll }) => (
              <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-lg">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-500 font-black truncate">{s.name} • DAY {day.num}/7</p>
                    <p className="font-black text-sm truncate">{day.title}</p>
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 mb-2">
                  <p className="text-[10px] font-black text-amber-400 mb-1">🧠 TECHNIQUE: {day.technique.toUpperCase()}</p>
                  <p className="text-[11px] text-slate-300 font-bold mb-2">{day.why}</p>
                  <p className="text-[10px] font-black text-emerald-400 mb-1">✅ TODAY&apos;S ACTION ({day.min} MIN)</p>
                  <p className="text-xs text-white font-bold">{day.action}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1"><Calendar size={10} /> Finish by {enroll.deadline || "—"}</span>
                  <button onClick={() => setOpenDay(day)} className="press flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 text-xs font-black text-white">Mark done</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === "badges" && (
        <>
          {graduated.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
              <p className="text-3xl mb-2">🏅</p>
              <p className="text-sm text-slate-400">No badges yet — finish a 7-day skill to earn one!</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {graduated.map((s) => (
              <div key={s.id} className="bg-gradient-to-br from-amber-500/10 to-rose-500/10 border border-amber-500/30 rounded-2xl p-4 text-center">
                <span className="text-4xl block mb-2">{s.emoji}</span>
                <p className="font-black text-sm text-white truncate">{s.name}</p>
                <p className="text-[10px] text-amber-400 font-black mt-1">✓ MASTERED</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ENROLL SHEET */}
      {openSkill && (
        <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-end justify-center" onClick={() => setOpenSkill(null)}>
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-t-3xl p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{openSkill.emoji}</span>
                <p className="text-sm font-black text-white">{openSkill.name}</p>
              </div>
              <button onClick={() => setOpenSkill(null)} className="text-slate-500 press"><X size={18} /></button>
            </div>
            <p className="text-[11px] text-slate-400 font-bold mb-4">{openSkill.tagline}</p>

            {!isEnrolled(openSkill.id) ? (
              <>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 mb-4 grid gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-300 font-bold"><Target size={12} className="text-amber-400" /> By Day 7 you will: <span className="text-white">master {openSkill.name.toLowerCase()}</span></div>
                  <div className="flex items-center gap-2 text-xs text-slate-300 font-bold"><Calendar size={12} className="text-amber-400" /> Deadline (optional)
                    <input type="date" value={deadlineDraft} onChange={(e) => setDeadlineDraft(e.target.value)} className="ml-auto bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-black text-slate-200 outline-none [color-scheme:dark]" />
                  </div>
                </div>
                <p className="text-[10px] font-black text-slate-500 mb-2">YOUR 7-DAY PATH</p>
                <div className="grid gap-1.5 mb-4 max-h-64 overflow-y-auto pr-1">
                  {openSkill.days.map((d) => (
                    <div key={d.num} className="flex items-start gap-2 bg-slate-950 border border-slate-800 rounded-lg p-2">
                      <span className="w-6 h-6 shrink-0 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-black flex items-center justify-center">{d.num}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-white truncate">{d.title}</p>
                        <p className="text-[10px] text-slate-500 font-bold truncate">{d.technique} • {d.min} min</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => enroll(openSkill)} className="press w-full py-3 rounded-xl bg-amber-600 text-sm font-black text-white">Enroll & start Day 1</button>
              </>
            ) : (
              <>
                <p className="text-[10px] font-black text-slate-500 mb-2">YOUR PROGRESS</p>
                <div className="grid gap-1.5 mb-4 max-h-80 overflow-y-auto pr-1">
                  {openSkill.days.map((d) => {
                    const done = highestDone(openSkill.id) >= d.num;
                    const unlocked = isUnlocked(openSkill.id, d.num);
                    const reflection = progress.find((p) => p.skill_id === openSkill.id && p.day_num === d.num)?.reflection;
                    return (
                      <div key={d.num} className={`flex items-start gap-2 rounded-lg p-2 border ${done ? "bg-emerald-500/10 border-emerald-500/30" : unlocked ? "bg-slate-950 border-slate-800" : "bg-slate-900/50 border-slate-800 opacity-50"}`}>
                        <span className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center ${done ? "bg-emerald-600 text-white" : unlocked ? "bg-amber-500/10 text-amber-400" : "bg-slate-800 text-slate-600"}`}>
                          {done ? <CheckCircle2 size={14} /> : unlocked ? d.num : <Lock size={12} />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] font-black truncate ${done ? "text-emerald-300 line-through" : "text-white"}`}>{d.title}</p>
                          <p className="text-[10px] text-slate-500 font-bold truncate">{d.technique} • {d.min} min</p>
                          {reflection && <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 italic">— {reflection}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {isGraduated(openSkill.id) && <p className="text-center text-xs text-amber-300 font-black">🏆 You mastered this skill. Badge earned.</p>}
              </>
            )}
          </div>
        </div>
      )}

      {/* DAY COMPLETE SHEET */}
      {openDay && (
        <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-end justify-center" onClick={() => { setOpenDay(null); setRefl(""); }}>
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-t-3xl p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-black text-white mb-1">Mark Day {openDay.num}/7 done</p>
            <p className="text-[11px] text-slate-400 font-bold mb-4">{openDay.action}</p>
            <div className="grid gap-1 mb-4">
              <span className="text-[10px] font-black text-slate-500">WHAT DID YOU LEARN? (OPTIONAL)</span>
              <textarea value={refl} onChange={(e) => setRefl(e.target.value)} rows={3} placeholder="One line — what worked, what surprised you..." className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-amber-500 resize-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { const s = SKILLS.find((x) => x.days.includes(openDay))!; completeDay(s, openDay); }} className="flex-1 press py-3 rounded-xl bg-emerald-600 text-sm font-black text-white">✓ I did it — +10 🪙</button>
              <button onClick={() => { setOpenDay(null); setRefl(""); }} className="press px-4 py-3 rounded-xl bg-slate-800 text-slate-400 text-xs font-black">Later</button>
            </div>
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-600 font-bold text-center mt-4">Graduated skills can be converted into daily habits in Habit Log.</p>
      <Link href="/routine-habits" className="inline-block mt-3 text-sm text-slate-500 hover:text-white press font-bold">← Back to Habits</Link>
    </main>
  );
}