import { NextResponse } from "next/server";

const GROQ_CHAT = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
];
const GEMINI_MODELS = ["gemini-3-flash-preview", "gemini-3.7-flash"];

function extractSteps(raw: string): string[] | null {
  try {
    let text = (raw || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (match) text = match[0];
    const arr = JSON.parse(text);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const steps = arr
      .filter((x) => typeof x === "string" && x.trim().length > 0)
      .map((x) => String(x).trim())
      .slice(0, 10); // cap at 10 to prevent abuse
    return steps.length > 0 ? steps : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { task } = await req.json();
    const groqKey = process.env.GROQ_API_KEY;
    const gKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!groqKey && !gKey) {
      return NextResponse.json({ error: "API keys not configured." }, { status: 500 });
    }
    if (!task) {
      return NextResponse.json({ error: "Enter a task first." }, { status: 400 });
    }

    const prompt = `Break this big task into 6-8 small actionable steps (each under 10 words, start with a verb): "${task}".
Reply ONLY with a valid JSON array of strings (no markdown): ["step 1","step 2"]`;

    const errs: string[] = [];

    // 1️⃣ GROQ FIRST (fast + excellent at structured text)
    if (groqKey) {
      for (const model of GROQ_CHAT) {
        try {
          const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: prompt }],
              max_tokens: 1024,
              temperature: 0.6,
            }),
          });
          if (r.ok) {
            const d = await r.json();
            const parsed = extractSteps(d.choices?.[0]?.message?.content || "");
            if (parsed) return NextResponse.json({ steps: parsed, engine: model });
            errs.push(`${model}: bad parse`);
          } else {
            const t = await r.text().catch(() => "");
            errs.push(`${model}: ${r.status} ${t.slice(0, 60)}`);
          }
        } catch (e: unknown) {
          errs.push(`${model}: ${e instanceof Error ? e.message : "fail"}`);
        }
      }
    } else errs.push("groq: NO KEY");

    // 2️⃣ GEMINI FALLBACK
    if (gKey) {
      for (const model of GEMINI_MODELS) {
        try {
          const r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.6, maxOutputTokens: 1024 },
              }),
            }
          );
          if (r.ok) {
            const d = await r.json();
            const parsed = extractSteps(d.candidates?.[0]?.content?.parts?.[0]?.text || "");
            if (parsed) return NextResponse.json({ steps: parsed, engine: model });
            errs.push(`${model}: bad parse`);
          } else {
            const t = await r.text().catch(() => "");
            errs.push(`${model}: ${r.status} ${t.slice(0, 60)}`);
          }
        } catch (e: unknown) {
          errs.push(`${model}: ${e instanceof Error ? e.message : "fail"}`);
        }
      }
    } else errs.push("gemini: NO KEY");

    return NextResponse.json(
      { error: "All AI engines are resting. Try again in a minute!", debug: errs },
      { status: 503 }
    );
  } catch {
    return NextResponse.json({ error: "Server error. Try again." }, { status: 500 });
  }
}