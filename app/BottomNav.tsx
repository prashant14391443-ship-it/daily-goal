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
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-900 border-t border-slate-800 grid grid-cols-5 md:hidden">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`flex flex-col items-center py-2 text-[10px] ${
            pathname.startsWith(t.href) ? "text-white" : "text-slate-500"
          }`}
        >
          <span className="text-lg">{t.icon}</span>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}