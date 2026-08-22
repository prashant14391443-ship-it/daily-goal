"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EnglishPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/speaking");
  }, [router]);
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <p className="text-slate-400 text-sm animate-pulse">🗣️ Opening Speaking Club...</p>
    </main>
  );
}