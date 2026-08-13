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
      supabase
        .from("community_members")
        .select("community_id")
        .eq("status", "approved"),
      supabase
        .from("community_members")
        .select("community_id, status")
        .eq("user_id", uid),
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
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-pink-600/20 border border-pink-500/40 flex items-center justify-center text-xl">🏘️</span>
          Community
        </h1>
        <p className="text-slate-400">Request to join → admin approves → chat & talk</p>
      </div>

      <Link
        href="/random-talk"
        className="block bg-pink-600 hover:bg-pink-500 rounded-lg p-4 mb-4 text-center font-semibold"
      >
        🎲 Talk to a Stranger — 1-on-1 voice, practice English communication
      </Link>

      <button
        onClick={() => setShowCreate(!showCreate)}
        className="w-full py-3 rounded bg-pink-600 hover:bg-pink-500 font-semibold mb-4 mt-6"
      >
        {showCreate ? "✖ Cancel" : "➕ Create My Community"}
      </button>

      {showCreate && (
        <form onSubmit={create} className="bg-slate-900 p-5 rounded-lg mb-6 grid gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Community name (e.g. English Practice India)"
            required
            className="p-3 rounded bg-slate-800 border border-slate-700"
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What is it about?"
            className="p-3 rounded bg-slate-800 border border-slate-700"
          />
          <button className="py-3 rounded bg-green-600 hover:bg-green-500 font-semibold">
            🏘️ Create & Enter
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-400">Loading communities...</p>
      ) : (
        <div className="grid gap-3">
          {list.map((c) => (
            <div
              key={c.id}
              className="bg-slate-900 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap"
            >
              <div>
                <p className="font-bold">{c.name}</p>
                <p className="text-sm text-slate-400">{c.description}</p>
                <p className="text-xs text-slate-500 mt-1">👥 {c.members} members</p>
              </div>
              <div className="flex gap-2 items-center">
                {c.joined ? (
                  <button
                    onClick={() => open(c.id)}
                    className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-sm font-semibold"
                  >
                    Open →
                  </button>
                ) : c.requested ? (
                  <span className="px-4 py-2 rounded bg-slate-800 text-amber-400 text-sm font-semibold">
                    ⏳ Requested
                  </span>
                ) : (
                  <button
                    onClick={() => requestJoin(c.id)}
                    className="px-4 py-2 rounded bg-pink-600 hover:bg-pink-500 text-sm font-semibold"
                  >
                    🙏 Request
                  </button>
                )}
                <button
                  onClick={() => report(c.id)}
                  className="px-2 py-2 rounded bg-slate-800 hover:bg-red-600 text-xs"
                  title="Report abusive content"
                >
                  🚩
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <p className="text-slate-400">No communities yet — create the first one! 🌟</p>
          )}
        </div>
      )}
    </main>
  );
}