import { NextResponse } from "next/server";

const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
];

function buildPrompt(
  question: string,
  options: string[],
  correct: number,
  userAnswer: number,
  exam: string,
  subject: string,
  topic: string
) {
  const isCorrect = userAnswer === correct;
  const userAns = options[userAnswer] || "";
  const correctAns = options[correct] || "";

  return `You are a warm, encouraging tutor explaining a ${exam} ${subject} question on "${topic}".

Question: ${question}
User's answer: "${userAns}" ${isCorrect ? "(CORRECT)" : "(WRONG)"}
Correct answer: "${correctAns}"

Reply ONLY with valid JSON:
{
  "verdict": "${isCorrect ? "correct" : "wrong"}",
  "one_line": "${isCorrect ? "One celebratory sentence" : "One kind, encouraging sentence"}",
  "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
  "wrong_explanations": ["Why option A is wrong", "Why option B is wrong"],
  "memory_trick": "Short catchy trick to remember this concept",
  "similar": "A brief similar practice question to test understanding"
}

Rules:
- Be warm even if wrong — never condescending
- steps: 2-4 simple numbered steps explaining the concept
- wrong_explanations: explain why each WRONG option is wrong (skip the correct one and user's pick)
- memory_trick: mnemonic, acronym, or visual — max 20 words
- similar: one-line question testing the same concept`;
}

function cleanJson(raw: string) {
  let t = (raw || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const match = t.match(/\{[\s\S]*\}/);
  if (match) t = match[0];
  return t;
}

export async function POST(req: Request) {
  try {
    const { question, options, correct, userAnswer, exam = "", subject = "", topic = "" } = await req.json();
    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const prompt = buildPrompt(question, options, correct, userAnswer, exam, subject, topic);
    const errs: string[] = [];

    for (const model of GROQ_MODELS) {
      try {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1500,
            temperature: 0.6,
          }),
        });
        if (r.ok) {
          const d = await r.json();
          const raw = d.choices?.[0]?.message?.content || "";
          const parsed = JSON.parse(cleanJson(raw));
          if (parsed.one_line && parsed.steps) {
            return NextResponse.json({ ...parsed, engine: model });
          }
          errs.push(`${model}: bad parse`);
        } else {
          errs.push(`${model}: ${r.status}`);
        }
      } catch (e: any) {
        errs.push(`${model}: ${e.message}`);
      }
    }

    return NextResponse.json({ error: "Failed to generate explanation", debug: errs }, { status: 503 });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e.message }, { status: 500 });
  }
}