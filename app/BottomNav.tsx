"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, User, Trophy, Gamepad2 } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const goHome = (e: React.MouseEvent) => {
    e.preventDefault();
    // Clear saved dashboard scroll position
    sessionStorage.removeItem("dg-dash-scroll");
    // Navigate + scroll to top
    window.location.href = "/";
  };

  const items = [
    { href: "/", icon: Home, label: "Home", onClick: goHome },
    { href: "/chat", icon: MessageCircle, label: "Chat" },
    { href: "/games", icon: Gamepad2, label: "Games" },
    { href: "/badges", icon: Trophy, label: "Badges" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-slate-950/95 backdrop-blur border-t border-slate-800">
      <div className="max-w-4xl mx-auto flex justify-around items-center h-16 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          const isHome = item.href === "/";

          if (isHome) {
            return (
              <button
                key={item.href}
                onClick={item.onClick}
                className="flex flex-col items-center justify-center gap-1 min-w-[48px] py-2"
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 2}
                  className={active ? "text-violet-400" : "text-slate-500"}
                />
                <span
                  className={`text-[10px] font-semibold ${
                    active ? "text-violet-400" : "text-slate-500"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 min-w-[48px] py-2"
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 2}
                className={active ? "text-violet-400" : "text-slate-500"}
              />
              <span
                className={`text-[10px] font-semibold ${
                  active ? "text-violet-400" : "text-slate-500"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}