import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { aiGate, cachedAi } from "@/lib/aiGate"; // 🛡 NEW

const GROQ_MODELS = ["openai/gpt-oss-20b","openai/gpt-oss-120b","meta-llama/llama-4-scout-17b-16e-instruct","meta-llama/llama-4-maverick-17b-128e-instruct"];
const GEMINI_MODELS = ["gemini-3-flash-preview","gemini-3.7-flash"];

const SYS = `You are a friendly, practical strength & nutrition coach. Build a plan SPECIFIC to the goal — never a generic template:
- Abs → core work + slight deficit. Running → running volume + intervals. Gain → surplus + heavy compounds. Lose → deficit + compounds. A muscle → target it with its best exercises.

EXERCISES: only the best compound movements for goal + equipment. Home = push-ups, pull-ups, weighted squats, pike push-ups, plank. Gym = squat, bench, deadlift, row, overhead press.

NUTRITION: list 10+ high-protein foods using NATURAL serving sizes people actually eat, each with protein (and C/F if useful). Examples: "1 egg = 6g", "1 glass milk = 8g", "1 bowl soya chunks = 26g", "2 tbsp sattu = 6g", "paneer 50g = 9g".
- Vegetarian = NO eggs, NO meat, NO fish. MUST include: soya chunks, sattu, paneer, chana, moong dal, rajma, curd, milk, peanuts, oats.
- Non-veg adds: eggs (as pieces), chicken, fish.

TIPS: write 5-7 tips in SIMPLE everyday language a total beginner understands. NO scientific jargon (never use VO2max, lactate, MPS, glycogen). Examples: "Warm up 5 minutes before lifting", "Sleep 7-9 hours", "Drink 3-4 litres water", "Add 1 rep or a little weight every week", "Eat protein in every meal", "Stop 1-2 reps before you fail".

Return ONLY valid JSON, EXACTLY:
{"title":"...","split":[{"day":"Mon","focus":"..."}],
"exercises":[{"day":"Mon","name":"...","sets":3,"reps":"8-12","rest":"90s"}],
"topExercises":["3-5 best for THIS goal"],
"progression":"simple overload rule",
"nutrition":{"calories":0,"protein":0,"carbs":0,"fat":0,"foods":["10+ foods with natural servings + protein"],"tip":"..."},
"recovery":{"sleep":"...","water":"...","deload":"..."},
"tips":["5-7 simple tips"]}
Use the EXACT calories/protein/carbs/fat numbers provided.`;

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
  // 🔒 1. AUTHENTICATE USER
  const jwt = (req.headers.get("authorization") || "").replace("Bearer ", "");
  let userId = "anon-ip-" + (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  if (jwt) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data } = await supabase.auth.getUser(jwt);
    if (data.user) userId = data.user.id;
  }

  const b = await req.json();

  // 🔒 2. AI GATE (Weight 5: Very heavy generation)
  const gate = await aiGate(userId, "blueprint", 5);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 429 });

  const prompt = `Goal:${b.goal} Days:${b.days} Split:${b.splitStyle} Level:${b.level} Equipment:${b.equipment} Exercises/session:${b.perSession} Diet:${b.diet}
EXACT macros → calories:${b.calories} protein:${b.protein}g carbs:${b.carbs}g fat:${b.fat}g ${b.weight ? `(weight ${b.weight}kg)` : ""}`;

  // 🔒 3. SMART CACHE: Identical fitness plans cost $0 tokens!
  const cacheKey = `bp:${b.goal}:${b.days}:${b.splitStyle}:${b.level}:${b.equipment}:${b.perSession}:${b.diet}:${b.calories}:${b.protein}:${b.weight || 'none'}`;
  
  try {
    const result = await cachedAi(cacheKey, async () => {
      let last = "";
      for (const m of GROQ_MODELS) { try { return parseJson(await groq(prompt, m)); } catch (e) { last = String(e); } }
      for (const m of GEMINI_MODELS) { try { return parseJson(await gemini(prompt, m)); } catch (e) { last = String(e); } }
      throw new Error("AI failed: " + last);
    }, 168); // Cache for 1 week (168 hours)

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "AI generation failed" }, { status: 500 });
  }
}