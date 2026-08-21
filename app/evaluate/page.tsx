"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const Bar = ({ label, val, max, color }: any) => (
  <div className="flex items-center gap-2">
    <span className="text-[9px] w-16 text-slate-400">{label}</span>
    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(100, (val / max) * 100)}%` }} />
    </div>
    <span className="text-[10px] font-bold">{val}/{max}</span>
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
      .replace(/[❌✅→|*_#`"“”•]/g, " ")
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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-black">📊 Speaking Test</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-violet-600/20 border border-violet-500/40 text-violet-300 px-2 py-1 rounded-lg font-bold">{left}/16</span>
          <Link href="/speaking" className="text-sm text-slate-400">← Back</Link>
        </div>
      </div>

      {!result && !loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center mb-6">
          <p className="text-4xl mb-2">🎤</p>
          <p className="font-bold mb-1">Record yourself ONCE</p>
          <p className="text-sm text-slate-400">Speak 5-20 seconds about anything — your day, a story, your hobby. Veer grades Accuracy, Expression, Fluency + fixes EVERY mistake!</p>
        </div>
      )}

      {loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center mb-6 animate-pulse">
          <p className="text-4xl mb-2">🧠</p>
          <p className="font-bold">Analyzing your English...</p>
          <p className="text-xs text-slate-400 mt-1">pronunciation • grammar • fluency • vocabulary</p>
        </div>
      )}

      {result && (
        <div className="grid gap-3 mb-6">
          {heard && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm">
              <p className="text-xs text-slate-400 mb-1">🎤 What we heard:</p>
              <p className="italic">"{heard}"</p>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className={`w-20 h-20 rounded-full border-8 flex items-center justify-center text-2xl font-black ${s?.total >= 70 ? "border-emerald-500 text-emerald-400" : s?.total >= 40 ? "border-amber-500 text-amber-400" : "border-red-500 text-red-400"}`}>
                {s?.total}
              </div>
              <div className="flex-1 grid gap-2">
                <Bar label="Accuracy" val={s?.accuracy || 0} max={40} color="bg-emerald-500" />
                <Bar label="Expression" val={s?.expression || 0} max={30} color="bg-blue-500" />
                <Bar label="Fluency" val={s?.fluency || 0} max={30} color="bg-amber-500" />
              </div>
            </div>
            <p className="text-center text-xs text-slate-400 mt-3">
              {s?.total >= 80 ? "🌟 Excellent speaker!" : s?.total >= 60 ? "💪 Good — keep practicing!" : "🌱 Keep going — practice daily!"}
            </p>
          </div>

          {result.grammar_corrections?.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 grid gap-2">
              <p className="font-bold text-sm">✏️ Grammar Fixes</p>
              {result.grammar_corrections.map((g: any, i: number) => (
                <div key={i} className="bg-slate-950 rounded-lg p-2 text-xs">
                  <p>
                    <span className="text-red-400 underline decoration-red-400 decoration-2">{g.wrong}</span> → <span className="text-emerald-400 font-bold">{g.right}</span>
                  </p>
                  <p className="text-slate-400 text-[10px] mt-0.5">{g.explanation}</p>
                </div>
              ))}
            </div>
          )}

          {result.vocabulary_upgrades?.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 grid gap-2">
              <p className="font-bold text-sm">💎 Sound More Natural</p>
              {result.vocabulary_upgrades.map((v: any, i: number) => (
                <div key={i} className="bg-slate-950 rounded-lg p-2 text-xs">
                  <span className="text-slate-300">{v.basic_phrase}</span> → <span className="text-violet-400 font-bold">{v.advanced_phrase}</span>
                </div>
              ))}
            </div>
          )}

          {result.ai_spoken_reply && (
            <button onClick={() => speak(result.ai_spoken_reply)} className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold">
              🔊 Hear Veer's feedback
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={toggleRecord}
          disabled={loading}
          className={`w-24 h-24 rounded-full text-3xl flex items-center justify-center transition-all disabled:opacity-40 ${recording ? "bg-red-600 animate-pulse" : "bg-violet-600 hover:bg-violet-500"}`}
        >
          {recording ? "⏹️" : "🎤"}
        </button>
        <p className="text-xs text-slate-400">
          {recording ? `Recording... ${recSec}s (tap to stop)` : result ? "🎤 Try Again — beat your score!" : "Tap & speak"}
        </p>
      </div>
    </main>
  );
}