"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Notif = {
  id: number;
  title: string;
  body: string;
  time: string;
  read: boolean;
};

function prune(list: Notif[]) {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000 * 24;
  return list
    .filter((n) => new Date(n.time).getTime() > cutoff)
    .slice(0, 50);
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const pathname = usePathname();
  const boxRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    try {
      setItems(prune(JSON.parse(localStorage.getItem("dg-notifications") || "[]")));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (pathname === "/login" || pathname === "/signup") return;
    refresh();
    window.addEventListener("dg-notif-change", refresh);
    return () => window.removeEventListener("dg-notif-change", refresh);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (["/login", "/signup", "/activity", "/inbox", "/profile", "/feed", "/search", "/leaderboard", "/english", "/ai", "/move", "/speaking", "/evaluate"].includes(pathname)) return null;

  const unread = items.filter((n) => !n.read).length;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      const marked = items.map((n) => ({ ...n, read: true }));
      localStorage.setItem("dg-notifications", JSON.stringify(marked));
      setItems(marked);
    }
  };

  const clearAll = () => {
    localStorage.removeItem("dg-notifications");
    setItems([]);
  };

  const timeLabel = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div
      ref={boxRef}
      data-version="v8-bell-violet"
      style={{ position: "absolute", top: 22, right: 76, zIndex: 60 }}
    >
      <button
        onClick={toggle}
        className="relative w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white flex items-center justify-center text-lg shadow-lg shadow-violet-900/50 ring-2 ring-white/10 hover:scale-105 transition-all"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ring-2 ring-slate-950">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed top-14 right-0 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-4 grid gap-2 shadow-2xl max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <p className="font-bold text-white text-sm">🔔 Notifications</p>
            <button
              onClick={clearAll}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            >
              Clear all
            </button>
          </div>
          {items.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">No notifications yet.</p>
          )}
          {items.map((n) => (
            <div key={n.id} className="bg-slate-800 rounded-xl p-3 border border-slate-700">
              <p className="text-sm font-semibold text-white">{n.title}</p>
              <p className="text-xs text-slate-300 mt-1">{n.body}</p>
              <p className="text-[10px] text-slate-500 mt-2">{timeLabel(n.time)}</p>
            </div>
          ))}
          <p className="text-[10px] text-slate-500 text-center pt-2 border-t border-slate-800">
            Auto-delete after 2 days
          </p>
        </div>
      )}
    </div>
  );
}