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
  const [micMsg, setMicMsg] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const roomRef = useRef<Room | null>(null);

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

        // 🔊 PLUG IN THE SPEAKERS (this was missing!)
        r.on(RoomEvent.TrackSubscribed, (track) => {
          const el = track.attach();
          el.classList.add("lk-audio-el");
          document.body.appendChild(el);
        });
        r.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach().forEach((el) => el.remove());
        });
        update();
        setStatus("live");

        try {
          await r.localParticipant.setMicrophoneEnabled(true);
          setMicOn(true);
        } catch {
          setMicMsg("Mic not started — tap 🎤 Enable Mic.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Connect failed");
      }
    };
    connect();
    return () => {
      cancelled = true;
      roomRef.current?.disconnect();
      document.querySelectorAll(".lk-audio-el").forEach((el) => el.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, identity]);

  const enableMic = async () => {
    const r = roomRef.current;
    if (!r) return;
    try {
      await r.localParticipant.setMicrophoneEnabled(true);
      setMicOn(true);
      setMicMsg("");
    } catch {
      setMicMsg(
        "No mic! Allow permission popup. Windows: Privacy→Microphone ON. Or earphones 🎧"
      );
    }
  };

  const muteMic = async () => {
    await roomRef.current?.localParticipant.setMicrophoneEnabled(false);
    setMicOn(false);
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

      <p className="text-[11px] text-slate-500 text-center mb-3">
        🎤 = talking • 🔇 = silent. BOTH need 🎤 to speak & hear.
      </p>

      {micMsg && (
        <p className="text-xs text-amber-400 text-center mb-4">{micMsg}</p>
      )}

      <div className="flex gap-3">
        {micOn ? (
          <button
            onClick={muteMic}
            className="flex-1 py-3 rounded bg-slate-700 hover:bg-slate-600 font-semibold"
          >
            🔇 Mute
          </button>
        ) : (
          <button
            onClick={enableMic}
            className="flex-1 py-3 rounded bg-green-600 hover:bg-green-500 font-semibold"
          >
            🎤 Enable Mic
          </button>
        )}
        <button
          onClick={leave}
          className="flex-1 py-3 rounded bg-slate-800 border border-red-500/50 text-red-400 hover:bg-red-600 hover:text-white font-semibold"
        >
          ❌ Leave
        </button>
      </div>
    </div>
  );
}