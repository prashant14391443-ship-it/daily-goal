"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { callBudget, USER_DAILY } from "@/lib/callLimits";
import {
  Mic, Users, BarChart3, UserPlus, MessageCircle, Ban, Unlock,
  Check, X, Phone, Clock, Star, PhoneCall, ArrowLeft, Dices, GraduationCap,
} from "lucide-react";

type Row = { id: string; partner: string | null; name: string; avatar: string | null; at: string; dur: number };
type Friend = { user_id: string; name: string; avatar: string | null; online: boolean };
type Req = { id: string; from_id: string; name: string; avatar: string | null };

function fmtClock(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}
function fmtDur(s: number) { return `${Math.floor(s / 60)}m ${s % 60}s`; }
function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function PracticeHubPage() {
  const [me, setMe] = useState("");
  const [tab, setTab] = useState<"calls" | "friends" | "progress">("calls");
  const [online, setOnline] = useState(0);
  const router = useRouter();

  // calls tab
  const [budget, setBudget] = useState<{ myLeft: number; poolLeft: number } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [friendsSet, setFriendsSet] = useState<Set<string>>(new Set());
  const [incoming, setIncoming] = useState<Map<string, string>>(new Map());
  const [outgoing, setOutgoing] = useState<Set<string>>(new Set());
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  // friends tab
  const [friends, setFriends] = useState<Friend[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  // progress tab
  const [calls30, setCalls30] = useState(0);
  const [rating, setRating] = useState<number | null>(null);
  const [thisWeek, setThisWeek] = useState(0);
  const [lastWeek, setLastWeek] = useState(0);
  const [bars, setBars] = useState<{ label: string; sec: number; today: boolean }[]>([]);

  // 🟢 online counter
  useEffect(() => {
    const loadOnline = async () => {
      const { count } = await supabase
        .from("online_users")
        .select("*", { count: "exact", head: true })
        .gt("last_seen", new Date(Date.now() - 90000).toISOString());
      setOnline(count || 0);
    };
    loadOnline();
    const id = setInterval(loadOnline, 30000);
    return () => clearInterval(id);
  }, []);

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
      // FIX 3 & 4: Using `rp` instead of `rp.data`, and applying Map tuple typing
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

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) { router.push("/login"); return; }
      setMe(uid);
    };
    init();
  }, [router]);
  useEffect(() => { load(); }, [load]);

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
    const room = `CALL-${[me, f.user_id].sort().join("-")}`;
    await supabase.from("call_invites").insert({ from_id: me, to_id: f.user_id, room });
    router.push(`/call?room=${encodeURIComponent(room)}&with=${f.user_id}`);
  };

  const used = USER_DAILY - (budget?.myLeft ?? USER_DAILY);
  const pct = Math.min(100, Math.round((used / USER_DAILY) * 100));
  const max = Math.max(60, ...bars.map((b) => b.sec));

  return (
    <main className="min-h-screen bg-slate-950 text-white p-3 pb-24">
      {/* 🎓 HEADER */}
      <div className="flex items-center gap-3 mb-4 max-w-xl mx-auto">
        <Link href="/dashboard" className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
          <ArrowLeft size={18} className="text-slate-300" />
        </Link>
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <GraduationCap size={20} className="text-violet-400" />
        </div>
        <div>
          <h1 className="font-bold leading-tight">English Club</h1>
          <p className="text-[10px] text-slate-400 font-semibold">Stranger calls • Friends • Progress</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto grid gap-3">
        {/* 🎲 TALK TO STRANGER — inside the club */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
              <Dices size={22} className="text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Talk to a Stranger</p>
              <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {online} member{online === 1 ? "" : "s"} online right now
              </p>
            </div>
          </div>
          <Link
            href="/random-talk"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <Mic size={17} /> Find Me a Partner
          </Link>
        </div>

        {/* 🕐 QUOTA BAR */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <div className="flex justify-between text-xs font-bold mb-2">
            <span className="flex items-center gap-1.5"><PhoneCall size={14} className="text-rose-400" /> Free calling: 20 min/day</span>
            <span className="flex items-center gap-1 text-slate-300"><Clock size={12} /> {fmtClock(budget?.myLeft ?? USER_DAILY)} left</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-rose-500 to-indigo-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* 3 TABS */}
        <div className="grid grid-cols-3 gap-2">
          {([["calls", "Calls", Mic], ["friends", "Friends", Users], ["progress", "Progress", BarChart3]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id as "calls" | "friends" | "progress")}
              className={`py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${tab === id ? "bg-gradient-to-r from-rose-600 to-indigo-600" : "bg-slate-900 border border-slate-800 text-slate-400"}`}>
              <Icon size={14} /> {label}
              {id === "friends" && reqs.length > 0 && <span className="min-w-4 h-4 px-1 rounded-full bg-red-500 text-[9px] flex items-center justify-center">{reqs.length}</span>}
            </button>
          ))}
        </div>

        {/* ── TAB: CALLS ── */}
        {tab === "calls" && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
            <p className="text-sm font-bold mb-3">People you talked to ({rows.length})</p>
            {rows.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No calls yet — press "Find Me a Partner" above! 🎙️</p>
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
                  <button onClick={() => addFriend(r.partner!)} className="px-2.5 py-2 rounded-lg bg-violet-600 text-[10px] font-bold flex items-center gap-1"><UserPlus size={12} /> Add Friend</button>
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
        )}

        {/* ── TAB: FRIENDS ── */}
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
              <p className="text-sm font-bold mb-3 flex items-center gap-2"><Users size={15} className="text-violet-400" /> My Friends ({friends.length})</p>
              {friends.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No friends yet — add people from the Calls tab!</p>
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

        {/* ── TAB: PROGRESS ── */}
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

      {/* 🔻 BOTTOM BIG BUTTON — Talk to Stranger */}
      <div className="fixed bottom-0 inset-x-0 z-40 p-3 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800">
        <Link href="/random-talk"
          className="max-w-xl mx-auto flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-indigo-600 font-black text-sm text-white shadow-xl shadow-rose-900/30 active:scale-[0.98] transition-all">
          <Mic size={18} /> Talk to Stranger
        </Link>
      </div>
    </main>
  );
}