// Try your newest models FIRST, then proven-stable fallbacks (one of these WILL work)
export const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

export const GEMINI_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.7-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

export type GeneratedQuestion = {
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string;
  solution_steps: string[];
  memory_trick: string;
};

// ✅ Record WHY generation failed so we can see it
let lastGenError = "no attempt yet";
export function getLastGenError() { return lastGenError; }

const FETCH_TIMEOUT_MS = 20000; // was 9000 — too short for slow models
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
    if (yearPatterns.trap_patterns?.length) prompt += `- Wrong-option traps: ${yearPatterns.trap_patterns.join("; ")}\n`;
    prompt += `\n`;
  } else if (year) {
    prompt += `Match the style and difficulty of the ${year} ${examName} paper.\n\n`;
  }
  const diffCtx = {
    easy: "EASY: basic recall / direct application.",
    medium: "MEDIUM: 2-step reasoning or common traps.",
    hard: "HARD: tricky, multi-step, deep conceptual clarity.",
  }[difficulty];
  prompt += `Difficulty: ${diffCtx}\n\n`;
  prompt += `Generate ONE multiple-choice question:
- Exam: ${examName}
- Section: ${sectionName}
- Topic: ${topicName}

Reply ONLY with valid JSON. No markdown. No preamble.
{
  "question_text": "Clear, unambiguous question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_index": 0,
  "explanation": "2-sentence explanation",
  "solution_steps": ["Step 1...", "Step 2..."],
  "memory_trick": "short mnemonic (max 15 words)"
}
Rules:
- "correct_index" is 0-based (0,1,2,3)
- 4 plausible options, similar length
- Wrong options target common misconceptions
- Respect the exam's time-per-question from the style guide
- For Quant: clean numbers, integer answers when possible
- For Reasoning: exactly one unambiguous answer
- For GK/Science: facts must be accurate and verifiable`;
  return prompt;
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
  if (!keys.groq && !keys.gemini) {
    lastGenError = "NO API KEYS: set GROQ_API_KEY or GEMINI_API_KEY in Vercel env";
    return null;
  }

  if (keys.groq) {
    for (const model of GROQ_MODELS) {
      try {
        const r = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${keys.groq}` },
          body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_tokens: 1500, temperature: 0.7 }),
        });
        if (r.ok) {
          const d = await r.json();
          const raw = d.choices?.[0]?.message?.content || "";
          try {
            const parsed = JSON.parse(cleanJson(raw));
            if (isValidQuestion(parsed)) return { q: parsed, engine: `groq:${model}` };
            lastGenError = `groq:${model}: invalid JSON shape`;
          } catch { lastGenError = `groq:${model}: JSON parse failed`; }
        } else {
          lastGenError = `groq:${model}: HTTP ${r.status}`;
        }
      } catch (e: any) { lastGenError = `groq:${model}: ${e?.message || "timeout"}`; }
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
            if (isValidQuestion(parsed)) return { q: parsed, engine: `gemini:${model}` };
            lastGenError = `gemini:${model}: invalid JSON shape`;
          } catch { lastGenError = `gemini:${model}: JSON parse failed`; }
        } else {
          lastGenError = `gemini:${model}: HTTP ${r.status}`;
        }
      } catch (e: any) { lastGenError = `gemini:${model}: ${e?.message || "timeout"}`; }
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