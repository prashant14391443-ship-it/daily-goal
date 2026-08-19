import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, history = [], context = "", mode = "coach", audio } = await req.json();

    // 🎙️ AUDIO MODE (English voice practice)
    if (audio && mode === "english") {
      const gKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!gKey) return NextResponse.json({ error: "Audio needs Gemini key." }, { status: 503 });
      try {
        const gm = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { inlineData: { mimeType: "audio/webm", data: audio } },
                  { text: "Listen to this English learner carefully. 1) Write what they said. 2) List ALL grammar AND pronunciation mistakes numbered: 1) ❌ [wrong] -> ✅ [right]. 3) End with one encouraging sentence + one simple question." },
                ],
              }],
            }),
          }
        );
        if (gm.ok) {
          const d = await gm.json();
          const reply = d.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) return NextResponse.json({ reply, engine: "gemini-audio" });
        }
      } catch {}
      return NextResponse.json({ error: "Could not hear the audio. Try again." }, { status: 503 });
    }

    if (!message) return NextResponse.json({ error: "No message" }, { status: 400 });

    // Build system prompt based on mode
    let system = "";
    if (mode === "english") {
      system = `You are an expert English language tutor. Rules:
1. Find ALL mistakes (grammar, spelling, word order, missing words).
2. List EVERY mistake numbered: 1) ❌ [wrong] -> ✅ [right]
3. If no mistakes: "✅ Perfect sentence!"
4. Add ONE short friendly reply + ONE simple question.
5. Keep whole answer under 150 words.`;
    } else {
      system = `You are "Personal AI", a friendly assistant inside a productivity app. Be SHORT (max 120 words), motivating.
USER DATA: ${context}`;
    }

    const chatMessages = [
      { role: "system", content: system },
      ...history.slice(-8),
      { role: "user", content: message },
    ];

    // ✅ PROVIDER CHAIN — Gemini FIRST (you have the key)
    const gKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const providers = [
      ...(gKey ? [{
        name: "gemini",
        key: gKey,
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gKey}`,
        isGemini: true,
      }] : []),
      { name: "groq", key: process.env.GROQ_API_KEY, url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile" },
      { name: "cerebras", key: process.env.CEREBRAS_API_KEY, url: "https://api.cerebras.ai/v1/chat/completions", model: "llama-3.3-70b" },
      { name: "sambanova", key: process.env.SAMBANOVA_API_KEY, url: "https://api.sambanova.ai/v1/chat/completions", model: "Meta-Llama-3.3-70B-Instruct" },
    ];

    const errors: string[] = [];

    for (const p of providers) {
      if (!p.key) continue;
      try {
        let res: Response;
        if (p.isGemini) {
          res = await fetch(p.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                { role: "user", parts: [{ text: system }] },
                ...history.slice(-8).map((h: any) => ({
                  role: h.role === "assistant" ? "model" : "user",
                  parts: [{ text: h.content }],
                })),
                { role: "user", parts: [{ text: message }] },
              ],
              generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
            }),
          });
        } else {
          res = await fetch(p.url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
            body: JSON.stringify({
              model: p.model,
              messages: chatMessages,
              max_tokens: 400,
              temperature: 0.7,
            }),
          });
        }
        
        if (res.ok) {
          const d = await res.json();
          const reply = p.isGemini
            ? d.candidates?.[0]?.content?.parts?.[0]?.text
            : d.choices?.[0]?.message?.content;
          if (reply) return NextResponse.json({ reply, engine: p.name });
          errors.push(`${p.name}: empty reply`);
        } else {
          const txt = await res.text().catch(() => "");
          errors.push(`${p.name}: ${res.status} ${txt.slice(0, 80)}`);
        }
      } catch (e: any) {
        errors.push(`${p.name}: ${e?.message || "fetch failed"}`);
      }
    }

    return NextResponse.json(
      { error: "All AI engines are resting. Try later!", debug: errors },
      { status: 503 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: "Bad request", debug: e?.message }, { status: 400 });
  }
}