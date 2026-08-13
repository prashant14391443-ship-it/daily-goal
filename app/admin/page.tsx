"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Report = {
  id: string;
  reason: string;
  created_at: string;
  community_id: string;
  communities: { name: string; description: string } | null;
};

// ⚠️ PASTE YOUR EXACT EMAIL HERE
const ADMIN_EMAIL = "prashant14391443@gmail.com";

export default function AdminPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Block everyone except YOU
      if (!session || session.user.email !== ADMIN_EMAIL) {
        router.push("/dashboard");
        return;
      }

      const { data } = await supabase
        .from("community_reports")
        .select("*, communities(id, name, description)")
        .order("created_at", { ascending: false });

      setReports((data as Report[]) || []);
      setLoading(false);
    };
    load();
  }, [router]);

  const destroyCommunity = async (communityId: string) => {
    if (!confirm("🧨 DESTROY this community and ALL its messages/files?")) return;
    
    // Deletes the community (auto-deletes members, chats, files)
    await supabase.from("communities").delete().eq("id", communityId);
    
    // Removes the reports for it from the screen
    setReports(reports.filter((r) => r.community_id !== communityId));
    alert("Community destroyed! Everything inside it is gone.");
  };

  if (loading) return <main className="min-h-screen bg-slate-950 text-white p-8">Loading Admin Panel...</main>;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">👑 Admin Dashboard</h1>
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">← Back to Dashboard</Link>
      </div>

      <p className="text-slate-400 mb-6">🚩 Communities reported by users:</p>

      {reports.length === 0 ? (
        <div className="bg-slate-900 p-8 rounded-xl text-center text-slate-500">
          ✨ No reports! Your community is clean.
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map((r) => (
            <div key={r.id} className="bg-slate-900 border border-red-500/30 rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4">
              <div>
                <p className="font-bold text-lg text-red-400">🚩 {r.communities?.name || "Deleted Community"}</p>
                <p className="text-sm text-slate-400 mb-2">{r.communities?.description}</p>
                <p className="text-sm bg-slate-800 p-2 rounded">
                  <span className="text-slate-500">Reason:</span> {r.reason}
                </p>
              </div>
              <button
                onClick={() => destroyCommunity(r.community_id)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 font-bold h-fit"
              >
                🧨 Destroy
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}