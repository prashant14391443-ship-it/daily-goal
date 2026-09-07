import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
];

const GEMINI_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.7-flash",
];

function buildPrompt(exam: string, subject: string, topic: string, difficulty: string) {
  return `You are an expert question setter for ${exam} exams. Generate ONE challenging multiple-choice question on "${topic}" (subject: ${subject}).

Difficulty: ${difficulty}
- easy: basic recall, straightforward
- medium: requires application of concepts
- hard: tricky, multi-step reasoning, common misconceptions

Match the EXACT style and pattern of previous ${exam} exam questions. Test real understanding, not memorization.

Reply ONLY with valid JSON. No markdown. No explanation.

Required shape:
{
  "question": "Clear, unambiguous question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct": 0,
  "explanation": "Brief 2-sentence explanation of why correct"
}

Rules:
- "correct" = 0-based index (0,1,2,3)
- Wrong options must be PLAUSIBLE (common mistakes, misconceptions)
- All options similar in length
- Question must be clear and unambiguous`;
}

function cleanJson(raw: string) {
  let t = (raw || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const match = t.match(/\{[\s\S]*\}/);
  if (match) t = match[0];
  return t;
}

async function callGroq(prompt: string, groqKey: string) {
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
          max_tokens: 1200,
          temperature: 0.7,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        const raw = d.choices?.[0]?.message?.content || "";
        const parsed = JSON.parse(cleanJson(raw));
        if (parsed.question && parsed.options?.length === 4 && typeof parsed.correct === "number") {
          return { parsed, engine: model, errs };
        }
        errs.push(`${model}: bad parse`);
      } else {
        errs.push(`${model}: ${r.status}`);
      }
    } catch (e: any) {
      errs.push(`${model}: ${e.message}`);
    }
  }
  return { parsed: null, engine: "", errs };
}

async function callGemini(prompt: string, gKey: string) {
  const errs: string[] = [];
  for (const model of GEMINI_MODELS) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1500,
              responseMimeType: "application/json",
            },
          }),
        }
      );
      if (r.ok) {
        const d = await r.json();
        const raw = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = JSON.parse(cleanJson(raw));
        if (parsed.question && parsed.options?.length === 4 && typeof parsed.correct === "number") {
          return { parsed, engine: model, errs };
        }
        errs.push(`${model}: bad parse`);
      } else {
        errs.push(`${model}: ${r.status}`);
      }
    } catch (e: any) {
      errs.push(`${model}: ${e.message}`);
    }
  }
  return { parsed: null, engine: "", errs };
}

export async function POST(req: Request) {
  try {
    const { exam, subject, topic, difficulty = "medium" } = await req.json();
    const groqKey = process.env.GROQ_API_KEY;
    const gKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!groqKey && !gKey) {
      return NextResponse.json({ error: "API keys not configured" }, { status: 500 });
    }
    if (!exam || !subject || !topic) {
      return NextResponse.json({ error: "Missing exam/subject/topic" }, { status: 400 });
    }

    // 1. Try to fetch an existing question from DB first (cache)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: cached } = await supabaseAdmin
      .from("pyq_questions")
      .select("*")
      .eq("exam", exam)
      .eq("subject", subject)
      .eq("topic", topic)
      .eq("difficulty", difficulty)
      .limit(20)
      .order("created_at", { ascending: false });

    // If we have cached questions, return a random one (avoid repetition)
    if (cached && cached.length > 0) {
      const randomIdx = Math.floor(Math.random() * cached.length);
      return NextResponse.json({ ...cached[randomIdx], cached: true });
    }

    // 2. No cache → generate new
    const prompt = buildPrompt(exam, subject, topic, difficulty);
    const errs: string[] = [];

    let result: any = null;
    let engine = "";

    if (groqKey) {
      const groq = await callGroq(prompt, groqKey);
      errs.push(...groq.errs);
      if (groq.parsed) { result = groq.parsed; engine = groq.engine; }
    }

    if (!result && gKey) {
      const gemini = await callGemini(prompt, gKey);
      errs.push(...gemini.errs);
      if (gemini.parsed) { result = gemini.parsed; engine = gemini.engine; }
    }

    if (!result) {
      return NextResponse.json({ error: "Failed to generate", debug: errs }, { status: 503 });
    }

    // 3. Save to DB
    const { data: saved, error } = await supabaseAdmin
      .from("pyq_questions")
      .insert({
        exam,
        subject,
        topic,
        difficulty,
        question: result.question,
        options: result.options,
        correct: result.correct,
        explanation: result.explanation || "",
        source: "ai-generated",
      })
      .select()
      .single();

    if (error) {
      // Save failed but we still have the question
      return NextResponse.json({ ...result, exam, subject, topic, difficulty, engine, cached: false });
    }

    return NextResponse.json({ ...saved, engine, cached: false });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e.message }, { status: 500 });
  }
}