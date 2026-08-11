"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const path = usePathname();

  if (path === "/login" || path === "/signup") return null;

  const tabs = [
    { href: "/dashboard", label: "Home", icon: "🏠" },
    { href: "/study-tracker", label: "Study", icon: "📚" },
    { href: "/gym-log", label: "Gym", icon: "🏋️" },
    { href: "/routine-habits", label: "Habits", icon: "✅" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 md:hidden">
      <div className="grid grid-cols-4">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-col items-center py-2 text-xs ${
              path === t.href ? "text-blue-400" : "text-slate-400"
            }`}
          >
            <span className="text-xl">{t.icon}</span>
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}