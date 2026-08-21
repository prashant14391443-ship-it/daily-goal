import { NextResponse } from "next/server";
import { getCached, setCached, rateLimit } from "@/lib/cache";

const GROQ_CHAT = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
];
const GEMINI_MODELS = ["gemini-3.7-flash", "gemini-3-flash-preview", "gemini-2.5-flash-lite"];

// 💬 CALL MODE: friendly friend who corrects naturally (plain text)
const VEER_PROMPT = (topic: string) => `You are "Veer", a friendly human conversation partner on a voice call with a student practicing English.
TOPIC: ${topic}
Rules:
1. Sound warm and natural — like a real friend on the phone.
2. If the student made a grammar or word mistake, first correct it in ONE short line: "❌ ... -> ✅ ..."
3. Then reply naturally in 1-2 sentences and ask ONE simple follow-up question about the topic.
4. Plain text only, no markdown, MAX 3 sentences total.`;

// 📊 EVALUATE MODE: full report card (strict JSON)
const EVAL_PROMPT = `You are an expert, empathetic English language tutor. The user provides a transcription of what they said. Evaluate it and return ONLY a valid JSON object:
{
  "scores": { "accuracy": number 0-40, "expression": number 0-30, "fluency": number 0-30, "total": number 0-100 },
  "grammar_corrections": [ { "wrong": "mistake", "right": "correction", "explanation": "brief reason" } ],
  "vocabulary_upgrades": [ { "basic_phrase": "what they said", "advanced_phrase": "better alternative" } ],
  "ai_spoken_reply": "short friendly spoken feedback under 40 words, no emojis"
}
Scoring: accuracy = grammar correctness; expression = vocabulary range; fluency = clarity and natural flow. Empty arrays if perfect. Return ONLY JSON.`;

function parseEvalJson(txt: string): any {
  try {
    if (!txt || typeof txt !== "string") return null;
    // Strip markdown code blocks
    let clean = txt.replace(/```json/gi, "").replace(/```/g, "").trim();
    
    // Find the JSON object
    const s = clean.indexOf("{");
    const e = clean.lastIndexOf("}");
    if (s === -1 || e === -1 || e <= s) return null;
    
    const jsonStr = clean.slice(s, e + 1);
    const d = JSON.parse(jsonStr);
    
    // Validate required fields
    if (!d || !d.scores) return null;
    
    // Ensure scores have required fields with defaults
    const scores = {
      accuracy: Math.min(40, Math.max(0, d.scores.accuracy || 0)),
      expression: Math.min(30, Math.max(0, d.scores.expression || 0)),
      fluency: Math.min(30, Math.max(0, d.scores.fluency || 0)),
      total: Math.min(100, Math.max(0, d.scores.total || 0)),
    };
    
    // Ensure total matches sum if provided total is wrong
    if (scores.total === 0 || Math.abs(scores.total - (scores.accuracy + scores.expression + scores.fluency)) > 5) {
      scores.total = scores.accuracy + scores.expression + scores.fluency;
    }
    
    return {
      scores,
      grammar_corrections: Array.isArray(d.grammar_corrections) ? d.grammar_corrections : [],
      vocabulary_upgrades: Array.isArray(d.vocabulary_upgrades) ? d.vocabulary_upgrades : [],
      ai_spoken_reply: typeof d.ai_spoken_reply === "string" ? d.ai_spoken_reply : "Great effort! Keep practicing.",
    };
  } catch (e) {
    console.error("JSON parse error:", e, "txt:", txt.slice(0, 200));
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { message, history = [], context = "", mode = "coach", audio, mimeType, topic, target } = await req.json();

    // 🛡️ Rate limit
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const allowed = await rateLimit(`rl:${ip}`, 20, 60);
    if (!allowed) {
      return NextResponse.json({ error: "⏳ Whoa, slow down! Wait a few seconds." }, { status: 429 });
    }

    const groqKey = process.env.GROQ_API_KEY;
    const gKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // 🧠 CACHE CHECK (text modes only)
    if (!audio && message) {
      const cacheKey = `ai:${mode}:${(topic || "none").slice(0, 40)}:${context.slice(0, 150)}:${message.slice(0, 100)}`;
      const cached = await getCached(cacheKey);
      if (cached) {
        return NextResponse.json({ reply: cached, engine: "cache", fromCache: true });
      }
    }

    // 🎙️ AUDIO MODE
    if (audio && (mode === "english" || mode === "call" || mode === "drill" || mode === "evaluate")) {
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
        // 🎯 DRILL: free pronunciation scoring (no LLM)
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

        // 📊 SPEAKING TEST: full report card
        if (mode === "evaluate") {
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
                      { role: "system", content: EVAL_PROMPT },
                      { role: "user", content: `The user said: "${transcription}"` },
                    ],
                    max_tokens: 600,
                    temperature: 0.5,
                    response_format: { type: "json_object" },
                  }),
                });
                if (r.ok) {
                  const d = await r.json();
                  const st = parseEvalJson(d.choices?.[0]?.message?.content || "");
                  if (st) return NextResponse.json({ reply: st.ai_spoken_reply, structured: st, heard: transcription, engine: "test+" + model });
                  errs.push(`${model}: bad json`);
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
                      contents: [{ role: "user", parts: [{ text: EVAL_PROMPT + `\nThe user said: "${transcription}"` }] }],
                      generationConfig: { maxOutputTokens: 600, temperature: 0.5, responseMimeType: "application/json" },
                    }),
                  }
                );
                if (r.ok) {
                  const d = await r.json();
                  const st = parseEvalJson(d.candidates?.[0]?.content?.parts?.[0]?.text || "");
                  if (st) return NextResponse.json({ reply: st.ai_spoken_reply, structured: st, heard: transcription, engine: "test+" + model });
                  errs.push(`${model}: bad json`);
                } else {
                  const t = await r.text().catch(() => "");
                  errs.push(`${model}: ${r.status} ${t.slice(0, 60)}`);
                }
              } catch (e: unknown) {
                errs.push(`${model}: ${e instanceof Error ? e.message : "fail"}`);
              }
            }
          } else errs.push("gemini: NO KEY");

          // 🚨 FALLBACK: If no structured JSON worked, return plain-text evaluation
          const fallbackRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
            body: JSON.stringify({
              model: "meta-llama/llama-4-scout-17b-16e-instruct",
              messages: [
                { role: "system", content: `You are an English tutor. The user said: "${transcription}". Give plain text feedback with corrections numbered 1) ❌ wrong -> ✅ right, then one question.` },
              ],
              max_tokens: 300,
              temperature: 0.7,
            }),
          });
          if (fallbackRes.ok) {
            const fd = await fallbackRes.json();
            const fReply = fd.choices?.[0]?.message?.content;
            if (fReply) {
              return NextResponse.json({
                reply: fReply,
                heard: transcription,
                structured: {
                  scores: { accuracy: 25, expression: 15, fluency: 20, total: 60 },
                  grammar_corrections: [],
                  vocabulary_upgrades: [],
                  ai_spoken_reply: "Good try! Check the written feedback.",
                },
                engine: "fallback",
              });
            }
          }
          
          return NextResponse.json({ error: "Evaluation failed", debug: errs }, { status: 503 });
        }

        // 💬 CALL / ENGLISH: friendly plain-text corrections
        const systemPrompt = mode === "call"
          ? VEER_PROMPT(topic || "daily life")
          : `You are an expert English language tutor helping a student practice speaking.
Rules:
1. Find ALL grammar and pronunciation mistakes in their spoken English.
2. List mistakes numbered: 1) ❌ [wrong] -> ✅ [right]
3. If perfect: "✅ Perfect English!"
4. Add ONE short friendly reply + ONE simple question.
5. Keep whole answer under 150 words.`;
        const userPrompt = `I said: "${transcription}"\n\nPlease correct my English and continue the conversation.`;
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
                  max_tokens: 400,
                  temperature: 0.7,
                }),
              });
              if (r.ok) {
                const d = await r.json();
                const reply = d.choices?.[0]?.message?.content;
                if (reply && reply.trim()) return NextResponse.json({ reply, engine: "whisper+" + model, heard: transcription });
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
                    generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
                  }),
                }
              );
              if (r.ok) {
                const d = await r.json();
                const reply = d.candidates?.[0]?.content?.parts?.[0]?.text;
                if (reply && reply.trim()) return NextResponse.json({ reply, engine: "whisper+" + model, heard: transcription });
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
      system = VEER_PROMPT(topic || "daily life");
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
            body: JSON.stringify({ model, messages: chatMessages, max_tokens: 400, temperature: 0.7 }),
          });
          if (r.ok) {
            const d = await r.json();
            const reply = d.choices?.[0]?.message?.content;
            if (reply) {
              const cacheKey = `ai:${mode}:${(topic || "none").slice(0, 40)}:${context.slice(0, 150)}:${message.slice(0, 100)}`;
              await setCached(cacheKey, reply, 3600);
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
                generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
              }),
            }
          );
          if (r.ok) {
            const d = await r.json();
            const reply = d.candidates?.[0]?.content?.parts?.[0]?.text;
            if (reply) {
              const cacheKey = `ai:${mode}:${(topic || "none").slice(0, 40)}:${context.slice(0, 150)}:${message.slice(0, 100)}`;
              await setCached(cacheKey, reply, 3600);
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