import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: "keys missing" }, { status: 500 });
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const { data: oldFiles } = await admin
      .from("community_messages")
      .select("id, file_url")
      .not("file_url", "is", null)
      .lt("created_at", twoDaysAgo);

    const paths = (oldFiles || [])
      .map((o) => String(o.file_url).split("/community-files/")[1])
      .filter(Boolean);
    if (paths.length) {
      await admin.storage.from("community-files").remove(paths);
    }

    await admin
      .from("community_messages")
      .delete()
      .not("file_url", "is", null)
      .lt("created_at", twoDaysAgo);

    await admin
      .from("community_messages")
      .delete()
      .lt("created_at", weekAgo);

    return NextResponse.json({
      ok: true,
      filesRemoved: paths.length,
    });
  } catch {
    return NextResponse.json({ error: "cleanup failed" }, { status: 500 });
  }
}