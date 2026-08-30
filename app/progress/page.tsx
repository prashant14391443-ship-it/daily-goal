"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { TrendingUp, TrendingDown, Camera, Trophy, Plus, Trash2, LineChart, Lightbulb, Loader2, Download } from "lucide-react";

// --- Types ---
interface WeightRecord { id: string; weight: number; log_date: string; }
interface ProgressPhoto { id: string; view: string; photo_url: string; created_at: string; }
interface PRLog { id: string; exercise: string; weight: number; reps: number; }

// --- Utilities ---
const calculate1RM = (weight: number, reps: number) => Math.round(weight * (1 + reps / 30));

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 800;
        let { width, height } = img;

        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

// --- Sub-components ---
const WeightChart = ({ data }: { data: WeightRecord[] }) => {
  if (data.length < 2) {
    return <p className="text-xs text-slate-500 text-center py-8">Log at least 2 weights to see your trend.</p>;
  }
  
  const weights = data.map((d) => d.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const padding = 16;
  const width = 320;
  const height = 140;

  const getX = (index: number) => padding + (index * (width - 2 * padding)) / (data.length - 1);
  const getY = (w: number) => height - padding - ((w - min) / (max - min || 1)) * (height - 2 * padding);
  const points = data.map((d, i) => `${getX(i)},${getY(d.weight)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
      <polyline points={points} fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={getX(i)} cy={getY(d.weight)} r="4" fill="#22c55e" className="shadow-sm" />
      ))}
      <text x={padding} y={getY(max) - 8} fill="#94a3b8" fontSize="10" fontWeight="bold">{max}kg</text>
      <text x={padding} y={getY(min) + 14} fill="#94a3b8" fontSize="10" fontWeight="bold">{min}kg</text>
    </svg>
  );
};

// --- Main Component ---
export default function ProgressPage() {
  const [activeTab, setActiveTab] = useState<"weight" | "photos" | "prs">("weight");
  const [userId, setUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "success" });

  // State
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [prs, setPrs] = useState<PRLog[]>([]);
  
  // Inputs
  const [newWeight, setNewWeight] = useState("");
  const [photoView, setPhotoView] = useState("front");
  const [photoImg, setPhotoImg] = useState<string | null>(null);
  const [prForm, setPrForm] = useState({ exercise: "", weight: "", reps: "" });

  const [userSettings, setUserSettings] = useState({ height: 0, direction: "maintain" });

  const notify = (text: string, type: "success" | "error" = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "success" }), 3000);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        setUserId(session.user.id);

        try {
          const cached = JSON.parse(localStorage.getItem("dg-calc") || "null");
          if (cached) setUserSettings({ height: Number(cached.height) || 0, direction: cached.result?.direction || "maintain" });
        } catch (e) { console.error("Cache error", e); }

        const [weightRes, photoRes, prRes] = await Promise.all([
          supabase.from("progress_weights").select("*").eq("user_id", session.user.id).order("log_date"),
          supabase.from("progress_photos").select("*").eq("user_id", session.user.id).order("created_at"),
          supabase.from("progress_prs").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false })
        ]);

        if (weightRes.data) setWeights(weightRes.data as WeightRecord[]);
        if (photoRes.data) setPhotos(photoRes.data as ProgressPhoto[]);
        if (prRes.data) setPrs(prRes.data as PRLog[]);
      } catch (error) {
        notify("Failed to load data", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // --- Handlers ---
  const handleAddWeight = async () => {
    if (!userId || !newWeight) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from("progress_weights").insert({ user_id: userId, weight: Number(newWeight) }).select().single();
      if (error) throw error;
      setWeights((prev) => [...prev, data as WeightRecord].sort((a, b) => a.log_date.localeCompare(b.log_date)));
      setNewWeight("");
      notify("⚖️ Weight logged successfully!");
    } catch (e) {
      notify("Failed to log weight", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoImg(await compressImage(file));
  };

  const handleSavePhoto = async () => {
    if (!userId || !photoImg) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from("progress_photos").insert({ user_id: userId, view: photoView, photo_url: photoImg }).select().single();
      if (error) throw error;
      setPhotos((prev) => [...prev, data as ProgressPhoto]);
      setPhotoImg(null);
      notify("📸 Progress photo saved!");
    } catch (e) {
      notify("Failed to save photo", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPR = async () => {
    if (!userId || !prForm.exercise || !prForm.weight) return;
    setIsSubmitting(true);
    
    try {
      const new1RM = calculate1RM(Number(prForm.weight), Number(prForm.reps) || 1);
      const previousLifts = prs.filter((p) => p.exercise.toLowerCase() === prForm.exercise.toLowerCase());
      const previousMax = previousLifts.length ? Math.max(...previousLifts.map(p => calculate1RM(p.weight, p.reps))) : 0;
      const isNewPR = previousLifts.length === 0 || new1RM > previousMax;

      const { data, error } = await supabase.from("progress_prs").insert({ 
        user_id: userId, 
        exercise: prForm.exercise, 
        weight: Number(prForm.weight), 
        reps: Number(prForm.reps) || 1 
      }).select().single();
      
      if (error) throw error;
      
      setPrs((prev) => [data as PRLog, ...prev]);
      setPrForm({ exercise: "", weight: "", reps: "" });
      notify(isNewPR ? `🏆 NEW PR! Est. 1RM ${new1RM}kg` : "💪 Lift logged successfully!");
    } catch (e) {
      notify("Failed to log PR", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteItem = async (table: string, id: string, stateSetter: Function) => {
    await supabase.from(table).delete().eq("id", id);
    stateSetter((prev: any[]) => prev.filter((item: any) => item.id !== id));
  };

  // --- Export Function ---
  const handleExportCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      notify("No data to export", "error");
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(val => `"${val}"`).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    notify(`💾 ${filename} exported successfully!`);
  };

  // --- Derived Data ---
  const currentWeight = weights.length ? weights[weights.length - 1].weight : 0;
  const startWeight = weights.length ? weights[0].weight : 0;
  const weightChange = Math.round((currentWeight - startWeight) * 10) / 10;
  const bmi = currentWeight && userSettings.height ? Math.round((currentWeight / Math.pow(userSettings.height / 100, 2)) * 10) / 10 : 0;
  
  const generateInsight = () => {
    if (!weights.length) return "Log your weight to start tracking.";
    if (userSettings.direction === "loss") return weightChange < 0 ? `Great work — down ${Math.abs(weightChange)}kg. Keep going! 🔥` : "Weight is steady or up — review your caloric deficit.";
    if (userSettings.direction === "gain") return weightChange > 0 ? `Up ${weightChange}kg — solid bulking progress! 🏋️` : "Eat in a slight surplus to stimulate growth.";
    return "Maintaining nicely.";
  };

  const filteredPhotos = photos.filter((p) => p.view === photoView).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const firstPhoto = filteredPhotos[0];
  const lastPhoto = filteredPhotos[filteredPhotos.length - 1];
  const inputBaseStyle = "w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm outline-none focus:border-green-500 transition-colors";

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-green-500" size={32} /></div>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 p-5 shadow-xl shadow-emerald-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 shrink-0 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm"><LineChart size={24} className="text-white" /></div>
          <div>
            <h1 className="text-xl font-black text-white leading-tight">Progress Tracker</h1>
            <p className="text-xs text-white/80 font-medium mt-1">Visualize your transformation</p>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-[10px] text-slate-400 font-bold tracking-wider mb-1">CURRENT</p>
          <p className="text-2xl font-black text-white">{currentWeight || "—"}<span className="text-sm font-medium text-slate-500 ml-1">kg</span></p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-[10px] text-slate-400 font-bold tracking-wider mb-1">CHANGE</p>
          <p className={`text-2xl font-black flex items-center justify-center gap-1 ${weightChange > 0 ? "text-red-400" : weightChange < 0 ? "text-green-400" : "text-slate-300"}`}>
            {weightChange > 0 ? <TrendingUp size={18} /> : weightChange < 0 ? <TrendingDown size={18} /> : null}
            {Math.abs(weightChange) || 0}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-[10px] text-slate-400 font-bold tracking-wider mb-1">BMI</p>
          <p className="text-2xl font-black text-blue-400">{bmi || "—"}</p>
        </div>
      </div>

      {/* AI Insight */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 mb-6 flex items-center gap-3">
        <div className="bg-amber-500/20 p-2 rounded-lg shrink-0"><Lightbulb size={16} className="text-amber-400" /></div>
        <p className="text-sm text-slate-300 font-medium">{generateInsight()}</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 p-1 bg-slate-900 rounded-xl border border-slate-800">
        {(["weight", "photos", "prs"] as const).map((t) => (
          <button 
            key={t} 
            onClick={() => setActiveTab(t)} 
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold capitalize transition-all ${activeTab === t ? "bg-slate-800 text-green-400 shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
          >
            {t === "weight" ? "⚖️ Weight" : t === "photos" ? "📸 Photos" : "🏆 PRs"}
          </button>
        ))}
      </div>

      {/* Toast Notification */}
      {msg.text && (
        <div className={`text-center text-sm font-bold p-3 rounded-lg mb-4 ${msg.type === "error" ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
          {msg.text}
        </div>
      )}

      {/* Content Tabs */}
      <div className="space-y-4">
        {activeTab === "weight" && (
          <>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex gap-3 mb-6">
                <input type="number" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} placeholder="Today's weight (kg)" className={inputBaseStyle} disabled={isSubmitting} />
                <button onClick={handleAddWeight} disabled={isSubmitting || !newWeight} className="px-5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-sm font-bold flex items-center gap-2 transition-colors">
                  <Plus size={16} /> Log
                </button>
              </div>
              <WeightChart data={weights} />
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-slate-500 tracking-wider">WEIGHT HISTORY</p>
                <button 
                  onClick={() => handleExportCSV(weights, 'Weight-History')}
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-green-400 transition-colors bg-slate-800/50 px-2 py-1 rounded-md"
                >
                  <Download size={12} />
                  EXPORT CSV
                </button>
              </div>
              <div className="space-y-2">
                {[...weights].reverse().map((w) => (
                  <div key={w.id} className="flex items-center justify-between bg-slate-950/50 rounded-xl p-3">
                    <span className="text-slate-400 text-sm font-medium">{new Date(w.log_date).toLocaleDateString()}</span>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-white">{w.weight} kg</span>
                      <button onClick={() => deleteItem("progress_weights", w.id, setWeights)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {!weights.length && <p className="text-center text-slate-500 text-sm py-4">No weight entries yet.</p>}
              </div>
            </div>
          </>
        )}

        {activeTab === "photos" && (
          <>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <select value={photoView} onChange={(e) => setPhotoView(e.target.value)} className={`${inputBaseStyle} mb-4`}>
                <option value="front">Front View</option>
                <option value="side">Side View</option>
                <option value="back">Back View</option>
              </select>
              
              {!photoImg ? (
                <label className="block bg-slate-950/50 border-2 border-dashed border-slate-700 hover:border-green-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors">
                  <Camera size={32} className="mx-auto text-slate-400 mb-3" />
                  <p className="text-sm font-bold text-slate-300">Tap to upload {photoView} photo</p>
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
                </label>
              ) : (
                <div className="animate-in fade-in zoom-in duration-300">
                  <img src={photoImg} alt="Preview" className="rounded-xl w-full max-h-64 object-cover mb-4 shadow-lg border border-slate-700" />
                  <div className="flex gap-2">
                    <button onClick={() => setPhotoImg(null)} className="flex-1 py-3 rounded-xl bg-slate-800 text-sm font-bold">Cancel</button>
                    <button onClick={handleSavePhoto} disabled={isSubmitting} className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-sm font-bold shadow-lg shadow-green-900/20 disabled:opacity-50">Save Photo</button>
                  </div>
                </div>
              )}
            </div>

            {firstPhoto && lastPhoto && firstPhoto.id !== lastPhoto.id && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-500 mb-4 tracking-wider">PROGRESS COMPARISON</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative group">
                    <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold">Before</span>
                    <img src={firstPhoto.photo_url} alt="First" className="rounded-xl w-full h-48 object-cover" />
                  </div>
                  <div className="relative group">
                    <span className="absolute top-2 left-2 bg-green-500/80 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold">Latest</span>
                    <img src={lastPhoto.photo_url} alt="Last" className="rounded-xl w-full h-48 object-cover border-2 border-green-500/50" />
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-500 mb-4 tracking-wider">GALLERY ({photoView.toUpperCase()})</p>
              <div className="grid grid-cols-3 gap-2">
                {filteredPhotos.map((p) => (
                  <div key={p.id} className="relative group rounded-xl overflow-hidden aspect-square border border-slate-800">
                    <img src={p.photo_url} alt={p.view} className="w-full h-full object-cover" />
                    <button onClick={() => deleteItem("progress_photos", p.id, setPhotos)} className="absolute top-1 right-1 w-7 h-7 rounded-lg bg-black/70 text-slate-300 hover:text-red-400 flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                  </div>
                ))}
                {!filteredPhotos.length && <p className="col-span-3 text-center text-slate-500 text-sm py-4">No photos for this view.</p>}
              </div>
            </div>
          </>
        )}

        {activeTab === "prs" && (
          <>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <input value={prForm.exercise} onChange={(e) => setPrForm({...prForm, exercise: e.target.value})} placeholder="Exercise (e.g. Barbell Squat)" className={inputBaseStyle} disabled={isSubmitting} />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={prForm.weight} onChange={(e) => setPrForm({...prForm, weight: e.target.value})} placeholder="Weight (kg)" className={inputBaseStyle} disabled={isSubmitting} />
                <input type="number" value={prForm.reps} onChange={(e) => setPrForm({...prForm, reps: e.target.value})} placeholder="Reps" className={inputBaseStyle} disabled={isSubmitting} />
              </div>
              <button onClick={handleAddPR} disabled={isSubmitting || !prForm.exercise || !prForm.weight} className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 transition-all">
                <Trophy size={18} /> Log Personal Record
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-slate-500 tracking-wider">LIFTING HISTORY</p>
                <button 
                  onClick={() => handleExportCSV(prs, 'PR-History')}
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-green-400 transition-colors bg-slate-800/50 px-2 py-1 rounded-md"
                >
                  <Download size={12} />
                  EXPORT CSV
                </button>
              </div>
              <div className="space-y-2">
                {prs.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-slate-950/50 rounded-xl p-3 border border-slate-800/50">
                    <div>
                      <p className="font-bold text-white text-sm">{p.exercise}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.weight}kg × {p.reps} reps</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="block text-[10px] text-slate-500 font-bold uppercase">Est. 1RM</span>
                        <span className="text-sm font-black text-amber-400">{calculate1RM(p.weight, p.reps)}kg</span>
                      </div>
                      <button onClick={() => deleteItem("progress_prs", p.id, setPrs)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {!prs.length && <p className="text-center text-slate-500 text-sm py-4">No PRs logged yet.</p>}
              </div>
            </div>
          </>
        )}
      </div>

      <Link href="/gym-log" className="inline-flex items-center gap-2 mt-8 text-sm text-slate-500 hover:text-white font-bold transition-colors">
        ← Back to Gym Log
      </Link>
    </main>
  );
}