"use client";

import { useEffect } from "react";

export default function InviteCapture() {
  useEffect(() => {
    const inv = new URLSearchParams(window.location.search).get("inv");
    if (inv) localStorage.setItem("ff-inv", inv);
  }, []);
  return null;
}