import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, history = [], context = "" } = await req.json();
    if (!message)
      return NextResponse.json({ error: "No message" }, { status: 400 });

    const system = `You are "Personal AI", the user's own friendly personal AI assistant inside their productivity & fitness app. Be SHORT (max 120 words), motivating, practical. Use emojis sometimes.
USER'S LIVE APP DATA:
${context}
Rules: Personalize answers using the data above. For general questions (study, life, English, anything) answer normally and helpfully.`;

    const messages = [
      { role: "system", content: system },
      ...history.slice(-8),
      { role: "user", content: message },
    ];

    // 1) GROQ (first choice — fast & free)
    if (process.env.GROQ_API_KEY) {
      try {
        const g = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages,
              max_tokens: 400,
              temperature: 0.7,
            }),
          }
        );
        if (g.ok) {
          const d = await g.json();
          const reply = d.choices?.[0]?.message?.content;
          if (reply) return NextResponse.json({ reply, engine: "groq" });
        }
      } catch {
        // fall through to Gemini
      }
    }

    // 2) GEMINI (backup — never lets user down)
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (key) {
      try {
        const gm = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                ...history
                  .slice(-8)
                  .map((h: { role: string; content: string }) => ({
                    role: h.role === "assistant" ? "model" : "user",
                    parts: [{ text: h.content }],
                  })),
                {
                  role: "user",
                  parts: [{ text: system + "\n\nUser says: " + message }],
                },
              ],
            }),
          }
        );
        if (gm.ok) {
          const d = await gm.json();
          const reply = d.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) return NextResponse.json({ reply, engine: "gemini" });
        }
      } catch {
        // both failed
      }
    }

    return NextResponse.json(
      { error: "AI is sleeping. Try again in a minute." },
      { status: 503 }
    );
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}