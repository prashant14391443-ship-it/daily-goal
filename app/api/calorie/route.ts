import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Extract both the image and the optional details from the frontend
    const { image, details } = await req.json();
    const key = process.env.GEMINI_API_KEY;
    
    if (!key) {
      return NextResponse.json({ error: "Missing API key" }, { status: 500 });
    }

    const base64 = String(image).split(",")[1];
    const mime = String(image).split(";")[0].split(":")[1] || "image/jpeg";

    // Update the prompt to include the user's manual input if provided
    const userContext = details 
      ? `The user has provided this extra context about the quantity or ingredients: "${details}". Use this information heavily in your calculation.` 
      : `The user did not provide quantity details. Do your best to estimate the portion size based on the photo.`;

    const prompt = `You are a nutritionist. Look at this food photo and estimate the nutritional value for the total meal.
    ${userContext}
    Reply ONLY with valid JSON, no markdown: {"food": "short food name", "calories": number, "protein": number, "carbs": number, "fat": number, "advice": "one short healthy tip"}`;

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
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
        }),
      }
    );

    const data = await r.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Clean up the JSON response
    text = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);
    
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}