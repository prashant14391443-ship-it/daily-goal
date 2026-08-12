"use client";

import { useEffect, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";

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
  const [error, setError] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [micError, setMicError] = useState(false);

  useEffect(() => {
    let activeRoom: Room | null = null;

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
        activeRoom = r;

        // Listen for incoming audio from other people and attach it
        r.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (track.kind === Track.Kind.Audio) {
            const element = track.attach();
            document.body.appendChild(element);
          }
        });

        // Cleanup audio when someone leaves
        r.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach().forEach((el) => el.remove());
        });

        // 1. Connect to the room FIRST
        await r.connect(data.url, data.token);

        // 2. MOBILE FIX: Force the phone's audio context to wake up
        await r.startAudio().catch(console.error);

        const updateList = () => {
          const names = [r.localParticipant.identity];
          r.remoteParticipants.forEach((p) => names.push(p.identity));
          setParticipants(names);
        };

        r.on(RoomEvent.ParticipantConnected, updateList);
        r.on(RoomEvent.ParticipantDisconnected, updateList);
        updateList();

        // 3. Show the room UI immediately so it doesn't crash
        setRoom(r);

        // 4. LAPTOP FIX: Try to turn on the mic entirely separately
        // We do NOT use "await" here, so if it fails, it doesn't crash the room!
        r.localParticipant.setMicrophoneEnabled(true).catch((err) => {
          console.warn("Mic error:", err);
          setMuted(true);
          setMicError(true);
        });

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to connect";
        setError(msg);
      }
    };
    
    connect();

    return () => {
      activeRoom?.disconnect();
    };
  }, [roomName, identity, onLeave]);

  const toggleMute = async () => {
    if (!room) return;
    try {
      const newState = !muted;
      await room.localParticipant.setMicrophoneEnabled(!newState);
      setMuted(newState);
      setMicError(false); // Clear the error if they plugged a mic in!
    } catch (err) {
      alert("No microphone found! Please plug one in or check browser permissions.");
      setMicError(true);
      setMuted(true);
    }
  };

  const leave = async () => {
    room?.disconnect();
    onLeave();
  };

  if (error)
    return (
      <p className="text-red-400 text-center p-4 bg-red-900/20 rounded-xl border border-red-500/30">
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
    <div className="bg-slate-900 border border-green-500/40 rounded-xl p-5 shadow-lg">
      <p className="text-center text-green-400 font-bold mb-3">
        🟢 Live Room — {participants.length} {participants.length === 1 ? "person" : "people"}
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

      {micError && (
        <p className="text-xs text-amber-400 text-center mb-4 bg-amber-900/20 p-2 rounded">
          ⚠️ No microphone detected. You can hear others, but they can't hear you.
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={toggleMute}
          className={`flex-1 py-3 rounded font-semibold transition-colors ${
            muted
              ? "bg-red-600 hover:bg-red-500"
              : "bg-slate-700 hover:bg-slate-600"
          }`}
        >
          {muted ? "🔇 Unmute" : "🎤 Mute"}
        </button>
        <button
          onClick={leave}
          className="flex-1 py-3 rounded bg-slate-800 border border-red-500/50 text-red-400 hover:bg-red-600 hover:text-white font-semibold transition-colors"
        >
          ❌ Leave
        </button>
      </div>
    </div>
  );
}