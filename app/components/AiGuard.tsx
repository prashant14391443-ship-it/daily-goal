"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// ONLY pages that are 100% internet-dependent (AI calls / realtime / social)
// English hub, /speaking, /vocab, games, tips are NOT here → they open offline
const ONLINE_ONLY = [
  "/random-talk", "/community", "/feed", "/friends", "/inbox", "/chat", "/newpost",
  "/call", "/evaluate", "/talk",
  "/calorie", "/blueprint", "/coach", "/summarize", "/ai-summary", "/breakdown",
  "/exam", "/test", "/learn", "/learns", "/ai",
  "/move",
];

// AI API routes → blocked offline with a friendly toast (wherever they're called)
const AI_API = [
  "/api/ai", "/api/quiz", "/api/calorie", "/api/blueprint", "/api/coach",
  "/api/summarize", "/api/ai-summary", "/api/learn", "/api/breakdown", "/api/vocab",
  "/api/test/start", "/api/test/topup",
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
    const offlineMsg = "📡 You're offline — this feature needs internet. Everything else works!";

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token || "";
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      token = session?.access_token || "";
    });

    const isOnlineOnlyPath = (p: string) =>
      ONLINE_ONLY.some((x) => p === x || p.startsWith(x + "/") || p.startsWith(x + "?"));

    // 1️⃣ Fetch patch: auth header + block AI APIs offline + limit alerts
    const orig = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

      // Offline + AI API (but NOT quota check) → toast, don't try network
      if (!navigator.onLine && AI_API.some((p) => url.includes(p)) && !url.includes("/api/ai/quota")) {
        show(offlineMsg);
        return new Response(JSON.stringify({ error: "offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }

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

    // 2️⃣ Block LINK taps to internet-only pages while offline
    const onClick = (e: MouseEvent) => {
      if (navigator.onLine) return;
      const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (isOnlineOnlyPath(href)) {
        e.preventDefault();
        e.stopPropagation();
        show(offlineMsg);
      }
    };
    document.addEventListener("click", onClick, true);

    // 3️⃣ Block programmatic navigation (router.push) to internet-only pages
    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);
    history.pushState = (state: any, unused: any, url?: string | URL | null) => {
      if (!navigator.onLine && url && isOnlineOnlyPath(String(url))) { show(offlineMsg); return; }
      return origPush(state, unused, url);
    };
    history.replaceState = (state: any, unused: any, url?: string | URL | null) => {
      if (!navigator.onLine && url && isOnlineOnlyPath(String(url))) { show(offlineMsg); return; }
      return origReplace(state, unused, url);
    };

    // 4️⃣ Listen for manual toasts (AI bubble etc.)
    const onToast = (e: any) => show(e.detail || offlineMsg);
    window.addEventListener("dg-toast", onToast);

    return () => {
      window.fetch = orig;
      document.removeEventListener("click", onClick, true);
      history.pushState = origPush;
      history.replaceState = origReplace;
      window.removeEventListener("dg-toast", onToast);
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