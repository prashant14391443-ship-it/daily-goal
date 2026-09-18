"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AiGuard() {
  useEffect(() => {
    let token = "";

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token || "";
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      token = session?.access_token || "";
    });

    const orig = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      // 1️⃣ Auto-attach the user's token to our own API calls
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const isOwnApi = url.startsWith("/api/") || url.includes(window.location.origin + "/api/");
      if (isOwnApi && token) {
        const headers = new Headers(init.headers);
        if (!headers.has("authorization") && !headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        init = { ...init, headers };
      }

      const res = await orig(input, init);

      // 2️⃣ Friendly messages for limits & guest wall
      if (res.status === 429 || res.status === 403) {
        try {
          const j = await res.clone().json();
          if (j?.error) alert(j.error);
        } catch {
          alert(
            res.status === 429
              ? "⏳ Daily AI limit reached — resets midnight!"
              : "🔒 Please sign up (free) to use this feature."
          );
        }
      }
      return res;
    };

    return () => {
      window.fetch = orig;
      sub.subscription.unsubscribe();
    };
  }, []);
  return null;
}