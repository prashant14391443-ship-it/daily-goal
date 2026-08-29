import { NextResponse } from "next/server";

const SYS = `You are an elite strength & conditioning coach. Build a complete, safe, practical training blueprint. Return ONLY valid JSON with EXACTLY this shape:
{"title":"...","split":[{"day":"Mon","focus":"..."}],
"exercises":[{"day":"Mon","name":"...","sets":3,"reps":"8-10","rest":"90s","cues":"form cue","mistakes":"common mistake"}],
"progression":"progressive overload rule",
"nutrition":{"calories":0,"protein":0,"foods":["..."],"tip":"..."},
"recovery":{"sleep":"...","water":"...","deload":"..."},
"tips":["..."]}
Rules: match the user's goal/days/experience/equipment; give the exact number of exercises per session requested; include form cues + common mistakes for EVERY exercise; keep each string short and concrete.`;

function parseJson(t: string) { const s = t.indexOf("{"), e = t.lastIndexOf("}"); if (s < 0 || e < 0) throw 0; return JSON.parse(t.slice(s, e + 1)); }

async function groq(prompt: string) {
  const key = process.env.GROQ_API_KEY; if (!key) throw 0;
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "llama-3.1-8b-instant", temperature: 0.7, messages: [{ role: "system", content: SYS }, { role: "user", content: prompt }] }) });
  const d = await r.json(); return d.choices?.[0]?.message?.content || "";
}
async function gemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY; if (!key) throw 0;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: SYS + "\n\n" + prompt }] }] }) });
  const d = await r.json(); return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function POST(req: Request) {
  try {
    const { goal, days, level, equipment, perSession, calories, direction } = await req.json();
    const prompt = `Goal: ${goal}
Days per week: ${days}
Experience: ${level}
Equipment: ${equipment}
Exercises per session: ${perSession}
${calories ? `User's daily calorie target: ${calories} kcal (direction: ${direction})` : "No calorie data — estimate nutrition for the goal."}`;
    let content = "";
    try { content = await groq(prompt); } catch { content = await gemini(prompt); }
    return NextResponse.json(parseJson(content));
  } catch {
    return NextResponse.json({ error: "fail" }, { status: 500 });
  }
}