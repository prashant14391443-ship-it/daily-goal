import { NextResponse } from "next/server";

const SYS = `You are an expert nutrition coach. Given a user's goal, daily calorie target, and last 7 days of calorie intake, provide:
1. What they're doing well (1-2 sentences)
2. What to improve (1-2 sentences)  
3. 3 specific actionable tips for next week
4. Verdict: on track / gaining too fast / losing too fast / not progressing
Keep it encouraging, specific, and based on the actual numbers. Return ONLY valid JSON:
{"good":"...","improve":"...","tips":["...","...","..."],"verdict":"on track|gaining too fast|losing too fast|not progressing"}`;

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
    const { goal, target, history } = await req.json();
    const prompt = `Goal: ${goal}
Daily target: ${target} kcal
Last 7 days calories: ${history.map((h: any) => `${h.date}: ${h.calories} kcal`).join(", ")}
Average: ${Math.round(history.reduce((s: number, h: any) => s + h.calories, 0) / history.length)} kcal`;
    let content = "";
    try { content = await groq(prompt); } catch { content = await gemini(prompt); }
    return NextResponse.json(parseJson(content));
  } catch {
    return NextResponse.json({ error: "fail" }, { status: 500 });
  }
}