import { NextResponse } from "next/server";

const GEMINI_MODELS = ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-3-flash-preview"];
const GROQ_CHAT = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
];

function extractJson(raw: string): any | null {
  try {
    let text = (raw || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (match) text = match[0];
    const obj = JSON.parse(text);
    if (!obj.food || typeof obj.calories !== "number") return null;
    return {
      food: String(obj.food),
      calories: Math.max(0, Math.round(Number(obj.calories) || 0)),
      protein: Math.max(0, Math.round(Number(obj.protein) || 0)),
      carbs: Math.max(0, Math.round(Number(obj.carbs) || 0)),
      fat: Math.max(0, Math.round(Number(obj.fat) || 0)),
      advice: String(obj.advice || "Enjoy in moderation as part of a balanced diet."),
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { image, foodName, quantity } = await req.json();
    const gKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (!gKey && !groqKey) {
      return NextResponse.json({ error: "API keys not configured." }, { status: 500 });
    }

    const base64 = String(image || "").split(",")[1];
    const mime = String(image || "").split(";")[0].split(":")[1] || "image/jpeg";

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

    const errs: string[] = [];

    // 1️⃣ GEMINI FIRST (only engine that handles images well on free tier)
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
          if (r.ok) {
            const d = await r.json();
            const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
            const parsed = extractJson(text || "");
            if (parsed) return NextResponse.json(parsed);
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

    // 2️⃣ GROQ TEXT-ONLY FALLBACK (only works if user gave food name + quantity)
    if (groqKey && (foodName || quantity)) {
      const fallbackPrompt = `You are a nutritionist. The user ate "${foodName || "unknown food"}" with quantity "${quantity || "1 serving"}".
Estimate nutritional values based on standard food databases.
Reply ONLY with valid JSON (no markdown):
{"food": "short food name", "calories": number, "protein": number, "carbs": number, "fat": number, "advice": "one short healthy tip"}`;

      for (const model of GROQ_CHAT) {
        try {
          const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: fallbackPrompt }],
              max_tokens: 400,
              temperature: 0.4,
            }),
          });
          if (r.ok) {
            const d = await r.json();
            const parsed = extractJson(d.choices?.[0]?.message?.content || "");
            if (parsed) {
              // Add a note that this is text-only estimation
              parsed.advice = parsed.advice + " (Estimated from text description — add clearer photos for better accuracy.)";
              return NextResponse.json(parsed);
            }
            errs.push(`groq-${model}: bad parse`);
          } else {
            const t = await r.text().catch(() => "");
            errs.push(`groq-${model}: ${r.status} ${t.slice(0, 60)}`);
          }
        } catch (e: unknown) {
          errs.push(`groq-${model}: ${e instanceof Error ? e.message : "fail"}`);
        }
      }
    }

    return NextResponse.json(
      {
        error:
          "Could not analyze this photo. " +
          (foodName || quantity
            ? "Try taking a clearer, well-lit photo."
            : "Try adding a food name and quantity for a text-based estimate."),
        debug: errs,
      },
      { status: 503 }
    );
  } catch {
    return NextResponse.json({ error: "Server error. Try again." }, { status: 500 });
  }
}