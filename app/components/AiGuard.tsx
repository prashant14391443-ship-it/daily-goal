"use client";

import { useEffect } from "react";

export default function AiGuard() {
  useEffect(() => {
    const orig = window.fetch;
    window.fetch = async (...args) => {
      const res = await orig(...args);
      if (res.status === 429) {
        try {
          const j = await res.clone().json();
          alert(j.error || "⏳ Daily AI limit reached — resets midnight!");
        } catch {
          alert("⏳ Daily AI limit reached — resets midnight!");
        }
      }
      return res;
    };
    return () => {
      window.fetch = orig;
    };
  }, []);
  return null;
}