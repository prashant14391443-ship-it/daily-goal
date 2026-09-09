"use client";
import { useEffect, useState } from "react";
import { Upload, Save, Trash2, FileText, Loader2, CheckCircle2, Coins } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { authHeaders } from "@/lib/testApi";
import { SSC_CGL_T1 } from "@/lib/examPatterns";

type Extracted = {
  question_text: string; options: string[]; correct_index: number;
  explanation: string; topic: string; topic_id: string; section_id: string;
};

const YEARS = [2025, 2024, 2023, 2022, 2021, 2020];

export default function ContributePage() {
  const [uid, setUid] = useState<string | null>(null);
  const [file, setFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [year, setYear] = useState(2024);
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<Extracted[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      setUid(data.session?.user.id || null);
    };
    load();
  }, []);

  const allTopics = SSC_CGL_T1.sections.flatMap((s) => s.topics.map((t) => ({ ...t, section_id: s.id })));

  const guessTopic = (guess: string) => {
    const g = (guess || "").toLowerCase();
    if (g) {
      const hit = allTopics.find((t) => g.includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(g));
      if (hit) return hit;
      const word = g.split(/[ ,(&]/)[0];
      const hit2 = allTopics.find((t) => t.name.toLowerCase().includes(word) && word.length > 3);
      if (hit2) return hit2;
    }
    return allTopics[0];
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 3_500_000) { alert("File too big (max ~3.5 MB)."); return; }
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => setFile(String(reader.result));
    reader.readAsDataURL(f);
  };

  const extract = async () => {
    if (!file) return;
    setExtracting(true); setMsg(""); setItems([]);
    try {
      const res = await fetch("/api/community/upload", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "extract", dataUrl: file }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Extraction failed");
      setItems((d.questions || []).map((q: any) => {
        const t = guessTopic(q.topic);
        return { ...q, topic_id: t.id, section_id: t.section_id };
      }));
      setMsg(`✅ Extracted ${d.questions.length} questions — review and submit!`);
    } catch (e: any) { setMsg(`❌ ${e.message}`); }
    setExtracting(false);
  };

  const update = (i: number, patch: Partial<Extracted>) => {
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  };

  const submit = async () => {
    const valid = items.filter((q) => q.question_text.trim() && q.correct_index >= 0);
    if (valid.length === 0) { alert("No valid questions."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/community/upload", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "submit", exam_id: SSC_CGL_T1.id, year, questions: valid }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Submit failed");
      setMsg(`🎉 ${d.submitted} questions submitted! You'll earn ${d.submitted * 10} coins when approved.`);
      setItems([]); setFile(null); setFileName("");
    } catch (e: any) { setMsg(`❌ ${e.message}`); }
    setSubmitting(false);
  };

  if (!uid) {
    return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6"><p className="text-sm font-black">Please login to contribute.</p></main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-black flex items-center gap-2"><Coins size={22} className="text-amber-400" /> Contribute PYQs & Earn Coins</h1>
        <p className="text-[11px] text-slate-500 font-semibold mt-1">Upload papers → get 10 coins per approved question</p>
      </div>

      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-4">
        <p className="text-[11px] text-emerald-200 font-semibold">
          💰 <strong>Earn coins:</strong> 10 coins per question approved • Help build the question bank • Get credited as contributor
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
        <label className="press block bg-slate-800 border-2 border-dashed border-slate-700 hover:border-emerald-500/40 rounded-xl p-5 text-center cursor-pointer">
          <Upload size={22} className="text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-300">{fileName || "Tap to upload paper (PDF or photo, max 3.5 MB)"}</p>
          <input type="file" accept="application/pdf,image/*" onChange={onFile} className="hidden" />
        </label>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <p className="text-[10px] font-black text-slate-400 uppercase">Paper Year:</p>
          <div className="flex gap-1.5 flex-wrap">
            {YEARS.map((y) => (
              <button key={y} onClick={() => setYear(y)} className={`press px-2.5 py-1 rounded-lg text-[11px] font-black border ${year === y ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>{y}</button>
            ))}
          </div>
        </div>
        <button onClick={extract} disabled={!file || extracting} className="press w-full mt-3 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {extracting ? <><Loader2 size={16} className="animate-spin" /> Extracting...</> : <>Extract Questions</>}
        </button>
        {msg && <p className="text-xs font-bold text-center mt-3 text-slate-300">{msg}</p>}
      </div>

      {items.length > 0 && (
        <div className="grid gap-3 mb-4">
          <p className="text-xs font-black text-emerald-400">Review these questions before submitting:</p>
          {items.map((q, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-emerald-400">Q{i + 1}</p>
                <button onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))} className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-red-400 flex items-center justify-center"><Trash2 size={12} /></button>
              </div>
              <textarea value={q.question_text} onChange={(e) => update(i, { question_text: e.target.value })} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-sm outline-none focus:border-emerald-500 mb-2" />
              <div className="grid gap-1.5 mb-2">
                {q.options.map((opt, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <button onClick={() => update(i, { correct_index: j })} className={`shrink-0 w-7 h-7 rounded-full text-xs font-black flex items-center justify-center ${q.correct_index === j ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400"}`}>{String.fromCharCode(65 + j)}</button>
                    <input value={opt} onChange={(e) => { const ops = [...q.options]; ops[j] = e.target.value; update(i, { options: ops }); }} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs outline-none focus:border-emerald-500" />
                  </div>
                ))}
              </div>
              <select value={q.topic_id} onChange={(e) => { const t = allTopics.find((x) => x.id === e.target.value)!; update(i, { topic_id: t.id, section_id: t.section_id }); }} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs outline-none focus:border-emerald-500 mb-2">
                {SSC_CGL_T1.sections.map((s) => (
                  <optgroup key={s.id} label={s.shortName}>
                    {s.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </optgroup>
                ))}
              </select>
              <input value={q.explanation} onChange={(e) => update(i, { explanation: e.target.value })} placeholder="Explanation (optional)" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs outline-none focus:border-emerald-500" />
              {q.correct_index === -1 && <p className="text-[10px] font-bold text-amber-400 mt-2">⚠️ Mark the correct answer!</p>}
            </div>
          ))}
          <button onClick={submit} disabled={submitting} className="press w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 font-black text-base flex items-center justify-center gap-2 disabled:opacity-50">
            {submitting ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : <><Save size={18} /> Submit {items.length} Questions for Review</>}
          </button>
        </div>
      )}
    </main>
  );
}