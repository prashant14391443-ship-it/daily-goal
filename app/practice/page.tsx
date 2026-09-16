"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mic, Users, BarChart3 } from "lucide-react";
import PracticeTab from "@/app/components/PracticeTab";
import FriendsTab from "@/app/components/FriendsTab";
import ProgressTab from "@/app/components/ProgressTab";

type Tab = "practice" | "friends" | "progress";

export default function PracticeHubPage() {
  const [me, setMe] = useState("");
  const [tab, setTab] = useState<Tab>("practice");
  const [reqCount, setReqCount] = useState(0);
  const router = useRouter();

  const loadBadge = useCallback(async (uid: string) => {
    const { count } = await supabase
      .from("friend_requests")
      .select("*", { count: "exact", head: true })
      .eq("to_id", uid)
      .eq("status", "pending");
    setReqCount(count || 0);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) {
        router.push("/login");
        return;
      }
      setMe(uid);
      loadBadge(uid);
    };
    init();
  }, [router, loadBadge]);

  const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: "practice", label: "Practice", icon: Mic },
    { id: "friends", label: "Friends", icon: Users, badge: reqCount },
    { id: "progress", label: "Progress", icon: BarChart3 },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white p-3 md:p-6 pb-24">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-4 max-w-xl mx-auto">
        <Link
          href="/dashboard"
          className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-colors shrink-0"
        >
          <ArrowLeft size={18} className="text-slate-300" />
        </Link>
        <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
          <Mic size={20} className="text-rose-400" />
        </div>
        <div>
          <h1 className="text-base md:text-lg font-bold leading-tight">English Practice Hub</h1>
          <p className="text-[10px] text-slate-400 font-semibold">Calls • Friends • Progress</p>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="grid grid-cols-3 gap-2 mb-5 max-w-xl mx-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                active
                  ? "bg-gradient-to-r from-rose-600 to-indigo-600 text-white shadow-lg shadow-rose-900/20"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-600"
              }`}
            >
              <Icon size={15} />
              {t.label}
              {!!t.badge && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-[10px] font-black flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="max-w-xl mx-auto">
        {tab === "practice" && <PracticeTab me={me} onRequestsChanged={() => loadBadge(me)} />}
        {tab === "friends" && <FriendsTab me={me} onRequestsChanged={() => loadBadge(me)} />}
        {tab === "progress" && <ProgressTab me={me} />}
      </div>
    </main>
  );
}