"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent } from "livekit-client";

type Person = { name: string; mic: boolean };

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
  const [people, setPeople] = useState<Person[]>([]);
  const roomRef = useRef<Room | null>(null);
  const elsRef = useRef<HTMLMediaElement[]>([]);
  const soundRef = useRef(true);
  const aloneRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const connect = async () => {
      try {
        const res = await fetch("/api/voice-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: roomName, identity }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Token failed");

        const r = new Room();
        roomRef.current = r;
        await r.connect(data.url, data.token);
        if (cancelled) {
          r.disconnect();
          return;
        }

        const update = () => {
          const list: Person[] = [
            { name: identity, mic: r.localParticipant.isMicrophoneEnabled },
          ];
          r.remoteParticipants.forEach((p) =>
            list.push({ name: p.identity, mic: p.isMicrophoneEnabled })
          );
          setPeople(list);
        };

        r.on(RoomEvent.ParticipantConnected, update);
        r.on(RoomEvent.ParticipantDisconnected, update);
        r.on(RoomEvent.TrackPublished, update);
        r.on(RoomEvent.TrackUnpublished, update);
        r.on(RoomEvent.TrackMuted, update);
        r.on(RoomEvent.TrackUnmuted, update);
        r.on(RoomEvent.Disconnected, () => onLeave());

        // plug the other person's voice into the page
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
        try {
          await (r as unknown as { startAudio?: () => Promise<void> }).startAudio?.();
        } catch {
          // ignore
        }

        try {
          await r.localParticipant.setMicrophoneEnabled(true);
          setMicOn(true);
        } catch {
          setMicMsg("Mic blocked — tap 🎤 button after allowing permission.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Connect failed");
      }
    };
    connect();
    return () => {
      cancelled = true;
      roomRef.current?.disconnect();
      elsRef.current.forEach((el) => el.remove());
      elsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, identity]);

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

  const leave = () => {
    roomRef.current?.disconnect();
    onLeave();
  };

  if (error)
    return (
      <p className="text-red-400 text-center p-4 bg-red-900/20 rounded-xl">❌ {error}</p>
    );

  if (status === "connecting")
    return (
      <p className="text-slate-400 text-center p-6 animate-pulse bg-slate-900 rounded-xl">
        📡 Connecting...
      </p>
    );

  return (
    <div className="bg-slate-900 border border-green-500/40 rounded-xl p-5">
      <p className="text-center text-green-400 font-bold mb-3">
        🟢 Live Room — {people.length} {people.length === 1 ? "person" : "people"}
      </p>

      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {people.map((p, i) => (
          <div
            key={i}
            className="bg-slate-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                p.mic ? "bg-green-500 animate-pulse" : "bg-red-500"
              }`}
            />
            {p.mic ? "🎤" : "🔇"} {p.name}
          </div>
        ))}
      </div>

      {micMsg && (
        <p className="text-xs text-amber-400 text-center mb-3">{micMsg}</p>
      )}

      {status === "live" && people.length === 1 && (
        <p className="text-[11px] text-slate-500 text-center mb-3">
           You're alone — auto-leave in 10 min to save data & battery.
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={toggleMic}
          className={`flex-1 py-3 rounded font-semibold ${
            micOn
              ? "bg-green-600 hover:bg-green-500"
              : "bg-slate-700 hover:bg-slate-600"
          }`}
        >
          🎤 {micOn ? "ON" : "OFF"}
        </button>
        <button
          onClick={toggleSound}
          className={`flex-1 py-3 rounded font-semibold ${
            soundOn
              ? "bg-green-600 hover:bg-green-500"
              : "bg-slate-700 hover:bg-slate-600"
          }`}
        >
          {soundOn ? "🔊 ON" : "🔇 OFF"}
        </button>
        <button
          onClick={leave}
          className="px-4 py-3 rounded bg-slate-800 border border-red-500/50 text-red-400 hover:bg-red-600 hover:text-white font-semibold"
        >
          ❌
        </button>
      </div>
    </div>
  );
}