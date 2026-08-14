import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, history = [], context = "", mode = "coach", audio } = await req.json();

    // 🎙️ AUDIO MODE: Gemini listens to the voice
    if (audio && mode === "english") {
      const gKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!gKey)
        return NextResponse.json({ error: "Audio needs Gemini key." }, { status: 503 });
      try {
        const gm = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${gKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { inline_data: { mime_type: "audio/webm", data: audio } },
                    {
                      text: "Listen to this English learner carefully. 1) Write what they said. 2) List ALL grammar AND pronunciation mistakes numbered: 1) ❌ [wrong] -> ✅ [right]. 3) End with one encouraging sentence + one simple question.",
                    },
                  ],
                },
              ],
            }),
          }
        );
        if (gm.ok) {
          const d = await gm.json();
          const reply = d.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) return NextResponse.json({ reply, engine: "gemini-audio" });
        }
      } catch {
        // fall through
      }
      return NextResponse.json(
        { error: "Could not hear the audio. Try again." },
        { status: 503 }
      );
    }

    if (!message) return NextResponse.json({ error: "No message" }, { status: 400 });

    let system = "";
    if (mode === "english") {
      system = `You are an expert English language tutor. The user is practicing spoken/written English.
Rules:
1. Read the user's ENTIRE message and find ALL mistakes (grammar, spelling, word order, missing words).
2. List EVERY mistake numbered:
   1) ❌ [wrong] -> ✅ [right]
   2) ❌ [wrong] -> ✅ [right]
   If no mistakes: "✅ Perfect sentence!"
3. After corrections, add ONE short friendly reply + ONE simple question.
4. Simple clear English, whole answer under 150 words.`;
    } else {
      system = `You are "Personal AI", a friendly assistant inside a productivity app. Be SHORT (max 120 words), motivating.
USER DATA: ${context}`;
    }

    const messages = [
      { role: "system", content: system },
      ...history.slice(-8),
      { role: "user", content: message },
    ];

    // THE 5-ENGINE AUTO-DETECT CHAIN (OpenAI compatible)
    const providers = [
      { name: "groq", key: process.env.GROQ_API_KEY, url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile" },
      { name: "cerebras", key: process.env.CEREBRAS_API_KEY, url: "https://api.cerebras.ai/v1/chat/completions", model: "llama3.1-70b" },
      { name: "sambanova", key: process.env.SAMBANOVA_API_KEY, url: "https://api.sambanova.ai/v1/chat/completions", model: "Meta-Llama-3.1-70B-Instruct" },
      { name: "mistral", key: process.env.MISTRAL_API_KEY, url: "https://api.mistral.ai/v1/chat/completions", model: "mistral-large-latest" },
    ];

    for (const p of providers) {
      if (!p.key) continue;
      try {
        const res = await fetch(p.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
          body: JSON.stringify({ model: p.model, messages, max_tokens: 400, temperature: 0.7 }),
        });
        if (res.ok) {
          const d = await res.json();
          const reply = d.choices?.[0]?.message?.content;
          if (reply) return NextResponse.json({ reply, engine: p.name });
        }
      } catch {
        // provider failed, try next
      }
    }

    // ULTIMATE FALLBACK: Gemini
    const gKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (gKey) {
      try {
        const gm = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${gKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              ...history.slice(-8).map((h: any) => ({ role: h.role === "assistant" ? "model" : "user", parts: [{ text: h.content }] })),
              { role: "user", parts: [{ text: system + "\n\nUser says: " + message }] },
            ],
          }),
        });
        if (gm.ok) {
          const d = await gm.json();
          const reply = d.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) return NextResponse.json({ reply, engine: "gemini" });
        }
      } catch {}
    }

    return NextResponse.json({ error: "All AI engines are resting. Try later!" }, { status: 503 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}