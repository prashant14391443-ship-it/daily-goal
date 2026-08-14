"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Msg = { role: "user" | "assistant"; content: string };

export default function EnglishPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/❌|✅|Correction:/g, "");
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = "en-US";
    window.speechSynthesis.speak(utter);
  };

  const toggleMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Your browser doesn't support voice. Please type!"); return; }

    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }

    const r = new SR();
    r.lang = "en-IN"; // Indian English accent optimized
    r.interimResults = false;
    r.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput(text);
      send(text);
    };
    r.onend = () => setListening(false);
    r.start();
    recogRef.current = r;
    setListening(true);
  };

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
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
    } catch {
      setMsgs([...next, { role: "assistant" as const, content: "📡 Network issue!" }]);
    }
    setLoading(false);
  };

  return (
    <main className="h-screen bg-slate-950 text-white flex flex-col p-4 md:p-8 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-black">🗣️ English Practice</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setMsgs([])} className="text-xs bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg">
            🗑️ Clear
          </button>
          <Link href="/community" className="text-sm text-slate-400 hover:text-white">← Back</Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto grid gap-3 content-start">
        {msgs.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
            <p className="text-4xl mb-2">🎓</p>
            <p className="font-bold mb-1">Practice English without fear!</p>
            <p className="text-sm text-slate-400">Tap the 🎤 mic and speak, or type. I will correct your mistakes gently.</p>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[85%] p-3 rounded-xl text-sm whitespace-pre-wrap ${m.role === "user" ? "justify-self-end bg-blue-600" : "justify-self-start bg-slate-800"}`}>
            {m.content}
            {m.role === "assistant" && (
              <button onClick={() => speak(m.content)} className="block mt-2 text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded">
                🔊 Listen
              </button>
            )}
          </div>
        ))}
        {loading && <div className="justify-self-start bg-slate-800 p-3 rounded-xl text-sm animate-pulse">🤖 correcting...</div>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
        <button type="button" onClick={toggleMic} className={`w-14 h-12 rounded-xl font-bold text-xl ${listening ? "bg-red-600 animate-pulse" : "bg-slate-800"}`}>
          {listening ? "🔴" : "🎤"}
        </button>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Speak or type in English..." className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm" />
        <button disabled={loading} className="px-5 rounded-xl bg-blue-600 font-bold disabled:opacity-50">➤</button>
      </form>
    </main>
  );
}