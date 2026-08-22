"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
    if (!uid) {
      router.push("/login");
      return;
    }
    setUserId(uid);
    const meta = (data.session?.user.user_metadata || {}) as {
      display_name?: string;
    };
    setMyName(meta.display_name || data.session?.user.email?.split("@")[0] || "member");
    
    const [c, m, jm] = await Promise.all([
      supabase.from("communities").select("*").order("created_at", { ascending: false }),
      supabase.from("community_members").select("community_id").eq("status", "approved"),
      supabase.from("community_members").select("community_id, status").eq("user_id", uid),
    ]);

    const counts = new Map<string, number>();
    (m.data || []).forEach((r) =>
      counts.set(r.community_id, (counts.get(r.community_id) || 0) + 1)
    );

    const mine = new Map<string, string>();
    (jm.data || []).forEach((r) => mine.set(r.community_id, r.status));

    setList(
      (c.data || []).map((x) => ({
        id: x.id,
        name: x.name,
        description: x.description,
        members: counts.get(x.id) || 0,
        joined: mine.get(x.id) === "approved",
        requested: mine.get(x.id) === "pending",
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (hasBadWord(name) || hasBadWord(desc)) {
      alert("🚫 Community name or description contains banned words. Please choose a clean name!");
      return;
    }

    const room =
      "DG-" +
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 10);
      
    const { data } = await supabase
      .from("communities")
      .insert({ owner_id: userId, name, description: desc, room_code: room })
      .select()
      .single();
      
    if (!data) return;
    
    await supabase.from("community_members").insert({
      community_id: data.id,
      user_id: userId,
      status: "approved",
      user_name: myName,
    });
    
    setName("");
    setDesc("");
    setShowCreate(false);
    localStorage.setItem("dg-community", data.id);
    router.push("/community-room");
  };

  const requestJoin = async (id: string) => {
    await supabase.from("community_members").insert({
      community_id: id,
      user_id: userId,
      status: "pending",
      user_name: myName,
    });
    await load();
  };

  const report = async (id: string) => {
    const reason = prompt("Why are you reporting this community? (e.g., abusive name, spam)");
    if (!reason || !reason.trim()) return;
    await supabase.from("community_reports").insert({
      community_id: id,
      user_id: userId,
      reason: reason.trim(),
    });
    alert("✅ Thank you! Our moderators will review this community.");
  };

  const open = (id: string) => {
    localStorage.setItem("dg-community", id);
    router.push("/community-room");
  };

  return (
    <main className="min-h-screen bg-[#0a0f1c] text-white p-4 md:p-8 pb-24">
      {/* HEADER */}
      <div className="mb-8 pt-6 pr-16">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3 tracking-tight">
            <span className="text-4xl drop-shadow-md">🏠</span>
            Community
          </h1>
          <p className="text-slate-400 text-sm md:text-base font-medium mt-1">
            Request to join → admin approves → chat & talk
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full self-start">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs md:text-sm text-green-400 font-bold tracking-wide">
              {online} online
            </span>
          </div>
        </div>
      </div>

      {/* FULL-WIDTH ACTION ROWS */}
      <div className="flex flex-col gap-4 mb-8">
        <Link
          href="/random-talk"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-950/40 to-purple-950/40 border border-pink-500/20 p-5 text-center transition-all duration-300 hover:border-pink-500/40 hover:shadow-[0_0_20px_-5px_rgba(236,72,153,0.2)] hover:-translate-y-0.5"
        >
          <p className="font-semibold text-pink-100 flex items-center justify-center gap-3 text-sm md:text-base">
            <span className="text-2xl group-hover:scale-110 transition-transform">🌍</span>
            Talk to a Stranger — 1-on-1 voice, practice English communication
          </p>
        </Link>

        <Link
          href="/speaking"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/40 to-fuchsia-950/40 border border-indigo-500/20 p-5 text-center transition-all duration-300 hover:border-indigo-500/40 hover:shadow-[0_0_20px_-5px_rgba(99,102,241,0.2)] hover:-translate-y-0.5"
        >
          <p className="font-semibold text-indigo-100 flex items-center justify-center gap-3 text-sm md:text-base">
            <span className="text-2xl group-hover:scale-110 transition-transform">🤖</span>
            Talk to AI — Practice English, correct mistakes
          </p>
        </Link>

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/40 to-orange-950/40 border border-amber-500/20 p-5 text-center transition-all duration-300 hover:border-amber-500/40 hover:shadow-[0_0_20px_-5px_rgba(245,158,11,0.2)] hover:-translate-y-0.5 w-full"
        >
          <p className="font-semibold text-amber-100 flex items-center justify-center gap-3 text-sm md:text-base">
            <span className="text-2xl group-hover:scale-110 transition-transform">✨</span>
            {showCreate ? "Cancel Creation" : "Create My Community"}
          </p>
        </button>
      </div>

      {/* CREATE COMMUNITY FORM */}
      {showCreate && (
        <form onSubmit={create} className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 rounded-2xl mb-8 grid gap-4 shadow-xl">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Community name (e.g. English Practice India)"
            required
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What is it about?"
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
          />
          <button className="py-3.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 font-bold text-white shadow-lg shadow-green-900/20 transition-all">
            🏘️ Create & Enter
          </button>
        </form>
      )}

      {/* SEARCH */}
      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search communities..."
          className="w-full pl-11 p-3.5 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-slate-800 focus:border-slate-600 outline-none transition-colors text-sm"
        />
      </div>

      {/* COMMUNITY LIST */}
      {loading ? (
        <div className="flex justify-center p-8">
          <p className="text-slate-400 animate-pulse font-medium">Loading communities...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {list
            .filter(
              (c) =>
                c.name.toLowerCase().includes(q.toLowerCase()) ||
                (c.description || "").toLowerCase().includes(q.toLowerCase())
            )
            .map((c) => (
              <div
                key={c.id}
                className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-colors shadow-lg"
              >
                {/* Info Top Row */}
                <div className="flex items-start gap-4 mb-4">
                  <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-600/20 to-purple-600/20 border border-pink-500/20 flex items-center justify-center text-3xl shrink-0 shadow-inner">
                    👥
                  </span>
                  <div className="flex-1 mt-0.5">
                    <h2 className="font-bold text-lg text-slate-100 leading-tight">
                      {c.description
                        ? `${c.name.trim()}'s ${c.description.trim()} Community`
                        : `${c.name.trim()} Community`}
                    </h2>
                    <span className="inline-flex items-center gap-1.5 text-[11px] bg-pink-500/10 border border-pink-500/20 text-pink-300 px-2.5 py-1 rounded-full font-bold mt-2 tracking-wide uppercase">
                      👥 {c.members} {c.members === 1 ? "member" : "members"}
                    </span>
                  </div>
                </div>

                {/* Buttons Bottom Row */}
                <div className="flex gap-3 items-center w-full">
                  {c.joined ? (
                    <button
                      onClick={() => open(c.id)}
                      className="px-6 py-2.5 rounded-xl bg-green-600/90 hover:bg-green-500 text-white text-sm font-bold shadow-lg shadow-green-900/20 transition-colors"
                    >
                      Open →
                    </button>
                  ) : c.requested ? (
                    <span className="px-5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-bold flex items-center gap-2">
                      ⏳ Requested
                    </span>
                  ) : (
                    <button
                      onClick={() => requestJoin(c.id)}
                      className="px-5 py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm font-bold hover:bg-blue-600/40 transition-colors flex items-center gap-2"
                    >
                      🙏 Request
                    </button>
                  )}

                  {/* Sleek SVG Report Button (Now available on ALL groups) */}
                  <button
                    onClick={() => report(c.id)}
                    title="Report Community"
                    className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-slate-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center justify-center ml-auto group"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="18" 
                      height="18" 
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
                  </button>
                </div>
              </div>
            ))}
            
          {list.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
              <p className="text-4xl mb-3">🌟</p>
              <p className="text-slate-400 font-medium">No communities yet — be the first to create one!</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}