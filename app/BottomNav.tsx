"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Dumbbell, ListChecks, ListTodo } from "lucide-react";

const tabs = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/study-tracker", icon: BookOpen, label: "Study" },
  { href: "/gym-log", icon: Dumbbell, label: "Gym" },
  { href: "/routine-habits", icon: ListChecks, label: "Habits" },
  { href: "/todo", icon: ListTodo, label: "ToDo" },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (
    pathname.startsWith("/random-talk") ||
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
      <div className="w-full bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 grid grid-cols-5">
        {tabs.map((t) => {
          const active = pathname === t.href || (t.href === "/dashboard" && pathname === "/");
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href} className="flex flex-col items-center py-2.5 gap-1 relative">
              {active && <span className="absolute inset-x-4 top-1.5 bottom-1.5 rounded-xl bg-violet-500/10" />}
              <Icon
                size={20}
                strokeWidth={active ? 2.4 : 2}
                className={`relative transition-colors ${active ? "text-violet-400" : "text-slate-500"}`}
              />
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