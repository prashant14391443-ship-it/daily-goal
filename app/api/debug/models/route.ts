import { NextResponse } from "next/server";
import { discoverGeminiModels, discoverGroqModels, generateOneQuestion, getKeys, getLastGenError } from "@/lib/qGen";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const keys = getKeys();
  const out: any = { has_gemini_key: !!keys.gemini, has_groq_key: !!keys.groq };

  if (keys.gemini) out.gemini_live_models = await discoverGeminiModels(keys.gemini);
  if (keys.groq) out.groq_live_models = await discoverGroqModels(keys.groq);

  const gen = await generateOneQuestion(
    'Generate ONE easy multiple-choice question on "Percentage" for a banking exam. Reply ONLY valid JSON: {"question_text","options":[4 strings],"correct_index":0,"explanation","solution_steps":[],"memory_trick"}',
    keys
  );
  out.test_generation = gen
    ? { ok: true, engine: gen.engine, sample: gen.q.question_text }
    : { ok: false, error: getLastGenError() };

  return NextResponse.json(out);
}