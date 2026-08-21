"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Msg = { role: "user" | "assistant"; content: string };

export default function EnglishPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [left, setLeft] = useState(16);
  const [uid, setUid] = useState("guest");
  const [micReady, setMicReady] = useState(false);
  const [micLoading, setMicLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recTimerRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  useEffect(() => {
    const initMic = async () => {
      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        setMicReady(true);
        setTimeout(() => {
          stream.getTracks().forEach((t) => t.stop());
          micStreamRef.current = null;
        }, 100);
      } catch (e) {
        console.log("Mic init deferred");
      }
    };
    initMic();
    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const id = data.session?.user.id || "guest";
        setUid(id);
        const c = JSON.parse(localStorage.getItem("dg-eng-count-" + id) || "null");
        if (c && c.date === new Date().toDateString()) {
          setLeft(Math.max(0, 16 - c.n));
        } else {
          setLeft(16);
        }
      } catch (e) {
        console.error("Session load failed", e);
      }
    };
    load();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUid("guest");
        setMsgs([]);
        setLeft(16);
      } else if (session?.user) {
        setUid(session.user.id);
        setMsgs([]);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // ✅ Browser TTS - FREE, no API needed!
  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    setIsPlaying(true);
    
    const clean = text.replace(/❌|✅|Correction:|🎤 Heard:/g, "").replace(/"[^"]*"/g, "");
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = "en-US";
    utter.rate = 0.95;
    utter.pitch = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => 
      v.lang.startsWith("en") && 
      (v.name.includes("Female") || v.name.includes("Samantha") || v.name.includes("Google"))
    );
    if (femaleVoice) utter.voice = femaleVoice;
    
    utter.onstart = () => setIsPlaying(true);
    utter.onend = () => setIsPlaying(false);
    utter.onerror = () => setIsPlaying(false);
    
    window.speechSynthesis.speak(utter);
  };

  const useLimit = () => {
    if (left <= 0) {
      alert("🗣️ 16 free practice sessions per day! Come back tomorrow.");
      return false;
    }
    return true;
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
      if (recSec < 2) {
        setMsgs((m) => [...m, { role: "assistant" as const, content: "⏱️ Hold the mic for at least 2 seconds." }]);
        chunksRef.current = [];
      }
      return;
    }

    window.speechSynthesis.cancel();
    setIsPlaying(false);

    if (!useLimit()) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Mic not supported!");
      return;
    }

    if (!micReady) {
      setMicLoading(true);
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicReady(true);
      } catch {
        alert("🎤 Mic permission denied!");
        setMicLoading(false);
        return;
      }
      setMicLoading(false);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recSec < 2) return;
        const actualMimeType = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        
        if (blob.size > 3500000 || blob.size < 5000) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
          const b64 = String(reader.result).split(",")[1];
          await sendAudio(b64, actualMimeType);
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setRecSec(0);
      recTimerRef.current = window.setInterval(() => setRecSec((s) => s + 1), 1000);
    } catch {
      alert("🎤 Could not start recording.");
    }
  };

  const sendAudio = async (b64: string, mimeType: string) => {
    setMsgs((m) => [...m, { role: "user" as const, content: "🎙️ (voice message)" }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "english", audio: b64, mimeType }),
      });
      const d = await res.json();
      const heard = d.heard ? `🎤 I heard: "${d.heard}"\n\n` : "";
      const reply = d.reply || "😴 " + (d.error || "Could not hear you.");
      
      setMsgs((m) => [...m, { role: "assistant" as const, content: heard + reply }]);
      
      if (d.reply && !d.debug?.length) {
        bumpLimit();
        speak(d.reply);
      }
    } catch {
      setMsgs((m) => [...m, { role: "assistant" as const, content: "📡 Network issue!" }]);
    }
    setLoading(false);
  };

  const send = async (text?: string) => {
    if (!useLimit()) return;
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    
    window.speechSynthesis.cancel();
    setIsPlaying(false);

    const next = [...msgs, { role: "user" as const, content: msg }];
    setMsgs(next);
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: msgs.slice(-8), mode: "english" }),
      });
      const d = await res.json();
      const reply = d.reply || "😴 " + (d.error || "AI sleeping.");
      
      setMsgs([...next, { role: "assistant" as const, content: reply }]);
      
      if (d.reply) {
        bumpLimit();
        speak(d.reply);
      }
    } catch {
      setMsgs([...next, { role: "assistant" as const, content: "📡 Network issue!" }]);
    }
    setLoading(false);
  };

  return (
    <main className="h-screen bg-slate-950 text-white flex flex-col p-4 md:p-8 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-black">🗣️ English Practice {isPlaying && "🔊"}</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-blue-600/20 border border-blue-500/40 text-blue-300 px-2 py-1 rounded-lg font-bold">
            {left}/16 free
          </span>
          <button onClick={() => setMsgs([])} className="text-xs bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg">
            🗑️ Clear
          </button>
          <Link href="/community" className="text-sm text-slate-400 hover:text-white">← Back</Link>
        </div>
      </div>
      <Link href="/speaking" className="mb-3 flex items-center gap-3 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/40 rounded-xl p-3">
        <span className="text-2xl">🎙️</span>
        <span>
          <span className="block text-sm font-bold text-emerald-300">Speaking Club — NEW!</span>
          <span className="block text-xs text-slate-400">Real voice CALL with AI on any topic</span>
        </span>
      </Link>
      <div className="flex-1 overflow-y-auto grid gap-3 content-start">
        {msgs.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
            <p className="text-4xl mb-2">🎓</p>
            <p className="font-bold mb-1">Practice English without fear!</p>
            <p className="text-sm text-slate-400">Tap the 🎤 mic and speak for 2+ seconds, or type. I will correct your mistakes gently.</p>
          </div>
        )}
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] p-3 rounded-xl text-sm whitespace-pre-wrap ${
              m.role === "user" ? "justify-self-end bg-blue-600" : "justify-self-start bg-slate-800"
            }`}
          >
            {m.content}
            {m.role === "assistant" && (
              <button onClick={() => speak(m.content)} className="block mt-2 text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded">
                🔊 Replay Voice
              </button>
            )}
          </div>
        ))}
        {loading && <div className="justify-self-start bg-slate-800 p-3 rounded-xl text-sm animate-pulse">🤖 listening & thinking...</div>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
        <button
          type="button"
          onClick={toggleRecord}
          disabled={micLoading}
          className={`h-12 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            recording ? "bg-red-600 animate-pulse min-w-[70px]" : "bg-slate-800 w-14"
          }`}
        >
          {micLoading ? "..." : recording ? <>⏹️ {recSec}s</> : "🎤"}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Speak or type in English..."
          className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm"
        />
        <button disabled={loading} className="px-5 rounded-xl bg-blue-600 font-bold disabled:opacity-50">
          ➤
        </button>
      </form>
    </main>
  );
}