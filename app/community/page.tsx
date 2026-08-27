"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home, Globe, Bot, Sparkles, Search, Users, Flag, UserPlus, Clock, ArrowRight, X, Building2 } from "lucide-react";

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
      {/* 🌆 CALM HERO */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-pink-600 via-fuchsia-600 to-violet-600 p-5 shadow-xl shadow-fuchsia-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
              <Home size={22} strokeWidth={2.2} className="text-white" />
            </div>
            {online > 0 && (
              <div className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-xs font-semibold text-white border border-white/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {online} online
              </div>
            )}
          </div>
          <h1 className="text-xl font-bold text-white">Community</h1>
          <p className="text-xs text-white/75 font-medium mt-1">Request → approved → chat & talk</p>
        </div>
      </div>

      {/* 🎯 3 ACTION CARDS */}
      <div className="grid gap-3 mb-6">
        <Link
          href="/random-talk"
          className="group bg-slate-900 border border-slate-700 hover:border-pink-500/40 rounded-2xl p-4 flex items-center gap-3 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center flex-shrink-0">
            <Globe size={20} className="text-pink-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white leading-tight">Talk to a Stranger</p>
            <p className="text-xs text-slate-400 mt-0.5">1-on-1 voice • practice English</p>
          </div>
          <ArrowRight size={18} className="text-slate-500 group-hover:text-pink-400 transition-colors flex-shrink-0" />
        </Link>

        <Link
          href="/speaking"
          className="group bg-slate-900 border border-slate-700 hover:border-indigo-500/40 rounded-2xl p-4 flex items-center gap-3 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <Bot size={20} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white leading-tight">Talk to AI</p>
            <p className="text-xs text-slate-400 mt-0.5">Practice English, correct mistakes</p>
          </div>
          <ArrowRight size={18} className="text-slate-500 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
        </Link>

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="group bg-slate-900 border border-slate-700 hover:border-amber-500/40 rounded-2xl p-4 flex items-center gap-3 transition-colors w-full text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            {showCreate ? <X size={20} className="text-amber-400" /> : <Sparkles size={20} className="text-amber-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white leading-tight">
              {showCreate ? "Cancel Creation" : "Create My Community"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Start your own space</p>
          </div>
          {showCreate ? (
            <X size={18} className="text-slate-500 flex-shrink-0" />
          ) : (
            <ArrowRight size={18} className="text-slate-500 group-hover:text-amber-400 transition-colors flex-shrink-0" />
          )}
        </button>
      </div>

      {/* 📝 CREATE FORM */}
      {showCreate && (
        <form onSubmit={create} className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-6 grid gap-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Building2 size={16} className="text-amber-400" />
            </div>
            <p className="font-semibold text-sm text-white">New Community</p>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Community name (e.g. English Practice India)"
            required
            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:border-amber-500 focus:outline-none"
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What is it about?"
            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm focus:border-amber-500 focus:outline-none"
          />
          <button 
            type="submit" 
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-sm font-semibold transition-colors"
          >
            Create & Enter
          </button>
        </form>
      )}

      {/* 🔍 SEARCH */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search communities..."
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-pink-500 focus:outline-none text-sm"
        />
      </div>

      {/* COMMUNITY LIST */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center animate-pulse">
            <Home size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-400 text-sm font-medium">Loading communities...</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className={`bg-slate-900 border rounded-2xl p-4 ${
                c.joined ? "border-emerald-500/30" : c.requested ? "border-amber-500/30" : "border-slate-700"
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  c.joined ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-pink-500/10 border border-pink-500/20"
                }`}>
                  <Users size={22} className={c.joined ? "text-emerald-400" : "text-pink-400"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white leading-tight truncate mb-1">
                    {c.description ? `${c.name.trim()}'s ${c.description.trim()}` : `${c.name.trim()}`}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Users size={12} />
                    <span>{c.members} {c.members === 1 ? "member" : "members"}</span>
                  </div>
                </div>
                <button
                  onClick={() => report(c.id)}
                  title="Report"
                  className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/40 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <Flag size={14} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {c.joined ? (
                  <button 
                    onClick={() => open(c.id)} 
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    Open
                    <ArrowRight size={14} />
                  </button>
                ) : c.requested ? (
                  <div className="flex-1 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-semibold text-center flex items-center justify-center gap-2">
                    <Clock size={14} />
                    Requested
                  </div>
                ) : (
                  <button 
                    onClick={() => requestJoin(c.id)} 
                    className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <UserPlus size={14} />
                    Request
                  </button>
                )}
              </div>
            </div>
          ))}

          {list.length === 0 && (
            <div className="bg-slate-900 border border-dashed border-slate-700 rounded-2xl p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center">
                <Sparkles size={24} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-400 font-medium">No communities yet — be the first to create one!</p>
            </div>
          )}
          {filtered.length === 0 && list.length > 0 && (
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center">
                <Search size={24} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-400 font-medium">No results for "{q}" — try different keywords!</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}