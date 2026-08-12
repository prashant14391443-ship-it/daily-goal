"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

function longRoom() {
  return (
    "TALK-" +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

export default function RandomTalkPage() {
  const [state, setState] = useState<"idle" | "waiting" | "talk">("idle");
  const [room, setRoom] = useState("");
  const [me, setMe] = useState("");
  const [displayName, setDisplayName] = useState("friend");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const meRef = useRef("");
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) {
        router.push("/login");
        return;
      }
      setMe(uid);
      meRef.current = uid;
      setDisplayName(data.session?.user.email?.split("@")[0] || "friend");
    };
    init();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (meRef.current)
        supabase.from("talk_queue").delete().eq("user_id", meRef.current);
    };
  }, []);

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const start = async () => {
    setState("waiting");
    const myRoom = longRoom();
    await supabase
      .from("talk_queue")
      .upsert({ user_id: me, status: "waiting", room_code: myRoom });

    pollRef.current = setInterval(async () => {
      const { data: mine } = await supabase
        .from("talk_queue")
        .select("*")
        .eq("user_id", me)
        .maybeSingle();
      if (!mine) {
        stopPoll();
        setState("idle");
        return;
      }
      if (mine.status === "matched" && mine.room_code) {
        stopPoll();
        setRoom(mine.room_code);
        setState("talk");
        return;
      }

      const { data: other } = await supabase
        .from("talk_queue")
        .select("*")
        .eq("status", "waiting")
        .neq("user_id", me)
        .order("updated_at", { ascending: true })
        .limit(1);

      if (other && other.length > 0) {
        const target = other[0];
        const { data: claimed } = await supabase
          .from("talk_queue")
          .update({ status: "matched" })
          .eq("user_id", target.user_id)
          .eq("status", "waiting")
          .select();
        if (claimed && claimed.length === 1) {
          await supabase
            .from("talk_queue")
            .update({ status: "matched", room_code: target.room_code })
            .eq("user_id", me);
          stopPoll();
          setRoom(target.room_code);
          setState("talk");
        }
      }
    }, 2000);
  };

  const end = async () => {
    stopPoll();
    await supabase.from("talk_queue").delete().eq("user_id", me);
    setRoom("");
    setState("idle");
  };

  const next = async () => {
    await end();
    setTimeout(start, 300);
  };

  const jitsiUrl = (r: string) =>
    `https://meet.ffmuc.net/${r}#config.prejoinConfig.enabled=false&config.requireDisplayName=false&userInfo.displayName=${encodeURIComponent(
      displayName
    )}`;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-pink-600/20 border border-pink-500/40 flex items-center justify-center text-xl">🎲</span>
          Talk to a Stranger
        </h1>
        <p className="text-slate-400">1-on-1 private voice with a random member</p>
      </div>

      {state === "idle" && (
        <div className="bg-slate-900 rounded-xl p-8 text-center max-w-md mx-auto">
          <p className="text-6xl mb-4">🎲</p>
          <p className="text-slate-400 mb-6">
            Press the button → when another member presses it, you both enter
            one private room and talk.
          </p>
          <button
            onClick={start}
            className="w-full py-4 rounded bg-pink-600 hover:bg-pink-500 font-bold text-lg"
          >
            🎙️ Find Me a Partner
          </button>
        </div>
      )}

      {state === "waiting" && (
        <div className="bg-slate-900 rounded-xl p-8 text-center max-w-md mx-auto">
          <p className="text-5xl mb-4 animate-pulse">🔍</p>
          <p className="font-bold mb-2">Finding a partner...</p>
          <p className="text-sm text-slate-400 mb-6">
            Keep this screen open. Connection happens within ~2 seconds of
            another member pressing the button.
          </p>
          <button
            onClick={end}
            className="px-6 py-3 rounded bg-slate-800 hover:bg-slate-700"
          >
            ✖ Cancel
          </button>
        </div>
      )}

      {state === "talk" && (
        <div className="max-w-md mx-auto">
          <p className="text-center text-green-400 font-bold mb-2">
            ✅ Matched! You're in a private room together.
          </p>
          <p className="text-center text-xs text-slate-400 mb-3">
            Allow microphone 🎤 when the browser asks — then talk!
          </p>
          <iframe
            src={jitsiUrl(room)}
            className="w-full rounded-xl border border-slate-700"
            style={{ height: 480 }}
            allow="camera; microphone; fullscreen; autoplay; display-capture"
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={next}
              className="flex-1 py-3 rounded bg-pink-600 hover:bg-pink-500 font-semibold"
            >
              🎲 Next Stranger
            </button>
            <button
              onClick={end}
              className="flex-1 py-3 rounded bg-slate-800 hover:bg-slate-700 font-semibold"
            >
              ❌ End
            </button>
          </div>
        </div>
      )}

      <Link
        href="/community"
        className="inline-block mt-6 text-sm text-slate-400 hover:text-white"
      >
        ← Back to Community
      </Link>
    </main>
  );
}