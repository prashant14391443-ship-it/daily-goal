"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconTile, GradButton, Chip, EmptyState } from "@/app/components/ui";

type Community = {
  id: string;
  name: string;
  description: string;
  members: number;
  joined: boolean;
  requested: boolean;
};

const BANNED_WORDS = [
  "fuck", "shit", "bitch", "asshole", "dick", "pussy",
  "nigga", "nigger", "cunt", "whore", "bastard"
];

function hasBadWord(text: string) {
  const lower = text.toLowerCase();
  return BANNED_WORDS.some((word) => lower.includes(word));
}

export default function CommunityPage() {
  const [online, setOnline] = useState(0);
  const [q, setQ] = useState("");

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

  const [list, setList] = useState<Community[]>([]);
  const [userId, setUserId] = useState("");
  const [myName, setMyName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) { router.push("/login"); return; }
    setUserId(uid);
    const meta = (data.session?.user.user_metadata || {}) as { display_name?: string };
    setMyName(meta.display_name || data.session?.user.email?.split("@")[0] || "member");
    const [c, m, jm] = await Promise.all([
      supabase.from("communities").select("*").order("created_at", { ascending: false }),
      supabase.from("community_members").select("community_id").eq("status", "approved"),
      supabase.from("community_members").select("community_id, status").eq("user_id", uid),
    ]);
    const counts = new Map<string, number>();
    (m.data || []).forEach((r) => counts.set(r.community_id, (counts.get(r.community_id) || 0) + 1));
    const mine = new Map<string, string>();
    (jm.data || []).forEach((r) => mine.set(r.community_id, r.status));
    setList(
      (c.data || []).map((x) => ({
        id: x.id, name: x.name, description: x.description,
        members: counts.get(x.id) || 0,
        joined: mine.get(x.id) === "approved",
        requested: mine.get(x.id) === "pending",
      }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasBadWord(name) || hasBadWord(desc)) {
      alert("🚫 Community name or description contains banned words. Please choose a clean name!");
      return;
    }
    const room = "DG-" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    const { data } = await supabase.from("communities")
      .insert({ owner_id: userId, name, description: desc, room_code: room })
      .select().single();
    if (!data) return;
    await supabase.from("community_members").insert({
      community_id: data.id, user_id: userId, status: "approved", user_name: myName,
    });
    setName(""); setDesc(""); setShowCreate(false);
    localStorage.setItem("dg-community", data.id);
    router.push("/community-room");
  };

  const requestJoin = async (id: string) => {
    await supabase.from("community_members").insert({
      community_id: id, user_id: userId, status: "pending", user_name: myName,
    });
    await load();
  };

  const report = async (id: string) => {
    const reason = prompt("Why are you reporting this community? (e.g., abusive name, spam)");
    if (!reason || !reason.trim()) return;
    await supabase.from("community_reports").insert({
      community_id: id, user_id: userId, reason: reason.trim(),
    });
    alert("✅ Thank you! Our moderators will review this community.");
  };

  const open = (id: string) => {
    localStorage.setItem("dg-community", id);
    router.push("/community-room");
  };

  const filtered = list.filter(
    (c) => c.name.toLowerCase().includes(q.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 HERO */}
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-pink-600 via-fuchsia-600 to-violet-600 p-5 shadow-2xl shadow-fuchsia-900/30">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-pink-300/20 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <span className="w-12 h-12 shrink-0 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-lg">🏠</span>
            {online > 0 && (
              <div className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-xs font-black text-white border border-white/20 flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {online} online
              </div>
            )}
          </div>
          <h1 className="text-xl font-black text-white mt-3">Community</h1>
          <p className="text-[10px] text-white/80 font-semibold mt-1">Request → approved → chat & talk</p>
        </div>
      </div>

      {/* 🎯 3 ACTION CARDS */}
      <div className="grid gap-3 mb-5">
        <Link
          href="/random-talk"
          className="press group relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-600/20 to-rose-600/20 border-2 border-pink-500/40 p-4 flex items-center gap-3 shadow-lg shadow-black/30"
        >
          <IconTile emoji="🌍" gradient="bg-gradient-to-br from-pink-500 to-rose-600" size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm text-white leading-tight">Talk to a Stranger</p>
            <p className="text-[10px] text-pink-200 font-semibold mt-0.5">1-on-1 voice • practice English</p>
          </div>
          <span className="text-slate-400 text-lg">→</span>
        </Link>

        <Link
          href="/speaking"
          className="press group relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600/20 to-violet-600/20 border-2 border-indigo-500/40 p-4 flex items-center gap-3 shadow-lg shadow-black/30"
        >
          <IconTile emoji="🤖" gradient="bg-gradient-to-br from-indigo-500 to-violet-600" size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm text-white leading-tight">Talk to AI</p>
            <p className="text-[10px] text-indigo-200 font-semibold mt-0.5">Practice English, correct mistakes</p>
          </div>
          <span className="text-slate-400 text-lg">→</span>
        </Link>

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="press group relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-2 border-amber-500/40 p-4 flex items-center gap-3 shadow-lg shadow-black/30 w-full text-left"
        >
          <IconTile emoji="✨" gradient="bg-gradient-to-br from-amber-500 to-orange-600" size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm text-white leading-tight">
              {showCreate ? "Cancel Creation" : "Create My Community"}
            </p>
            <p className="text-[10px] text-amber-200 font-semibold mt-0.5">Start your own space</p>
          </div>
          <span className="text-slate-400 text-lg">{showCreate ? "✕" : "→"}</span>
        </button>
      </div>

      {/* 📝 CREATE FORM */}
      {showCreate && (
        <form onSubmit={create} className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 mb-5 grid gap-3 shadow-lg shadow-black/30">
          <div className="flex items-center gap-2 mb-1">
            <IconTile emoji="🏘️" gradient="bg-gradient-to-br from-amber-500 to-orange-600" size="sm" />
            <p className="font-black text-sm text-white">New Community</p>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Community name (e.g. English Practice India)"
            required
            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-amber-500"
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What is it about?"
            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-amber-500"
          />
          <GradButton type="submit" gradient="from-amber-500 to-orange-600" className="w-full py-3 text-sm">
            🏘️ Create & Enter
          </GradButton>
        </form>
      )}

      {/* 🔍 SEARCH */}
      <div className="relative mb-5">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search communities..."
          className="w-full pl-11 pr-4 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 focus:border-pink-500 outline-none text-sm"
        />
      </div>

      {/* COMMUNITY LIST */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-2 animate-bounce">🏠</p>
          <p className="text-slate-400 text-sm">Loading communities...</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className={`press bg-slate-900 border-2 rounded-2xl p-4 shadow-lg shadow-black/30 ${
                c.joined ? "border-green-500/40" : c.requested ? "border-amber-500/30" : "border-slate-800"
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg ${
                  c.joined ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gradient-to-br from-pink-500 to-fuchsia-600"
                }`}>
                  👥
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-white leading-tight truncate">
                    {c.description ? `${c.name.trim()}'s ${c.description.trim()}` : `${c.name.trim()}`}
                  </p>
                  <Chip color={c.joined ? "green" : "violet"}>
                    👥 {c.members} {c.members === 1 ? "member" : "members"}
                  </Chip>
                </div>
                <button
                  onClick={() => report(c.id)}
                  title="Report"
                  className="press shrink-0 w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/40 flex items-center justify-center text-xs"
                >
                  🚩
                </button>
              </div>

              <div className="flex items-center gap-2">
                {c.joined ? (
                  <GradButton onClick={() => open(c.id)} gradient="from-green-500 to-emerald-600" className="flex-1 py-2.5 text-sm">
                    Open →
                  </GradButton>
                ) : c.requested ? (
                  <div className="flex-1 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-sm font-black text-center">
                    ⏳ Requested
                  </div>
                ) : (
                  <GradButton onClick={() => requestJoin(c.id)} gradient="from-pink-500 to-fuchsia-600" className="flex-1 py-2.5 text-sm">
                    🙏 Request
                  </GradButton>
                )}
              </div>
            </div>
          ))}

          {list.length === 0 && (
            <div className="bg-slate-900 border border-dashed border-pink-500/30 rounded-2xl">
              <EmptyState emoji="🌟" text="No communities yet — be the first to create one!" />
            </div>
          )}
          {filtered.length === 0 && list.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl">
              <EmptyState emoji="🔍" text={`No results for "${q}" — try different keywords!`} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}