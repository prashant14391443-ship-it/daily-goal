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

let lastGenError = "no attempt yet";
export function getLastGenError() { return lastGenError; }

const FETCH_TIMEOUT_MS = 20000;
async function fetchWithTimeout(url: string, init?: RequestInit, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

const FALLBACK_GEMINI = ["gemini-2.5-flash", "gemini-2.0-flash"];
const FALLBACK_GROQ = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

let geminiCache: { models: string[]; at: number } | null = null;
export async function discoverGeminiModels(key: string): Promise<string[]> {
  if (geminiCache && Date.now() - geminiCache.at < 10 * 60 * 1000) return geminiCache.models;
  try {
    const r = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=200`);
    if (r.ok) {
      const d = await r.json();
      const all = (d.models || [])
        .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m: any) => (m.name || "").replace("models/", ""))
        .filter((n: string) => n && !/embedding|tts|imagen|aqa|safeguard|guard/i.test(n));
      const flashStable = all.filter((n: string) => n.includes("flash") && !n.includes("preview"));
      const flashPrev = all.filter((n: string) => n.includes("flash") && n.includes("preview"));
      const pro = all.filter((n: string) => n.includes("pro"));
      const rest = all.filter((n: string) => !n.includes("flash") && !n.includes("pro"));
      const models = [...flashStable, ...flashPrev, ...pro, ...rest].slice(0, 8);
      if (models.length > 0) { geminiCache = { models, at: Date.now() }; return models; }
    }
  } catch {}
  return FALLBACK_GEMINI;
}

let groqCache: { models: string[]; at: number } | null = null;
export async function discoverGroqModels(key: string): Promise<string[]> {
  if (groqCache && Date.now() - groqCache.at < 10 * 60 * 1000) return groqCache.models;
  try {
    const r = await fetchWithTimeout("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (r.ok) {
      const d = await r.json();
      const ids: string[] = (d.data || []).map((m: any) => m.id).filter(Boolean);
      const chat = ids.filter((i) => !/safeguard|guard|whisper|embed|tts|asr|moderation|distil-whisper/i.test(i));
      const preferred = [
        ...chat.filter((i) => i.includes("llama-3.3-70b")),
        ...chat.filter((i) => i.includes("llama-3.1-8b")),
        ...chat.filter((i) => i.includes("gpt-oss-120b")),
        ...chat.filter((i) => i.includes("gpt-oss-20b")),
        ...chat.filter((i) => i.includes("llama")),
        ...chat.filter((i) => !i.includes("llama") && !i.includes("gpt-oss")),
      ];
      const models = [...new Set(preferred)].slice(0, 8);
      if (models.length > 0) { groqCache = { models, at: Date.now() }; return models; }
    }
  } catch {}
  return FALLBACK_GROQ;
}

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
  "question_text": "Clear, unambiguous question text. Use standard text formatting.",
  "options": ${optionsString},
  "correct_index": 0,
  "correct_value": null,
  "explanation": "2-sentence explanation",
  "solution_steps": ["Step 1...", "Step 2..."],
  "memory_trick": "short mnemonic (optional, leave as empty string if not applicable)"
}

Rules:
- "correct_index" is 0-based (0 to ${optionCount - 1})
- ${optionCount} plausible options, similar length
- Wrong options target common misconceptions
- For Quant: clean numbers, integer answers when possible
- For Reasoning: exactly one unambiguous answer`;

  return prompt;
}

export function cleanJson(raw: string): string {
  let t = (raw || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const m = t.match(/\{[\s\S]*\}/);
  if (m) {
    // Basic cleanup to prevent JSON parse crashes on weird formatting
    return m[0].replace(/\n/g, "\\n").replace(/\r/g, ""); 
  }
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
  keys: { groq?: string; gemini?: string }
): Promise<{ q: GeneratedQuestion; engine: string } | null> {
  if (!keys.groq && !keys.gemini) {
    lastGenError = "NO API KEYS: set GROQ_API_KEY or GEMINI_API_KEY in Vercel env";
    return null;
  }

  if (keys.groq) {
    const models = await discoverGroqModels(keys.groq);
    for (const model of models) {
      try {
        const r = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${keys.groq}` },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1500,
            temperature: 0.7,
            response_format: { type: "json_object" },
          }),
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
    const models = await discoverGeminiModels(keys.gemini);
    for (const model of models) {
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