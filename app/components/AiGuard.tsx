"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Features that physically need internet (AI / realtime / calls)
const ONLINE_ONLY = [
  "/english", "/talk", "/speaking", "/evaluate", "/random-talk", "/call",
  "/feed", "/friends", "/inbox", "/chat", "/newpost",
  "/calorie", "/blueprint", "/coach", "/quiz", "/summarize", "/ai-summary",
  "/exam", "/test", "/learn", "/vocab", "/tips", "/mind", "/focus",
];

export default function AiGuard() {
  const [toast, setToast] = useState("");

  useEffect(() => {
    let token = "";
    let toastTimer: any = null;

    const show = (msg: string) => {
      setToast(msg);
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => setToast(""), 2600);
    };

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token || "";
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      token = session?.access_token || "";
    });

    // 1️⃣ Auto-attach auth header to our API calls
    const orig = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const isOwnApi = url.startsWith("/api/") || url.includes(window.location.origin + "/api/");
      if (isOwnApi && token) {
        const headers = new Headers(init.headers);
        if (!headers.has("authorization") && !headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        init = { ...init, headers };
      }
      const res = await orig(input, init);
      if (res.status === 429 || res.status === 403) {
        try {
          const j = await res.clone().json();
          if (j?.error) show(j.error);
        } catch {
          show(res.status === 429 ? "⏳ Daily AI limit reached — resets midnight!" : "🔒 Please sign up (free) to use this feature.");
        }
      }
      return res;
    };

    // 2️⃣ Offline guard: block internet-only pages with a friendly toast (no bounce)
    const onClick = (e: MouseEvent) => {
      if (navigator.onLine) return;
      const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (ONLINE_ONLY.some((p) => href === p || href.startsWith(p + "/") || href.startsWith(p + "?"))) {
        e.preventDefault();
        e.stopPropagation();
        show("📡 You're offline — this feature needs internet. Everything else works!");
      }
    };
    document.addEventListener("click", onClick, true);

    return () => {
      window.fetch = orig;
      document.removeEventListener("click", onClick, true);
      sub.subscription.unsubscribe();
      clearTimeout(toastTimer);
    };
  }, []);

  if (!toast) return null;
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] max-w-[90vw] px-4 py-3 rounded-2xl bg-slate-900/95 border border-slate-700 text-slate-100 text-xs font-bold shadow-2xl backdrop-blur-sm text-center">
      {toast}
    </div>
  );
}