"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Dumbbell, ListChecks, ListTodo, Mic } from "lucide-react";
import { supabase } from "@/lib/supabase";

const tabs = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/study-tracker", icon: BookOpen, label: "Study" },
  { href: "/gym-log", icon: Dumbbell, label: "Gym" },
  { href: "/routine-habits", icon: ListChecks, label: "Habits" },
  { href: "/todo", icon: ListTodo, label: "ToDo" },
  { href: "/practice", icon: Mic, label: "Talk" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [reqCount, setReqCount] = useState(0);

  // 🔴 friend-request badge on the Talk tab
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) return;
      const { count } = await supabase
        .from("friend_requests")
        .select("*", { count: "exact", head: true })
        .eq("to_id", uid)
        .eq("status", "pending");
      if (active) setReqCount(count || 0);
    };
    load();
    return () => {
      active = false;
    };
  }, [pathname]);

  if (
    pathname.startsWith("/random-talk") ||
    pathname.startsWith("/call") ||
    pathname.startsWith("/feed") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/activity") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/newpost") ||
    pathname.startsWith("/friends") ||
    pathname.startsWith("/inbox") ||
    pathname.startsWith("/games") ||
    pathname.startsWith("/tips")
  ) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden pb-safe">
      <div className="w-full bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 grid grid-cols-6">
        {tabs.map((t) => {
          const active = pathname === t.href || (t.href === "/dashboard" && pathname === "/");
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-col items-center py-2.5 gap-1 relative"
            >
              {active && <span className="absolute inset-x-1.5 top-1.5 bottom-1.5 rounded-xl bg-violet-500/10" />}
              <span className="relative">
                <Icon
                  size={20}
                  strokeWidth={active ? 2.4 : 2}
                  className={`relative transition-colors ${active ? "text-violet-400" : "text-slate-500"}`}
                />
                {t.href === "/practice" && reqCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[9px] font-black text-white flex items-center justify-center">
                    {reqCount}
                  </span>
                )}
              </span>
              <span className={`relative text-[9px] font-bold ${active ? "text-violet-300" : "text-slate-600"}`}>
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}