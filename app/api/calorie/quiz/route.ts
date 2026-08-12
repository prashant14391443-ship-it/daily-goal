import { NextResponse } from "next/server";

type ModelInfo = { name: string; supportedGenerationMethods?: string[] };

async function getCandidates(key: string): Promise<string[]> {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=200`
  );
  const d = await r.json();
  const list: ModelInfo[] = d.models || [];
  const usable = list.filter(
    (m) =>
      (m.supportedGenerationMethods || []).includes("generateContent") &&
      /gemini/.test(m.name) &&
      !/embedding|tts|image|a2i|deep-research|robotics/i.test(m.name)
  );
  const clean = (m: ModelInfo) => m.name.replace("models/", "");
  const ordered = [
    ...usable.filter((m) => /flash/.test(m.name) && !/preview/.test(m.name)),
    ...usable.filter((m) => /flash/.test(m.name) && /preview/.test(m.name)),
    ...usable.filter((m) => /pro/.test(m.name)),
  ].map(clean);
  return [...new Set(ordered)].slice(0, 4);
}

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();
    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      return NextResponse.json({ error: "API key not configured." }, { status: 500 });
    }
    if (!topic) {
      return NextResponse.json({ error: "Enter a topic first." }, { status: 400 });
    }

    const prompt = `You are a teacher. Create 5 multiple-choice questions about "${topic}".
    Reply ONLY with a valid JSON array (no markdown):
    [{"q":"question text","options":["A","B","C","D"],"answer":0,"explain":"one line why correct"}]
    "answer" is the index (0-3) of the correct option.`;

    const candidates = await getCandidates(key);
    let data: any = null;
    let lastError = "";
    for (const model of candidates) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          }),
        }
      );
      data = await r.json();
      if (data.candidates && data.candidates.length > 0) break;
      lastError = data?.error?.message || "model failed";
    }

    if (!data?.candidates?.length) {
      return NextResponse.json({ error: `AI error: ${lastError}` }, { status: 500 });
    }

    let text = data.candidates[0]?.content?.parts?.[0]?.text || "";
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (match) text = match[0];

    try {
      const questions = JSON.parse(text);
      return NextResponse.json({ questions });
    } catch {
      return NextResponse.json({ error: "Could not parse quiz. Try again." }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Server error. Try again." }, { status: 500 });
  }
}