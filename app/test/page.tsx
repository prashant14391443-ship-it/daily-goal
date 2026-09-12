"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, Search, Landmark, Wallet, Train, ScrollText,
  GraduationCap, Shield, FlaskConical, Sigma, Cpu, School, ArrowLeft, Layers
} from "lucide-react";
import { ALL_EXAMS } from "@/lib/examPatterns";

function metaFor(id: string): { tag: string; icon: any; grad: string } {
  if (id.startsWith("SSC")) return { tag: "SSC", icon: Landmark, grad: "from-blue-500 to-indigo-600" };
  if (id.startsWith("BANK")) return { tag: "Banking", icon: Wallet, grad: "from-emerald-500 to-teal-600" };
  if (id.startsWith("RRB")) return { tag: "Railway", icon: Train, grad: "from-green-500 to-emerald-600" };
  if (id.startsWith("UPSC")) return { tag: "UPSC", icon: ScrollText, grad: "from-amber-500 to-orange-600" };
  if (id.startsWith("CTET")) return { tag: "Teaching", icon: GraduationCap, grad: "from-purple-500 to-fuchsia-600" };
  if (id.startsWith("CDS") || id.startsWith("NDA")) return { tag: "Defence", icon: Shield, grad: "from-red-500 to-rose-600" };
  if (id.startsWith("CUET")) return { tag: "University", icon: School, grad: "from-cyan-500 to-blue-600" };
  if (id.startsWith("JEE")) return { tag: "Engineering", icon: Sigma, grad: "from-indigo-500 to-violet-600" };
  if (id.startsWith("NEET")) return { tag: "Medical", icon: FlaskConical, grad: "from-teal-500 to-cyan-600" };
  if (id.startsWith("GATE")) return { tag: "Post-Grad", icon: Cpu, grad: "from-slate-500 to-slate-700" };
  return { tag: "Exam", icon: GraduationCap, grad: "from-slate-500 to-slate-700" };
}

const CATEGORIES = ["All", "SSC", "Banking", "Railway", "UPSC", "Defence", "Teaching", "Engineering", "Medical", "Post-Grad", "University"];

export default function ExamSelector() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const list = useMemo(() => {
    return ALL_EXAMS.filter((e) => {
      const m = metaFor(e.id);
      const matchSearch = (e.name + " " + e.shortName + " " + m.tag).toLowerCase().includes(q.toLowerCase());
      const matchCat = cat === "All" || m.tag === cat;
      return matchSearch && matchCat;
    });
  }, [q, cat]);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-8 pb-24 max-w-3xl mx-auto relative">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-gradient-to-b from-indigo-500/[0.06] to-transparent" />

      {/* Header */}
      <div className="relative mb-5">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/study" className="w-9 h-9 shrink-0 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center hover:border-slate-600 transition-colors">
            <ArrowLeft size={15} />
          </Link>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300/80">Step 1</p>
            <h1 className="text-xl font-semibold tracking-tight text-white">Choose Your Exam</h1>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 font-medium mt-1.5 ml-12">
          {ALL_EXAMS.length} exams · Tap to open dashboard with mocks, PYQs, notes & analytics
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search exam (SSC, NEET, Banking…)"
          className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-10 pr-4 py-3.5 text-sm outline-none focus:border-indigo-500/40 placeholder:text-slate-600 transition-colors"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 -mx-4 px-4 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-[11px] font-semibold border transition-all ${
              cat === c
                ? "bg-indigo-500/15 border-indigo-400/40 text-indigo-200"
                : "bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Exam cards */}
      <div className="grid gap-2.5 relative">
        {list.map((e) => {
          const m = metaFor(e.id);
          const Icon = m.icon;
          return (
            <button
              key={e.id}
              onClick={() => router.push(`/exam/${e.id}`)}
              className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-left hover:border-indigo-400/25 hover:bg-white/[0.04] transition-all"
            >
              <span className={`w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br ${m.grad} flex items-center justify-center shadow-lg`}>
                <Icon size={20} className="text-white" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-slate-100 truncate">{e.name}</span>
                  <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[8px] font-semibold uppercase tracking-wider text-slate-400">{m.tag}</span>
                </span>
                <span className="block text-[10px] text-slate-500 font-medium mt-1">
                  {e.totalQuestions} Qs · {e.totalMarks} marks · {e.durationMin} min · −{e.negativeMarking}
                </span>
              </span>
              <ChevronRight size={16} className="text-slate-600 shrink-0" />
            </button>
          );
        })}
        {list.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-xs text-slate-500 font-medium">No exam matches "{q}" in {cat}</p>
          </div>
        )}
      </div>
    </main>
  );
}