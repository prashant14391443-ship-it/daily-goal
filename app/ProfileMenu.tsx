"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [light, setLight] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname === "/login" || pathname === "/signup") return;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user.email || "friend");
    };
    load();
    if (localStorage.getItem("dg-theme") === "light") {
      setLight(true);
      document.documentElement.classList.add("light");
    }
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

  if (pathname === "/login" || pathname === "/signup") return null;

  const name = email ? email.split("@")[0] : "friend";
  const initial = name.charAt(0).toUpperCase();

  const toggleTheme = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("dg-theme", next ? "light" : "dark");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="fixed top-3 right-3 z-50" ref={boxRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl p-4 grid gap-3 shadow-xl">
          <div>
            <p className="font-bold text-white capitalize">{name}</p>
            <p className="text-xs text-slate-400 break-all">{email}</p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex justify-between items-center text-sm bg-slate-800 hover:bg-slate-700 p-2 rounded text-white"
          >
            <span>Theme</span>
            <span>{light ? "☀️ Light" : "🌙 Dark"}</span>
          </button>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="text-sm bg-slate-800 hover:bg-slate-700 p-2 rounded text-white"
          >
            🎯 Settings / Goals
          </Link>
          <button
            onClick={logout}
            className="text-sm bg-red-600 hover:bg-red-500 p-2 rounded font-semibold text-white"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}