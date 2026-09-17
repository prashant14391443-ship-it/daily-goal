"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

let restoring = false;
let saveLockUntil = 0;
let currentPath = typeof window !== "undefined" ? location.pathname : "/";

function writeSave(path: string, y: number) {
  try {
    sessionStorage.setItem("scroll:" + path, String(y));
  } catch {
    // storage blocked — ignore
  }
}

// capture the TRUE position at tap/back moment, then freeze saving briefly
function captureNow(lockMs: number) {
  if (!restoring) writeSave(currentPath, window.scrollY);
  saveLockUntil = Date.now() + lockMs;
}

if (typeof window !== "undefined") {
  document.addEventListener("click", () => captureNow(1500), true);
  document.addEventListener("touchend", () => captureNow(1000), true);
  window.addEventListener("popstate", () => captureNow(1500));
}

// re-apply saved position until page is tall enough (async data)
function restoreScroll(saved: number) {
  const start = Date.now();
  restoring = true;
  const attempt = () => {
    window.scrollTo(0, saved);
    const reached = Math.abs(window.scrollY - saved) < 5;
    if (reached || Date.now() - start > 8000) {
      restoring = false;
      saveLockUntil = Date.now() + 1200; // shield from leftover swipe
      return;
    }
    setTimeout(attempt, 120);
  };
  attempt();
}

export default function ScrollMemory() {
  const pathname = usePathname();
  const mounted = useRef(false);

  // continuous saving, never during locks/restores
  useEffect(() => {
    const save = () => {
      if (restoring || Date.now() < saveLockUntil) return;
      writeSave(currentPath, window.scrollY);
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, []);

  // NEW: tapping a link to the page you're ALREADY on (e.g. Home tab) → go TOP
  useEffect(() => {
    const onSamePageLink = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as
        | HTMLAnchorElement
        | null;
      if (!a) return;
      let url: URL;
      try {
        url = new URL(a.href, location.origin);
      } catch {
        return;
      }
      if (url.hash || url.pathname !== location.pathname) return;
      window.scrollTo(0, 0);
      writeSave(url.pathname, 0);
      saveLockUntil = Date.now() + 800;
    };
    document.addEventListener("click", onSamePageLink, true);
    return () => document.removeEventListener("click", onSamePageLink, true);
  }, []);

  // page change → restore saved position (first load = refresh → top)
  useEffect(() => {
    const first = !mounted.current;
    mounted.current = true;
    currentPath = pathname;
    if (first) return;
    const saved = Number(sessionStorage.getItem("scroll:" + pathname) || 0);
    if (saved > 0) restoreScroll(saved);
  }, [pathname]);

  return null;
}