import { NextResponse } from "next/server";
import { getKeys } from "@/lib/qGen";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const keys = getKeys();
    
    return NextResponse.json({
      status: "success",
      api_keys_configured: {
        gemini: !!keys.gemini,
      },
      message: "AI engine is currently locked to the stable gemini-1.5-flash model.",
      active_models: ["gemini-1.5-flash"]
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message || String(e) }, { status: 500 });
  }
}