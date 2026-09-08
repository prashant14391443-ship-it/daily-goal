import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type GeneratedQuestion = {
  parsed: {
    question: string;
    options: string[];
    correct: string;
    explanation?: string;
  };
  engine: "groq" | "gemini";
};

function buildPrompt(exam: string, subject: string, topic: string, difficulty: string) {
  return `Create one ${difficulty} multiple-choice question for ${exam}, subject ${subject}, topic ${topic}.
Return JSON only with this shape: {"question":"...","options":["...","...","...","..."],"correct":"...","explanation":"..."}.
The correct value must exactly match one option. Do not include markdown.`;
}

async function generateQuestion(prompt: string, keys: { groq?: string; gemini?: string }): Promise<GeneratedQuestion | null> {
  if (keys.groq) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${keys.groq}` },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", temperature: 0.7, messages: [{ role: "user", content: prompt }] }),
      });
      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "").trim());
        if (parsed.question && Array.isArray(parsed.options) && parsed.correct) return { parsed, engine: "groq" };
      }
    } catch {}
  }

  if (keys.gemini) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keys.gemini}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "").trim());
        if (parsed.question && Array.isArray(parsed.options) && parsed.correct) return { parsed, engine: "gemini" };
      }
    } catch {}
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const { exam, subject, topic, difficulty = "medium", excludeIds = [] } = await req.json();
    if (!exam || !subject || !topic) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // ✅ Cache lookup — but NEVER return a question the user already saw
    let query = supabaseAdmin
      .from("pyq_questions")
      .select("*")
      .eq("exam", exam)
      .eq("subject", subject)
      .eq("topic", topic)
      .eq("difficulty", difficulty)
      .is("year", null);
    if (excludeIds.length > 0) query = query.not("id", "in", `(${excludeIds.join(",")})`);
    const { data: cached } = await query.limit(30);

    if (cached && cached.length > 0) {
      const pick = cached[Math.floor(Math.random() * cached.length)];
      return NextResponse.json({ ...pick, cached: true });
    }

    // Generate a brand-new question
    const keys = { groq: process.env.GROQ_API_KEY, gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY };
    const gen = await generateQuestion(buildPrompt(exam, subject, topic, difficulty), keys);
    if (!gen) return NextResponse.json({ error: "All engines failed" }, { status: 503 });

    const { data: saved, error } = await supabaseAdmin
      .from("pyq_questions")
      .insert({ exam, subject, topic, difficulty, question: gen.parsed.question, options: gen.parsed.options, correct: gen.parsed.correct, explanation: gen.parsed.explanation || "", year: null, source: "ai-generated" })
      .select()
      .single();

    if (error || !saved) return NextResponse.json({ ...gen.parsed, exam, subject, topic, difficulty, engine: gen.engine });
    return NextResponse.json({ ...saved, engine: gen.engine });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e.message }, { status: 500 });
  }
}