import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@supabase/supabase-js";

/**
 * 🔐 Secured LiveKit token mint.
 * - Verifies the caller's Supabase session (Bearer JWT).
 * - FORCES identity = the authenticated uid (no impersonation, no room crashing).
 * - Display name travels in the token's `name` field (shown in chat/headers).
 */
export async function POST(req: Request) {
  try {
    const { room, name } = await req.json();

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const url = process.env.LIVEKIT_URL;
    if (!apiKey || !apiSecret || !url) {
      return NextResponse.json({ error: "LiveKit keys missing in environment." }, { status: 500 });
    }
    if (!room) {
      return NextResponse.json({ error: "room required." }, { status: 400 });
    }

    // ── Verify session ────────────────────────────────────────────────
    const jwt = (req.headers.get("authorization") || "").replace("Bearer ", "");
    if (!jwt) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data, error } = await supabase.auth.getUser(jwt);
    if (error || !data.user) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const uid = data.user.id;
    const displayName = String(name || data.user.email?.split("@")[0] || "friend").slice(0, 24);

    // ── Mint token: identity is ALWAYS the uid ────────────────────────
    const token = new AccessToken(apiKey, apiSecret, {
      identity: uid,
      name: displayName,
    });
    token.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return NextResponse.json({ token: await token.toJwt(), url });
  } catch {
    return NextResponse.json({ error: "Token error." }, { status: 500 });
  }
}