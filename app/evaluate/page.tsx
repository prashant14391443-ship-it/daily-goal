"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { BarChart3, ArrowLeft, Mic, Square, Volume2, Check, Pencil, Sparkles, Brain, Target } from "lucide-react";

const Bar = ({ label, val, max, color }: any) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] w-16 text-slate-400 font-medium">{label}</span>
    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, (val / max) * 100)}%` }} />
    </div>
    <span className="text-[10px] font-semibold text-slate-300 w-12 text-right">{val}/{max}</span>
  </div>
);

export default function EvaluatePage() {
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [heard, setHeard] = useState("");
  const [left, setLeft] = useState(16);
  const [uid, setUid] = useState("guest");

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<number | null>(null);
  const recSecRef = useRef(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id || "guest";
      setUid(id);
      const c = JSON.parse(localStorage.getItem("dg-eng-count-" + id) || "null");
      if (c && c.date === new Date().toDateString()) setLeft(Math.max(0, 16 - c.n));
    };
    load();
    const warm = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
      } catch {}
    };
    warm();
  }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text
      .replace(/[❌✅→|*_#`""•]/g, " ")
      .replace(/\bcomma\b|\bquote\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  };

  const bumpLimit = () => {
    const count = 16 - left + 1;
    setLeft(16 - count);
    localStorage.setItem("dg-eng-count-" + uid, JSON.stringify({ date: new Date().toDateString(), n: count }));
  };

  const toggleRecord = async () => {
    if (recording) {
      mediaRef.current?.stop();
      setRecording(false);
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      if (recSecRef.current < 2) alert("⏱️ Speak for at least 2 seconds!");
      return;
    }
    if (left <= 0) {
      alert("🗣️ Daily limit reached! Come back tomorrow.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recSecRef.current < 2) return;
        const mime = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 5000 || blob.size > 3500000) {
          alert("Recording problem — try again!");
          return;
        }
        const reader = new FileReader();
        reader.onloadend = async () => {
          await sendAudio(String(reader.result).split(",")[1], mime);
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      recSecRef.current = 0;
      setRecSec(0);
      recTimerRef.current = window.setInterval(() => {
        recSecRef.current += 1;
        setRecSec(recSecRef.current);
      }, 1000);
    } catch {
      alert("🎤 Mic permission denied!");
    }
  };

  const sendAudio = async (b64: string, mime: string) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "evaluate", audio: b64, mimeType: mime }),
      });
      const d = await res.json();
      if (d.structured) {
        setResult(d.structured);
        setHeard(d.heard || "");
        bumpLimit();
        if (d.reply) speak(d.reply);
      } else {
        const dbg = d.debug ? `\n\nDEBUG:\n${d.debug.join("\n")}` : "";
        alert("😴 " + (d.error || "Could not evaluate — try again!") + dbg);
      }
    } catch {
      alert("📡 Network issue!");
    }
    setLoading(false);
  };

  const s = result?.scores;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <BarChart3 size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Speaking Test</h1>
            <p className="text-xs text-slate-400">AI-powered evaluation</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5">
            <Target size={14} className="text-violet-400" />
            <span className="text-xs font-semibold text-slate-300">{left}/16</span>
          </div>
          <Link href="/speaking" className="text-slate-400 hover:text-slate-300">
            <ArrowLeft size={18} />
          </Link>
        </div>
      </div>

      {!result && !loading && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Mic size={28} className="text-violet-400" />
          </div>
          <p className="font-semibold mb-2">Record yourself ONCE</p>
          <p className="text-sm text-slate-400 leading-relaxed">
            Speak 5-20 seconds about anything — your day, a story, your hobby. Veer grades Accuracy, Expression, Fluency + fixes EVERY mistake!
          </p>
        </div>
      )}

      {loading && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center animate-pulse">
            <Brain size={28} className="text-violet-400" />
          </div>
          <p className="font-semibold mb-1">Analyzing your English...</p>
          <p className="text-xs text-slate-400">pronunciation • grammar • fluency • vocabulary</p>
        </div>
      )}

      {result && (
        <div className="grid gap-3 mb-6">
          {heard && (
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Mic size={14} className="text-slate-400" />
                <p className="text-xs font-semibold text-slate-400">What we heard</p>
              </div>
              <p className="text-sm text-slate-300 italic">"{heard}"</p>
            </div>
          )}

          {result.corrected_version && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check size={14} className="text-emerald-400" />
                <p className="text-xs font-semibold text-emerald-400">Corrected Version</p>
              </div>
              <p className="text-sm text-emerald-100">{result.corrected_version}</p>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center text-2xl font-bold ${
                s?.total >= 70 
                  ? "border-emerald-500 text-emerald-400 bg-emerald-500/5" 
                  : s?.total >= 40 
                  ? "border-amber-500 text-amber-400 bg-amber-500/5" 
                  : "border-red-500 text-red-400 bg-red-500/5"
              }`}>
                {s?.total}
              </div>
              <div className="flex-1 grid gap-2">
                <Bar label="Accuracy" val={s?.accuracy || 0} max={30} color="bg-emerald-500" />
                <Bar label="Pronun." val={s?.pronunciation || 0} max={20} color="bg-pink-500" />
                <Bar label="Expression" val={s?.expression || 0} max={25} color="bg-blue-500" />
                <Bar label="Fluency" val={s?.fluency || 0} max={25} color="bg-amber-500" />
              </div>
            </div>
            <p className="text-center text-xs text-slate-400 font-medium">
              {s?.total >= 80 ? "🌟 Excellent speaker!" : s?.total >= 60 ? "💪 Good — keep practicing!" : "🌱 Keep going — practice daily!"}
            </p>
          </div>

          {result.grammar_corrections?.length > 0 && (
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Pencil size={16} className="text-amber-400" />
                <p className="font-semibold text-sm">Grammar Fixes</p>
              </div>
              <div className="grid gap-2">
                {result.grammar_corrections.map((g: any, i: number) => (
                  <div key={i} className="bg-slate-800 rounded-xl p-3">
                    <p className="text-sm mb-1">
                      <span className="text-red-400 line-through decoration-red-400 decoration-2">{g.wrong}</span>
                      <span className="text-slate-500 mx-2">→</span>
                      <span className="text-emerald-400 font-semibold">{g.right}</span>
                    </p>
                    <p className="text-xs text-slate-400">{g.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.vocabulary_upgrades?.length > 0 && (
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-violet-400" />
                <p className="font-semibold text-sm">Sound More Natural</p>
              </div>
              <div className="grid gap-2">
                {result.vocabulary_upgrades.map((v: any, i: number) => (
                  <div key={i} className="bg-slate-800 rounded-xl p-3 text-sm">
                    <span className="text-slate-300">{v.basic_phrase}</span>
                    <span className="text-slate-500 mx-2">→</span>
                    <span className="text-violet-400 font-semibold">{v.advanced_phrase}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.ai_spoken_reply && (
            <button 
              onClick={() => speak(result.ai_spoken_reply)} 
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors"
            >
              <Volume2 size={16} />
              Hear Veer's feedback
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <button
          onClick={toggleRecord}
          disabled={loading}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all disabled:opacity-40 ${
            recording 
              ? "bg-red-600 animate-pulse border-4 border-red-400" 
              : "bg-violet-600 hover:bg-violet-500 border-4 border-violet-400"
          }`}
        >
          {recording ? <Square size={32} className="text-white" /> : <Mic size={32} className="text-white" />}
        </button>
        <p className="text-xs text-slate-400 font-medium">
          {recording ? `Recording... ${recSec}s (tap to stop)` : result ? "Try Again — beat your score!" : "Tap & speak"}
        </p>
      </div>
    </main>
  );
}