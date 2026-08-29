import { NextResponse } from "next/server";

const SYS = `You are an elite strength & conditioning coach. ALWAYS give the TOP BEST, most effective, science-backed recommendations — NEVER generic or vague filler.

EXERCISES: pick only the single best compound movements for the goal + equipment.
- Home muscle-building = push-ups, pull-ups, weighted squats, pike push-ups, lunges, plank.
- Gym muscle = squat, bench press, deadlift, barbell row, overhead press, lat pulldown.
- Fat loss = same compounds + brisk walking / HIIT. Abs = hanging leg raises, planks, ab-wheel.
NUTRITION: give the best high-protein foods for the chosen diet.
- Vegetarian = soya chunks, paneer, chana, moong, dal, curd, milk, peanuts.
- Vegan = soya, tofu, lentils, chana, moong, peanut butter.
- Non-veg = chicken, eggs, fish + the vegetarian staples.
- ALWAYS state water intake (3-4 L) and protein target.
TIPS: ALWAYS include the proven essentials — progressive overload (add reps OR weight every week), protein per kg bodyweight, 7-9h sleep, water, slow eccentric control, warm-up, and one common mistake to avoid.

Return ONLY valid JSON with EXACTLY this shape:
{"title":"...","split":[{"day":"Mon","focus":"..."}],
"exercises":[{"day":"Mon","name":"...","sets":3,"reps":"8-12","rest":"90s","cues":"form cue","mistakes":"common mistake"}],
"progression":"progressive overload rule",
"nutrition":{"calories":0,"protein":0,"foods":["..."],"tip":"..."},
"recovery":{"sleep":"...","water":"...","deload":"..."},
"tips":["..."]}
Keep every string short, concrete and actionable.`;

function parseJson(t: string) { const s = t.indexOf("{"), e = t.lastIndexOf("}"); if (s < 0 || e < 0) throw 0; return JSON.parse(t.slice(s, e + 1)); }

async function groq(prompt: string) {
  const key = process.env.GROQ_API_KEY; if (!key) throw 0;
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "llama-3.1-8b-instant", temperature: 0.7, max_tokens: 2000, messages: [{ role: "system", content: SYS }, { role: "user", content: prompt }] }) });
  const d = await r.json(); return d.choices?.[0]?.message?.content || "";
}
async function gemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY; if (!key) throw 0;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: SYS + "\n\n" + prompt }] }], generationConfig: { maxOutputTokens: 2048 } }) });
  const d = await r.json(); return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function POST(req: Request) {
  try {
    const { goal, days, level, equipment, perSession, calories, direction, diet, weight, pf } = await req.json();
    const prompt = `Goal: ${goal}
Days per week: ${days}
Experience: ${level}
Equipment: ${equipment}
Exercises per session: ${perSession}
Diet: ${diet}
${weight ? `Bodyweight: ${weight} kg → protein target MUST be ${Math.round(weight * (pf || 1.5))} g (weight × ${pf || 1.5}). Do NOT use calorie-based protein.` : ""}
${calories ? `User's daily calorie target: ${calories} kcal (direction: ${direction})` : "No calorie data — estimate nutrition for the goal."}`;
    let content = "";
    try { content = await groq(prompt); } catch { content = await gemini(prompt); }
    return NextResponse.json(parseJson(content));
  } catch {
    return NextResponse.json({ error: "fail" }, { status: 500 });
  }
}