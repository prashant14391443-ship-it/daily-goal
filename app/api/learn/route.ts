import { NextResponse } from "next/server";
const GROQ_MODELS = ["openai/gpt-oss-20b","openai/gpt-oss-120b","meta-llama/llama-4-scout-17b-16e-instruct","meta-llama/llama-4-maverick-17b-128e-instruct"];
const GEMINI_MODELS = ["gemini-3-flash-preview","gemini-3.7-flash"];

const SYS = `You are a world-class learning coach. Build a COMPLETE, personalized "learn anything" blueprint. Adapt tone+depth to the audience (programmer / medical student / competitive-exam student / junior school kid). Use SIMPLE language.
RULES:
- NEVER invent URLs or channel names. For resources give SEARCH QUERIES the user can paste into YouTube/Google (e.g. "Python for beginners freeCodeCamp"), plus well-known FREE platforms (freeCodeCamp, Khan Academy, MDN, NCERT, TryHackMe, CS50) and at most 1-2 famous paid options.
- Give milestones (what you can DO), not just weeks.
- Give a project/practice ladder with difficulty.
- Give mistakes per level (beginner/intermediate/advanced).
Return ONLY valid JSON, EXACTLY:
{"title":"...","goal":{"meaning":"what knowing this means","time":"honest estimate","skip":["things to skip"]},
"roadmap":[{"m":"milestone","topics":"...","project":"...","checkpoint":"how you know you got it"}],
"projects":[{"name":"...","difficulty":"easy/med/hard","time":"...","learn":"..."}],
"resources":{"free":["..."],"search":["..."],"paid":["..."],"book":"..."},
"practice":[{"name":"...","what":"..."}],
"mistakes":{"beginner":["..."],"intermediate":["..."],"advanced":["..."]},
"prereq":["learn this first, then that"],
"schedule":{"oneHour":"...","twoHour":"...","weekend":"..."},
"tips":["5-7 simple tips"]}`;

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
  const prompt = `Topic: ${b.topic}
Category: ${b.category}
Current level: ${b.level}
Time per day: ${b.hours}
Goal: ${b.goal}`;
  let last = "";
  for (const m of GROQ_MODELS) { try { return NextResponse.json(parseJson(await groq(prompt, m))); } catch (e) { last = String(e); } }
  for (const m of GEMINI_MODELS) { try { return NextResponse.json(parseJson(await gemini(prompt, m))); } catch (e) { last = String(e); } }
  return NextResponse.json({ error: "AI failed: " + last }, { status: 500 });
}