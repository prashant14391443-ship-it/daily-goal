import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AI_LIMITS } from "@/lib/aiGate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const jwt = (req.headers.get("authorization") || "").replace("Bearer ", "");
    const defaultRes = { used: 0, limit: AI_LIMITS["*"], left: AI_LIMITS["*"] };
    
    if (!jwt) return NextResponse.json(defaultRes);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data } = await supabase.auth.getUser(jwt);
    if (!data.user || data.user.is_anonymous) return NextResponse.json(defaultRes);

    const userId = data.user.id;
    const today = new Date().toISOString().slice(0, 10);

    // Fetch total units used today (feature = '*')
    const { data: totRow } = await supabase
      .from("ai_usage")
      .select("count")
      .eq("user_id", userId)
      .eq("day", today)
      .eq("feature", "*")
      .maybeSingle();

    const used = totRow?.count || 0;
    const limit = AI_LIMITS["*"]; // This is 40 from your aiGate.ts

    return NextResponse.json({ used, limit, left: Math.max(0, limit - used) });
  } catch {
    return NextResponse.json({ used: 0, limit: 40, left: 40 });
  }
}