"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { TrendingUp, TrendingDown, Camera, Trophy, Scale, Plus, Trash2, LineChart, Lightbulb } from "lucide-react";

type W = { id: string; weight: number; log_date: string };
type P = { id: string; view: string; photo_url: string; created_at: string };
type PR = { id: string; exercise: string; weight: number; reps: number };

const e1rm = (w: number, r: number) => Math.round(w * (1 + r / 30));

function compress(file: File): Promise<string> {
  return new Promise((res) => {
    const rd = new FileReader();
    rd.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        const max = 600;
        let { width, height } = img;
        if (width > height) { if (width > max) { height *= max / width; width = max; } }
        else { if (height > max) { width *= max / height; height = max; } }
        c.width = width; c.height = height;
        c.getContext("2d")?.drawImage(img, 0, 0, width, height);
        res(c.toDataURL("image/jpeg", 0.6));
      };
      img.src = e.target?.result as string;
    };
    rd.readAsDataURL(file);
  });
}

const Chart = ({ data }: { data: W[] }) => {
  if (data.length < 2) return <p className="text-xs text-slate-500 text-center py-4">Log at least 2 weights to see your trend.</p>;
  const ws = data.map((d) => d.weight);
  const min = Math.min(...ws), max = Math.max(...ws);
  const Wd = 320, H = 140, P = 14;
  const x = (i: number) => P + (i * (Wd - 2 * P)) / (data.length - 1);
  const y = (w: number) => H - P - ((w - min) / (max - min || 1)) * (H - 2 * P);
  const pts = data.map((d, i) => `${x(i)},${y(d.weight)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${Wd} ${H}`} className="w-full">
      <polyline points={pts} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
      {data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.weight)} r="3.5" fill="#38bdf8" />)}
      <text x={P} y={y(max) - 4} fill="#64748b" fontSize="9">{max}kg</text>
      <text x={P} y={y(min) + 10} fill="#64748b" fontSize="9">{min}kg</text>
    </svg>
  );
};

export default function ProgressPage() {
  const [tab, setTab] = useState<"weight" | "photos" | "prs">("weight");
  const [uid, setUid] = useState("");
  const [weights, setWeights] = useState<W[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [photos, setPhotos] = useState<P[]>([]);
  const [photoView, setPhotoView] = useState("front");
  const [photoImg, setPhotoImg] = useState<string | null>(null);
  const [prs, setPrs] = useState<PR[]>([]);
  const [prEx, setPrEx] = useState("");
  const [prW, setPrW] = useState("");
  const [prR, setPrR] = useState("");
  const [height, setHeight] = useState(0);
  const [direction, setDirection] = useState("maintain");
  const [msg, setMsg] = useState("");

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id;
      if (!id) return;
      setUid(id);
      try { const c = JSON.parse(localStorage.getItem("dg-calc") || "null"); if (c) { setHeight(Number(c.height) || 0); setDirection(c.result?.direction || "maintain"); } } catch {}
      const w = await supabase.from("progress_weights").select("*").eq("user_id", id).order("log_date");
      setWeights((w.data as W[]) || []);
      const p = await supabase.from("progress_photos").select("*").eq("user_id", id).order("created_at");
      setPhotos((p.data as P[]) || []);
      const r = await supabase.from("progress_prs").select("*").eq("user_id", id).order("created_at", { ascending: false });
      setPrs((r.data as PR[]) || []);
    };
    load();
  }, []);

  const addWeight = async () => {
    if (!uid || !newWeight) return;
    const { data, error } = await supabase.from("progress_weights").insert({ user_id: uid, weight: Number(newWeight) }).select().single();
    if (!error && data) setWeights([...weights, data as W].sort((a, b) => a.log_date.localeCompare(b.log_date)));
    setNewWeight("");
    notify("⚖️ Weight logged!");
  };
  const delWeight = async (id: string) => { await supabase.from("progress_weights").delete().eq("id", id); setWeights(weights.filter((w) => w.id !== id)); };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoImg(await compress(f));
  };
  const savePhoto = async () => {
    if (!uid || !photoImg) return;
    const { data, error } = await supabase.from("progress_photos").insert({ user_id: uid, view: photoView, photo_url: photoImg }).select().single();
    if (!error && data) setPhotos([...photos, data as P]);
    setPhotoImg(null);
    notify("📸 Progress photo saved!");
  };
  const delPhoto = async (id: string) => { await supabase.from("progress_photos").delete().eq("id", id); setPhotos(photos.filter((p) => p.id !== id)); };

  const addPR = async () => {
    if (!uid || !prEx || !prW) return;
    const newE = e1rm(Number(prW), Number(prR) || 1);
    const old = prs.filter((p) => p.exercise.toLowerCase() === prEx.toLowerCase()).map((p) => e1rm(p.weight, p.reps));
    const isPR = old.length === 0 || newE > Math.max(...old);
    const { data, error } = await supabase.from("progress_prs").insert({ user_id: uid, exercise: prEx, weight: Number(prW), reps: Number(prR) || 1 }).select().single();
    if (!error && data) setPrs([data as PR, ...prs]);
    setPrEx(""); setPrW(""); setPrR("");
    notify(isPR ? `🏆 NEW PR! est 1RM ${newE}kg` : "💪 Logged!");
  };
  const delPR = async (id: string) => { await supabase.from("progress_prs").delete().eq("id", id); setPrs(prs.filter((p) => p.id !== id)); };

  const sorted = [...weights].sort((a, b) => a.log_date.localeCompare(b.log_date));
  const current = sorted.length ? sorted[sorted.length - 1].weight : 0;
  const start = sorted.length ? sorted[0].weight : 0;
  const change = Math.round((current - start) * 10) / 10;
  const bmi = current && height ? Math.round((current / Math.pow(height / 100, 2)) * 10) / 10 : 0;
  const insight = !sorted.length ? "Log your weight to start tracking." : direction === "loss" ? (change < 0 ? `Great — down ${Math.abs(change)}kg. Keep going! 🔥` : change > 0 ? `Up ${change}kg — tighten calories a little.` : "Holding steady — aim for a small deficit.") : direction === "gain" ? (change > 0 ? `Up ${change}kg — bulking well! 🏋️` : "Eat a bit more to gain.") : "Maintaining nicely.";

  const viewPhotos = photos.filter((p) => p.view === photoView).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const first = viewPhotos[0], last = viewPhotos[viewPhotos.length - 1];

  const inputCls = "w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-green-500";

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 p-5 shadow-xl shadow-emerald-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center"><LineChart size={22} className="text-white" /></span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Progress Tracker</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">Photos + weight trend + PRs — see your change</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
          <p className="text-[10px] text-slate-500 font-black">CURRENT</p>
          <p className="text-xl font-black text-white">{current || "—"}kg</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
          <p className="text-[10px] text-slate-500 font-black">CHANGE</p>
          <p className={`text-xl font-black flex items-center justify-center gap-1 ${change > 0 ? "text-red-400" : change < 0 ? "text-green-400" : "text-slate-300"}`}>
            {change > 0 ? <TrendingUp size={16} /> : change < 0 ? <TrendingDown size={16} /> : null}{change || 0}kg
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
          <p className="text-[10px] text-slate-500 font-black">BMI</p>
          <p className="text-xl font-black text-blue-400">{bmi || "—"}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-5 flex items-center gap-2">
        <Lightbulb size={14} className="text-amber-400 shrink-0" />
        <p className="text-xs text-slate-300">{insight}</p>
      </div>

      <div className="flex gap-2 mb-5">
        {(["weight", "photos", "prs"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`press flex-1 py-2.5 rounded-xl text-xs font-black border capitalize ${tab === t ? "bg-green-500/15 border-green-500/30 text-green-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
            {t === "weight" ? "⚖️ Weight" : t === "photos" ? "📸 Photos" : "🏆 PRs"}
          </button>
        ))}
      </div>
      {msg && <p className="text-center text-xs font-bold text-green-300 mb-3">{msg}</p>}

      {tab === "weight" && (
        <div className="grid gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex gap-2 mb-4">
              <input type="number" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} placeholder="Today's weight (kg)" className={inputCls} />
              <button onClick={addWeight} className="press px-4 rounded-xl bg-green-600 text-sm font-black shrink-0 flex items-center gap-1"><Plus size={14} /> Log</button>
            </div>
            <Chart data={sorted} />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs font-black text-slate-400 mb-2">HISTORY</p>
            <div className="grid gap-1.5">
              {[...sorted].reverse().map((w) => (
                <div key={w.id} className="flex items-center justify-between bg-slate-800/60 rounded-lg p-2 text-sm">
                  <span className="text-slate-400 text-xs">{w.log_date}</span>
                  <span className="font-black text-white">{w.weight} kg</span>
                  <button onClick={() => delWeight(w.id)} className="text-red-400"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "photos" && (
        <div className="grid gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex gap-2 mb-3">
              <select value={photoView} onChange={(e) => setPhotoView(e.target.value)} className={inputCls}>
                <option value="front">Front</option>
                <option value="side">Side</option>
              </select>
            </div>
            <label className="press block bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl p-4 text-center cursor-pointer">
              <Camera size={22} className="mx-auto text-green-400 mb-1" />
              <p className="text-xs font-black text-slate-300">Tap to add {photoView} photo</p>
              <input type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" />
            </label>
            {photoImg && (
              <div className="mt-3">
                <img src={photoImg} alt="new" className="rounded-xl max-h-48 w-full object-cover mb-2" />
                <button onClick={savePhoto} className="press w-full py-2.5 rounded-xl bg-green-600 text-sm font-black">Save Photo</button>
              </div>
            )}
          </div>
          {first && last && first.id !== last.id && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-xs font-black text-slate-400 mb-2">THEN vs NOW</p>
              <div className="grid grid-cols-2 gap-2">
                <div><img src={first.photo_url} alt="then" className="rounded-xl w-full object-cover" /><p className="text-[10px] text-slate-500 text-center mt-1">{first.created_at.slice(0, 10)}</p></div>
                <div><img src={last.photo_url} alt="now" className="rounded-xl w-full object-cover" /><p className="text-[10px] text-green-400 text-center mt-1">{last.created_at.slice(0, 10)}</p></div>
              </div>
            </div>
          )}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs font-black text-slate-400 mb-2">ALL {photoView.toUpperCase()} PHOTOS</p>
            <div className="grid grid-cols-3 gap-2">
              {viewPhotos.map((p) => (
                <div key={p.id} className="relative">
                  <img src={p.photo_url} alt={p.view} className="rounded-lg w-full object-cover" />
                  <button onClick={() => delPhoto(p.id)} className="absolute top-1 right-1 w-6 h-6 rounded bg-black/60 text-red-400 flex items-center justify-center"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "prs" && (
        <div className="grid gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid gap-2">
            <input value={prEx} onChange={(e) => setPrEx(e.target.value)} placeholder="Exercise (e.g. Bench press)" className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={prW} onChange={(e) => setPrW(e.target.value)} placeholder="Weight (kg)" className={inputCls} />
              <input type="number" value={prR} onChange={(e) => setPrR(e.target.value)} placeholder="Reps" className={inputCls} />
            </div>
            <button onClick={addPR} className="press py-2.5 rounded-xl bg-green-600 text-sm font-black flex items-center justify-center gap-1"><Trophy size={14} /> Log Lift</button>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs font-black text-slate-400 mb-2">PERSONAL RECORDS</p>
            <div className="grid gap-1.5">
              {prs.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-slate-800/60 rounded-lg p-2.5 text-sm">
                  <div>
                    <p className="font-bold text-white">{p.exercise}</p>
                    <p className="text-[10px] text-slate-500">{p.weight}kg × {p.reps}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-400">1RM ~{e1rm(p.weight, p.reps)}kg</span>
                    <button onClick={() => delPR(p.id)} className="text-red-400"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Link href="/gym-log" className="inline-block mt-6 text-sm text-slate-500 hover:text-white press font-bold">← Back to Gym</Link>
    </main>
  );
}