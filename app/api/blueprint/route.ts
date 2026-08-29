import { NextResponse } from "next/server";

const GROQ_MODELS = [
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
];
const GEMINI_MODELS = ["gemini-3-flash-preview", "gemini-3.7-flash"];

const SYS = `You are an elite strength coach. Give TOP BEST, science-backed advice. Return ONLY valid JSON, EXACTLY this shape, keep strings SHORT:
{"title":"...","split":[{"day":"Mon","focus":"..."}],
"exercises":[{"day":"Mon","name":"...","sets":3,"reps":"8-12","rest":"90s","cues":"short cue","mistakes":"short mistake"}],
"topExercises":["3-5 best"],"topMistakes":["top 3"],
"progression":"overload rule",
"nutrition":{"calories":0,"protein":0,"foods":["10+ foods with protein"],"tip":"..."},
"recovery":{"sleep":"...","water":"...","deload":"..."},"tips":["..."]}
Home = push-ups/pull-ups/weighted squats/pike push-ups/plank. Gym = squat/bench/deadlift/row/OHP.
Vegetarian foods = soya chunks, paneer, chana, moong, dal, curd, milk, peanuts.`;

function parseJson(t: string) { const s = t.indexOf("{"), e = t.lastIndexOf("}"); if (s < 0 || e < 0) throw 0; return JSON.parse(t.slice(s, e + 1)); }

async function groq(prompt: string, model: string) {
  const key = process.env.GROQ_API_KEY; if (!key) throw "no-groq-key";
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, temperature: 0.7, max_tokens: 4000, messages: [{ role: "system", content: SYS }, { role: "user", content: prompt }] }) });
  if (!r.ok) throw "groq-" + r.status;
  const d = await r.json();
  const c = d.choices?.[0]?.message?.content || "";
  if (!c) throw "groq-empty";
  return c;
}
async function gemini(prompt: string, model: string) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY; if (!key) throw "no-gemini-key";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: SYS + "\n\n" + prompt }] }], generationConfig: { maxOutputTokens: 4096 } }) });
  if (!r.ok) throw "gemini-" + r.status;
  const d = await r.json();
  const c = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!c) throw "gemini-empty";
  return c;
}

export async function POST(req: Request) {
  const { goal, days, level, equipment, perSession, calories, direction, diet, weight, pf, splitStyle } = await req.json();
  const prompt = `Goal:${goal} Days:${days} Split:${splitStyle} Level:${level} Equipment:${equipment} Exercises/session:${perSession} Diet:${diet} ${weight ? `Weight:${weight}kg protein=${Math.round(weight * (pf || 1.5))}g` : ""} ${calories ? `Calories:${calories}(${direction})` : ""}`;

  let lastErr = "";
  for (const m of GROQ_MODELS) {
    try { return NextResponse.json(parseJson(await groq(prompt, m))); } catch (e) { lastErr = String(e); }
  }
  for (const m of GEMINI_MODELS) {
    try { return NextResponse.json(parseJson(await gemini(prompt, m))); } catch (e) { lastErr = String(e); }
  }
  return NextResponse.json({ error: "AI failed: " + lastErr }, { status: 500 });
}