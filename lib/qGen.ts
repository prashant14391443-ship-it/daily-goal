export const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
];

export const GEMINI_MODELS = ["gemini-3-flash-preview", "gemini-3.7-flash"];

export type GeneratedQuestion = {
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string;
  solution_steps: string[];
  memory_trick: string;
};

// ✅ Never let a hanging AI call stall the whole batch
const FETCH_TIMEOUT_MS = 9000;
async function fetchWithTimeout(url: string, init: RequestInit, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export function buildQuestionPrompt(
  examName: string,
  sectionName: string,
  topicName: string,
  difficulty: "easy" | "medium" | "hard",
  year?: number | null
): string {
  const yearCtx = year
    ? `This question must match the exact style, difficulty, and pattern of the ${year} ${examName} exam.`
    : `This question must match the official ${examName} exam pattern.`;

  const diffCtx = {
    easy: "Easy difficulty: basic recall / direct application.",
    medium: "Medium difficulty: requires 2-step reasoning or common traps.",
    hard: "Hard difficulty: tricky, multi-step, tests deep conceptual clarity.",
  }[difficulty];

  return `You are an expert question setter for ${examName}.

${yearCtx}
${diffCtx}

Generate ONE multiple-choice question:
- Exam: ${examName}
- Section: ${sectionName}
- Topic: ${topicName}

Reply ONLY with valid JSON. No markdown. No preamble.

{
  "question_text": "Clear, unambiguous question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_index": 0,
  "explanation": "2-sentence explanation of why the answer is correct",
  "solution_steps": ["Step 1...", "Step 2...", "Step 3..."],
  "memory_trick": "A short catchy mnemonic to remember this concept (max 15 words)"
}

Rules:
- "correct_index" is 0-based (0, 1, 2, or 3)
- All 4 options must be plausible and similar in length
- Wrong options should target common misconceptions
- Never use "None of the above" or "All of the above" unless genuinely appropriate
- Question must be solvable in under 60 seconds by a prepared candidate
- For Quant: ensure clean numbers and integer answers when possible
- For Reasoning: ensure one unambiguous answer
- For GK: facts must be accurate and verifiable`;
}

export function cleanJson(raw: string): string {
  let t = (raw || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const m = t.match(/\{[\s\S]*\}/);
  if (m) t = m[0];
  return t;
}

export function isValidQuestion(q: any): q is GeneratedQuestion {
  return (
    !!q &&
    typeof q.question_text === "string" &&
    q.question_text.length > 10 &&
    Array.isArray(q.options) &&
    q.options.length === 4 &&
    q.options.every((o: any) => typeof o === "string" && o.length > 0) &&
    typeof q.correct_index === "number" &&
    q.correct_index >= 0 &&
    q.correct_index <= 3
  );
}

export async function generateOneQuestion(
  prompt: string,
  keys: { groq?: string; gemini?: string }
): Promise<{ q: GeneratedQuestion; engine: string } | null> {
  if (keys.groq) {
    for (const model of GROQ_MODELS) {
      try {
        const r = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${keys.groq}` },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1500,
            temperature: 0.7,
          }),
        });
        if (r.ok) {
          const d = await r.json();
          const raw = d.choices?.[0]?.message?.content || "";
          try {
            const parsed = JSON.parse(cleanJson(raw));
            if (isValidQuestion(parsed)) return { q: parsed, engine: model };
          } catch {}
        }
      } catch {}
    }
  }

  if (keys.gemini) {
    for (const model of GEMINI_MODELS) {
      try {
        const r = await fetchWithTimeout(
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
            if (isValidQuestion(parsed)) return { q: parsed, engine: model };
          } catch {}
        }
      } catch {}
    }
  }

  return null;
}

export function getKeys(): { groq?: string; gemini?: string } {
  return {
    groq: process.env.GROQ_API_KEY,
    gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  };
}