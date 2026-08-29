import { NextResponse } from "next/server";

const SYS = `You are an elite strength & conditioning coach. ALWAYS give the TOP BEST, science-backed recommendations — never vague filler.

SPLIT: if the user requests a specific split style, follow it. If "Auto", choose by days: 2-3 days = Full body; 4 days = Upper/Lower; 5-6 days = Push/Pull/Legs.
EXERCISES: only the single best compound movements for goal + equipment.
- Home = push-ups, pull-ups, weighted squats, pike push-ups, lunges, plank.
- Gym = squat, bench press, deadlift, barbell row, overhead press, lat pulldown.
NUTRITION: list AT LEAST 10 high-protein foods, EACH with its protein amount (e.g. "Paneer — 18g/100g"). Vegetarian = soya chunks, paneer, chana, moong, dal, curd, milk, peanuts. Non-veg adds chicken, eggs, fish. ALWAYS state water (3-4 L).
TOP MISTAKES: give the top 3 real mistakes (bad form, inconsistency, no progressive overload, poor sleep).

Return ONLY valid JSON, EXACTLY this shape (keep every string SHORT):
{"title":"...","split":[{"day":"Mon","focus":"..."}],
"exercises":[{"day":"Mon","name":"...","sets":3,"reps":"8-12","rest":"90s","cues":"short cue","mistakes":"short mistake"}],
"topExercises":["3-5 best exercises"],
"topMistakes":["top 3 mistakes"],
"progression":"progressive overload rule",
"nutrition":{"calories":0,"protein":0,"foods":["10+ foods with protein"],"tip":"..."},
"recovery":{"sleep":"...","water":"...","deload":"..."},
"tips":["..."]}`;

function parseJson(t: string) { const s = t.indexOf("{"), e = t.lastIndexOf("}"); if (s < 0 || e < 0) throw 0; return JSON.parse(t.slice(s, e + 1)); }

async function groq(prompt: string) {
  const key = process.env.GROQ_API_KEY; if (!key) throw 0;
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "llama-3.1-8b-instant", temperature: 0.7, max_tokens: 4000, messages: [{ role: "system", content: SYS }, { role: "user", content: prompt }] }) });
  if (!r.ok) throw 0;
  const d = await r.json();
  const c = d.choices?.[0]?.message?.content || "";
  if (!c) throw 0;
  return c;
}
async function gemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY; if (!key) throw 0;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: SYS + "\n\n" + prompt }] }], generationConfig: { maxOutputTokens: 4096 } }) });
  if (!r.ok) throw 0;
  const d = await r.json();
  const c = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!c) throw 0;
  return c;
}

export async function POST(req: Request) {
  try {
    const { goal, days, level, equipment, perSession, calories, direction, diet, weight, pf, splitStyle } = await req.json();
    const prompt = `Goal: ${goal}
Days per week: ${days}
Split style: ${splitStyle}
Experience: ${level}
Equipment: ${equipment}
Exercises per session: ${perSession}
Diet: ${diet}
${weight ? `Bodyweight: ${weight} kg → protein target MUST be ${Math.round(weight * (pf || 1.5))} g (weight × ${pf || 1.5}).` : ""}
${calories ? `Daily calorie target: ${calories} kcal (direction: ${direction})` : ""}`;
    let content = "";
    try { content = await groq(prompt); } catch { content = await gemini(prompt); }
    return NextResponse.json(parseJson(content));
  } catch {
    return NextResponse.json({ error: "fail" }, { status: 500 });
  }
}