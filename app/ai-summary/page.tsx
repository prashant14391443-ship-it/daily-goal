"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AiSummaryRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/summarize"); }, [router]);
  return null;
}