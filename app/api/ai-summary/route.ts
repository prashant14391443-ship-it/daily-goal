import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { aiGate } from "@/lib/aiGate"; // 🛡 NEW

const SYS = `Return ONLY valid JSON: {"overall":"one-sentence summary","facts":["..."],"points":[{"text":"point","importance":1-5,"highlight":"red|orange|green"}]}`;
function parseJson(t: string) { const s = t.indexOf("{"), e = t.lastIndexOf("}"); if (s < 0 || e < 0) throw 0; return JSON.parse(t.slice(s, e + 1)); }

async function gemini(prompt: string, image?: string) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY; if (!key) throw 0;
  const parts: any[] = [{ text: SYS + "\n\n" + prompt }];
  if (image) { const [m, b] = image.split(","); parts.push({ inline_data: { mime_type: m.replace("data:", "").replace(";base64", ""), data: b } }); }
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts }] }) });
  const d = await r.json(); return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
async function groq(prompt: string) {
  const key = process.env.GROQ_API_KEY; if (!key) throw 0;
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "llama-3.1-8b-instant", temperature: 0.4, messages: [{ role: "system", content: SYS }, { role: "user", content: prompt }] }) });
  const d = await r.json(); return d.choices?.[0]?.message?.content || "";
}

export async function POST(req: Request) {
  try {
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

    const { tab, input, image, count } = await req.json();

    // 🔒 2. AI GATE (Dynamic weight: Vision is heavier)
    const weight = tab === "photo" ? 3 : 2;
    const gate = await aiGate(userId, "ai-summary", weight);
    if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 429 });

    const prompt = tab === "topic" ? `Teach & summarize "${input}" in exactly ${count} importance-ordered bullets + key facts.`
      : tab === "photo" ? `Read all text in this image and summarize into exactly ${count} importance-ordered bullets + key facts.`
      : `Summarize into exactly ${count} importance-ordered bullets + key facts.\n\nTEXT:\n${input}`;
      
    let content = "";
    if (tab === "photo") content = await gemini(prompt, image);
    else { try { content = await groq(prompt); } catch { content = await gemini(prompt); } }
    
    return NextResponse.json(parseJson(content));
  } catch { 
    return NextResponse.json({ error: "fail" }, { status: 500 }); 
  }
}