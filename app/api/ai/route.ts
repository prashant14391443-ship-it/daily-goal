import { NextResponse } from "next/server";
import { getCached, setCached, rateLimit } from "@/lib/cache";

const GROQ_CHAT = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
];
const GEMINI_MODELS = ["gemini-3.7-flash", "gemini-3-flash-preview", "gemini-2.5-flash-lite"];

const CALL_JSON_PROMPT = (topic: string) => `You are "Veer", an expert, empathetic English tutor on a voice call. Topic: ${topic}.
The user provides a transcription of what they just said. Evaluate it and return ONLY a valid JSON object matching this exact schema:
{
  "scores": { "accuracy": number 0-40, "expression": number 0-30, "fluency": number 0-30, "total": number 0-100 },
  "grammar_corrections": [ { "wrong": "mistake", "right": "correction", "explanation": "brief reason" } ],
  "vocabulary_upgrades": [ { "basic_phrase": "what they said", "advanced_phrase": "better alternative" } ],
  "ai_spoken_reply": "friendly conversational reply under 40 words, ending with a question, no emojis or formatting"
}
Scoring: accuracy = grammar correctness; expression = vocabulary range; fluency = natural flow. Use empty arrays if nothing to fix. Return ONLY JSON.`;

function parseCallJson(txt: string): any {
  try {
    const clean = txt.replace(/```json/gi, "").replace(/```/g, "").trim();
    const s = clean.indexOf("{");
    const e = clean.lastIndexOf("}");
    if (s === -1 || e === -1) return null;
    const d = JSON.parse(clean.slice(s, e + 1));
    if (d && d.scores && typeof d.ai_spoken_reply === "string") return d;
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { message, history = [], context = "", mode = "coach", audio, mimeType, topic, target } = await req.json();

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const allowed = await rateLimit(`rl:${ip}`, 20, 60);
    if (!allowed) {
      return NextResponse.json({ error: "⏳ Whoa, slow down! Wait a few seconds." }, { status: 429 });
    }

    const groqKey = process.env.GROQ_API_KEY;
    const gKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // 🧠 CACHE CHECK
    if (!audio && message) {
      const cacheKey = `ai:${mode}:${(topic || "none").slice(0, 40)}:${context.slice(0, 150)}:${message.slice(0, 100)}`;
      const cached = await getCached(cacheKey);
      if (cached) {
        if (mode === "call") {
          const st = parseCallJson(cached);
          if (st) return NextResponse.json({ reply: st.ai_spoken_reply, structured: st, engine: "cache", fromCache: true });
        }
        return NextResponse.json({ reply: cached, engine: "cache", fromCache: true });
      }
    }

    // 🎙️ AUDIO MODE
    if (audio && (mode === "english" || mode === "call" || mode === "drill")) {
      let transcription = "";

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
          }
        } catch {}
      }

      if (transcription && transcription.trim().length > 0) {
        // 🎯 DRILL: free scoring, no LLM
        if (mode === "drill" && target) {
          const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9'\s]/g, "").split(/\s+/).filter(Boolean);
          const tWords = norm(target);
          const hWords = norm(transcription);
          const missed = tWords.filter((w) => !hWords.includes(w));
          const score = Math.max(0, Math.round(((tWords.length - missed.length) / tWords.length) * 100));
          const reply =
            score >= 80
              ? `🌟 ${score}% — Amazing pronunciation! You said: "${transcription}"`
              : missed.length > 0
              ? `💪 ${score}% — Good try! I heard: "${transcription}". Practice slowly: ${missed.join(", ")}. Tap 🔊 and try again!`
              : `🌟 ${score}% — Great job! You said: "${transcription}"`;
          return NextResponse.json({ reply, heard: transcription, score });
        }

        const systemPrompt = mode === "call"
          ? CALL_JSON_PROMPT(topic || "daily life")
          : `You are an expert English language tutor helping a student practice speaking.
Rules:
1. Find ALL grammar and pronunciation mistakes in their spoken English.
2. List mistakes numbered: 1) ❌ [wrong] -> ✅ [right]
3. If perfect: "✅ Perfect English!"
4. Add ONE short friendly reply + ONE simple question.
5. Keep whole answer under 150 words.`;
        const userPrompt = `I said: "${transcription}"\n\nPlease evaluate my English.`;
        const errs: string[] = [];

        if (groqKey) {
          for (const model of GROQ_CHAT) {
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
                  max_tokens: 500,
                  temperature: 0.7,
                  ...(mode === "call" ? { response_format: { type: "json_object" } } : {}),
                }),
              });
              if (r.ok) {
                const d = await r.json();
                const reply = d.choices?.[0]?.message?.content;
                if (reply && reply.trim()) {
                  if (mode === "call") {
                    const st = parseCallJson(reply);
                    if (st) return NextResponse.json({ reply: st.ai_spoken_reply, structured: st, engine: "whisper+" + model, heard: transcription });
                  }
                  return NextResponse.json({ reply, engine: "whisper+" + model, heard: transcription });
                }
                errs.push(`${model}: empty`);
              } else {
                const t = await r.text().catch(() => "");
                errs.push(`${model}: ${r.status} ${t.slice(0, 60)}`);
              }
            } catch (e: unknown) {
              errs.push(`${model}: ${e instanceof Error ? e.message : "fail"}`);
            }
          }
        } else errs.push("groq: NO KEY");

        if (gKey) {
          for (const model of GEMINI_MODELS) {
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
                    generationConfig: { maxOutputTokens: 500, temperature: 0.7, ...(mode === "call" ? { responseMimeType: "application/json" } : {}) },
                  }),
                }
              );
              if (r.ok) {
                const d = await r.json();
                const reply = d.candidates?.[0]?.content?.parts?.[0]?.text;
                if (reply && reply.trim()) {
                  if (mode === "call") {
                    const st = parseCallJson(reply);
                    if (st) return NextResponse.json({ reply: st.ai_spoken_reply, structured: st, engine: "whisper+" + model, heard: transcription });
                  }
                  return NextResponse.json({ reply, engine: "whisper+" + model, heard: transcription });
                }
                errs.push(`${model}: empty`);
              } else {
                const t = await r.text().catch(() => "");
                errs.push(`${model}: ${r.status} ${t.slice(0, 60)}`);
              }
            } catch (e: unknown) {
              errs.push(`${model}: ${e instanceof Error ? e.message : "fail"}`);
            }
          }
        } else errs.push("gemini: NO KEY");

        return NextResponse.json({
          reply: `🎤 I heard you say: "${transcription}"\n\n✅ Great job speaking! Practice saying it again slowly.`,
          engine: "whisper-manual",
          heard: transcription,
          debug: errs,
        });
      }

      return NextResponse.json({ error: "Could not hear clearly — speak louder for 2+ seconds." }, { status: 503 });
    }

    // 📝 TEXT MODE
    if (!message) return NextResponse.json({ error: "No message" }, { status: 400 });

    let system = "";
    if (mode === "call") {
      system = CALL_JSON_PROMPT(topic || "daily life");
    } else if (mode === "english") {
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
    const errs: string[] = [];

    if (groqKey) {
      for (const model of GROQ_CHAT) {
        try {
          const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
            body: JSON.stringify({
              model,
              messages: chatMessages,
              max_tokens: 500,
              temperature: 0.7,
              ...(mode === "call" ? { response_format: { type: "json_object" } } : {}),
            }),
          });
          if (r.ok) {
            const d = await r.json();
            const reply = d.choices?.[0]?.message?.content;
            if (reply) {
              const cacheKey = `ai:${mode}:${(topic || "none").slice(0, 40)}:${context.slice(0, 150)}:${message.slice(0, 100)}`;
              await setCached(cacheKey, reply, 3600);
              if (mode === "call") {
                const st = parseCallJson(reply);
                if (st) return NextResponse.json({ reply: st.ai_spoken_reply, structured: st, engine: model });
              }
              return NextResponse.json({ reply, engine: model });
            }
            errs.push(`${model}: empty`);
          } else {
            const t = await r.text().catch(() => "");
            errs.push(`${model}: ${r.status} ${t.slice(0, 60)}`);
          }
        } catch (e: unknown) {
          errs.push(`${model}: ${e instanceof Error ? e.message : "fail"}`);
        }
      }
    } else errs.push("groq: NO KEY");

    if (gKey) {
      for (const model of GEMINI_MODELS) {
        try {
          const r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gKey}`,
            {
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
                generationConfig: { maxOutputTokens: 500, temperature: 0.7, ...(mode === "call" ? { responseMimeType: "application/json" } : {}) },
              }),
            }
          );
          if (r.ok) {
            const d = await r.json();
            const reply = d.candidates?.[0]?.content?.parts?.[0]?.text;
            if (reply) {
              const cacheKey = `ai:${mode}:${(topic || "none").slice(0, 40)}:${context.slice(0, 150)}:${message.slice(0, 100)}`;
              await setCached(cacheKey, reply, 3600);
              if (mode === "call") {
                const st = parseCallJson(reply);
                if (st) return NextResponse.json({ reply: st.ai_spoken_reply, structured: st, engine: model });
              }
              return NextResponse.json({ reply, engine: model });
            }
            errs.push(`${model}: empty`);
          } else {
            const t = await r.text().catch(() => "");
            errs.push(`${model}: ${r.status} ${t.slice(0, 60)}`);
          }
        } catch (e: unknown) {
          errs.push(`${model}: ${e instanceof Error ? e.message : "fail"}`);
        }
      }
    } else errs.push("gemini: NO KEY");

    return NextResponse.json({ error: "All AI engines are resting. Try later!", debug: errs }, { status: 503 });
  } catch (e: unknown) {
    return NextResponse.json({ error: "Bad request", debug: e instanceof Error ? e.message : "unknown" }, { status: 400 });
  }
}