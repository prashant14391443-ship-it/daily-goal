"use client";

import { useEffect, useState } from "react";
import { Room, RoomEvent } from "livekit-client";

export default function LivekitRoom({
  roomName,
  identity,
  onLeave,
}: {
  roomName: string;
  identity: string;
  onLeave: () => void;
}) {
  const [room, setRoom] = useState<Room | null>(null);
  const [muted, setMuted] = useState(false);
  const [noMic, setNoMic] = useState(false);
  const [error, setError] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);

  useEffect(() => {
    let current: Room | null = null;
    const connect = async () => {
      try {
        const res = await fetch("/api/voice-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: roomName, identity }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to get token");

        const r = new Room();
        current = r;
        await r.connect(data.url, data.token);

        try {
          await r.localParticipant.setMicrophoneEnabled(true);
          setMuted(false);
          setNoMic(false);
        } catch {
          setMuted(true);
          setNoMic(true);
        }

        r.on(RoomEvent.Disconnected, onLeave);

        const updateList = () => {
          const names = [r.localParticipant.identity];
          r.remoteParticipants.forEach((p) => names.push(p.identity));
          setParticipants(names);
        };

        r.on(RoomEvent.ParticipantConnected, updateList);
        r.on(RoomEvent.ParticipantDisconnected, updateList);
        updateList();

        setRoom(r);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to connect";
        setError(msg);
      }
    };
    connect();

    return () => {
      current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, identity]);

  const toggleMute = async () => {
    if (!room) return;
    try {
      const newState = !muted;
      await room.localParticipant.setMicrophoneEnabled(!newState);
      setMuted(newState);
      if (!newState) setNoMic(false);
    } catch {
      setNoMic(true);
    }
  };

  const leave = async () => {
    room?.disconnect();
    onLeave();
  };

  if (error)
    return (
      <p className="text-red-400 text-center p-4 bg-red-900/20 rounded-xl">
        ❌ {error}
      </p>
    );

  if (!room)
    return (
      <p className="text-slate-400 text-center p-6 animate-pulse bg-slate-900 rounded-xl">
        📡 Connecting to voice room...
      </p>
    );

  return (
    <div className="bg-slate-900 border border-green-500/40 rounded-xl p-5">
      <p className="text-center text-green-400 font-bold mb-3">
        🟢 Live Room — {participants.length}{" "}
        {participants.length === 1 ? "person" : "people"}
      </p>

      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {participants.map((name, i) => (
          <div
            key={i}
            className="bg-slate-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {name}
          </div>
        ))}
      </div>

      {noMic && (
        <p className="text-xs text-amber-400 text-center mb-4">
          ⚠️ No microphone found on this device — you can still listen.
          Check mic settings, then tap the mic button to retry.
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={toggleMute}
          className={`flex-1 py-3 rounded font-semibold ${
            muted
              ? "bg-red-600 hover:bg-red-500"
              : "bg-slate-700 hover:bg-slate-600"
          }`}
        >
          {muted ? "🎤 Try Mic" : "🔇 Mute"}
        </button>
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