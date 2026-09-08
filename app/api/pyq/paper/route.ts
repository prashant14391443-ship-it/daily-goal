export const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
];

export const GEMINI_MODELS = ["gemini-3-flash-preview", "gemini-3.7-flash"];

export function buildPrompt(exam: string, subject: string, topic: string, difficulty: string, year?: number | null) {
  return `You are an expert question setter for ${exam} exams.
${year ? `This question must match the style, pattern & difficulty of the ${year} ${exam} question paper.` : ""}
Generate ONE multiple-choice question on "${topic}" (subject: ${subject}).
Difficulty: ${difficulty} (easy = recall, medium = application, hard = tricky/multi-step).

Reply ONLY with valid JSON. No markdown.
{
  "question": "Clear question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct": 0,
  "explanation": "2-sentence explanation"
}
Rules: "correct" = 0-based index; wrong options must be plausible; options similar length.`;
}

export function cleanJson(raw: string) {
  let t = (raw || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const m = t.match(/\{[\s\S]*\}/);
  if (m) t = m[0];
  return t;
}

export function validParsed(p: any): boolean {
  return (
    !!p &&
    typeof p.question === "string" &&
    Array.isArray(p.options) &&
    p.options.length === 4 &&
    typeof p.correct === "number" &&
    p.correct >= 0 &&
    p.correct <= 3
  );
}

export async function generateQuestion(
  prompt: string,
  keys: { groq?: string; gemini?: string }
): Promise<{ parsed: any; engine: string } | null> {
  if (keys.groq) {
    for (const model of GROQ_MODELS) {
      try {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${keys.groq}` },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1200,
            temperature: 0.8,
          }),
        });
        if (r.ok) {
          const d = await r.json();
          const parsed = JSON.parse(cleanJson(d.choices?.[0]?.message?.content || ""));
          if (validParsed(parsed)) return { parsed, engine: model };
        }
      } catch {}
    }
  }
  if (keys.gemini) {
    for (const model of GEMINI_MODELS) {
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.gemini}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.8, maxOutputTokens: 1500, responseMimeType: "application/json" },
            }),
          }
        );
        if (r.ok) {
          const d = await r.json();
          const parsed = JSON.parse(cleanJson(d.candidates?.[0]?.content?.parts?.[0]?.text || ""));
          if (validParsed(parsed)) return { parsed, engine: model };
        }
      } catch {}
    }
  }
  return null;
}