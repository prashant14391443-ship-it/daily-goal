import { NextResponse } from "next/server";

const SYS = `You are a world-class memory coach. Given a title and bullet points, create mnemonics that are CONCRETE, VISUAL and DIFFERENT for every topic. Return ONLY valid JSON:
{"acronym":"a pronounceable word or short code from first letters (reorder if needed so it sounds like a real word)","story":"a vivid 2-4 sentence mini-story linking ALL points in order using the actual topic words","rhyme":"a short catchy rhyme","palace":"a memory palace: assign EACH point to a specific familiar place (door, sofa, kitchen, bed...) with a vivid image of that point"}
Rules: never generic; always use the real topic words; keep each field short and memorable.`;

function parseJson(t: string) { const s = t.indexOf("{"), e = t.lastIndexOf("}"); if (s < 0 || e < 0) throw 0; return JSON.parse(t.slice(s, e + 1)); }

async function groq(prompt: string) {
  const key = process.env.GROQ_API_KEY; if (!key) throw 0;
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "llama-3.1-8b-instant", temperature: 0.8, messages: [{ role: "system", content: SYS }, { role: "user", content: prompt }] }) });
  const d = await r.json(); return d.choices?.[0]?.message?.content || "";
}
async function gemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY; if (!key) throw 0;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: SYS + "\n\n" + prompt }] }] }) });
  const d = await r.json(); return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function POST(req: Request) {
  try {
    const { title, points } = await req.json();
    const prompt = `Title: ${title}\nPoints:\n${(points || []).map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}`;
    let content = "";
    try { content = await groq(prompt); } catch { content = await gemini(prompt); }
    return NextResponse.json(parseJson(content));
  } catch {
    return NextResponse.json({ error: "fail" }, { status: 500 });
  }
}