"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LivekitRoom from "@/app/LivekitRoom";
import CallRatingModal from "@/app/components/CallRatingModal";
import { supabase } from "@/lib/supabase";
import { callBudget, USER_DAILY } from "@/lib/callLimits";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Dices, ArrowLeft, Flag, X, PhoneOff, Shuffle, Mic, Loader2, HeartHandshake,
  Users, BarChart3, UserPlus, MessageCircle, Ban, Unlock, Check, Phone, Clock, Star, PhoneCall,
} from "lucide-react";

type Row = { id: string; partner: string | null; name: string; avatar: string | null; at: string; dur: number };
type Friend = { user_id: string; name: string; avatar: string | null; online: boolean };
type Req = { id: string; from_id: string; name: string; avatar: string | null };

function longRoom() {
  return "TALK-" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}
function fmtClock(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}
function fmtDur(s: number) { return `${Math.floor(s / 60)}m ${s % 60}s`; }
function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function RandomTalkPage() {
  const [tab, setTab] = useState<"stranger" | "friends" | "progress">("stranger");
  const [state, setState] = useState<"idle" | "waiting" | "talk">("idle");
  const [room, setRoom] = useState("");
  const [me, setMe] = useState("");
  const [displayName, setDisplayName] = useState("friend");
  const [online, setOnline] = useState(0);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [rateCall, setRateCall] = useState<{ partner: string; callId: string } | null>(null);
  const [showHint, setShowHint] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const meRef = useRef("");
  const blockedRef = useRef<Set<string>>(new Set());
  const myGenderRef = useRef("");
  const myPrefRef = useRef("any");
  const router = useRouter();

  // hub data
  const [budget, setBudget] = useState<{ myLeft: number } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [friendsSet, setFriendsSet] = useState<Set<string>>(new Set());
  const [incoming, setIncoming] = useState<Map<string, string>>(new Map());
  const [outgoing, setOutgoing] = useState<Set<string>>(new Set());
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [friends, setFriends] = useState<Friend[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [calls30, setCalls30] = useState(0);
  const [rating, setRating] = useState<number | null>(null);
  const [thisWeek, setThisWeek] = useState(0);
  const [lastWeek, setLastWeek] = useState(0);
  const [bars, setBars] = useState<{ label: string; sec: number; today: boolean }[]>([]);

  // ── AUTH + PROFILE + BLOCKS ──
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) { router.push("/login"); return; }
      setMe(uid);
      meRef.current = uid;
      let name = data.session?.user.email?.split("@")[0] || "friend";
      const { data: prof, error } = await supabase
        .from("profiles").select("display_name, gender, pref_gender").eq("user_id", uid).maybeSingle();
      if (!error && prof) {
        name = (prof as any).display_name || name;
        myGenderRef.current = (prof as any).gender || "";
        myPrefRef.current = (prof as any).pref_gender || "any";
      }
      setDisplayName(name);
      const { data: bl } = await supabase
        .from("blocks").select("blocker_id, blocked_id").or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`);
      const set = new Set<string>();
      ((bl as any[]) || []).forEach((r) => set.add(r.blocker_id === uid ? r.blocked_id : r.blocker_id));
      blockedRef.current = set;
    };
    init();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (meRef.current) supabase.from("talk_queue").delete().eq("user_id", meRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🟢 online counter
  useEffect(() => {
    const loadOnline = async () => {
      const { count } = await supabase
        .from("online_users").select("*", { count: "exact", head: true })
        .gt("last_seen", new Date(Date.now() - 90000).toISOString());
      setOnline(count || 0);
    };
    loadOnline();
    const id = setInterval(loadOnline, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 6000);
    return () => clearTimeout(t);
  }, []);

  // ── HUB DATA LOAD ──
  const load = useCallback(async () => {
    if (!me) return;
    const cutoff = new Date(Date.now() - 90000).toISOString();
    const d30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const [b, logs, fr, rq, bl, rates] = await Promise.all([
      callBudget(me),
      supabase.from("call_logs").select("id,user_a,user_b,started_at,duration_sec")
        .or(`user_a.eq.${me},user_b.eq.${me}`).in("type", ["stranger", "friend"])
        .not("ended_at", "is", null).order("started_at", { ascending: false }).limit(30),
      supabase.from("friends").select("friend_id").eq("user_id", me),
      supabase.from("friend_requests").select("id,from_id,to_id").eq("status", "pending").or(`to_id.eq.${me},from_id.eq.${me}`),
      supabase.from("blocks").select("blocker_id,blocked_id").or(`blocker_id.eq.${me},blocked_id.eq.${me}`),
      supabase.from("call_ratings").select("rating").eq("target_id", me),
    ]);
    setBudget(b);
    const logRows = (logs.data as any[]) || [];
    const pids = Array.from(new Set(logRows.map((r) => (r.user_a === me ? r.user_b : r.user_a)).filter(Boolean)));
    const { data: profs } = pids.length
      ? await supabase.from("profiles").select("user_id,display_name,avatar_url").in("user_id", pids)
      : { data: [] };
    
    // FIX 1: Map tuple typing
    const pmap = new Map<string, any>(((profs as any[]) || []).map((p) => [p.user_id, p] as [string, any]));
    setRows(logRows.map((r) => {
      const pid = r.user_a === me ? r.user_b : r.user_a;
      const p = pmap.get(pid);
      return { id: r.id, partner: pid, name: p?.display_name || "Member", avatar: p?.avatar_url || null, at: r.started_at, dur: r.duration_sec || 0 };
    }));
    
    const fids = ((fr.data as any[]) || []).map((f) => f.friend_id);
    setFriendsSet(new Set(fids));
    if (fids.length) {
      const [fp, on] = await Promise.all([
        supabase.from("profiles").select("user_id,display_name,avatar_url,appear_offline").in("user_id", fids),
        supabase.from("online_users").select("user_id").gt("last_seen", cutoff).in("user_id", fids),
      ]);
      // FIX 2: Set generic typing
      const onlineSet = new Set<string>(((on.data as any[]) || []).map((o) => o.user_id as string));
      setFriends(((fp.data as any[]) || []).map((p) => ({
        user_id: p.user_id, name: p.display_name || "Member", avatar: p.avatar_url || null,
        online: onlineSet.has(p.user_id) && !p.appear_offline,
      })));
    } else setFriends([]);
    
    const inc = new Map<string, string>();
    const out = new Set<string>();
    ((rq.data as any[]) || []).forEach((q) => { if (q.to_id === me) inc.set(q.from_id, q.id); else out.add(q.to_id); });
    setIncoming(inc); setOutgoing(out);
    const rids = ((rq.data as any[]) || []).filter((q) => q.to_id === me).map((q) => q.from_id);
    if (rids.length) {
      const { data: rp } = await supabase.from("profiles").select("user_id,display_name,avatar_url").in("user_id", rids);
      // FIX 3: Using `rp` instead of `rp.data`, and applying Map tuple typing
      const m = new Map<string, any>(((rp as any[]) || []).map((p) => [p.user_id, p] as [string, any]));
      setReqs(((rq.data as any[]) || []).filter((q) => q.to_id === me).map((q) => ({
        id: q.id, from_id: q.from_id, name: m.get(q.from_id)?.display_name || "Member", avatar: m.get(q.from_id)?.avatar_url || null,
      })));
    } else setReqs([]);
    
    setBlocked(new Set(((bl.data as any[]) || []).map((x) => (x.blocker_id === me ? x.blocked_id : x.blocker_id))));
    const [{ count }] = await Promise.all([
      supabase.from("call_logs").select("*", { count: "exact", head: true })
        .or(`user_a.eq.${me},user_b.eq.${me}`).not("ended_at", "is", null).gte("started_at", d30),
    ]);
    setCalls30(count || 0);
    const rr = (rates.data as any[]) || [];
    setRating(rr.length ? rr.reduce((a, r) => a + r.rating, 0) / rr.length : null);
    const now = new Date();
    const dow = (now.getDay() + 6) % 7;
    const thisStart = new Date(now); thisStart.setDate(now.getDate() - dow); thisStart.setHours(0, 0, 0, 0);
    const lastStart = new Date(thisStart); lastStart.setDate(thisStart.getDate() - 7);
    let tw = 0, lw = 0;
    const perDay = [0, 0, 0, 0, 0, 0, 0];
    const { data: recent } = await supabase.from("call_logs").select("started_at,duration_sec")
      .or(`user_a.eq.${me},user_b.eq.${me}`).not("ended_at", "is", null)
      .gte("started_at", new Date(Date.now() - 14 * 86400000).toISOString());
    ((recent as any[]) || []).forEach((r) => {
      const d = new Date(r.started_at);
      if (d >= thisStart) tw++; else if (d >= lastStart) lw++;
      const diff = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
      if (diff >= 0 && diff < 7) perDay[6 - diff] += r.duration_sec || 0;
    });
    setThisWeek(tw); setLastWeek(lw);
    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      labels.push({ label: d.toLocaleDateString([], { weekday: "short" }).toUpperCase(), sec: perDay[6 - i], today: i === 0 });
    }
    setBars(labels);
  }, [me]);
  
  useEffect(() => { load(); }, [load]);

  // smart disconnect
  useEffect(() => {
    if (state !== "talk" || !room) return;
    let checks = 0;
    const dropCheck = setInterval(async () => {
      checks++;
      if (checks < 3) return;
      const { count } = await supabase.from("talk_queue")
        .select("*", { count: "exact", head: true }).eq("room_code", room);
      if (count !== null && count < 2) end();
    }, 3000);
    return () => clearInterval(dropCheck);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, room]);

  const stopPoll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const start = async () => {
    setState("waiting");
    const myRoom = longRoom();
    await supabase.from("talk_queue").upsert({ user_id: me, status: "waiting", room_code: myRoom });
    pollRef.current = setInterval(async () => {
      const { data: mine } = await supabase.from("talk_queue").select("*").eq("user_id", me).maybeSingle();
      if (!mine) { stopPoll(); setState("idle"); return; }
      if (mine.status === "matched" && mine.room_code) {
        const { data: pair } = await supabase.from("talk_queue").select("user_id").eq("room_code", mine.room_code);
        const other = ((pair as any[]) || []).find((r) => r.user_id !== me);
        setPartnerId(other?.user_id || null);
        stopPoll(); setRoom(mine.room_code); setState("talk");
        return;
      }
      const { data: waiting } = await supabase.from("talk_queue").select("*")
        .eq("status", "waiting").neq("user_id", me).order("updated_at", { ascending: true }).limit(10);
      const candidates = (waiting as any[]) || [];
      if (!candidates.length) return;
      let pmap = new Map<string, any>();
      const { data: profs2, error: pErr } = await supabase.from("profiles")
        .select("user_id, gender, pref_gender").in("user_id", candidates.map((c) => c.user_id));
      
      // FIX 4: Map tuple typing applied here too
      if (!pErr) pmap = new Map<string, any>(((profs2 as any[]) || []).map((p) => [p.user_id, p] as [string, any]));
      
      for (const target of candidates) {
        if (blockedRef.current.has(target.user_id)) continue;
        const cp = pmap.get(target.user_id);
        const cGender = cp?.gender || "";
        const cPref = cp?.pref_gender || "any";
        const myG = myGenderRef.current;
        const myP = myPrefRef.current;
        if (myP !== "any" && cGender && cGender !== myP) continue;
        if (cPref !== "any" && myG && cPref !== myG) continue;
        const { data: claimed } = await supabase.from("talk_queue")
          .update({ status: "matched" }).eq("user_id", target.user_id).eq("status", "waiting").select();
        if (claimed && claimed.length === 1) {
          await supabase.from("talk_queue").update({ status: "matched", room_code: target.room_code }).eq("user_id", me);
          setPartnerId(target.user_id);
          stopPoll(); setRoom(target.room_code); setState("talk");
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
    load();
  };
  const next = async () => { await end(); setTimeout(start, 300); };

  const reportStranger = async () => {
    const reason = prompt("What did the stranger say wrong?");
    if (!reason || !reason.trim()) return;
    await supabase.from("community_reports").insert({
      community_id: null, user_id: me,
      reason: `🎙️ Voice talk (room ${room}): ${reason.trim()}`,
    });
    alert("✅ Reported. Moderators will review this person.");
  };

  // friend actions
  const addFriend = async (pid: string) => {
    await supabase.from("friend_requests").insert({ from_id: me, to_id: pid });
    setOutgoing((s) => new Set(s).add(pid));
  };
  const acceptReq = async (r: Req) => {
    await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", r.id);
    await supabase.from("friends").insert([{ user_id: me, friend_id: r.from_id }, { user_id: r.from_id, friend_id: me }]);
    load();
  };
  const declineReq = async (r: Req) => {
    await supabase.from("friend_requests").update({ status: "rejected" }).eq("id", r.id);
    load();
  };
  const blockUser = async (pid: string) => {
    if (!confirm("Block this member?")) return;
    await supabase.from("blocks").insert({ blocker_id: me, blocked_id: pid });
    load();
  };
  const unblock = async (pid: string) => {
    await supabase.from("blocks").delete().eq("blocker_id", me).eq("blocked_id", pid);
    load();
  };
  const callFriend = async (f: Friend) => {
    const rm = `CALL-${[me, f.user_id].sort().join("-")}`;
    await supabase.from("call_invites").insert({ from_id: me, to_id: f.user_id, room: rm });
    router.push(`/call?room=${encodeURIComponent(rm)}&with=${f.user_id}`);
  };

  const used = USER_DAILY - (budget?.myLeft ?? USER_DAILY);
  const pct = Math.min(100, Math.round((used / USER_DAILY) * 100));
  const max = Math.max(60, ...bars.map((b) => b.sec));

  return (
    <main className="fixed inset-0 flex flex-col bg-slate-950 text-white p-3 md:p-6 pb-4 overflow-y-auto no-scrollbar">
      {/* HEADER */}
      <div className="mb-4 flex justify-between items-center gap-2 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/english" className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-colors shrink-0">
            <ArrowLeft size={18} className="text-slate-300" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <Dices size={20} className="text-rose-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-white leading-tight truncate">Talk to a Stranger</h1>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {online} online now
            </div>
          </div>
        </div>
        {state === "talk" && (
          <button onClick={reportStranger} title="Report Stranger"
            className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center gap-2 shrink-0">
            <Flag size={15} />
            <span className="font-bold text-xs hidden sm:inline">Report</span>
          </button>
        )}
      </div>

      {/* ── WAITING ── */}
      {state === "waiting" && (
        <div className="flex-1 flex flex-col justify-center">
          <div className="bg-slate-900/70 backdrop-blur border border-slate-800 rounded-3xl p-8 text-center max-w-md w-full mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Loader2 size={32} className="text-rose-400 animate-spin" />
            </div>
            <p className="text-xl font-bold text-white mb-8">Finding a partner...</p>
            <button onClick={end}
              className="px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold transition-all flex items-center gap-2 mx-auto">
              <X size={16} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── TALK ── */}
      {state === "talk" && (
        <div className="flex-1 min-h-0 w-full max-w-xl mx-auto flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-2">
            <LivekitRoom
              roomName={room}
              identity={displayName}
              partnerId={partnerId}
              callType="stranger"
              onCallEnd={(sec, partner, callId) => {
                if (partner && callId && sec >= 30) setRateCall({ partner, callId });
              }}
              onLeave={end}
            />
          </div>
          <div className="flex gap-2 md:gap-3 shrink-0 pt-2">
            <button onClick={next}
              className="flex-1 py-3.5 md:py-4 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold shadow-lg shadow-violet-900/20 transition-all active:scale-[0.98] text-white flex items-center justify-center gap-2 text-sm md:text-base">
              <Shuffle size={16} /> Next
            </button>
            <button onClick={end}
              className="flex-1 py-3.5 md:py-4 rounded-xl bg-red-600 hover:bg-red-500 font-bold shadow-lg shadow-red-900/20 transition-all active:scale-[0.98] text-white flex items-center justify-center gap-2 text-sm md:text-base">
              <PhoneOff size={16} /> End Call
            </button>
          </div>
          {showHint && (
            <p className="text-center text-[10px] md:text-xs text-slate-500 mt-2 uppercase tracking-wider font-bold shrink-0 flex items-center justify-center gap-1.5">
              <HeartHandshake size={12} /> Be respectful — a real person is listening.
            </p>
          )}
        </div>
      )}

      {/* ── IDLE: QUOTA + 3 TABS ── */}
      {state === "idle" && (
        <div className="w-full max-w-xl mx-auto grid gap-3">
          {/* quota bar */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="flex items-center gap-1.5"><PhoneCall size={14} className="text-rose-400" /> Free calling: 20 min/day</span>
              <span className="flex items-center gap-1 text-slate-300"><Clock size={12} /> {fmtClock(budget?.myLeft ?? USER_DAILY)} left</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-rose-500 to-indigo-500" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* tabs */}
          <div className="grid grid-cols-3 gap-2">
            {([["stranger", "Stranger", Dices], ["friends", "Friends", Users], ["progress", "Progress", BarChart3]] as const).map(([id, label, Icon]) => (
              <button key={id} onClick={() => setTab(id as any)}
                className={`py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${tab === id ? "bg-gradient-to-r from-rose-600 to-indigo-600" : "bg-slate-900 border border-slate-800 text-slate-400"}`}>
                <Icon size={14} /> {label}
                {id === "friends" && reqs.length > 0 && (
                  <span className="min-w-4 h-4 px-1 rounded-full bg-red-500 text-[9px] flex items-center justify-center">{reqs.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* TAB: STRANGER (clean — no long text) */}
          {tab === "stranger" && (
            <div className="bg-slate-900/70 backdrop-blur border border-slate-800 rounded-3xl p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Dices size={36} className="text-rose-400" />
              </div>
              <div className="flex items-center justify-center gap-2 mb-5 bg-slate-800/60 border border-slate-700 rounded-xl py-2.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-300">
                  {online} member{online === 1 ? "" : "s"} online right now
                </span>
              </div>
              <button onClick={start}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 font-bold text-base shadow-lg shadow-rose-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                <Mic size={18} /> Find Me a Partner
              </button>
            </div>
          )}

          {/* TAB: FRIENDS (recent calls + add friend + call friends) */}
          {tab === "friends" && (
            <>
              {reqs.length > 0 && (
                <div className="bg-amber-600/10 border border-amber-500/40 rounded-2xl p-4">
                  <p className="text-xs font-black text-amber-300 mb-2">Friend Requests ({reqs.length})</p>
                  {reqs.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 mb-2">
                      <span className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">{r.name.charAt(0).toUpperCase()}</span>
                      <p className="flex-1 text-xs font-bold truncate">{r.name}</p>
                      <button onClick={() => acceptReq(r)} className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center"><Check size={15} /></button>
                      <button onClick={() => declineReq(r)} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center"><X size={15} /></button>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <p className="text-sm font-bold mb-3">People you talked to ({rows.length})</p>
                {rows.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No calls yet — find a partner in the Stranger tab! 🎙️</p>
                ) : rows.map((r) => (
                  <div key={r.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3 mb-2">
                    {r.avatar ? <img src={r.avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                      : <span className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center font-bold shrink-0">{r.name.charAt(0).toUpperCase()}</span>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{r.name}</p>
                      <p className="text-[10px] text-slate-500 font-semibold">{fmtWhen(r.at)} • {fmtDur(r.dur)}</p>
                    </div>
                    {r.partner && (incoming.has(r.partner) ? (
                      <>
                        {/* FIX 5 & 6: Bang operators added for strict-mode closure inference */}
                        <button onClick={() => acceptReq({ id: incoming.get(r.partner!)!, from_id: r.partner!, name: r.name, avatar: r.avatar })} className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center"><Check size={15} /></button>
                        <button onClick={() => declineReq({ id: incoming.get(r.partner!)!, from_id: r.partner!, name: r.name, avatar: r.avatar })} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center"><X size={15} /></button>
                      </>
                    ) : !friendsSet.has(r.partner) && !outgoing.has(r.partner) && !blocked.has(r.partner) ? (
                      <button onClick={() => addFriend(r.partner!)} className="px-2.5 py-2 rounded-lg bg-violet-600 text-[10px] font-bold flex items-center gap-1"><UserPlus size={12} /> Add</button>
                    ) : outgoing.has(r.partner) ? (
                      <span className="px-2 py-2 rounded-lg bg-slate-800 text-[10px] font-bold text-slate-400">Sent</span>
                    ) : null)}
                    {r.partner && friendsSet.has(r.partner) && (
                      <Link href={`/chat?user=${r.partner}`} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center"><MessageCircle size={14} /></Link>
                    )}
                    {r.partner && (blocked.has(r.partner)
                      ? <button onClick={() => unblock(r.partner!)} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center"><Unlock size={14} /></button>
                      : <button onClick={() => blockUser(r.partner!)} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center"><Ban size={14} /></button>)}
                  </div>
                ))}
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <p className="text-sm font-bold mb-3 flex items-center gap-2"><Users size={15} className="text-violet-400" /> My Friends ({friends.length})</p>
                {friends.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No friends yet — add people from your calls above!</p>
                ) : friends.map((f) => (
                  <div key={f.user_id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3 mb-2">
                    <div className="relative shrink-0">
                      {f.avatar ? <img src={f.avatar} alt="" className={`w-10 h-10 rounded-full object-cover ${f.online ? "border-2 border-green-500" : "border-2 border-slate-700"}`} />
                        : <span className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center font-bold">{f.name.charAt(0).toUpperCase()}</span>}
                      {f.online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-slate-950" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{f.name}</p>
                      <p className={`text-[10px] font-bold ${f.online ? "text-green-400" : "text-slate-500"}`}>{f.online ? "Online" : "Offline"}</p>
                    </div>
                    <Link href={`/chat?user=${f.user_id}`} className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center"><MessageCircle size={15} /></Link>
                    <button onClick={() => callFriend(f)} disabled={!f.online}
                      className="w-9 h-9 rounded-lg bg-green-600/15 border border-green-600/40 text-green-400 disabled:opacity-30 flex items-center justify-center">
                      <Phone size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TAB: PROGRESS */}
          {tab === "progress" && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                  <PhoneCall size={20} className="text-rose-400" />
                  <div><p className="text-xl font-black">{calls30}</p><p className="text-[9px] text-slate-400 font-bold">Calls (30 days)</p></div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                  <Star size={20} className="text-amber-400 fill-amber-400" />
                  <div><p className="text-xl font-black">{rating === null ? "–" : rating.toFixed(1)}</p><p className="text-[9px] text-slate-400 font-bold">Your Rating</p></div>
                </div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-3">
                <span>Last week: <b className="text-amber-400">{lastWeek}</b></span>
                <span>This week: <b className="text-violet-400">{thisWeek}</b></span>
              </div>
              <div className="flex items-end gap-2 h-24 mb-1">
                {bars.map((b, i) => (
                  <div key={i} className="flex-1 h-full flex items-end">
                    <div title={`${Math.round(b.sec / 60)} min`}
                      className={`w-full rounded-t-lg ${b.today ? "bg-gradient-to-t from-violet-600 to-rose-500" : "bg-slate-700"}`}
                      style={{ height: `${Math.max(4, (b.sec / max) * 100)}%` }} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                {bars.map((b, i) => (
                  <span key={i} className={`flex-1 text-center text-[8px] font-black ${b.today ? "text-violet-400" : "text-slate-600"}`}>{b.label}</span>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 text-center mt-4">Consistency matters — every call adds to your growth 🌱</p>
            </div>
          )}
        </div>
      )}

      {rateCall && (
        <CallRatingModal callId={rateCall.callId} partnerId={rateCall.partner} onClose={() => setRateCall(null)} />
      )}
    </main>
  );
}