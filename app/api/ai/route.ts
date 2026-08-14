import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, history = [], context = "", mode = "coach" } = await req.json();
    if (!message) return NextResponse.json({ error: "No message" }, { status: 400 });

    let system = "";
    if (mode === "english") {
      system = `You are an expert English language tutor. The user is practicing spoken/written English.
Rules:
1. Keep replies very SHORT (2-3 sentences max) to keep the conversation flowing.
2. If the user makes a mistake, gently correct it using this exact format:
   Correction: ❌ [wrong] -> ✅ [right]
3. Always end with a simple question to make them reply.
4. Use simple, clear English.`;
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