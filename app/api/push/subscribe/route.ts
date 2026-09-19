import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const jwt = (req.headers.get("authorization") || "").replace("Bearer ", "");
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: ud, error } = await anon.auth.getUser(jwt);
    if (error || !ud?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const { endpoint, keys } = body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) return NextResponse.json({ error: "bad sub" }, { status: 400 });

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    await admin.from("push_subscriptions").upsert(
      { user_id: ud.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: "user_id,endpoint" }
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "fail" }, { status: 500 });
  }
}