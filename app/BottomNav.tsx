"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", icon: "🏠", label: "Home" },
  { href: "/study-tracker", icon: "📚", label: "Study" },
  { href: "/gym-log", icon: "🏋️", label: "Gym" },
  { href: "/routine-habits", icon: "✅", label: "Habits" },
  { href: "/todo", icon: "📝", label: "ToDo" },
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
      <div className="w-full bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 grid grid-cols-5 shadow-[0_-5px_15px_rgba(0,0,0,0.4)]">
        {tabs.map((t) => {
          const active = pathname === t.href || (t.href === "/dashboard" && pathname === "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-col items-center py-3 gap-1 relative"
            >
              {active && (
                <span className="absolute inset-x-3 inset-y-1 rounded-xl nav-active opacity-20" />
              )}
              <span className={`text-xl transition-transform ${active ? "scale-110" : ""}`}>
                {t.icon}
              </span>
              <span className={`text-[10px] font-bold ${active ? "text-white" : "text-slate-500"}`}>
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
