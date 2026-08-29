"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackBtn({ to = "/study" }: { to?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(to);
      }}
      className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-colors"
    >
      <ArrowLeft size={18} className="text-slate-300" />
    </button>
  );
}