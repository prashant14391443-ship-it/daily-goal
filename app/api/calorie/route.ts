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
    ...usable.filter((m) => /pro/.test(m.name) && !/preview/.test(m.name)),
    ...usable.filter((m) => /pro/.test(m.name) && /preview/.test(m.name)),
    ...usable.filter(
      (m) => !/flash/.test(m.name) && !/pro/.test(m.name)
    ),
  ].map(clean);

  // remove duplicates, keep order
  return [...new Set(ordered)].slice(0, 4);
}

export async function POST(req: Request) {
  try {
    const { image, foodName, quantity } = await req.json();
    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      return NextResponse.json({ error: "API key not configured." }, { status: 500 });
    }

    const base64 = String(image).split(",")[1];
    const mime = String(image).split(";")[0].split(":")[1] || "image/jpeg";

    if (!base64 || base64.length < 100) {
      return NextResponse.json({ error: "Invalid image. Try a new photo." }, { status: 400 });
    }

    let userContext = "Estimate portion size from the photo.";
    if (foodName && quantity) {
      userContext = `The user identified this food as "${foodName}" with quantity "${quantity}". Use this heavily for accuracy.`;
    } else if (foodName) {
      userContext = `The user identified this food as "${foodName}". Estimate portion from the photo.`;
    } else if (quantity) {
      userContext = `The user specified quantity "${quantity}". Use this in calculation.`;
    }

    const prompt = `You are a nutritionist. Analyze this food photo and estimate the total meal's nutritional value.
    ${userContext}
    Reply ONLY with valid JSON (no markdown):
    {"food": "short food name", "calories": number, "protein": number, "carbs": number, "fat": number, "advice": "one short healthy tip"}`;

    const candidates = await getCandidates(key);
    if (candidates.length === 0) {
      return NextResponse.json({ error: "No AI model available on this key." }, { status: 500 });
    }

    let data: any = null;
    let lastError = "";
    for (const model of candidates) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mime, data: base64 } },
                ],
              },
            ],
            generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
          }),
        }
      );
      data = await r.json();
      if (data.candidates && data.candidates.length > 0) break;
      lastError = data?.error?.message || "model failed";
    }

    if (!data || data.error || !data.candidates?.length) {
      return NextResponse.json({ error: `AI error: ${lastError}` }, { status: 500 });
    }

    let text = data.candidates[0]?.content?.parts?.[0]?.text || "";
    if (!text) {
      return NextResponse.json({ error: "AI returned empty. Try another photo." }, { status: 500 });
    }

    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];

    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ error: "Could not parse AI response. Try again." }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Server error. Try again." }, { status: 500 });
  }
}