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

// Start with a clear default message
let lastGenError = "Starting AI Generation...";
export function getLastGenError() { return lastGenError; }

export function buildQuestionPrompt(
  examName: string,
  sectionName: string,
  topicName: string,
  difficulty: "easy" | "medium" | "hard",
  optionCount: number = 4, 
  year?: number | null,
  styleGuide?: string,
  yearPatterns?: any
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
    typeof q.question_text === "string" &&
    q.question_text.length > 5 &&
    Array.isArray(q.options) &&
    allowedOptionCounts.includes(q.options.length) &&
    q.options.every((o: any) => typeof o === "string") &&
    typeof q.correct_index === "number" &&
    q.correct_index >= -1
  );
}

export async function generateOneQuestion(
  prompt: string,
  keys: { gemini?: string }
): Promise<{ q: GeneratedQuestion; engine: string } | null> {
  
  if (!keys.gemini) {
    lastGenError = "ERROR: GEMINI_API_KEY is missing in Vercel Settings.";
    return null;
  }

  // 🔥 Force the app to use the most stable, reliable free model
  // Replace the old model name with this:
const model = "gemini-3.7-flash";
  lastGenError = `Waiting for ${model} to generate...`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.gemini}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1500, responseMimeType: "application/json" },
        }),
      }
    );

    if (r.ok) {
      const d = await r.json();
      const raw = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
      try {
        const parsed = JSON.parse(cleanJson(raw));
        if (isValidQuestion(parsed)) {
          lastGenError = "Success";
          return { q: parsed, engine: `gemini:${model}` };
        }
        lastGenError = "ERROR: Google AI returned bad JSON data.";
      } catch { 
        lastGenError = "ERROR: Google AI failed to format the question correctly."; 
      }
    } else {
      lastGenError = `ERROR: Google AI API failed with HTTP ${r.status}. Check your API Key.`;
    }
  } catch (e: any) { 
    lastGenError = `ERROR: Vercel Timeout or Network Issue - ${e?.message}`; 
  }

  return null;
}

export function getKeys(): { gemini?: string } {
  return {
    gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  };
}