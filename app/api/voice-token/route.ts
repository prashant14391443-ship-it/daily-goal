import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function POST(req: Request) {
  try {
    const { room, identity } = await req.json();
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const url = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !url) {
      return NextResponse.json(
        { error: "LiveKit keys missing in environment." },
        { status: 500 }
      );
    }
    if (!room || !identity) {
      return NextResponse.json({ error: "room & identity required." }, { status: 400 });
    }

    const token = new AccessToken(apiKey, apiSecret, { identity });
    token.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    return NextResponse.json({ token: await token.toJwt(), url });
  } catch {
    return NextResponse.json({ error: "Token error." }, { status: 500 });
  }
}