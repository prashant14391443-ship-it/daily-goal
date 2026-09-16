"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { callBudget, USER_DAILY } from "@/lib/callLimits";
import { Mic, UserPlus, MessageCircle, Ban, Unlock, Check, X, Clock, PhoneCall } from "lucide-react";

type Row = {
  id: string;
  partner: string | null;
  name: string;
  avatar: string | null;
  at: string;
  dur: number;
  type: string;
};

function fmtClock(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}
function fmtDur(s: number) {
  return `${Math.floor(s / 60)}mins ${s % 60}secs`;
}
function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function PracticeTab({ me, onRequestsChanged }: { me: string; onRequestsChanged?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<{ myLeft: number; poolLeft: number; ok: boolean } | null>(null);
  const [gender, setGender] = useState<"male" | "female" | "any">("any");
  const [rows, setRows] = useState<Row[]>([]);
  const [friends, setFriends] = useState<Set<string>>(new Set());
  const [incoming, setIncoming] = useState<Map<string, string>>(new Map());
  const [outgoing, setOutgoing] = useState<Set<string>>(new Set());
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [blockedList, setBlockedList] = useState<{ user_id: string; name: string; avatar: string | null }[]>([]);
  const [showBlocked, setShowBlocked] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    const [b, prof, logs, fr, reqs, bl] = await Promise.all([
      callBudget(me),
      supabase.from("profiles").select("gender").eq("user_id", me).maybeSingle(),
      supabase
        .from("call_logs")
        .select("id,user_a,user_b,started_at,duration_sec,type")
        .or(`user_a.eq.${me},user_b.eq.${me}`)
        .in("type", ["stranger", "friend"])
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(30),
      supabase.from("friends").select("friend_id").eq("user_id", me),
      supabase
        .from("friend_requests")
        .select("id,from_id,to_id")
        .eq("status", "pending")
        .or(`to_id.eq.${me},from_id.eq.${me}`),
      supabase.from("blocks").select("blocker_id,blocked_id").or(`blocker_id.eq.${me},blocked_id.eq.${me}`),
    ]);
    setBudget(b);
    setGender(((prof.data as any)?.gender as any) || "any");

    const logRows = (logs.data as any[]) || [];
    const pids = Array.from(new Set(logRows.map((r) => (r.user_a === me ? r.user_b : r.user_a)).filter(Boolean)));
    const { data: profs } = pids.length
      ? await supabase.from("profiles").select("user_id,display_name,avatar_url").in("user_id", pids)
      : { data: [] };
    const pmap = new Map(((profs as any[]) || []).map((p) => [p.user_id, p]));
    setRows(
      logRows.map((r) => {
        const pid = r.user_a === me ? r.user_b : r.user_a;
        const p = pmap.get(pid);
        return {
          id: r.id,
          partner: pid,
          name: p?.display_name || "Member",
          avatar: p?.avatar_url || null,
          at: r.started_at,
          dur: r.duration_sec || 0,
          type: r.type,
        };
      })
    );

    setFriends(new Set(((fr.data as any[]) || []).map((f) => f.friend_id)));
    const inc = new Map<string, string>();
    const out = new Set<string>();
    ((reqs.data as any[]) || []).forEach((q) => {
      if (q.to_id === me) inc.set(q.from_id, q.id);
      else out.add(q.to_id);
    });
    setIncoming(inc);
    setOutgoing(out);

    const bset = new Set<string>();
    ((bl.data as any[]) || []).forEach((x) => bset.add(x.blocker_id === me ? x.blocked_id : x.blocker_id));
    setBlocked(bset);
    const bids = Array.from(bset);
    if (bids.length) {
      const { data: bp } = await supabase.from("profiles").select("user_id,display_name,avatar_url").in("user_id", bids);
      setBlockedList(((bp as any[]) || []).map((p) => ({ user_id: p.user_id, name: p.display_name || "Member", avatar: p.avatar_url || null })));
    } else setBlockedList([]);
    setLoading(false);
  }, [me]);

  useEffect(() => {
    load();
  }, [load]);

  const setPref = async (g: "male" | "female" | "any") => {
    setGender(g);
    await supabase.from("profiles").update({ gender: g }).eq("user_id", me);
  };

  const addFriend = async (pid: string) => {
    await supabase.from("friend_requests").insert({ from_id: me, to_id: pid });
    setOutgoing((s) => new Set(s).add(pid));
  };

  const acceptReq = async (rid: string, pid: string) => {
    await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", rid);
    await supabase.from("friends").insert([
      { user_id: me, friend_id: pid },
      { user_id: pid, friend_id: me },
    ]);
    setFriends((s) => new Set(s).add(pid));
    setIncoming((m) => {
      const n = new Map(m);
      n.delete(pid);
      return n;
    });
    onRequestsChanged?.();
  };

  const declineReq = async (rid: string, pid: string) => {
    await supabase.from("friend_requests").update({ status: "rejected" }).eq("id", rid);
    setIncoming((m) => {
      const n = new Map(m);
      n.delete(pid);
      return n;
    });
    onRequestsChanged?.();
  };

  const blockUser = async (pid: string) => {
    if (!confirm("Block this member? Matching & friendship with them will be removed.")) return;
    await supabase.from("blocks").insert({ blocker_id: me, blocked_id: pid });
    await supabase.from("friends").delete().or(`and(user_id.eq.${me},friend_id.eq.${pid}),and(user_id.eq.${pid},friend_id.eq.${me})`);
    await supabase
      .from("friend_requests")
      .delete()
      .eq("status", "pending")
      .or(`and(from_id.eq.${me},to_id.eq.${pid}),and(from_id.eq.${pid},to_id.eq.${me})`);
    load();
  };

  const unblock = async (pid: string) => {
    await supabase.from("blocks").delete().eq("blocker_id", me).eq("blocked_id", pid);
    load();
  };

  const used = USER_DAILY - (budget?.myLeft ?? USER_DAILY);
  const pct = Math.min(100, Math.round((used / USER_DAILY) * 100));

  return (
    <div className="grid gap-4">
      {/* 🕐 DAILY QUOTA CARD */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-sm font-bold text-white flex items-center gap-2">
            <PhoneCall size={15} className="text-rose-400" />
            Practice free calling for 20 minutes everyday
          </p>
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
            <Clock size={13} /> {fmtClock(budget?.myLeft ?? USER_DAILY)}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden mb-2">
          <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-indigo-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-slate-500 font-semibold">
          {fmtClock(used)} used • {fmtClock(budget?.myLeft ?? USER_DAILY)} left • 🌍 pool {fmtClock(budget?.poolLeft ?? 0)}
        </p>

        {/* GENDER PREFERENCE */}
        <p className="text-xs font-bold text-slate-300 mt-4 mb-2">Select co-learner&apos;s gender</p>
        <div className="grid grid-cols-3 gap-2">
          {(["male", "female", "any"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setPref(g)}
              className={`py-2.5 rounded-xl text-xs font-bold capitalize transition-all ${
                gender === g
                  ? "bg-gradient-to-r from-rose-600 to-indigo-600 text-white"
                  : "bg-slate-800/70 border border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <Link
          href="/random-talk"
          className="mt-4 w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <Mic size={16} />
          Connect with your Co-learners
        </Link>
      </div>

      {/* 📜 HISTORY */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-white">Recent Calls ({rows.length})</p>
          <button onClick={() => setShowBlocked(true)} className="text-[11px] font-bold text-slate-400 underline hover:text-slate-200">
            Blocked list
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 py-8 text-center">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">No calls yet — press the button above to start! 🎙️</p>
        ) : (
          <div className="grid gap-2">
            {rows.map((r) => (
              <div key={r.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                {r.avatar ? (
                  <img src={r.avatar} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-slate-800 shrink-0" />
                ) : (
                  <span className="w-10 h-10 rounded-full bg-violet-600 border-2 border-slate-800 flex items-center justify-center font-bold shrink-0">
                    {r.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{r.type === "friend" ? "👥 " : "🎲 "}{r.name}</p>
                  <p className="text-[10px] text-slate-500 font-semibold truncate">
                    {fmtWhen(r.at)} • {fmtDur(r.dur)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {r.partner && incoming.has(r.partner) ? (
                    <>
                      <button
                        onClick={() => acceptReq(incoming.get(r.partner!)!, r.partner!)}
                        title="Accept friend request"
                        className="w-8 h-8 rounded-lg bg-green-600 hover:bg-green-500 flex items-center justify-center"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        onClick={() => declineReq(incoming.get(r.partner!)!, r.partner!)}
                        title="Decline"
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-600 flex items-center justify-center"
                      >
                        <X size={15} />
                      </button>
                    </>
                  ) : r.partner && !friends.has(r.partner) && !outgoing.has(r.partner) && !blocked.has(r.partner) ? (
                    <button
                      onClick={() => addFriend(r.partner!)}
                      className="px-2.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-[10px] font-bold flex items-center gap-1"
                    >
                      <UserPlus size={12} /> Add Friend
                    </button>
                  ) : r.partner && outgoing.has(r.partner) ? (
                    <span className="px-2.5 py-2 rounded-lg bg-slate-800 text-[10px] font-bold text-slate-400">Sent</span>
                  ) : null}
                  {r.partner && friends.has(r.partner) && (
                    <Link
                      href={`/chat?user=${r.partner}`}
                      title="Message"
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
                    >
                      <MessageCircle size={14} />
                    </Link>
                  )}
                  {r.partner &&
                    (blocked.has(r.partner) ? (
                      <button onClick={() => unblock(r.partner!)} title="Unblock" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-green-600 flex items-center justify-center">
                        <Unlock size={14} />
                      </button>
                    ) : (
                      <button onClick={() => blockUser(r.partner!)} title="Block" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-600/60 flex items-center justify-center text-slate-400 hover:text-white">
                        <Ban size={14} />
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🚫 BLOCKED MODAL */}
      {showBlocked && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowBlocked(false)}>
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-sm">Blocked list ({blockedList.length})</p>
              <button onClick={() => setShowBlocked(false)} className="text-slate-500 hover:text-white">
                <X size={17} />
              </button>
            </div>
            {blockedList.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No blocked members ✅</p>
            ) : (
              <div className="grid gap-2 max-h-72 overflow-y-auto">
                {blockedList.map((p) => (
                  <div key={p.user_id} className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
                    <span className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <p className="flex-1 text-xs font-bold truncate">{p.name}</p>
                    <button onClick={() => unblock(p.user_id)} className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-green-600 text-[10px] font-bold flex items-center gap-1">
                      <Unlock size={11} /> Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}