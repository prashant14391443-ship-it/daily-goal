"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent } from "livekit-client";
import { supabase } from "@/lib/supabase";
import { callBudget, addCallSeconds } from "@/lib/callLimits";

type ChatMsg = { who: string; text: string; me: boolean };

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

export default function LivekitRoom({
  roomName,
  identity,
  onLeave,
}: {
  roomName: string;
  identity: string;
  onLeave: () => void;
}) {
  const [status, setStatus] = useState<"connecting" | "live">("connecting");
  const [error, setError] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [micMsg, setMicMsg] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [sec, setSec] = useState(0);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [myId, setMyId] = useState("");
  const [myLeft, setMyLeft] = useState(900); // 15 min in seconds
  const [poolLeft, setPoolLeft] = useState(18000); // 300 min in seconds
  const roomRef = useRef<Room | null>(null);
  const elsRef = useRef<HTMLMediaElement[]>([]);
  const soundRef = useRef(true);
  const aloneRef = useRef<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const secRef = useRef(0);
  const syncRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const lastSyncedRef = useRef(0);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  useEffect(() => {
    if (status !== "live") return;
    const id = setInterval(() => {
      setSec((x) => {
        const next = x + 1;
        secRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    
    const connect = async () => {
      try {
        // 🔒 CHECK BUDGET BEFORE CONNECTING
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user.id;
        if (!uid) throw new Error("Not logged in");
        setMyId(uid);

        const budget = await callBudget(uid);
        setMyLeft(budget.myLeft);
        setPoolLeft(budget.poolLeft);
        if (!budget.ok) {
          alert(budget.reason);
          onLeave();
          return;
        }

        const res = await fetch("/api/voice-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: roomName, identity }),
        });
        const data2 = await res.json();
        if (!res.ok) throw new Error(data2.error || "Token failed");

        const r = new Room();
        roomRef.current = r;
        await r.connect(data2.url, data2.token);
        if (cancelled) {
          r.disconnect();
          return;
        }

        const update = () => {
          const list: string[] = [];
          r.remoteParticipants.forEach((p) => list.push(p.identity));
          setNames(list);
        };

        r.on(RoomEvent.ParticipantConnected, update);
        r.on(RoomEvent.ParticipantDisconnected, update);
        r.on(RoomEvent.Disconnected, () => {
          clearInterval(syncRef.current!);
          onLeave();
        });

        r.on(RoomEvent.DataReceived, (payload, participant) => {
          try {
            const obj = JSON.parse(new TextDecoder().decode(payload));
            if (obj && obj.text)
              setMsgs((prev) => [
                ...prev,
                { who: participant?.identity || "friend", text: String(obj.text), me: false },
              ]);
          } catch {
            // ignore
          }
        });

        r.on(RoomEvent.TrackSubscribed, (track) => {
          const el = track.attach() as HTMLMediaElement;
          el.muted = !soundRef.current;
          elsRef.current.push(el);
          document.body.appendChild(el);
        });
        r.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach().forEach((el) => {
            elsRef.current = elsRef.current.filter((x) => x !== el);
            el.remove();
          });
        });

        update();
        setStatus("live");
        startedAtRef.current = Date.now();
        lastSyncedRef.current = Date.now();

        // 📊 SYNC USAGE EVERY 30 SECONDS
        syncRef.current = window.setInterval(() => {
          const now = Date.now();
          const delta = Math.floor((now - lastSyncedRef.current) / 1000);
          if (delta > 0 && uid) {
            addCallSeconds(uid, delta);
            lastSyncedRef.current = now;
          }
        }, 30000);

        try {
          await (r as unknown as { startAudio?: () => Promise<void> }).startAudio?.();
        } catch {
          // ignore
        }
        try {
          await r.localParticipant.setMicrophoneEnabled(true);
          setMicOn(true);
        } catch {
          setMicMsg("Mic blocked — tap the mic button after allowing permission.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Connect failed");
      }
    };
    
    connect();
    return () => {
      cancelled = true;
      if (syncRef.current) clearInterval(syncRef.current);
      // SYNC REMAINING SECONDS ON DISCONNECT
      if (myId && startedAtRef.current > 0) {
        const delta = Math.floor((Date.now() - lastSyncedRef.current) / 1000);
        if (delta > 0) addCallSeconds(myId, delta);
      }
      roomRef.current?.disconnect();
      elsRef.current.forEach((el) => el.remove());
      elsRef.current = [];
      setMsgs([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, identity]);

  useEffect(() => {
    if (status === "live" && names.length === 0) {
      if (!aloneRef.current)
        aloneRef.current = window.setTimeout(() => {
          roomRef.current?.disconnect();
          onLeave();
        }, 10 * 60 * 1000);
    } else if (aloneRef.current) {
      clearTimeout(aloneRef.current);
      aloneRef.current = null;
    }
    return () => {
      if (aloneRef.current) {
        clearTimeout(aloneRef.current);
        aloneRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names.length, status]);

  const toggleMic = async () => {
    const r = roomRef.current;
    if (!r) return;
    try {
      await r.localParticipant.setMicrophoneEnabled(!micOn);
      setMicOn(!micOn);
      if (!micOn) setMicMsg("");
    } catch {
      setMicMsg("No mic on this device — use earphones 🎧 or check settings.");
    }
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundRef.current = next;
    elsRef.current.forEach((el) => {
      el.muted = !next;
    });
  };

  const sendMsg = async () => {
    const text = input.trim();
    if (!text || !roomRef.current) return;
    const bytes = new TextEncoder().encode(JSON.stringify({ who: identity, text }));
    try {
      await roomRef.current.localParticipant.publishData(bytes, { reliable: true });
      setMsgs((prev) => [...prev, { who: identity, text, me: true }]);
      setInput("");
    } catch {
      // ignore
    }
  };

  const leave = () => {
    roomRef.current?.disconnect();
    onLeave();
  };

  if (error)
    return (
      <p className="text-red-400 text-center p-4 bg-red-900/20 rounded-2xl">❌ {error}</p>
    );

  if (status === "connecting")
    return (
      <p className="text-slate-400 text-center p-6 animate-pulse bg-slate-900/60 rounded-2xl">
        📡 Checking call budget & connecting...
      </p>
    );

  return (
    <div className="min-h-[calc(100dvh-150px)] flex flex-col rounded-3xl bg-slate-900/70 p-4">
      {/* 1️⃣ SINGLE CLEAN HEADER + TIMER + BUDGET */}
      <div className="text-center mb-3">
        <p className="text-white font-bold">
          {names.length > 0 ? (
            <>🟢 Talking with {names.join(", ")} • {fmt(sec)}</>
          ) : (
            <>🟢 Connected — waiting for someone • {fmt(sec)}</>
          )}
        </p>
        <p className="text-[10px] text-slate-400 mt-1">
          🎙 {fmt(myLeft - secRef.current)} left today • 🌍 {fmt(poolLeft)} pool left
        </p>
      </div>

      {micMsg && (
        <p className="text-xs text-amber-400 text-center mb-3">{micMsg}</p>
      )}

      {/* 4️⃣ SOFT CHAT CONTAINER */}
      <div className="bg-slate-950/50 rounded-2xl p-3 mb-3 flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
          {msgs.length === 0 && (
            <p className="text-center text-xs text-slate-600 py-4">
              💬 Messages auto-delete when call ends
            </p>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.me ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm break-words ${
                  m.me
                    ? "bg-violet-600 text-white rounded-br-sm"
                    : "bg-slate-800 text-white rounded-bl-sm"
                }`}
              >
                {!m.me && (
                  <p className="text-[9px] font-bold text-slate-400 mb-0.5">{m.who}</p>
                )}
                {m.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMsg();
          }}
          className="flex gap-2 mt-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            maxLength={300}
            className="flex-1 p-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white"
          />
          <button
            type="submit"
            className="px-4 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-sm text-white"
          >
            ➤
          </button>
        </form>
      </div>

      {/* 2️⃣ SINGLE CONTROL PILL */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={toggleMic}
          className={`flex-1 py-3 rounded-xl font-semibold ${
            micOn ? "bg-green-600/90 text-white" : "bg-slate-800 text-slate-300"
          }`}
        >
          {micOn ? "🎙️ Mic ON" : "🔇 Muted"}
        </button>
        <button
          onClick={toggleSound}
          className={`flex-1 py-3 rounded-xl font-semibold ${
            soundOn ? "bg-green-600/90 text-white" : "bg-slate-800 text-slate-300"
          }`}
        >
          {soundOn ? "🔊 Speaker" : "🔇 Muted"}
        </button>
        <button
          onClick={leave}
          className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 font-semibold text-white"
        >
          ❌
        </button>
      </div>
    </div>
  );
}