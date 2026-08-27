import { NextResponse } from "next/server";

const GROQ_CHAT = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
];
const GEMINI_MODELS = ["gemini-3-flash-preview", "gemini-3.7-flash"];

function extractQuestions(raw: string): any[] | null {
  try {
    let text = (raw || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (match) text = match[0];
    const arr = JSON.parse(text);
    if (Array.isArray(arr) && arr.length > 0 && arr[0].q && Array.isArray(arr[0].options)) {
      return arr
        .filter((x: any) => x.q && Array.isArray(x.options))
        .map((x: any) => ({
          q: String(x.q),
          options: x.options.map(String).slice(0, 6),
          answer: Math.min(Math.max(0, Number(x.answer) || 0), (x.options?.length || 4) - 1),
          explain: String(x.explain || ""),
        }));
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { topic, count = 5 } = await req.json();
    const groqKey = process.env.GROQ_API_KEY;
    const gKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!groqKey && !gKey) {
      return NextResponse.json({ error: "API keys not configured." }, { status: 500 });
    }
    if (!topic) {
      return NextResponse.json({ error: "Enter a topic first." }, { status: 400 });
    }

    const numQuestions = Math.min(10, Math.max(1, Number(count) || 5));

    const prompt = `You are a teacher. Create ${numQuestions} multiple-choice questions about "${topic}".
Reply ONLY with a valid JSON array (no markdown):
[{"q":"question text","options":["A","B","C","D"],"answer":0,"explain":"one line why correct"}]
"answer" is the index (0-3) of the correct option.`;

    const errs: string[] = [];

    // 1️⃣ GROQ FIRST (fast + free)
    if (groqKey) {
      for (const model of GROQ_CHAT) {
        try {
          const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: prompt }],
              max_tokens: 2048,
              temperature: 0.7,
            }),
          });
          if (r.ok) {
            const d = await r.json();
            const parsed = extractQuestions(d.choices?.[0]?.message?.content || "");
            if (parsed) return NextResponse.json({ questions: parsed, engine: model });
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
                generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
              }),
            }
          );
          if (r.ok) {
            const d = await r.json();
            const parsed = extractQuestions(d.candidates?.[0]?.content?.parts?.[0]?.text || "");
            if (parsed) return NextResponse.json({ questions: parsed, engine: model });
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
    return NextResponse.json({ error: "Server error. Try again." }, { status: 400 });
  }
}