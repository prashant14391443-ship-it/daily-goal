"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTrackById } from "@/lib/learningTracks";
import { countDue } from "@/lib/srs";
import { Code2, BookOpen, Dumbbell, ListChecks, ListTodo, RefreshCw, ArrowRight, Check, ChevronUp, ChevronDown, type LucideIcon } from "lucide-react";
import { readGoal } from "@/lib/goal";
function iso(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const dd = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${dd}`; }

type StepItem = { key: string; icon: LucideIcon; label: string; sub: string; href: string; done: boolean };

export default function TodayLoop() {
  const router = useRouter();
  const today = iso(new Date());
  const [mounted, setMounted] = useState(false);
  const [steps, setSteps] = useState<StepItem[]>([]);
  const [next, setNext] = useState<StepItem | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setMounted(true);
    try { setOpen(localStorage.getItem("dg-quest-open") !== "0"); } catch {}
    load();
  }, []);

  const toggleOpen = () => {
    const nv = !open; setOpen(nv);
    try { localStorage.setItem("dg-quest-open", nv ? "1" : "0"); } catch {}
  };

  const load = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) return;
      const [study, goals, gym, habits, habitLogs, todo, general, en, pr] = await Promise.all([
        supabase.from("study_sessions").select("duration_minutes").eq("user_id", uid).eq("session_date", today).eq("completed", true),
        supabase.from("user_goals").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("gym_logs").select("id").eq("user_id", uid).eq("session_date", today).eq("completed", true),
        supabase.from("habits").select("id").eq("user_id", uid),
        supabase.from("habit_logs").select("habit_id").eq("user_id", uid).eq("log_date", today).eq("completed", true),
        supabase.from("tasks").select("id,completed").eq("user_id", uid).eq("category", "todo").eq("task_date", today),
        supabase.from("tasks").select("id,completed").eq("user_id", uid).eq("category", "general").eq("task_date", today),
        supabase.from("learning_enrollments").select("track_id").eq("user_id", uid).maybeSingle(),
        supabase.from("learning_progress").select("track_id,milestone_id,status").eq("user_id", uid),
      ]);
      
      const enrollmentData = en.data;
      const goalsData = goals.data;
      const g = goalsData || { study_target: 120, workout_target: 1, habits_target: 3 };
      const sMin = (study.data || []).reduce((s: number, r: any) => s + r.duration_minutes, 0);
      const gymN = (gym.data || []).length;
      const hTot = (habits.data || []).length;
      const hDone = new Set((habitLogs.data || []).map((l: any) => l.habit_id)).size;
      const tRows = [...(todo.data || []), ...(general.data || [])];
      const tDone = tRows.filter((t: any) => t.completed).length;
      const due = countDue(uid);

      const list: StepItem[] = [];
      if (enrollmentData?.track_id) {
        const tr = getTrackById(enrollmentData.track_id);
        if (tr && tr.milestones.length > 0) {
          const doneIds = new Set((pr.data || []).filter((p: any) => p.track_id === tr.id && p.status === "completed").map((p: any) => p.milestone_id));
          const m = tr.milestones.find((x) => !doneIds.has(x.id));
          if (m) list.push({ key: "learn", icon: Code2, label: m.title, sub: tr.name, href: `/learns/${tr.id}`, done: false });
        }
      }
      if (due > 0) list.push({ key: "review", icon: RefreshCw, label: `Review ${due} due`, sub: "SRS memory", href: "/review", done: false });
      list.push(
        { key: "study", icon: BookOpen, label: `Study ${g.study_target}m`, sub: `${sMin}m done`, href: "/study-tracker", done: sMin >= g.study_target },
        { key: "gym", icon: Dumbbell, label: "Workout", sub: `${gymN}/${g.workout_target}`, href: "/gym-log", done: gymN >= g.workout_target },
        { key: "habits", icon: ListChecks, label: "Habits", sub: `${hDone}/${hTot || g.habits_target}`, href: "/routine-habits", done: hTot > 0 && hDone >= hTot },
        { key: "todo", icon: ListTodo, label: "To-do", sub: `${tDone}/${tRows.length}`, href: "/todo", done: tRows.length > 0 && tDone >= tRows.length },
      );
            const goal = readGoal(uid);
      const prefMap: Record<string, string> = { job: "learn", exam: "study", fit: "gym", habits: "habits", english: "study" };
      const want = goal ? prefMap[goal] : undefined;
      if (want) { const i = list.findIndex((s) => s.key === want); if (i > 0) { const [it] = list.splice(i, 1); list.unshift(it); } }
      setSteps(list);
      setNext(list.find((s) => !s.done) || null);
    } catch (e) {
      setSteps([
        { key: "study", icon: BookOpen, label: "Study", sub: "open timer", href: "/study-tracker", done: false },
        { key: "gym", icon: Dumbbell, label: "Workout", sub: "log one", href: "/gym-log", done: false },
      ]);
    }
  };

  if (!mounted) return null;
  const doneN = steps.filter((s) => s.done).length;

  return (
    <div className="mb-4 rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Daily Quest</p>
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-bold text-slate-400">{doneN}/{steps.length || "…"}</p>
          <button onClick={toggleOpen} className="text-slate-500 hover:text-white transition-colors" aria-label="toggle">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {open && (
        <>
          <div className="mt-3">
            {steps.length === 0 ? (
              <div className="h-14 rounded-xl bg-slate-800/50 animate-pulse" />
            ) : next ? (
              <button onClick={() => router.push(next.href)}
                className="w-full mb-3 rounded-xl bg-emerald-500/15 border border-emerald-400/30 p-3 flex items-center gap-3 hover:bg-emerald-500/25 transition-colors text-left">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-emerald-500/20 flex items-center justify-center"><next.icon size={16} className="text-emerald-300" /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-300">Next up</span>
                  <span className="block text-[13px] font-black text-white truncate">{next.label}</span>
                </span>
                <ArrowRight size={16} className="text-emerald-300 shrink-0" />
              </button>
            ) : (
              <p className="mb-3 text-center text-[12px] font-black text-emerald-300">🎉 All done today!</p>
            )}
          </div>

          {steps.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {steps.map((s) => {
                const Icon = s.icon;
                return (
                  <Link key={s.key} href={s.href}
                    className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold ${s.done ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-300" : "bg-slate-800/60 border-slate-700 text-slate-400"}`}>
                    {s.done ? <Check size={11} /> : <Icon size={11} />} {s.key}
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}