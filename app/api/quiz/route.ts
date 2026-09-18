import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { aiGate } from "@/lib/aiGate"; // 🛡 NEW

// Increase body size limit for base64 image uploads (Next.js default is 1MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

// ✅ RESTORED YOUR EXACT MODELS
const GROQ_CHAT = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
];
const GEMINI_MODELS = ["gemini-3-flash-preview", "gemini-3.7-flash"];

function extractQuestions(raw: string): any[] | null {
  try {
    let text = (raw || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (match) text = match[0];
    const arr = JSON.parse(text);
    if (Array.isArray(arr) && arr.length > 0 && arr[0].q && Array.isArray(arr[0].options)) {
      return arr
        .filter((x: any) => x.q && Array.isArray(x.options))
        .map((x: any) => ({
          q: String(x.q),
          options: x.options.map(String).slice(0, 6),
          answer: Math.min(Math.max(0, Number(x.answer) || 0), (x.options?.length || 4) - 1),
          explain: String(x.explain || ""),
        }));
    }
    return null;
  } catch {
    return null;
  }
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

    const body = await req.json();
    const { mode = "topic", topic, text, image, count = 5 } = body;
    
    const groqKey = process.env.GROQ_API_KEY;
    const gKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!groqKey && !gKey) {
      return NextResponse.json({ error: "API keys not configured." }, { status: 500 });
    }

    // 1. Validate based on mode
    if (mode === "topic" && !topic?.trim()) {
      return NextResponse.json({ error: "Please enter a topic." }, { status: 400 });
    }
    if (mode === "text" && !text?.trim()) {
      return NextResponse.json({ error: "Please paste some text." }, { status: 400 });
    }
    if (mode === "photo" && !image) {
      return NextResponse.json({ error: "Please provide an image." }, { status: 400 });
    }

    const numQuestions = Math.min(10, Math.max(1, Number(count) || 5));

    // 🔒 2. AI GATE (Vision is heavier: weight 3 per 3 questions. Text is weight 2 per 5 questions)
    const weight = mode === "photo" ? Math.ceil(numQuestions / 3) * 3 : Math.ceil(numQuestions / 5) * 2;
    const gate = await aiGate(userId, "quiz", weight);
    if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 429 });

    // 2. Build dynamic prompt based on mode
    let promptText = "";
    if (mode === "topic") {
      promptText = `You are an expert teacher. Create ${numQuestions} high-quality multiple-choice questions about "${topic}".
Reply ONLY with a valid JSON array (no markdown, no extra text):
[{"q":"question text","options":["A","B","C","D"],"answer":0,"explain":"one line why correct"}]
"answer" is the index (0-3) of the correct option.`;
    } else if (mode === "text") {
      promptText = `You are an expert teacher. Create ${numQuestions} multiple-choice questions based STRICTLY on the following text. Do not use outside knowledge.
Reply ONLY with a valid JSON array (no markdown, no extra text):
[{"q":"question text","options":["A","B","C","D"],"answer":0,"explain":"one line why correct"}]
"answer" is the index (0-3) of the correct option.

TEXT:
${text}`;
    } else if (mode === "photo") {
      promptText = `You are an expert teacher. Analyze the provided image (which contains study notes, a textbook page, or handwritten text) and create ${numQuestions} multiple-choice questions based STRICTLY on its visible content.
Reply ONLY with a valid JSON array (no markdown, no extra text):
[{"q":"question text","options":["A","B","C","D"],"answer":0,"explain":"one line why correct"}]
"answer" is the index (0-3) of the correct option.`;
    }

    const errs: string[] = [];

    // 3️⃣ GROQ FIRST
    if (groqKey) {
      for (const model of GROQ_CHAT) {
        try {
          const messageContent = (mode === "photo" && image)
            ? [
                { type: "text", text: promptText },
                { type: "image_url", image_url: { url: image } }
              ]
            : promptText;

          const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: messageContent }],
              max_tokens: 2048,
              temperature: 0.7,
            }),
          });

          if (r.ok) {
            const d = await r.json();
            const parsed = extractQuestions(d.choices?.[0]?.message?.content || "");
            if (parsed) return NextResponse.json({ questions: parsed, engine: model });
            errs.push(`${model}: bad parse`);
          } else {
            const t = await r.text().catch(() => "");
            errs.push(`${model}: ${r.status} ${t.slice(0, 80)}`);
          }
        } catch (e: unknown) {
          errs.push(`${model}: ${e instanceof Error ? e.message : "fail"}`);
        }
      }
    } else {
      errs.push("groq: NO KEY");
    }

    // 4️⃣ GEMINI FALLBACK
    if (gKey) {
      for (const model of GEMINI_MODELS) {
        try {
          const parts: any[] = [{ text: promptText }];
          
          if (mode === "photo" && image) {
            const match = image.match(/^data:(image\/[a-zA-Z0-9.+]+);base64,(.*)$/);
            if (match) {
              parts.push({
                inlineData: {
                  mimeType: match[1],
                  data: match[2],
                },
              });
            }
          }

          const r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
              }),
            }
          );

          if (r.ok) {
            const d = await r.json();
            const parsed = extractQuestions(d.candidates?.[0]?.content?.parts?.[0]?.text || "");
            if (parsed) return NextResponse.json({ questions: parsed, engine: model });
            errs.push(`${model}: bad parse`);
          } else {
            const t = await r.text().catch(() => "");
            errs.push(`${model}: ${r.status} ${t.slice(0, 80)}`);
          }
        } catch (e: unknown) {
          errs.push(`${model}: ${e instanceof Error ? e.message : "fail"}`);
        }
      }
    } else {
      errs.push("gemini: NO KEY");
    }

    return NextResponse.json(
      { error: "All AI engines failed to generate questions. Try a different input or try again.", debug: errs },
      { status: 503 }
    );
  } catch (err) {
    console.error("Quiz API Error:", err);
    return NextResponse.json({ error: "Server error. Try again." }, { status: 500 });
  }
}