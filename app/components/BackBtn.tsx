"use client";
import { useRouter } from "next/navigation";

export default function BackText({ to = "/study", label = "Back to Study" }: { to?: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(to);
      }}
      className="mt-10 mx-auto flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-white transition-colors"
    >
      ← {label}
    </button>
  );
}