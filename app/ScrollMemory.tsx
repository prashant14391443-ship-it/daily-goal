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
    // storage full / blocked — ignore
  }
}

// capture the TRUE position at the exact moment of tap / back,
// then freeze saving so page-swap noise (scroll clamped to 0) can't overwrite it
function captureNow(lockMs: number) {
  if (!restoring) writeSave(currentPath, window.scrollY);
  saveLockUntil = Date.now() + lockMs;
}

if (typeof window !== "undefined") {
  document.addEventListener("click", () => captureNow(1500), true);
  document.addEventListener("touchend", () => captureNow(1000), true);
  window.addEventListener("popstate", () => captureNow(1500));
}

// re-apply saved position until the page is actually tall enough (async data)
function restoreScroll(saved: number) {
  const start = Date.now();
  restoring = true;
  const attempt = () => {
    window.scrollTo(0, saved);
    const reached = Math.abs(window.scrollY - saved) < 5;
    if (reached || Date.now() - start > 8000) {
      restoring = false;
      saveLockUntil = Date.now() + 1200; // shield from leftover back-swipe
      return;
    }
    setTimeout(attempt, 120);
  };
  attempt();
}

export default function ScrollMemory() {
  const pathname = usePathname();
  const mounted = useRef(false);

  // continuous saving, but never during locks / restores
  useEffect(() => {
    const save = () => {
      if (restoring || Date.now() < saveLockUntil) return;
      writeSave(currentPath, window.scrollY);
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, []);

  // page change → restore (first load = refresh → stay top)
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