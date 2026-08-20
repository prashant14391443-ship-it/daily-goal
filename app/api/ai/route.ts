import { NextResponse } from "next/server";

type Provider = {
  name: string;
  key?: string;
  url: string;
  model?: string;
  isGemini?: boolean;
};

export async function POST(req: Request) {
  try {
    const { message, history = [], context = "", mode = "coach", audio, mimeType } = await req.json();

    // 🎙️ AUDIO MODE: Groq Whisper transcribes → Gemini OR Groq corrects
    if (audio && mode === "english") {
      const groqKey = process.env.GROQ_API_KEY;
      let transcription = "";

      // STEP 1: Transcribe with Whisper
      if (groqKey && audio.length > 500) {
        try {
          const actualMime = mimeType || "audio/webm";
          const audioBlob = await fetch(`data:${actualMime};base64,${audio}`).then((r) => r.blob());
          const ext = actualMime.split("/")[1]?.split(";")[0] || "webm";
          const formData = new FormData();
          formData.append("file", audioBlob, `audio.${ext}`);
          formData.append("model", "whisper-large-v3-turbo");

          const whisperRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${groqKey}` },
            body: formData,
          });

          if (whisperRes.ok) {
            const wd = await whisperRes.json();
            transcription = wd.text || "";
          } else {
            const errText = await whisperRes.text();
            console.error("❌ Whisper failed:", whisperRes.status, errText.slice(0, 200));
          }
        } catch (e: unknown) {
          console.error("❌ Whisper fetch error:", e instanceof Error ? e.message : "unknown");
        }
      }

      // STEP 2: Correct with AI — multi-model fallback chain
      if (transcription && transcription.trim().length > 0) {
        const systemPrompt = `You are an expert English language tutor helping a student practice speaking.
Rules:
1. Find ALL grammar and pronunciation mistakes in their spoken English.
2. List mistakes numbered: 1) ❌ [wrong] -> ✅ [right]
3. If perfect: "✅ Perfect English!"
4. Add ONE short friendly reply + ONE simple question.
5. Keep whole answer under 150 words.`;
        const userPrompt = `I said: "${transcription}"\n\nPlease correct my English and give me feedback.`;
        const errs: string[] = [];

        // GROQ — try 3 models in order (in case one is retired)
        if (groqKey) {
          for (const model of ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "llama-3.1-70b-versatile"]) {
            try {
              const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
                body: JSON.stringify({
                  model,
                  messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                  ],
                  max_tokens: 400,
                  temperature: 0.7,
                }),
              });
              if (r.ok) {
                const d = await r.json();
                const reply = d.choices?.[0]?.message?.content;
                if (reply && reply.trim()) {
                  return NextResponse.json({ reply, engine: "whisper+" + model, heard: transcription });
                }
                errs.push(`${model}: empty reply`);
              } else {
                const t = await r.text().catch(() => "");
                errs.push(`${model}: ${r.status} ${t.slice(0, 80)}`);
              }
            } catch (e: unknown) {
              errs.push(`${model}: ${e instanceof Error ? e.message : "fetch failed"}`);
            }
          }
        } else {
          errs.push("groq: NO KEY");
        }

        // GEMINI — try 2 models in order
        const gKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (gKey) {
          for (const model of ["gemini-2.0-flash", "gemini-2.5-flash"]) {
            try {
              const r = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [
                      { role: "user", parts: [{ text: systemPrompt }] },
                      { role: "user", parts: [{ text: userPrompt }] },
                    ],
                    generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
                  }),
                }
              );
              if (r.ok) {
                const d = await r.json();
                const reply = d.candidates?.[0]?.content?.parts?.[0]?.text;
                if (reply && reply.trim()) {
                  return NextResponse.json({ reply, engine: "whisper+" + model, heard: transcription });
                }
                errs.push(`${model}: empty reply`);
              } else {
                const t = await r.text().catch(() => "");
                errs.push(`${model}: ${r.status} ${t.slice(0, 80)}`);
              }
            } catch (e: unknown) {
              errs.push(`${model}: ${e instanceof Error ? e.message : "fetch failed"}`);
            }
          }
        } else {
          errs.push("gemini: NO KEY");
        }

        // LAST RESORT — but NOW returns debug info so user sees the reason!
        return NextResponse.json({
          reply: `🎤 I heard you say: "${transcription}"\n\n✅ Great job speaking! Practice saying it again slowly.\n\n🔧 (AI correction unavailable — see debug)`,
          engine: "whisper-manual",
          heard: transcription,
          debug: errs,
        });
      }

      return NextResponse.json(
        { error: "Could not hear clearly — speak louder for 2+ seconds." },
        { status: 503 }
      );
    }

    // 📝 TEXT MODE (coach or english text)
    if (!message) return NextResponse.json({ error: "No message" }, { status: 400 });

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

    const gKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const providers: Provider[] = [
      ...(gKey
        ? [
            {
              name: "gemini-2.0",
              key: gKey,
              url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gKey}`,
              isGemini: true,
            },
          ]
        : []),
      { name: "groq", key: process.env.GROQ_API_KEY, url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile" },
      { name: "cerebras", key: process.env.CEREBRAS_API_KEY, url: "https://api.cerebras.ai/v1/chat/completions", model: "llama-3.3-70b" },
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
                ...history.slice(-8).map((h: { role: string; content: string }) => ({
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
          errors.push(`${p.name}: ${res.status} ${txt.slice(0, 100)}`);
        }
      } catch (e: unknown) {
        errors.push(`${p.name}: ${e instanceof Error ? e.message : "fetch failed"}`);
      }
    }

    return NextResponse.json(
      { error: "All AI engines are resting. Try later!", debug: errors },
      { status: 503 }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Bad request", debug: e instanceof Error ? e.message : "unknown" },
      { status: 400 }
    );
  }
}