"use client";
import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-red-600 text-white text-center text-sm font-bold py-2 shadow-lg">
      📡 You're offline — reconnect to continue!
    </div>
  );
}