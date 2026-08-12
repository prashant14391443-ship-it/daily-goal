import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { image, foodName, quantity } = await req.json();
    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      return NextResponse.json(
        { error: "API key not configured. Check environment variables." },
        { status: 500 }
      );
    }

    const base64 = String(image).split(",")[1];
    const mime = String(image).split(";")[0].split(":")[1] || "image/jpeg";

    if (!base64 || base64.length < 100) {
      return NextResponse.json(
        { error: "Invalid image data. Try taking a new photo." },
        { status: 400 }
      );
    }

    let userContext = "Estimate portion size from the photo.";
    
    if (foodName && quantity) {
      userContext = `The user has identified this food as "${foodName}" with quantity "${quantity}". Use this information heavily in your calculation for maximum accuracy.`;
    } else if (foodName) {
      userContext = `The user has identified this food as "${foodName}". Estimate the portion size from the photo.`;
    } else if (quantity) {
      userContext = `The user specified the quantity as "${quantity}". Use this in your calculation.`;
    }

    const prompt = `You are a nutritionist. Analyze this food photo and estimate the total meal's nutritional value.
    
    ${userContext}
    
    Reply ONLY with valid JSON (no markdown, no code blocks):
    {"food": "short food name", "calories": number, "protein": number, "carbs": number, "fat": number, "advice": "one short healthy tip"}`;

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
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
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    const data = await r.json();

    if (data.error) {
      console.error("Gemini API error:", data.error);
      return NextResponse.json(
        { error: `AI error: ${data.error.message || "Try again"}` },
        { status: 500 }
      );
    }

    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      return NextResponse.json(
        { error: "AI returned empty response. Try a different photo." },
        { status: 500 }
      );
    }

    text = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json(parsed);
    } catch {
      console.error("JSON parse error, raw text:", text);
      return NextResponse.json(
        { error: "Could not parse AI response. Try again." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Server error. Try again." },
      { status: 500 }
    );
  }
}