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
    const { text, image } = await req.json();
    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      return NextResponse.json({ error: "API key not configured." }, { status: 500 });
    }
    if (!text && !image) {
      return NextResponse.json({ error: "Give a topic or a photo." }, { status: 400 });
    }

    const prompt = `You are an expert study assistant. Summarize ${
      image ? "this photo of notes/text" : `this topic/text: "${text}"`
    } for fast memorization.

IMPORTANT — POINT COUNT RULE:
- Analyze the complexity of the content
- Simple topics (basic concepts, single ideas): generate 5-6 points
- Medium topics (multiple related concepts): generate 7 points  
- Complex topics (detailed processes, many subtopics): generate 8-10 points
- Choose the number that best matches the content depth

Reply ONLY with valid JSON (no markdown, no explanation):
{
  "title": "short title (max 6 words)",
  "points": ["point 1", "point 2", ...],
  "map": {
    "center": "main topic",
    "branches": [
      { "name": "branch name", "kids": ["2-3 tiny details"] },
      ...
    ]
  }
}

Rules:
- Every label under 6 words
- 4-6 branches in the map
- Points should be concise but informative
- Rank points by importance (most important first)`;

    const parts: any[] = [{ text: prompt }];
    if (image) {
      const base64 = String(image).split(",")[1];
      const mime = String(image).split(";")[0].split(":")[1] || "image/jpeg";
      parts.push({ inline_data: { mime_type: mime, data: base64 } });
    }

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
            contents: [{ parts }],
            generationConfig: { 
              temperature: 0.5, 
              maxOutputTokens: 2048,
              responseMimeType: "application/json"
            },
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

    let t = data.candidates[0]?.content?.parts?.[0]?.text || "";
    t = t.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const match = t.match(/\{[\s\S]*\}/);
    if (match) t = match[0];

    try {
      return NextResponse.json(JSON.parse(t));
    } catch {
      return NextResponse.json({ error: "Could not parse summary. Try again." }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Server error. Try again." }, { status: 500 });
  }
}