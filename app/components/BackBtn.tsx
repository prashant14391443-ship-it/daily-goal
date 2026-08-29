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
      className="w-10 h-10 shrink-0 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-700 hover:text-white active:scale-95 transition-all shadow-sm"
    >
      <ArrowLeft size={18} />
    </button>
  );
}