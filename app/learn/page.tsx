"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { addTopic } from "@/lib/srs";
import { GraduationCap, Sparkles, Save, Download, Layers, Map as MapIcon, Hammer, BookOpen, Dumbbell, AlertTriangle, ListOrdered, Calendar, Lightbulb, Timer, Trash2, Pencil } from "lucide-react";

type LearnBP = {
  title: string;
  goal: { meaning: string; time: string; skip: string[] };
  stages?: string[];
  physical?: { events: string[]; plan: string[] };
  roadmap: { m: string; topics: string; project: string; checkpoint: string }[];
  projects: { name: string; difficulty: string; time: string; learn: string }[];
  resources: { free: string[]; search: string[]; paid: string[]; book: string };
  practice: { name: string; what: string }[];
  mistakes: { beginner: string[]; intermediate: string[]; advanced: string[] };
  prereq: string[];
  schedule: { oneHour: string; twoHour: string; weekend: string };
  tips: string[];
};

const METHOD = [
  { n: "1", name: "Prep & Setup", min: 10, what: "Clear desk, phone in another room, set timer. Define ONE outcome for the session." },
  { n: "2", name: "Learn + Micro-Practice", min: 45, what: "15 min watch/read → 30 min mimic. Never watch passively >15 min straight." },
  { n: "3", name: "Active Recall + Feynman", min: 10, what: "Close everything. Blurt it from memory on paper. Explain it simply out loud." },
  { n: "4", name: "Brain Rest / NSDR", min: 10, what: "Eyes closed, zero screens — locks it into long-term memory." },
  { n: "5", name: "Real Project Build", min: 60, what: "Build something real WITHOUT a tutorial. Look up only the exact step you're stuck on." },
  { n: "6", name: "Review & Feedback", min: 15, what: "Compare to a good reference. Find what's weak and fix it." },
  { n: "7", name: "Deep Thinking", min: 10, what: "Notebook: why it worked, how to reuse it in the next project." },
  { n: "8", name: "Revision Prep", min: 10, what: "Make 2-3 flashcards for what you struggled to remember." },
];

const CATEGORIES = ["Web Development","App Development","Cybersecurity","Python","JavaScript","Java","C++","Medical (NEET/MBBS)","Competitive Exams","Junior School (1-10)"];
const CODING = ["Web Development","App Development","Cybersecurity","Python","JavaScript","Java","C++"];

const RESOURCES: Record<string, any> = {
  "Web Development": { free: ["freeCodeCamp Responsive Web Design","The Odin Project","MDN Web Docs","CS50x (free)"], search: ["HTML CSS full course freeCodeCamp","JavaScript tutorial MDN","flexbox practice game","build first website tutorial"], paid: ["Frontend Masters (later)","Udemy bootcamp (wait for sale)"], book: "Eloquent JavaScript (free online)" },
  "App Development": { free: ["Flutter official docs","React Native docs","CS50 Mobile","freeCodeCamp mobile"], search: ["Flutter beginner full course","React Native crash course","build first app Flutter"], paid: ["Udemy Flutter & Dart (sale)"], book: "Flutter Apprentice" },
  "Cybersecurity": { free: ["TryHackMe free path","OWASP Top 10","PortSwigger Academy","CS50 Security"], search: ["TryHackMe beginner path","ethical hacking full course","CTF walkthrough beginner"], paid: ["HackTheBox (later)"], book: "Web Application Hacker's Handbook" },
  "Python": { free: ["official Python tutorial","freeCodeCamp Python","CS50P (free)","Automate the Boring Stuff (free)"], search: ["Python for beginners full course","CS50P Harvard","Python projects for beginners"], paid: ["Udemy 100 Days of Code (sale)"], book: "Python Crash Course" },
  "JavaScript": { free: ["MDN JavaScript","freeCodeCamp JS","JavaScript.info"], search: ["JavaScript full course freeCodeCamp","JS DOM tutorial","JavaScript projects beginner"], paid: ["Udemy JS course (sale)"], book: "Eloquent JavaScript" },
  "Java": { free: ["official Java tutorials","CS courses","freeCodeCamp Java"], search: ["Java full course beginner","Java OOP tutorial","Java projects beginner"], paid: ["Udemy Java (sale)"], book: "Head First Java" },
  "C++": { free: ["learncpp.com","CS courses","freeCodeCamp C++"], search: ["C++ full course beginner","C++ DSA basics","C++ projects beginner"], paid: ["Udemy C++ (sale)"], book: "C++ Primer" },
  "Medical (NEET/MBBS)": { free: ["NCERT Biology (the base)","Khan Academy Health","Osmosis free","Boards & Beyond free"], search: ["NEET biology playlist","physiology basics Osmosis","anatomy diagrams explained"], paid: ["Marrow / PrepLadder (PG)","Osmosis premium"], book: "NCERT + Guyton Physiology" },
  "Competitive Exams": { free: ["Khan Academy (math/reasoning)","NCERT (UPSC base)","free current-affairs YT"], search: ["SSC CGL full course","UPSC prelims strategy","bank PO quant playlist"], paid: ["test series (worth it)"], book: "RS Aggarwal (quant/reasoning)" },
  "Junior School (1-10)": { free: ["NCERT textbooks","Khan Academy Kids","animated lessons on YT"], search: ["class 9 science NCERT explained","class 8 math animated","class 10 history story"], paid: ["BYJU'S/Toppr (optional)"], book: "NCERT (the base)" },
};

const CODE_MILESTONES = [
  { m: "Write basics without Google", topics: "variables, loops, functions, conditionals", project: "number guessing game", checkpoint: "can explain a loop to a friend" },
  { m: "Build a CLI tool", topics: "functions, data structures, files", project: "to-do list in the terminal", checkpoint: "runs without errors" },
  { m: "Use an API / UI", topics: "async, APIs or DOM", project: "weather app", checkpoint: "shows real live data" },
  { m: "Ship a real project", topics: "git, structure, deploy", project: "portfolio project on GitHub", checkpoint: "deployed & shared" },
];
const STUDY_MILESTONES = [
  { m: "Master the base (NCERT/core)", topics: "read, underline, make notes", project: "chapter-wise notes", checkpoint: "can blurt each chapter" },
  { m: "Practice questions", topics: "exercises + previous-year Qs", project: "solve 50 questions", checkpoint: "80% accuracy" },
  { m: "Mock tests", topics: "full-length timed tests", project: "1 mock per week", checkpoint: "score keeps rising" },
  { m: "Revision system", topics: "flashcards + spaced repetition", project: "daily Review in this app", checkpoint: "recall without notes" },
];

export default function LearnPage() {
  const [category, setCategory] = useState("Python");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [hours, setHours] = useState("1 hour/day");
  const [goal, setGoal] = useState("Get a job");
  const [bp, setBp] = useState<LearnBP | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [uid, setUid] = useState("");
  const [edit, setEdit] = useState(false);

  useEffect(() => { load(); }, []);
  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };
  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id; if (!id) return; setUid(id);
    const { data: rows } = await supabase.from("learn_blueprints").select("*").eq("user_id", id).order("created_at", { ascending: false });
    setSaved(rows || []);
  };

  const setGoalP = (patch: Partial<LearnBP["goal"]>) => setBp((b) => (b ? { ...b, goal: { ...b.goal, ...patch } } : b));
  const setRoad = (i: number, patch: Partial<LearnBP["roadmap"][number]>) => setBp((b) => (b ? { ...b, roadmap: b.roadmap.map((r, j) => (j === i ? { ...r, ...patch } : r)) } : b));
  const setSched = (patch: Partial<LearnBP["schedule"]>) => setBp((b) => (b ? { ...b, schedule: { ...b.schedule, ...patch } } : b));

  const buildOffline = (): LearnBP => {
    const isCode = CODING.includes(category);
    const R = RESOURCES[category] || RESOURCES["Python"];
    const low = (topic + " " + category).toLowerCase();
    const isPhysical = ["police","army","navy","air force","airforce","defence","defense","constable","fire","gd"].some((k) => low.includes(k));
    return {
      title: `Learn ${topic || category}`,
      stages: isCode
        ? ["Learn basics","Build small projects","Build a real project","Portfolio + apply"]
        : isPhysical
          ? ["Written exam (GK, math, reasoning, Hindi, science, current affairs)","Physical test (run, long jump, high jump)","Document verification + medical"]
          : ["Learn base (NCERT/core)","Practice questions","Mock tests","Revision"],
      physical: isPhysical
        ? { events: ["1.6 km run (beat the cutoff time)","Long jump","High jump","Basic strength (push-ups, squats, core)"], plan: ["Run 3x/week: start easy 800m, add 200m weekly till 1.6km, then train speed","Long jump practice 2x/week (5 attempts, focus technique)","High jump + strength 2x/week","Rest 1-2 days; stretch daily"] }
        : undefined,
      goal: { meaning: isCode ? "Being able to build real things without a tutorial." : "Being able to recall and apply it in an exam without notes.", time: isCode ? "3-6 months at 1hr/day" : "2-4 months at 1hr/day", skip: ["memorizing everything", "watching tutorials all day", "buying 5 courses"] },
      roadmap: isCode ? CODE_MILESTONES : STUDY_MILESTONES,
      projects: isCode
        ? [{ name: "number guessing game", difficulty: "easy", time: "1 day", learn: "loops + input" }, { name: "to-do CLI", difficulty: "easy", time: "2 days", learn: "functions + files" }, { name: "weather app", difficulty: "medium", time: "3 days", learn: "APIs" }, { name: "portfolio project", difficulty: "hard", time: "1-2 weeks", learn: "everything together" }]
        : [{ name: "chapter notes", difficulty: "easy", time: "ongoing", learn: "summarizing" }, { name: "50 question set", difficulty: "medium", time: "1 week", learn: "application" }, { name: "weekly mock test", difficulty: "medium", time: "weekly", learn: "exam skill" }, { name: "flashcard deck", difficulty: "easy", time: "ongoing", learn: "memory" }],
      resources: R,
      practice: isCode ? [{ name: "Exercism / Codewars", what: "small daily problems" }, { name: "LeetCode (easy)", what: "once basics are solid" }, { name: "build & break things", what: "the real practice" }] : [{ name: "Previous-year papers", what: "the single best practice" }, { name: "Mock tests", what: "weekly, timed" }, { name: "Flashcards (this app)", what: "daily recall" }],
      mistakes: { beginner: ["tutorial hell — watching without doing", "copy-pasting without understanding", "trying to learn everything at once"], intermediate: ["skipping fundamentals", "only doing tutorials, never real work", "not reviewing old topics"], advanced: ["not building a portfolio / not testing yourself", "ignoring weak areas", "no revision system"] },
      prereq: isCode ? ["basics → loops → functions", "functions → projects", "projects → APIs → deploy"] : ["NCERT/base first", "base → practice questions", "questions → mocks → revision"],
      schedule: { oneHour: "25 min learn + 25 min practice + 10 min recall", twoHour: "one full 8-phase block from the method below", weekend: "two blocks + one real project / mock test" },
      tips: ["Do a little every day — consistency beats intensity", "Build/answer from memory, not from the screen", "Make flashcards for anything you forget", "Teach it out loud (Feynman)", "Review weekly so you never re-learn"],
    };
  };

  const generate = async () => {
    setBusy(true); setBp(null); setEdit(false);
    try {
      const res = await fetch("/api/learn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: topic || category, category, level, hours, goal }) });
      const d = await res.json().catch(() => null);
      if (res.ok && d && d.roadmap) setBp(d); else { setBp(buildOffline()); notify("🌐 " + (d?.error || "AI busy — built-in plan")); }
    } catch { setBp(buildOffline()); notify("🌐 AI busy — built-in plan"); }
    setBusy(false);
  };

  const save = async () => {
    if (!bp || !uid) return notify("⚠️ Login first");
    const { error } = await supabase.from("learn_blueprints").insert({ user_id: uid, title: bp.title, category, data: bp });
    notify(error ? "⚠️ Save failed" : "💾 Saved!");
    await load();
  };
  const del = async (id: string) => { await supabase.from("learn_blueprints").delete().eq("id", id); setSaved(saved.filter((s) => s.id !== id)); };
  const open = (s: any) => { setBp(s.data); setEdit(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const makeFlashcards = async () => {
    if (!bp || !uid) return notify("⚠️ Login first");
    const rows = bp.roadmap.map((r) => ({ user_id: uid, subject: bp.title, front: `${r.m} — what to do?`, back: `${r.topics} → ${r.project}` }));
    const { error } = await supabase.from("flashcards").insert(rows);
    notify(error ? "⚠️ Failed" : `🃏 ${rows.length} flashcards added!`);
  };
  const toReview = () => { if (!bp) return; addTopic(uid || "guest", `Learn: ${bp.title}`, true); notify("🔄 Added to Review!"); };

  const download = () => {
    if (!bp) return;
    let t = `🎓 ${bp.title}\n${"=".repeat(40)}\n\nGOAL\n${bp.goal.meaning}\nTime: ${bp.goal.time}\nSkip: ${bp.goal.skip.join(", ")}\n\nTHE 8-PHASE METHOD (daily)\n`;
    METHOD.forEach((m) => (t += `${m.n}. ${m.name} (${m.min}m) — ${m.what}\n`));
    t += `\nROADMAP\n`; bp.roadmap.forEach((r) => (t += `• ${r.m}: ${r.topics} → ${r.project} (check: ${r.checkpoint})\n`));
    t += `\nPROJECTS\n`; bp.projects.forEach((p) => (t += `• ${p.name} [${p.difficulty}, ${p.time}] — ${p.learn}\n`));
    t += `\nRESOURCES\nFree: ${bp.resources.free.join(", ")}\nSearch: ${bp.resources.search.join(" | ")}\nPaid: ${bp.resources.paid.join(", ")}\nBook: ${bp.resources.book}\n\nPRACTICE\n`; bp.practice.forEach((p) => (t += `• ${p.name} — ${p.what}\n`));
    t += `\nMISTAKES\nBeginner: ${bp.mistakes.beginner.join("; ")}\nIntermediate: ${bp.mistakes.intermediate.join("; ")}\nAdvanced: ${bp.mistakes.advanced.join("; ")}\n\nORDER\n${bp.prereq.join(" → ")}\n\nSCHEDULE\n1h: ${bp.schedule.oneHour}\n2h: ${bp.schedule.twoHour}\nWeekend: ${bp.schedule.weekend}\n\nTIPS\n${bp.tips.map((x) => `• ${x}`).join("\n")}\n`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([t], { type: "text/plain" }));
    a.download = "learn-blueprint.txt"; a.click();
    notify("⬇️ Downloaded!");
  };

  const inputCls = "w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-violet-500";
  const Card = ({ icon: I, color, title, children }: any) => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <p className={`text-xs font-black mb-2 flex items-center gap-1.5 ${color}`}><I size={14} /> {title}</p>
      {children}
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 p-5 shadow-xl shadow-purple-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center"><GraduationCap size={22} className="text-white" /></span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Learn Anything</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">Master blueprint — plan, resources, projects, method</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 grid gap-3 grid-cols-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} col-span-2`}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Specific topic (e.g. Python, Class 9 History)" className={`${inputCls} col-span-2`} />
        <select value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls}>
          {["Beginner","Intermediate","Advanced"].map((l) => <option key={l}>{l}</option>)}
        </select>
        <select value={hours} onChange={(e) => setHours(e.target.value)} className={inputCls}>
          {["30 min/day","1 hour/day","2 hours/day","Weekend only"].map((h) => <option key={h}>{h}</option>)}
        </select>
        <select value={goal} onChange={(e) => setGoal(e.target.value)} className={`${inputCls} col-span-2`}>
          {["Get a job","Pass an exam","Build a project","Just for fun"].map((g) => <option key={g}>{g}</option>)}
        </select>
        <button onClick={generate} disabled={busy} className="press col-span-2 py-3 rounded-xl bg-violet-500/15 border border-violet-500/30 text-sm font-black text-violet-300 disabled:opacity-50 flex items-center justify-center gap-1.5">
          <Sparkles size={15} /> {busy ? "Building…" : "Build My Blueprint"}
        </button>
      </div>
      {msg && <p className="text-center text-xs font-bold text-violet-300 mb-3">{msg}</p>}

      {bp && (
        <div className="grid gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-base text-white flex-1 min-w-0">{bp.title}</h3>
            <button onClick={() => setEdit(!edit)} className="press px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-black text-slate-300 flex items-center gap-1"><Pencil size={12} /> {edit ? "Done" : "Edit"}</button>
            <button onClick={save} className="press px-3 py-2 rounded-lg bg-amber-600/20 border border-amber-500/30 text-xs font-black text-amber-300 flex items-center gap-1"><Save size={12} /> Save</button>
            <button onClick={makeFlashcards} className="press px-3 py-2 rounded-lg bg-violet-600/20 border border-violet-500/30 text-xs font-black text-violet-300 flex items-center gap-1"><Layers size={12} /> Cards</button>
            <button onClick={toReview} className="press px-3 py-2 rounded-lg bg-teal-600/20 border border-teal-500/30 text-xs font-black text-teal-300 flex items-center gap-1"><Timer size={12} /> Review</button>
            <button onClick={download} className="press px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-black text-slate-300"><Download size={12} /></button>
          </div>

          <Card icon={MapIcon} color="text-blue-400" title="🎯 GOAL DECODED">
            {edit ? (
              <div className="grid gap-2">
                <textarea value={bp.goal.meaning} onChange={(e) => setGoalP({ meaning: e.target.value })} rows={2} className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-sm" />
                <input value={bp.goal.time} onChange={(e) => setGoalP({ time: e.target.value })} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-xs" />
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-200 mb-1">{bp.goal.meaning}</p>
                <p className="text-xs text-slate-400 mb-1">⏱ {bp.goal.time}</p>
                <p className="text-xs text-slate-400">Skip: {bp.goal.skip.join(", ")}</p>
              </>
            )}
          </Card>

          {(bp.stages || []).length > 0 && (
            <Card icon={ListOrdered} color="text-purple-400" title="🧾 FULL SYLLABUS / SELECTION STAGES">
              <ol className="list-decimal list-inside">{bp.stages!.map((s, i) => <li key={i} className="text-xs text-slate-300 mb-1">{s}</li>)}</ol>
            </Card>
          )}
          {bp.physical && (
            <Card icon={Dumbbell} color="text-red-400" title="🏃 PHYSICAL TEST PREP">
              <p className="text-[10px] font-black text-slate-500">EVENTS</p>
              <ul className="mb-2">{bp.physical.events.map((e, i) => <li key={i} className="text-xs text-slate-300">• {e}</li>)}</ul>
              <p className="text-[10px] font-black text-slate-500">WEEKLY PLAN</p>
              <ul>{bp.physical.plan.map((p, i) => <li key={i} className="text-xs text-slate-300">• {p}</li>)}</ul>
            </Card>
          )}

          <Card icon={Timer} color="text-emerald-400" title="🧠 THE 8-PHASE METHOD (your daily session)">
            <div className="grid gap-2">
              {METHOD.map((m) => (
                <div key={m.n} className="bg-slate-800/60 rounded-xl p-2.5 flex gap-2">
                  <span className="w-6 h-6 shrink-0 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-black flex items-center justify-center">{m.n}</span>
                  <div><p className="text-xs font-bold text-white">{m.name} <span className="text-slate-500">({m.min}m)</span></p><p className="text-[11px] text-slate-400">{m.what}</p></div>
                </div>
              ))}
            </div>
          </Card>

          <Card icon={ListOrdered} color="text-indigo-400" title="🗺️ ROADMAP (milestones)">
            <div className="grid gap-2">{bp.roadmap.map((r, i) => (
              <div key={i} className="bg-slate-800/60 rounded-xl p-3">
                {edit ? (
                  <div className="grid gap-2">
                    <input value={r.m} onChange={(e) => setRoad(i, { m: e.target.value })} className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs" />
                    <input value={r.topics} onChange={(e) => setRoad(i, { topics: e.target.value })} className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs" />
                    <input value={r.project} onChange={(e) => setRoad(i, { project: e.target.value })} className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs" />
                    <input value={r.checkpoint} onChange={(e) => setRoad(i, { checkpoint: e.target.value })} className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-bold text-white">{i + 1}. {r.m}</p>
                    <p className="text-[11px] text-slate-400">Learn: {r.topics}</p>
                    <p className="text-[11px] text-indigo-300">Build/Do: {r.project}</p>
                    <p className="text-[11px] text-green-400">Check: {r.checkpoint}</p>
                  </>
                )}
              </div>
            ))}</div>
          </Card>

          <Card icon={Hammer} color="text-orange-400" title="🛠️ PROJECT / PRACTICE LADDER">
            <div className="grid gap-2">{bp.projects.map((p, i) => (
              <div key={i} className="bg-slate-800/60 rounded-xl p-3 flex justify-between items-center">
                <div><p className="text-sm font-bold text-white">{p.name}</p><p className="text-[11px] text-slate-400">{p.learn} • {p.time}</p></div>
                <span className="text-[10px] font-black px-2 py-1 rounded-md bg-orange-500/10 text-orange-300">{p.difficulty}</span>
              </div>
            ))}</div>
          </Card>

          <Card icon={BookOpen} color="text-cyan-400" title="📚 RESOURCES (no dead links)">
            <p className="text-[10px] font-black text-slate-500">FREE</p><ul className="mb-2">{bp.resources.free.map((f, i) => <li key={i} className="text-xs text-slate-300">• {f}</li>)}</ul>
            <p className="text-[10px] font-black text-slate-500">SEARCH THESE (YouTube/Google)</p><ul className="mb-2">{bp.resources.search.map((f, i) => <li key={i} className="text-xs text-cyan-300">🔍 {f}</li>)}</ul>
            <p className="text-[10px] font-black text-slate-500">PAID (optional)</p><ul className="mb-2">{bp.resources.paid.map((f, i) => <li key={i} className="text-xs text-slate-300">• {f}</li>)}</ul>
            <p className="text-xs text-slate-300">📖 Book: {bp.resources.book}</p>
          </Card>

          <Card icon={Dumbbell} color="text-green-400" title="🧪 WHERE TO PRACTICE">
            <ul>{bp.practice.map((p, i) => <li key={i} className="text-xs text-slate-300 mb-1">• <b>{p.name}</b> — {p.what}</li>)}</ul>
          </Card>

          <Card icon={AlertTriangle} color="text-red-400" title="⚠️ MISTAKES TO AVOID">
            <p className="text-[10px] font-black text-slate-500">BEGINNER</p><ul className="mb-2">{bp.mistakes.beginner.map((m, i) => <li key={i} className="text-xs text-slate-300">✖ {m}</li>)}</ul>
            <p className="text-[10px] font-black text-slate-500">INTERMEDIATE</p><ul className="mb-2">{bp.mistakes.intermediate.map((m, i) => <li key={i} className="text-xs text-slate-300">✖ {m}</li>)}</ul>
            <p className="text-[10px] font-black text-slate-500">ADVANCED</p><ul>{bp.mistakes.advanced.map((m, i) => <li key={i} className="text-xs text-slate-300">✖ {m}</li>)}</ul>
          </Card>

          <Card icon={ListOrdered} color="text-amber-400" title="🧩 LEARN IN THIS ORDER">
            <p className="text-sm text-slate-200">{bp.prereq.join(" → ")}</p>
          </Card>

          <Card icon={Calendar} color="text-blue-400" title="📅 SCHEDULE (pick yours)">
            {edit ? (
              <div className="grid gap-2">
                <input value={bp.schedule.oneHour} onChange={(e) => setSched({ oneHour: e.target.value })} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-xs" />
                <input value={bp.schedule.twoHour} onChange={(e) => setSched({ twoHour: e.target.value })} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-xs" />
                <input value={bp.schedule.weekend} onChange={(e) => setSched({ weekend: e.target.value })} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-xs" />
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-300 mb-1">1h/day: {bp.schedule.oneHour}</p>
                <p className="text-xs text-slate-300 mb-1">2h/day: {bp.schedule.twoHour}</p>
                <p className="text-xs text-slate-300">Weekend: {bp.schedule.weekend}</p>
              </>
            )}
          </Card>

          <Card icon={Lightbulb} color="text-yellow-400" title="🔑 TIPS">
            {edit ? (
              <textarea value={bp.tips.join("\n")} onChange={(e) => setBp({ ...bp, tips: e.target.value.split("\n") })} rows={5} className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-sm" />
            ) : (
              <ul>{bp.tips.map((t, i) => <li key={i} className="text-xs text-slate-300 mb-1">• {t}</li>)}</ul>
            )}
          </Card>
        </div>
      )}

      {saved.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mt-5">
          <p className="text-xs font-black text-slate-400 mb-3">💾 SAVED LEARNING BLUEPRINTS ({saved.length})</p>
          <div className="grid gap-2">
            {saved.map((s) => (
              <div key={s.id} className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                <button onClick={() => open(s)} className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold text-white truncate">{s.title}</p>
                  <p className="text-[10px] text-slate-500">{s.category}</p>
                </button>
                <button onClick={() => del(s.id)} className="w-8 h-8 shrink-0 rounded-lg bg-slate-900 border border-slate-700 text-red-400 flex items-center justify-center"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link href="/study" className="inline-block mt-6 text-sm text-slate-500 hover:text-white press font-bold">← Back to Study</Link>
    </main>
  );
}