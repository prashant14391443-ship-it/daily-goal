export type GeneratedQuestion = {
  question_type: string;
  question_text: string;
  options: string[];
  correct_index: number | null;
  correct_value: string | null;
  explanation: string;
  solution_steps: string[];
  memory_trick: string | null;
};

// 🔥 2026-valid chain. NEVER use 1.5-flash / 2.0-flash again.
const MODEL_CHAIN = ["gemini-3.7-flash", "gemini-3.5-flash", "gemini-2.5-flash"];

export function buildQuestionPrompt(
  examName: string, sectionName: string, topicName: string,
  difficulty: "easy" | "medium" | "hard", optionCount: number = 4,
  year?: number | null, styleGuide?: string, yearPatterns?: any
): string {
  let prompt = `You are an expert question setter for the ${examName} examination.\n\n`;
  if (styleGuide) prompt += `OFFICIAL EXAM PATTERN & STYLE (follow strictly):\n${styleGuide}\n\n`;
  if (yearPatterns) {
    prompt += `REAL ${year} PAPER ANALYSIS (match this exactly):\n`;
    if (yearPatterns.difficulty_mix) prompt += `- Difficulty mix: ${JSON.stringify(yearPatterns.difficulty_mix)}\n`;
    if (yearPatterns.style_notes?.length) prompt += `- Style: ${yearPatterns.style_notes.join("; ")}\n`;
    prompt += `\n`;
  }
  const diffCtx = {
    easy: "EASY: basic recall / direct application.",
    medium: "MEDIUM: 2-step reasoning or common traps.",
    hard: "HARD: tricky, multi-step, deep conceptual clarity.",
  }[difficulty];
  prompt += `Difficulty: ${diffCtx}\n\n`;
  const optionsString = optionCount === 5
    ? '["Option A", "Option B", "Option C", "Option D", "Option E"]'
    : '["Option A", "Option B", "Option C", "Option D"]';
  prompt += `Generate ONE multiple-choice question:
- Exam: ${examName}
- Section: ${sectionName}
- Topic: ${topicName}

Reply ONLY with valid JSON. No markdown. No preamble.
{
  "question_type": "mcq-${optionCount}",
  "question_text": "Clear, unambiguous question text.",
  "options": ${optionsString},
  "correct_index": 0,
  "correct_value": null,
  "explanation": "2-sentence explanation",
  "solution_steps": ["Step 1...", "Step 2..."],
  "memory_trick": ""
}

Rules:
- "correct_index" is 0-based (0 to ${optionCount - 1})
- ${optionCount} plausible options, similar length
- For Quant: clean numbers, integer answers when possible
- For Reasoning: exactly one unambiguous answer`;
  return prompt;
}

export function cleanJson(raw: string): string {
  let t = (raw || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const m = t.match(/\{[\s\S]*\}/);
  if (m) return m[0].replace(/\n/g, "\\n").replace(/\r/g, "");
  return t;
}

export function isValidQuestion(q: any, allowedOptionCounts: number[] = [4, 5]): q is GeneratedQuestion {
  return (
    !!q &&
    typeof q.question_text === "string" && q.question_text.length > 5 &&
    Array.isArray(q.options) && allowedOptionCounts.includes(q.options.length) &&
    q.options.every((o: any) => typeof o === "string") &&
    typeof q.correct_index === "number" && q.correct_index >= -1
  );
}

// 🔥 Now THROWS real errors instead of global variable
export async function generateOneQuestion(
  prompt: string,
  keys: { gemini?: string }
): Promise<{ q: GeneratedQuestion; engine: string }> {
  if (!keys.gemini) throw new Error("GEMINI_API_KEY missing in Vercel env");

  let lastErr = "No model attempted";
  for (const model of MODEL_CHAIN) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 20000);
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.gemini}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1500, responseMimeType: "application/json" },
          }),
        }
      );
      clearTimeout(to);

      if (!r.ok) {
        const body = await r.text().catch(() => "");
        lastErr = `${model}: HTTP ${r.status} ${body.slice(0, 120)}`;
        if (r.status === 403) break; // bad key — stop trying
        continue;                    // 404/429/503 — try next model
      }

      const d = await r.json();
      const raw = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!raw) { lastErr = `${model}: empty response (${d.candidates?.[0]?.finishReason || "unknown"})`; continue; }

      const parsed = JSON.parse(cleanJson(raw));
      if (!isValidQuestion(parsed)) { lastErr = `${model}: invalid question shape`; continue; }
      return { q: parsed, engine: `gemini:${model}` };
    } catch (e: any) {
      lastErr = `${model}: ${e?.message || "network error"}`;
    }
  }
  throw new Error(lastErr);
}

export function getKeys(): { gemini?: string } {
  return { gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY };
}