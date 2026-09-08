import { NextResponse } from "next/server";
import { adminClient, userClientFromRequest } from "@/lib/testEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { attempt_id, clear_all } = await req.json();

    const userClient = userClientFromRequest(req);
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const admin = adminClient();

    if (clear_all) {
      const { data: rows } = await admin.from("test_attempts").select("id").eq("user_id", userId).eq("status", "completed");
      const ids = (rows || []).map((r: any) => r.id);
      if (ids.length > 0) await admin.from("test_attempts").delete().in("id", ids);
      return NextResponse.json({ deleted: ids.length });
    }

    if (!attempt_id) return NextResponse.json({ error: "Missing attempt_id" }, { status: 400 });
    const { data: att } = await admin.from("test_attempts").select("id").eq("id", attempt_id).eq("user_id", userId).maybeSingle();
    if (!att) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Cascades: test_answers + test_attempt_questions auto-deleted
    await admin.from("test_attempts").delete().eq("id", attempt_id);
    return NextResponse.json({ deleted: 1 });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message || String(e) }, { status: 500 });
  }
}