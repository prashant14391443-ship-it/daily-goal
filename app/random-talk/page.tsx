"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RandomTalkPage() {
  const [state, setState] = useState<"idle" | "waiting" | "talk">("idle");
  const [room, setRoom] = useState("");
  const [me, setMe] = useState("");
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
    };
    init();
    
    // Cleanup: Remove user from queue if they close the tab or navigate away
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (meRef.current) {
        supabase.from("talk_queue").delete().eq("user_id", meRef.current);
      }
    };
  }, [router]);

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const matchWith = async (otherId: string) => {
    // Generate a random 6-character room code
    const newRoom = "TALK-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    
    // Update both users in the database to 'matched' and assign the room
    const { data } = await supabase
      .from("talk_queue")
      .update({ status: "matched", room_code: newRoom })
      .in("user_id", [me, otherId])
      .eq("status", "waiting")
      .select();
      
    if (data && data.length === 2) {
      stopPoll();
      setRoom(newRoom);
      setState("talk");
      return;
    }
    
    // Fallback: Check if I was matched by someone else at the exact same millisecond
    const { data: mine } = await supabase
      .from("talk_queue")
      .select("*")
      .eq("user_id", me)
      .maybeSingle();
      
    if (mine && mine.status === "matched" && mine.room_code) {
      stopPoll();
      setRoom(mine.room_code);
      setState("talk");
    }
  };

  const start = async () => {
    setState("waiting");
    // Put myself in the waiting room
    await supabase
      .from("talk_queue")
      .upsert({ user_id: me, status: "waiting", room_code: null });

    // Look for someone else who is already waiting
    const { data } = await supabase
      .from("talk_queue")
      .select("*")
      .eq("status", "waiting")
      .neq("user_id", me)
      .limit(1);
      
    if (data && data.length > 0) {
      await matchWith(data[0].user_id);
      return;
    }

    // If nobody is waiting, poll every 2.5 seconds
    pollRef.current = setInterval(async () => {
      // 1. Check if someone else matched with me
      const { data: mine } = await supabase
        .from("talk_queue")
        .select("*")
        .eq("user_id", me)
        .maybeSingle();
        
      if (mine && mine.status === "matched" && mine.room_code) {
        stopPoll();
        setRoom(mine.room_code);
        setState("talk");
        return;
      }
      
      // 2. Check if a new person joined the waiting room
      const { data: others } = await supabase
        .from("talk_queue")
        .select("*")
        .eq("status", "waiting")
        .neq("user_id", me)
        .limit(1);
        
      if (others && others.length > 0) {
        await matchWith(others[0].user_id);
      }
    }, 2500);
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

  // MAGIC URL: This bypasses the pre-join screen, deep-link prompts, and sets default names.
  const jitsiUrl = room 
    ? `https://meet.jit.si/${room}#config.prejoinPageEnabled=false&config.disableDeepLinking=true&config.startWithVideoMuted=true&userInfo.displayName=Member` 
    : "";

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-pink-600/20 border border-pink-500/40 flex items-center justify-center text-xl">🎲</span>
          Talk to a Stranger
        </h1>
        <p className="text-slate-400">Instant 1-on-1 voice with a random member</p>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
        {state === "idle" && (
          <div className="bg-slate-900 rounded-xl p-8 text-center border border-slate-800 shadow-2xl">
            <p className="text-6xl mb-6">🎙️</p>
            <h2 className="text-2xl font-bold mb-2">Ready to talk?</h2>
            <p className="text-slate-400 mb-8">
              Press the button to instantly connect with another online member. No setup required.
            </p>
            <button
              onClick={start}
              className="w-full py-4 rounded-lg bg-pink-600 hover:bg-pink-500 font-bold text-xl transition-colors shadow-lg shadow-pink-500/20"
            >
              Start Matching
            </button>
          </div>
        )}

        {state === "waiting" && (
          <div className="bg-slate-900 rounded-xl p-8 text-center border border-slate-800 shadow-2xl">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-pink-500/20 border-t-pink-500 animate-spin"></div>
              <p className="absolute inset-0 flex items-center justify-center text-3xl">🔍</p>
            </div>
            <h2 className="text-xl font-bold mb-2">Looking for a partner...</h2>
            <p className="text-sm text-slate-400 mb-8">
              Stay on this screen. You'll connect the second someone else searches.
            </p>
            <button
              onClick={end}
              className="px-8 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {state === "talk" && (
          <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col h-[500px]">
            <div className="bg-green-600 text-white text-center py-2 font-bold text-sm">
              ✅ Connected! You are live.
            </div>
            
            <iframe
              src={jitsiUrl}
              className="w-full flex-1 bg-black"
              allow="camera; microphone; fullscreen; autoplay; display-capture"
            />
            
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-3">
              <button
                onClick={next}
                className="flex-1 py-3 rounded-lg bg-pink-600 hover:bg-pink-500 font-semibold transition-colors"
              >
                🎲 Next Person
              </button>
              <button
                onClick={end}
                className="flex-1 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold transition-colors"
              >
                End Call
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <Link
          href="/community"
          className="inline-block text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Hub
        </Link>
      </div>
    </main>
  );
}