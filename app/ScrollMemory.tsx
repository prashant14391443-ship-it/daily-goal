"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

let restoring = false;      // while we re-apply a position, don't save scroll noise
let saveLockUntil = 0;      // ignore scroll events during page swap

function restoreScroll(saved: number) {
  const start = Date.now();
  restoring = true;
  const attempt = () => {
    window.scrollTo(0, saved);
    const reached = Math.abs(window.scrollY - saved) < 5;
    if (reached || Date.now() - start > 5000) {
      restoring = false;
      return;
    }
    setTimeout(attempt, 120);
  };
  attempt();
}

export default function ScrollMemory() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const mounted = useRef(false);

  // remember position of whichever page we're on
  useEffect(() => {
    const save = () => {
      if (restoring || Date.now() < saveLockUntil) return;
      sessionStorage.setItem("scroll:" + pathRef.current, String(window.scrollY));
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, []);

  // on page change: restore saved position (except first load = refresh → top)
  useEffect(() => {
    saveLockUntil = Date.now() + 1500;
    const target = pathname;
    const firstLoad = !mounted.current;
    mounted.current = true;
    pathRef.current = target;
    if (firstLoad) return; // refresh / fresh open stays at top
    const saved = Number(sessionStorage.getItem("scroll:" + target) || 0);
    if (saved > 0) restoreScroll(saved);
  }, [pathname]);

  return null;
}