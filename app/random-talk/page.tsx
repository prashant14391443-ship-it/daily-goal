"use client";

import { useEffect, useRef, useState } from "react";
import LivekitRoom from "@/app/LivekitRoom";
import CallRatingModal from "@/app/components/CallRatingModal";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Dices,
  ArrowLeft,
  Flag,
  X,
  PhoneOff,
  Shuffle,
  Mic,
  Loader2,
  HeartHandshake,
  GraduationCap,
} from "lucide-react";

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
  const [online, setOnline] = useState(0);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [rateCall, setRateCall] = useState<{ sec: number; partner: string; callId: string } | null>(null);
  const [showHint, setShowHint] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const meRef = useRef("");
  const blockedRef = useRef<Set<string>>(new Set());
  const myGenderRef = useRef("");
  const myPrefRef = useRef("any");
  const router = useRouter();

  // ── AUTH + PROFILE + BLOCKED LIST ────────────────────────────────────
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

      // profile name + gender prefs (safe fallback if columns missing)
      let name = data.session?.user.email?.split("@")[0] || "friend";
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("display_name, gender, pref_gender")
        .eq("user_id", uid)
        .maybeSingle();
      if (!error && prof) {
        name = (prof as any).display_name || name;
        myGenderRef.current = (prof as any).gender || "";
        myPrefRef.current = (prof as any).pref_gender || "any";
      } else {
        const { data: prof2 } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", uid)
          .maybeSingle();
        name = (prof2 as any)?.display_name || name;
      }
      setDisplayName(name);

      // never match with people I blocked (or who blocked me)
      const { data: bl } = await supabase
        .from("blocks")
        .select("blocker_id, blocked_id")
        .or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`);
      const set = new Set<string>();
      ((bl as any[]) || []).forEach((r) =>
        set.add(r.blocker_id === uid ? r.blocked_id : r.blocker_id)
      );
      blockedRef.current = set;
    };
    init();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (meRef.current)
        supabase.from("talk_queue").delete().eq("user_id", meRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🟢 ONLINE COUNTER
  useEffect(() => {
    const load = async () => {
      const { count } = await supabase
        .from("online_users")
        .select("*", { count: "exact", head: true })
        .gt("last_seen", new Date(Date.now() - 90000).toISOString());
      setOnline(count || 0);
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 6000);
    return () => clearTimeout(t);
  }, []);

  // SMART DISCONNECT: end call automatically if the stranger leaves
  useEffect(() => {
    if (state !== "talk" || !room) return;
    let checks = 0;
    const dropCheck = setInterval(async () => {
      checks++;
      if (checks < 3) return;
      const { count } = await supabase
        .from("talk_queue")
        .select("*", { count: "exact", head: true })
        .eq("room_code", room);
      if (count !== null && count < 2) end();
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

  // ── MATCHING (block-aware + gender-preference-aware) ─────────────────
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

      // I was claimed by someone → learn partner from the shared room
      if (mine.status === "matched" && mine.room_code) {
        const { data: pair } = await supabase
          .from("talk_queue")
          .select("user_id")
          .eq("room_code", mine.room_code);
        const other = ((pair as any[]) || []).find((r) => r.user_id !== me);
        setPartnerId(other?.user_id || null);
        stopPoll();
        setRoom(mine.room_code);
        setState("talk");
        return;
      }

      // I claim the oldest compatible waiting stranger
      const { data: waiting } = await supabase
        .from("talk_queue")
        .select("*")
        .eq("status", "waiting")
        .neq("user_id", me)
        .order("updated_at", { ascending: true })
        .limit(10);

      const candidates = (waiting as any[]) || [];
      if (!candidates.length) return;

      // candidate genders / prefs (safe if columns missing)
      let pmap = new Map<string, any>();
      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, gender, pref_gender")
        .in("user_id", candidates.map((c) => c.user_id));
      if (!pErr) pmap = new Map(((profs as any[]) || []).map((p) => [p.user_id, p]));

      for (const target of candidates) {
        if (blockedRef.current.has(target.user_id)) continue;

        const cp = pmap.get(target.user_id);
        const cGender = cp?.gender || "";
        const cPref = cp?.pref_gender || "any";
        const myG = myGenderRef.current;
        const myP = myPrefRef.current;
        // my preference vs their gender
        if (myP !== "any" && cGender && cGender !== myP) continue;
        // their preference vs my gender
        if (cPref !== "any" && myG && cPref !== myG) continue;

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
          setPartnerId(target.user_id);
          stopPoll();
          setRoom(target.room_code);
          setState("talk");
          return;
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
    <main className="fixed inset-0 flex flex-col bg-slate-950 text-white p-3 md:p-6 pb-4">
      {/* HEADER */}
      <div className="mb-4 flex justify-between items-center gap-2 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/english"
            className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-colors shrink-0"
          >
            <ArrowLeft size={18} className="text-slate-300" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <Dices size={20} className="text-rose-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-white leading-tight truncate">
              Talk to a Stranger
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {online} online now
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* 🎓 ENGLISH CLUB BUTTON */}
          {state !== "talk" && (
            <Link
              href="/practice"
              className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              <GraduationCap size={15} className="text-violet-400" />
              <span className="font-bold text-xs hidden sm:inline">English Club</span>
            </Link>
          )}
          {/* REPORT BUTTON */}
          {state === "talk" && (
            <button
              onClick={reportStranger}
              title="Report Stranger"
              className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center gap-2"
            >
              <Flag size={15} />
              <span className="font-bold text-xs hidden sm:inline">Report</span>
            </button>
          )}
        </div>
      </div>

      {/* IDLE STATE */}
      {state === "idle" && (
        <div className="flex-1 flex flex-col justify-center">
          <div className="bg-slate-900/70 backdrop-blur border border-slate-800 rounded-3xl p-8 text-center max-w-md w-full mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Dices size={36} className="text-rose-400" />
            </div>
            <p className="text-xl font-bold text-white mb-2">Meet someone new</p>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Press the button below. When another member also presses it, you both enter a private voice room to talk.
            </p>

            <div className="flex items-center justify-center gap-2 mb-6 bg-slate-800/60 border border-slate-700 rounded-xl py-2.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-300">
                {online} member{online === 1 ? "" : "s"} online right now
              </span>
            </div>

            <button
              onClick={start}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 font-bold text-base shadow-lg shadow-rose-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Mic size={18} />
              Find Me a Partner
            </button>
          </div>
        </div>
      )}

      {/* WAITING STATE */}
      {state === "waiting" && (
        <div className="flex-1 flex flex-col justify-center">
          <div className="bg-slate-900/70 backdrop-blur border border-slate-800 rounded-3xl p-8 text-center max-w-md w-full mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Loader2 size={32} className="text-rose-400 animate-spin" />
            </div>
            <p className="text-xl font-bold text-white mb-2">Finding a partner...</p>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Keep this screen open — you&apos;ll be connected within seconds of another member pressing the button.
            </p>
            <button
              onClick={end}
              className="px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold transition-all flex items-center gap-2 mx-auto"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* TALK STATE */}
      {state === "talk" && (
        <div className="flex-1 min-h-0 w-full max-w-xl mx-auto flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-2">
            <LivekitRoom
              roomName={room}
              identity={displayName}
              partnerId={partnerId}
              callType="stranger"
              onCallEnd={(sec, partner, callId) => {
                if (partner && callId && sec >= 30)
                  setRateCall({ sec, partner, callId });
              }}
              onLeave={end}
            />
          </div>

          <div className="flex gap-2 md:gap-3 shrink-0 pt-2">
            <button
              onClick={next}
              className="flex-1 py-3.5 md:py-4 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold shadow-lg shadow-violet-900/20 transition-all active:scale-[0.98] text-white flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <Shuffle size={16} />
              Next
            </button>
            <button
              onClick={end}
              className="flex-1 py-3.5 md:py-4 rounded-xl bg-red-600 hover:bg-red-500 font-bold shadow-lg shadow-red-900/20 transition-all active:scale-[0.98] text-white flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <PhoneOff size={16} />
              End Call
            </button>
          </div>

          {showHint && (
            <p className="text-center text-[10px] md:text-xs text-slate-500 mt-2 uppercase tracking-wider font-bold shrink-0 flex items-center justify-center gap-1.5">
              <HeartHandshake size={12} />
              Be respectful — a real person is listening.
            </p>
          )}
        </div>
      )}

      {/* ⭐ POST-CALL RATING */}
      {rateCall && (
        <CallRatingModal
          callId={rateCall.callId}
          partnerId={rateCall.partner}
          onClose={() => setRateCall(null)}
        />
      )}
    </main>
  );
}