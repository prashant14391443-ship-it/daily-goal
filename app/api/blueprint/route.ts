import { NextResponse } from "next/server";

const GROQ_MODELS = ["openai/gpt-oss-20b","openai/gpt-oss-120b","meta-llama/llama-4-scout-17b-16e-instruct","meta-llama/llama-4-maverick-17b-128e-instruct"];
const GEMINI_MODELS = ["gemini-3-flash-preview","gemini-3.7-flash"];

const SYS = `You are an evidence-based strength & nutrition coach. Build a plan SPECIFIC to the goal — NEVER a generic template:
- Abs → core-focused + slight deficit.
- Running → running volume + intervals, light lifting.
- Gain/bulk → surplus + heavy compounds.
- Lose/cut → deficit + compound lifts to keep muscle.
- A muscle (chest/back/biceps/...) → target that muscle with its best exercises.
Use current scientific consensus (protein 1.6-2.2 g/kg, progressive overload, ~10-20 hard sets/muscle/week, 7-9h sleep).
Return ONLY valid JSON, EXACTLY this shape (keep strings short):
{"title":"...","split":[{"day":"Mon","focus":"..."}],
"exercises":[{"day":"Mon","name":"...","sets":3,"reps":"8-12","rest":"90s"}],
"topExercises":["3-5 best for THIS goal"],
"progression":"overload rule",
"nutrition":{"calories":0,"protein":0,"carbs":0,"fat":0,"foods":["10+ foods, each as 'Name — P..g C..g F..g /100g'"],"tip":"..."},
"recovery":{"sleep":"...","water":"...","deload":"..."},
"tips":["5-7 scientific, goal-specific tips"]}
Use the EXACT calories/protein/carbs/fat numbers provided. Do NOT add per-exercise right/wrong lines.`;

function parseJson(t: string) { const s = t.indexOf("{"), e = t.lastIndexOf("}"); if (s < 0 || e < 0) throw 0; return JSON.parse(t.slice(s, e + 1)); }
async function groq(p: string, m: string) {
  const k = process.env.GROQ_API_KEY; if (!k) throw 0;
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${k}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: m, temperature: 0.7, max_tokens: 4000, messages: [{ role: "system", content: SYS }, { role: "user", content: p }] }) });
  if (!r.ok) throw 0; const d = await r.json(); const c = d.choices?.[0]?.message?.content || ""; if (!c) throw 0; return c;
}
async function gemini(p: string, m: string) {
  const k = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY; if (!k) throw 0;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: SYS + "\n\n" + p }] }], generationConfig: { maxOutputTokens: 4096 } }) });
  if (!r.ok) throw 0; const d = await r.json(); const c = d.candidates?.[0]?.content?.parts?.[0]?.text || ""; if (!c) throw 0; return c;
}

export async function POST(req: Request) {
  const b = await req.json();
  const prompt = `Goal:${b.goal} Days:${b.days} Split:${b.splitStyle} Level:${b.level} Equipment:${b.equipment} Exercises/session:${b.perSession} Diet:${b.diet}
EXACT macros to use → calories:${b.calories} protein:${b.protein}g carbs:${b.carbs}g fat:${b.fat}g ${b.weight ? `(weight ${b.weight}kg)` : ""}`;
  let last = "";
  for (const m of GROQ_MODELS) { try { return NextResponse.json(parseJson(await groq(prompt, m))); } catch (e) { last = String(e); } }
  for (const m of GEMINI_MODELS) { try { return NextResponse.json(parseJson(await gemini(prompt, m))); } catch (e) { last = String(e); } }
  return NextResponse.json({ error: "AI failed: " + last }, { status: 500 });
}