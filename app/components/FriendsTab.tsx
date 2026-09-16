"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Phone, RefreshCw, Check, X, MessageCircle, Users } from "lucide-react";

type Friend = { user_id: string; name: string; avatar: string | null; online: boolean };
type Req = { id: string; from_id: string; name: string; avatar: string | null };
type Invite = { id: string; from_id: string; room: string; name: string };

export default function FriendsTab({ me, onRequestsChanged }: { me: string; onRequestsChanged?: () => void }) {
  const [appearOffline, setAppearOffline] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    const cutoff = new Date(Date.now() - 90000).toISOString();
    const [prof, fr, rq, inv] = await Promise.all([
      supabase.from("profiles").select("appear_offline").eq("user_id", me).maybeSingle(),
      supabase.from("friends").select("friend_id").eq("user_id", me),
      supabase.from("friend_requests").select("id,from_id").eq("to_id", me).eq("status", "pending"),
      supabase.from("call_invites").select("id,from_id,room,created_at").eq("to_id", me).eq("status", "ringing").gt("created_at", cutoff),
    ]);
    setAppearOffline(!!(prof.data as any)?.appear_offline);

    const fids = ((fr.data as any[]) || []).map((f) => f.friend_id);
    let list: Friend[] = [];
    if (fids.length) {
      const [profs, on] = await Promise.all([
        supabase.from("profiles").select("user_id,display_name,avatar_url,appear_offline").in("user_id", fids),
        supabase.from("online_users").select("user_id").gt("last_seen", cutoff).in("user_id", fids),
      ]);
      const onlineSet = new Set<string>(((on.data as any[]) || []).map((o) => o.user_id as string));
      list = ((profs.data as any[]) || []).map((p) => ({
        user_id: p.user_id,
        name: p.display_name || "Member",
        avatar: p.avatar_url || null,
        online: onlineSet.has(p.user_id) && !p.appear_offline,
      }));
      list.sort((a, b) => Number(b.online) - Number(a.online));
    }
    setFriends(list);

    const rids = ((rq.data as any[]) || []).map((r) => r.from_id);
    if (rids.length) {
      const { data: rp } = await supabase.from("profiles").select("user_id,display_name,avatar_url").in("user_id", rids);
      // FIX 1 & 2: Use `rp` directly (not rp.data) and explicitly type the mapping as a tuple [string, any] for the Map constructor
      const m = new Map<string, any>(((rp as any[]) || []).map((p) => [p.user_id, p] as [string, any]));
      setReqs(((rq.data as any[]) || []).map((r) => ({ id: r.id, from_id: r.from_id, name: m.get(r.from_id)?.display_name || "Member", avatar: m.get(r.from_id)?.avatar_url || null })));
    } else setReqs([]);

    const iids = ((inv.data as any[]) || []).map((i) => i.from_id);
    if (iids.length) {
      const { data: ip } = await supabase.from("profiles").select("user_id,display_name").in("user_id", iids);
      // FIX 3 & 4: Use `ip` directly (not ip.data) and explicitly type the mapping as a tuple [string, string] for the Map constructor
      const m = new Map<string, string>(((ip as any[]) || []).map((p) => [p.user_id, p.display_name || "Member"] as [string, string]));
      setInvites(((inv.data as any[]) || []).map((i) => ({ id: i.id, from_id: i.from_id, room: i.room, name: m.get(i.from_id) || "Member" })));
    } else setInvites([]);
    setLoading(false);
  }, [me]);

  useEffect(() => {
    load();
    const id = setInterval(load, 10000); // poll invites + presence
    return () => clearInterval(id);
  }, [load]);

  const toggleOnline = async () => {
    const next = !appearOffline;
    setAppearOffline(next);
    await supabase.from("profiles").update({ appear_offline: next }).eq("user_id", me);
  };

  const accept = async (r: Req) => {
    await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", r.id);
    await supabase.from("friends").insert([
      { user_id: me, friend_id: r.from_id },
      { user_id: r.from_id, friend_id: me },
    ]);
    onRequestsChanged?.();
    load();
  };
  const decline = async (r: Req) => {
    await supabase.from("friend_requests").update({ status: "rejected" }).eq("id", r.id);
    onRequestsChanged?.();
    load();
  };

  const callFriend = async (f: Friend) => {
    const room = `CALL-${[me, f.user_id].sort().join("-")}`;
    await supabase.from("call_invites").insert({ from_id: me, to_id: f.user_id, room });
    router.push(`/call?room=${encodeURIComponent(room)}&with=${f.user_id}`);
  };

  const joinCall = async (inv: Invite) => {
    await supabase.from("call_invites").update({ status: "joined" }).eq("id", inv.id);
    router.push(`/call?room=${encodeURIComponent(inv.room)}&with=${inv.from_id}`);
  };

  const onlineCount = friends.filter((f) => f.online).length;

  return (
    <div className="grid gap-4">
      {/*  MY STATUS */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
        <span className="w-11 h-11 rounded-full bg-violet-600 flex items-center justify-center font-black">YOU</span>
        <div className="flex-1">
          <p className="text-sm font-bold">You</p>
          <p className={`text-[10px] font-bold ${appearOffline ? "text-slate-500" : "text-green-400"}`}>
            {appearOffline ? "Appearing offline" : "Online"}
          </p>
        </div>
        <button
          onClick={toggleOnline}
          className={`w-14 h-8 rounded-full p-1 transition-colors ${appearOffline ? "bg-slate-700" : "bg-green-600"}`}
        >
          <span className={`block w-6 h-6 rounded-full bg-white transition-transform ${appearOffline ? "" : "translate-x-6"}`} />
        </button>
      </div>

      {/* 📞 INCOMING CALL INVITES */}
      {invites.map((inv) => (
        <div key={inv.id} className="bg-green-600/15 border-2 border-green-500/50 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
          <Phone size={20} className="text-green-400" />
          <div className="flex-1">
            <p className="text-sm font-bold text-white">{inv.name} is calling…</p>
            <p className="text-[10px] text-green-300 font-semibold">Tap join to enter the voice room</p>
          </div>
          <button onClick={() => joinCall(inv)} className="px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-xs font-black">
            JOIN
          </button>
        </div>
      ))}

      {/* 🙏 FRIEND REQUESTS */}
      {reqs.length > 0 && (
        <div className="bg-amber-600/10 border border-amber-500/40 rounded-2xl p-4">
          <p className="text-xs font-black text-amber-300 mb-2">Friend Requests ({reqs.length})</p>
          <div className="grid gap-2">
            {reqs.map((r) => (
              <div key={r.id} className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
                {r.avatar ? (
                  <img src={r.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <span className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">{r.name.charAt(0).toUpperCase()}</span>
                )}
                <p className="flex-1 text-xs font-bold truncate">{r.name}</p>
                <button onClick={() => accept(r)} className="w-8 h-8 rounded-lg bg-green-600 hover:bg-green-500 flex items-center justify-center"><Check size={15} /></button>
                <button onClick={() => decline(r)} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-600 flex items-center justify-center"><X size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 👥 FRIENDS LIST */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold flex items-center gap-2">
            <Users size={15} className="text-violet-400" /> Online Friends ({onlineCount})
          </p>
          <button onClick={load} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
            <RefreshCw size={13} />
          </button>
        </div>
        {loading ? (
          <p className="text-xs text-slate-500 py-8 text-center">Loading...</p>
        ) : friends.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">No friends yet — add them from your call history in the Practice tab!</p>
        ) : (
          <div className="grid gap-2">
            {friends.map((f) => (
              <div key={f.user_id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <div className="relative shrink-0">
                  {f.avatar ? (
                    <img src={f.avatar} alt="" className={`w-10 h-10 rounded-full object-cover ${f.online ? "border-2 border-green-500" : "border-2 border-slate-700"}`} />
                  ) : (
                    <span className={`w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center font-bold ${f.online ? "border-2 border-green-500" : "border-2 border-slate-700"}`}>
                      {f.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  {f.online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-slate-950" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{f.name}</p>
                  <p className={`text-[10px] font-bold ${f.online ? "text-green-400" : "text-slate-500"}`}>{f.online ? "Online" : "Offline"}</p>
                </div>
                <Link href={`/chat?user=${f.user_id}`} className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0">
                  <MessageCircle size={15} />
                </Link>
                <button
                  onClick={() => callFriend(f)}
                  disabled={!f.online || appearOffline}
                  title={f.online ? "Voice call" : "Friend is offline"}
                  className="w-9 h-9 rounded-lg bg-green-600/15 border border-green-600/40 text-green-400 hover:bg-green-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-all"
                >
                  <Phone size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}