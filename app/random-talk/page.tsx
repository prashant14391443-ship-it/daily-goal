"use client";

import { useEffect, useRef, useState } from "react";
import LivekitRoom from "@/app/LivekitRoom";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

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
  const [showHint, setShowHint] = useState(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 6000);
    return () => clearTimeout(t);
  }, []);

  // SMART DISCONNECT: Automatically ends the call if the stranger leaves
  useEffect(() => {
    if (state !== "talk" || !room) return;
    
    let checks = 0;
    const dropCheck = setInterval(async () => {
      checks++;
      if (checks < 3) return; // Wait a few seconds for both users to fully join the DB
      
      const { count } = await supabase
        .from("talk_queue")
        .select("*", { count: "exact", head: true })
        .eq("room_code", room);
        
      // If the count drops below 2, it means the stranger deleted their row (they left)
      if (count !== null && count < 2) {
        end();
      }
    }, 3000);

    return () => clearInterval(dropCheck);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, room]);

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

  const reportStranger = async () => {
    const reason = prompt("What did the stranger say wrong?");
    if (!reason || !reason.trim()) return;
    await supabase.from("community_reports").insert({
      community_id: null,
      user_id: me,
      reason: `🎙️ Voice talk (room ${room}): ${reason.trim()}`,
    });
    alert("✅ Reported. Moderators will review this person.");
  };

  return (
    <main className="min-h-screen bg-[#0a0f1c] text-white p-4 md:p-8 pb-12">
      {/* HEADER */}
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3 tracking-tight">
          <span className="text-4xl drop-shadow-md">🎲</span>
          Talk to a Stranger
        </h1>
        
        {/* REPORT BUTTON */}
        {state === "talk" && (
          <button
            onClick={reportStranger}
            title="Report Stranger"
            className="px-4 py-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-slate-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center gap-2 group shadow-lg"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="group-hover:fill-red-500/20 transition-colors"
            >
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
              <line x1="4" y1="22" x2="4" y2="15"></line>
            </svg>
            <span className="font-bold text-sm hidden md:inline">Report</span>
          </button>
        )}
      </div>

      {/* IDLE STATE */}
      {state === "idle" && (
        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 text-center max-w-md mx-auto shadow-2xl mt-12">
          <p className="text-7xl mb-6">🎲</p>
          <p className="text-slate-400 mb-8 leading-relaxed font-medium">
            Press the button below. When another member also presses it, you will both securely enter a private room to talk.
          </p>
          <button
            onClick={start}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 font-bold text-lg shadow-lg shadow-pink-900/20 transition-all active:scale-[0.98]"
          >
            🎙️ Find Me a Partner
          </button>
        </div>
      )}

      {/* WAITING STATE */}
      {state === "waiting" && (
        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 text-center max-w-md mx-auto shadow-2xl mt-12">
          <p className="text-6xl mb-6 animate-pulse">🔍</p>
          <p className="text-2xl font-bold mb-3 text-slate-100">Finding a partner...</p>
          <p className="text-sm text-slate-400 mb-8 leading-relaxed">
            Keep this screen open. Connection happens within seconds of another member pressing the button.
          </p>
          <button
            onClick={end}
            className="px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all border border-slate-700 hover:border-slate-600"
          >
            ✖ Cancel
          </button>
        </div>
      )}

      {/* TALK STATE (Unified Layout) */}
      {state === "talk" && (
        <div className="max-w-xl mx-auto w-full">
          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl p-2 md:p-3 flex flex-col gap-3">
            
            {/* LiveKit component renders Chat + Mic/Speaker controls here */}
            <LivekitRoom roomName={room} identity={displayName} onLeave={end} />
            
            {/* DOCKED ACTIONS: Next and End buttons sit permanently under LiveKit */}
            <div className="flex gap-2 pt-3 border-t border-slate-800/80">
              <button
                onClick={next}
                className="flex-1 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold shadow-lg shadow-violet-900/20 transition-all active:scale-[0.98] text-white flex items-center justify-center gap-2 text-sm md:text-base"
              >
                🎲 Next Stranger
              </button>
              <button
                onClick={end}
                className="flex-1 py-4 rounded-xl bg-red-600 hover:bg-red-500 font-bold shadow-lg shadow-red-900/20 transition-all active:scale-[0.98] text-white flex items-center justify-center gap-2 text-sm md:text-base"
              >
                ❌ End Call
              </button>
            </div>

          </div>
          
          {showHint && (
            <p className="text-center text-[11px] text-slate-500 mt-4 uppercase tracking-wider font-bold">
              🤝 Be respectful — a real person is listening.
            </p>
          )}
        </div>
      )}
    </main>
  );
}