"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// detects browser Back / Forward presses
let backForward = false;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    backForward = true;
  });
}

export default function ScrollMemory() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);

  // continuously remember scroll position of the page we're on
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

  // on navigation: Back/Forward → restore position, normal taps → stay at top
  useEffect(() => {
    pathRef.current = pathname;
    if (!backForward) return; // tab/link click = fresh visit = top (Next default)
    backForward = false;

    const saved = Number(sessionStorage.getItem("scroll:" + pathname) || 0);
    if (!saved) return;

    // retry several times so it sticks even after async data renders
    const restore = () => window.scrollTo(0, saved);
    restore();
    setTimeout(restore, 100);
    setTimeout(restore, 300);
    setTimeout(restore, 600);
    setTimeout(restore, 1000);
  }, [pathname]);

  return null;
}