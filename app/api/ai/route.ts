import { NextResponse } from "next/server";
import { getCached, setCached, rateLimit } from "@/lib/cache";

const GROQ_CHAT = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
];
const GEMINI_MODELS = ["gemini-3-flash-preview", "gemini-3.7-flash"];

const Swati_PROMPT = (topic: string) => `You are "Swati", a friendly human conversation partner on a voice call with a student practicing English.
TOPIC: ${topic}
Rules:
1. Sound warm and natural — like a real friend on the phone.
2. If the student made a grammar or word mistake, first correct it in ONE short line: "❌ ... -> ✅ ..."
3. Then reply naturally in 1-2 sentences and ask ONE simple follow-up question about the topic.
4. Plain text only, no markdown, MAX 3 sentences total.`;

const EVAL_PROMPT = `You are an expert, strict-but-kind English language tutor. The user provides a transcription of what they said. Find EVERY grammar, phrasing, word-choice and pronunciation mistake (be thorough — up to 6 mistakes, like a professional teacher). Reply in EXACTLY this line format (one item per line, no extra text, no quotation marks, no emojis):
CORRECTED: <the complete corrected version of their full text>
TOTAL: <0-100>
ACCURACY: <0-30>
PRONUNCIATION: <0-20>
EXPRESSION: <0-25>
FLUENCY: <0-25>
MISTAKE: <their exact wrong phrase> -> <correction> | <brief reason>
MISTAKE: ... (one line per mistake, up to 6, omit if none)
UPGRADE: <basic phrase> -> <more natural phrase>
UPGRADE: ... (max 2, omit if none)
REPLY: <friendly spoken feedback under 40 words, no emojis, no quotes>
Scoring guide: ACCURACY = grammar correctness; PRONUNCIATION = how clearly words were spoken (judge from misheard or odd-sounding words in the transcription); EXPRESSION = vocabulary range; FLUENCY = natural flow and rhythm.`;

function parseEvalText(txt: string): any {
  try {
    if (!txt) return null;
    const lines = txt.split("\n").map((l) => l.trim()).filter(Boolean);
    const get = (p: string) => lines.find((l) => l.toUpperCase().startsWith(p + ":"));
    const num = (p: string, max: number) => {
      const l = get(p);
      if (!l) return 0;
      const m = l.slice(l.indexOf(":") + 1).match(/\d{1,3}/);
      const n = m ? parseInt(m[0], 10) : 0;
      return Math.min(max, Math.max(0, n));
    };
    const accuracy = num("ACCURACY", 30);
    const pronunciation = num("PRONUNCIATION", 20);
    const expression = num("EXPRESSION", 25);
    const fluency = num("FLUENCY", 25);
    let total = num("TOTAL", 100);
    if (!total) total = accuracy + pronunciation + expression + fluency;
    const correctedLine = get("CORRECTED");
    const corrected = correctedLine ? correctedLine.slice(correctedLine.indexOf(":") + 1).trim() : "";
    const corrections = lines
      .filter((l) => l.toUpperCase().startsWith("MISTAKE:"))
      .map((l) => {
        const body = l.slice(l.indexOf(":") + 1).trim();
        const [wr, rest] = body.split("->");
        const [right, reason] = (rest || "").split("|");
        return { wrong: (wr || "").trim(), right: (right || "").trim(), explanation: (reason || "").trim() };
      })
      .filter((c) => c.wrong && c.right);
    const upgrades = lines
      .filter((l) => l.toUpperCase().startsWith("UPGRADE:"))
      .map((l) => {
        const body = l.slice(l.indexOf(":") + 1).trim();
        const [b, a] = body.split("->");
        return { basic_phrase: (b || "").trim(), advanced_phrase: (a || "").trim() };
      })
      .filter((v) => v.basic_phrase && v.advanced_phrase);
    const replyLine = get("REPLY");
    const reply = replyLine ? replyLine.slice(replyLine.indexOf(":") + 1).trim() : "";
    if (!total && !reply) return null;
    return {
      scores: { accuracy, pronunciation, expression, fluency, total },
      corrected_version: corrected,
      grammar_corrections: corrections,
      vocabulary_upgrades: upgrades,
      ai_spoken_reply: reply || "Good try! Keep practicing daily.",
    };
  } catch {
    return null;
  }
}

// 📦 AI PACK helpers (line format = never breaks)
function parsePackLines(txt: string, prefix: string): string[][] {
  return txt
    .split("\n")
    .map((l) => l.trim().replace(/^\d+[.)\s]+/, ""))
    .filter((l) => l.toUpperCase().startsWith(prefix))
    .map((l) => l.slice(l.indexOf(":") + 1).split("|").map((s) => s.trim()));
}

async function genPackLines(prompt: string, prefix: string, groqKey?: string, gKey?: string): Promise<string[][]> {
  if (groqKey) {
    for (const model of GROQ_CHAT) {
      try {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_tokens: 900, temperature: 0.7 }),
        });
        if (r.ok) {
          const d = await r.json();
          const items = parsePackLines(d.choices?.[0]?.message?.content || "", prefix);
          if (items.length >= 3) return items;
        }
      } catch {}
    }
  }
  if (gKey) {
    for (const model of GEMINI_MODELS) {
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1024, temperature: 0.7 } }),
          }
        );
        if (r.ok) {
          const d = await r.json();
          const items = parsePackLines(d.candidates?.[0]?.content?.parts?.[0]?.text || "", prefix);
          if (items.length >= 3) return items;
        }
      } catch {}
    }
  }
  return [];
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

    // 🧠 CACHE CHECK (text modes only)
    if (!audio && message) {
      const cacheKey = `ai:${mode}:${(topic || "none").slice(0, 40)}:${context.slice(0, 150)}:${message.slice(0, 100)}`;
      const cached = await getCached(cacheKey);
      if (cached) {
        return NextResponse.json({ reply: cached, engine: "cache", fromCache: true });
      }
    }

    // 📚 AI VOCAB PACK (any topic, 8 words)
    if (mode === "vocabpack" && topic) {
      const items = await genPackLines(
        `You are an English teacher for Indian students. Create 8 useful vocabulary words about "${topic}". Reply with EXACTLY 8 lines, no extra text, format:
WORD: <word> | <type> | <simple english meaning> | <hindi meaning> | <short example sentence> | <synonym>`,
        "WORD:",
        groqKey,
        gKey
      );
      if (items.length) return NextResponse.json({ items });
      return NextResponse.json({ error: "Could not generate pack — try again!" }, { status: 503 });
    }

    // 🎯 AI SENTENCE PACK (any topic, 8 pairs)
    if (mode === "sentencepack" && topic) {
      const items = await genPackLines(
        `You are an English teacher for Indian students. Create 8 common-mistake sentence pairs about "${topic}" situations. Reply with EXACTLY 8 lines, no extra text, format:
SENT: <wrong sentence> | <correct sentence> | <brief reason> | <hindi meaning of correct sentence>`,
        "SENT:",
        groqKey,
        gKey
      );
      if (items.length) return NextResponse.json({ items });
      return NextResponse.json({ error: "Could not generate pack — try again!" }, { status: 503 });
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

        // 📊 SPEAKING TEST
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
                    max_tokens: 800,
                    temperature: 0.5,
                  }),
                });
                if (r.ok) {
                  const d = await r.json();
                  const st = parseEvalText(d.choices?.[0]?.message?.content || "");
                  if (st) return NextResponse.json({ reply: st.ai_spoken_reply, structured: st, heard: transcription, engine: "test+" + model });
                  errs.push(`${model}: bad parse`);
                } else {
                  const t = await r.text().catch(() => "");
                  errs.push(`${model}: ${r.status} ${t.slice(0, 50)}`);
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
                      generationConfig: { maxOutputTokens: 1024, temperature: 0.5 },
                    }),
                  }
                );
                if (r.ok) {
                  const d = await r.json();
                  const st = parseEvalText(d.candidates?.[0]?.content?.parts?.[0]?.text || "");
                  if (st) return NextResponse.json({ reply: st.ai_spoken_reply, structured: st, heard: transcription, engine: "test+" + model });
                  errs.push(`${model}: bad parse`);
                } else {
                  const t = await r.text().catch(() => "");
                  errs.push(`${model}: ${r.status} ${t.slice(0, 50)}`);
                }
              } catch (e: unknown) {
                errs.push(`${model}: ${e instanceof Error ? e.message : "fail"}`);
              }
            }
          } else errs.push("gemini: NO KEY");

          if (groqKey) {
            try {
              const fr = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
                body: JSON.stringify({
                  model: GROQ_CHAT[0],
                  messages: [
                    { role: "system", content: `You are an English tutor. The user said: "${transcription}". Give corrections numbered like 1) ❌ wrong -> ✅ right, then one encouraging question. Max 120 words.` },
                  ],
                  max_tokens: 300,
                  temperature: 0.7,
                }),
              });
              if (fr.ok) {
                const fd = await fr.json();
                const fReply = fd.choices?.[0]?.message?.content;
                if (fReply) {
                  return NextResponse.json({
                    reply: fReply,
                    heard: transcription,
                    structured: {
                      scores: { accuracy: 18, pronunciation: 12, expression: 15, fluency: 15, total: 60 },
                      corrected_version: "",
                      grammar_corrections: [],
                      vocabulary_upgrades: [],
                      ai_spoken_reply: "Good try! Read the written feedback below and try again.",
                    },
                    engine: "fallback",
                  });
                }
              }
            } catch {}
          }

          return NextResponse.json({ error: "Evaluation failed", debug: errs }, { status: 503 });
        }

        // 💬 CALL / ENGLISH
        const systemPrompt = mode === "call"
          ? Swati_PROMPT(topic || "daily life")
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
      system = Swati_PROMPT(topic || "daily life");
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