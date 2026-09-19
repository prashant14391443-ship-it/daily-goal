import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const jwt = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const max = 40;
  if (!jwt) return NextResponse.json({ left: max, max, used: 0 });

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data } = await anon.auth.getUser(jwt);
  const uid = data.user?.id;
  if (!uid) return NextResponse.json({ left: max, max, used: 0 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const today = new Date().toISOString().slice(0, 10);
  const { data: row } = await admin
    .from("ai_usage")
    .select("count")
    .eq("user_id", uid)
    .eq("day", today)
    .eq("feature", "*")
    .maybeSingle();

  const used = row?.count || 0;
  return NextResponse.json({ left: Math.max(0, max - used), max, used });
}