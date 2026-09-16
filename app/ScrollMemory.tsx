"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// detect browser Back / Forward
let backForward = false;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    backForward = true;
  });
}

// keep re-applying the saved position until the page is tall enough
function restoreScroll(saved: number) {
  const start = Date.now();
  let cancelled = false;

  const cancel = () => {
    cancelled = true;
    window.removeEventListener("touchmove", cancel);
    window.removeEventListener("wheel", cancel);
  };
  // if the USER scrolls manually, stop fighting them
  window.addEventListener("touchmove", cancel, { passive: true });
  window.addEventListener("wheel", cancel, { passive: true });

  const attempt = () => {
    if (cancelled) return;
    window.scrollTo(0, saved);
    const reached = Math.abs(window.scrollY - saved) < 5;
    if (reached || Date.now() - start > 5000) {
      cancel();
      return;
    }
    setTimeout(attempt, 120);
  };
  attempt();
}

export default function ScrollMemory() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);

  // remember scroll position of the page we're on
  useEffect(() => {
    const save = () =>
      sessionStorage.setItem("scroll:" + pathRef.current, String(window.scrollY));
    window.addEventListener("scroll", save, { passive: true });
    save();
    return () => {
      save();
      window.removeEventListener("scroll", save);
    };
  }, []);

  // Back/Forward → restore; normal tap/link → top (Next default)
  useEffect(() => {
    pathRef.current = pathname;
    if (!backForward) return;
    backForward = false;
    const saved = Number(sessionStorage.getItem("scroll:" + pathname) || 0);
    if (saved > 0) restoreScroll(saved);
  }, [pathname]);

  return null;
}