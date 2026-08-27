"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mic } from "lucide-react";

export default function EnglishPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/speaking");
  }, [router]);
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="flex items-center gap-2 text-slate-500 text-sm font-bold">
        <Mic size={16} className="animate-pulse text-violet-400" />
        Opening Speaking Club...
      </div>
    </main>
  );
}