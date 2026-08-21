"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ✅ Type definition remains the same
type Msg = { 
  role: "user" | "assistant"; 
  content: string;
  data?: {
    scores?: { total: number; accuracy: number; expression: number; fluency: number };
    grammar_corrections?: { wrong: string; right: string; explanation: string }[];
    vocabulary_upgrades?: { basic_phrase: string; advanced_phrase: string }[];
  }
};

const TOPICS = [
  { emoji: "🛒", title: "Buying Groceries" },
  { emoji: "👔", title: "Job Interview" },
  { emoji: "🏠", title: "Your Hometown" },
  { emoji: "🎉", title: "Festivals & Culture" },
  { emoji: "🧑‍🤝‍", title: "Describing a Friend" },
  { emoji: "🗺️", title: "Famous Places" },
  { emoji: "🍕", title: "Food & Restaurants" },
  { emoji: "📚", title: "Studies & Exams" },
  { emoji: "🏏", title: "Sports & Fitness" },
  { emoji: "🎬", title: "Movies & Music" },
];

function Bar({ label, val, max, color }: { label: string; val: number; max: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (val / max) * 100));
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-12 text-slate-400">{label}</span>
      <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right font-bold">{val}</span>
    </div>
  );
}

export default function SpeakingPage() {
  const [topic, setTopic] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [mode, setMode] = useState<"" | "call" | "chat">("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [left, setLeft] = useState(16);
  const [uid, setUid] = useState("guest");

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<number | null>(null);
  const recSecRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id || "guest";
      setUid(id);
      const c = JSON.parse(localStorage.getItem("dg-eng-count-" + id) || "null");
      if (c && c.date === new Date().toDateString()) setLeft(Math.max(0, 16 - c.n));
    };
    load();
  }, []);

  useEffect(() => {
    const initMic = async () => {
      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
      } catch {}
    };
    initMic();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading, speaking]);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/❌|✅|Quick fix:/g, "");
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "en-US";
    u.rate = 1;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const stopAll = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    mediaRef.current?.stop();
    setRecording(false);
    if (recTimerRef.current) clearInterval(recTimerRef.current);
  };

  const bumpLimit = () => {
    const count = 16 - left + 1;
    setLeft(16 - count);
    localStorage.setItem("dg-eng-count-" + uid, JSON.stringify({ date: new Date().toDateString(), n: count }));
  };

  const useLimit = () => {
    if (left <= 0) {
      alert("🗣️ 16 free practice sessions per day! Come back tomorrow.");
      return false;
    }
    return true;
  };

  const startCall = async () => {
    if (!topic) return;
    setPicker(false);
    setMode("call");
    setMsgs([]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "call", topic, message: `Start the conversation about "${topic}". Greet me warmly and ask the first question.`, history: [] }),
      });
      const d = await res.json();
      if (d.reply) {
        setMsgs([{ role: "assistant", content: d.reply }]);
        speak(d.reply);
      }
    } catch {}
    setLoading(false);
  };

  const startChat = () => {
    setPicker(false);
    setMode("chat");
    setMsgs([{ role: "assistant", content: `Hi! I'm Veer 😊 Let's talk about ${topic}. Write your first sentence!` }]);
  };

  const sendAudio = async (b64: string, mime: string) => {
    setMsgs((m) => [...m, { role: "user", content: "🎙️ (voice)" }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "call", topic, audio: b64, mimeType: mime, history: msgs.slice(-6) }),
      });
      const d = await res.json();
      const heard = d.heard ? `🎤 "${d.heard}"\n\n` : "";
      const reply = d.reply || "😴 " + (d.error || "Could not hear you.");
      setMsgs((m) => [...m, { role: "assistant", content: heard + reply, data: d.structured || undefined }]);
      if (d.reply && !d.debug?.length) {
        bumpLimit();
        speak(d.reply);
      }
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "📡 Network issue!" }]);
    }
    setLoading(false);
  };

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    if (!useLimit()) return;
    setInput("");
    const next: Msg[] = [...msgs, { role: "user", content: msg }];
    setMsgs(next);
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: mode === "call" ? "call" : "english", topic: topic || "", message: msg, history: msgs.slice(-6) }),
      });
      const d = await res.json();
      const reply = d.reply || "😴 " + (d.error || "AI sleeping.");
      setMsgs([...next, { role: "assistant", content: reply, data: d.structured || undefined }]);
      if (d.reply) {
        bumpLimit();
        if (mode === "call") speak(d.reply);
      }
    } catch {
      setMsgs([...next, { role: "assistant", content: "📡 Network issue!" }]);
    }
    setLoading(false);
  };

  const toggleRecord = async () => {
    if (recording) {
      mediaRef.current?.stop();
      setRecording(false);
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      if (recSecRef.current < 2) {
        setMsgs((m) => [...m, { role: "assistant", content: "⏱️ Speak for 2+ seconds!" }]);
        chunksRef.current = [];
      }
      return;
    }
    if (!useLimit()) return;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
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
        if (blob.size < 5000 || blob.size > 3500000) return;
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

  if (!mode) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black">🎙️ Speaking Club</h1>
          <Link href="/english" className="text-sm text-slate-400">← Back</Link>
        </div>
        <p className="text-sm text-slate-400 mb-4">Pick a topic → have a REAL voice call with Veer, your AI friend!</p>
        <div className="grid grid-cols-2 gap-3">
          {TOPICS.map((t) => (
            <button
              key={t.title}
              onClick={() => { setTopic(t.title); setPicker(true); }}
              className="bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-xl p-4 text-center transition-colors"
            >
              <p className="text-3xl mb-2">{t.emoji}</p>
              <p className="text-sm font-bold">{t.title}</p>
            </button>
          ))}
        </div>

        {picker && (
          <div className="fixed inset-0 z-[90] bg-black/70 flex items-end justify-center">
            <div className="bg-slate-900 border border-slate-700 rounded-t-3xl p-6 w-full max-w-md grid gap-3">
              <div className="flex justify-between items-center">
                <p className="font-bold">Select a method to practice</p>
                <button onClick={() => setPicker(false)} className="text-slate-400 text-xl">✖</button>
              </div>
              <p className="text-xs text-slate-400">Topic: {topic}</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={startCall} className="py-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-lg">📞 Call</button>
                <button onClick={startChat} className="py-5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-lg">💬 Chat</button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="h-screen bg-slate-950 text-white flex flex-col p-4 pb-24">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-xl ${speaking ? "animate-pulse ring-4 ring-emerald-400/40" : ""}`}>🤖</span>
          <div>
            <p className="font-bold text-sm">Veer • {topic}</p>
            <p className="text-[10px] text-emerald-400">{speaking ? "🔊 Veer is speaking..." : mode === "call" ? "🎤 Your turn — tap mic & speak" : "💬 chat mode"}</p>
          </div>
        </div>
        <button
          onClick={() => { stopAll(); setMode(""); setMsgs([]); }}
          className="px-3 py-2 rounded-xl bg-red-600/20 text-red-400 text-xs font-bold"
        >
          📴 End
        </button>
      </div>

      <div className="flex-1 overflow-y-auto grid gap-3 content-start">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[85%] p-3 rounded-xl text-sm whitespace-pre-wrap ${m.role === "user" ? "justify-self-end bg-emerald-600" : "justify-self-start bg-slate-800"}`}>
            {m.content}
            {m.role === "assistant" && m.data && (
              <div className="mt-2 grid gap-2">
                <div className="flex items-center gap-3 bg-slate-900 rounded-xl p-2">
                  {/* ✅ FIXED: Used fallback to 0 to prevent undefined math errors */}
                  <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-black ${(m.data.scores?.total ?? 0) >= 70 ? "border-emerald-500 text-emerald-400" : (m.data.scores?.total ?? 0) >= 40 ? "border-amber-500 text-amber-400" : "border-red-500 text-red-400"}`}>
                    {m.data.scores?.total}
                  </div>
                  <div className="flex-1 grid gap-1">
                    <Bar label="Accuracy" val={m.data.scores?.accuracy ?? 0} max={40} color="bg-emerald-500" />
                    <Bar label="Express." val={m.data.scores?.expression ?? 0} max={30} color="bg-blue-500" />
                    <Bar label="Fluency" val={m.data.scores?.fluency ?? 0} max={30} color="bg-amber-500" />
                  </div>
                </div>
                {m.data.grammar_corrections?.map((g: any, i: number) => (
                  <div key={i} className="bg-slate-900 rounded-lg p-2 text-xs">
                    <p><span className="text-red-400 line-through">{g.wrong}</span> → <span className="text-emerald-400">{g.right}</span></p>
                    <p className="text-slate-400 text-[10px]">{g.explanation}</p>
                  </div>
                ))}
                {m.data.vocabulary_upgrades?.map((v: any, i: number) => (
                  <div key={i} className="bg-slate-900 rounded-lg p-2 text-xs">
                    <span className="text-slate-300">{v.basic_phrase}</span> → <span className="text-violet-400 font-bold">{v.advanced_phrase}</span>
                  </div>
                ))}
              </div>
            )}
            {m.role === "assistant" && mode === "chat" && (
              <button onClick={() => speak(m.content)} className="block mt-2 text-[10px] bg-slate-700 px-2 py-1 rounded">🔊 Listen</button>
            )}
          </div>
        ))}
        {loading && <div className="justify-self-start bg-slate-800 p-3 rounded-xl text-sm animate-pulse">🤖 Veer is thinking...</div>}
        <div ref={bottomRef} />
      </div>

      {mode === "call" ? (
        <div className="flex flex-col items-center gap-2 pt-2">
          <button
            onClick={toggleRecord}
            disabled={loading || speaking}
            className={`w-20 h-20 rounded-full font-bold text-sm flex items-center justify-center transition-all disabled:opacity-40 ${recording ? "bg-red-600 animate-pulse" : "bg-emerald-600 hover:bg-emerald-500"}`}
          >
            {recording ? <>⏹️ {recSec}s</> : "🎤"}
          </button>
          <p className="text-[10px] text-slate-400">{speaking ? "Listen to Veer first..." : "Tap & speak your answer"}</p>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 pt-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type in English..." className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm" />
          <button disabled={loading} className="px-5 rounded-xl bg-blue-600 font-bold disabled:opacity-50">➤</button>
        </form>
      )}
    </main>
  );
}