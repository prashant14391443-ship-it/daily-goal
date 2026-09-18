import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { aiGate, cachedAi } from "@/lib/aiGate"; // 🛡 NEW: Import gate & cache

const GROQ_CHAT = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
];

const GEMINI_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.7-flash",
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
];

function buildPrompt(text?: string, hasImage?: boolean) {
  return `You are an expert study assistant. Summarize ${
    hasImage ? "this photo of notes/text" : `this topic/text: "${text}"`
  } for fast memorization.

IMPORTANT — POINT COUNT RULE:
- Analyze the complexity of the content
- Simple topics: generate 5-6 points
- Medium topics: generate 7 points
- Complex topics: generate 8-10 points
- Choose the number that best matches the content depth

Reply ONLY with valid JSON. No markdown. No explanation.

Required JSON shape:
{
  "title": "short title",
  "points": ["point 1", "point 2"],
  "map": {
    "center": "main topic",
    "branches": [
      { "name": "branch name", "kids": ["tiny detail 1", "tiny detail 2"] }
    ]
  }
}

Rules:
- Title max 6 words
- Every map label under 6 words
- 4-6 branches in the map
- Each branch has 2-3 tiny details
- Points should be concise but informative
- Rank points by importance`;
}

function cleanJson(raw: string) {
  let t = (raw || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const match = t.match(/\{[\s\S]*\}/);
  if (match) t = match[0];
  return t;
}

function normalizeSummary(raw: string) {
  try {
    const parsed = JSON.parse(cleanJson(raw));

    const title = String(parsed.title || "Quick Summary").slice(0, 80);

    const points = Array.isArray(parsed.points)
      ? parsed.points
          .filter((p: unknown) => typeof p === "string" && p.trim())
          .map((p: string) => p.trim())
          .slice(0, 10)
      : [];

    const map = parsed.map || {};
    const branches = Array.isArray(map.branches)
      ? map.branches
          .filter((b: any) => b && b.name)
          .map((b: any) => ({
            name: String(b.name || "").trim().slice(0, 60),
            kids: Array.isArray(b.kids)
              ? b.kids
                  .filter((k: unknown) => typeof k === "string" && k.trim())
                  .map((k: string) => k.trim().slice(0, 80))
                  .slice(0, 3)
              : [],
          }))
          .slice(0, 6)
      : [];

    if (!points.length) return null;

    return {
      title,
      points,
      map: {
        center: String(map.center || title).trim().slice(0, 60),
        branches:
          branches.length > 0
            ? branches
            : [
                {
                  name: "Key Ideas",
                  kids: points.slice(0, 3),
                },
              ],
      },
    };
  } catch {
    return null;
  }
}

async function callGroq(prompt: string, groqKey: string) {
  const errs: string[] = [];

  for (const model of GROQ_CHAT) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1800,
          temperature: 0.5,
        }),
      });

      if (r.ok) {
        const d = await r.json();
        const raw = d.choices?.[0]?.message?.content || "";
        const parsed = normalizeSummary(raw);
        if (parsed) return { parsed, engine: model, errs };
        errs.push(`${model}: bad parse`);
      } else {
        const t = await r.text().catch(() => "");
        errs.push(`${model}: ${r.status} ${t.slice(0, 80)}`);
      }
    } catch (e: unknown) {
      errs.push(`${model}: ${e instanceof Error ? e.message : "fail"}`);
    }
  }

  return { parsed: null, engine: "", errs };
}

async function callGeminiText(prompt: string, gKey: string) {
  const errs: string[] = [];

  for (const model of GEMINI_MODELS) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 2048,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (r.ok) {
        const d = await r.json();
        const raw = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = normalizeSummary(raw);
        if (parsed) return { parsed, engine: model, errs };
        errs.push(`${model}: bad parse`);
      } else {
        const t = await r.text().catch(() => "");
        errs.push(`${model}: ${r.status} ${t.slice(0, 80)}`);
      }
    } catch (e: unknown) {
      errs.push(`${model}: ${e instanceof Error ? e.message : "fail"}`);
    }
  }

  return { parsed: null, engine: "", errs };
}

async function callGeminiImage(prompt: string, image: string, gKey: string) {
  const errs: string[] = [];

  const base64 = String(image || "").split(",")[1];
  const mime = String(image || "").split(";")[0].split(":")[1] || "image/jpeg";

  if (!base64 || base64.length < 100) {
    return { parsed: null, engine: "", errs: ["invalid image"] };
  }

  for (const model of GEMINI_MODELS) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mime, data: base64 } },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 2048,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (r.ok) {
        const d = await r.json();
        const raw = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = normalizeSummary(raw);
        if (parsed) return { parsed, engine: model, errs };
        errs.push(`${model}: bad parse`);
      } else {
        const t = await r.text().catch(() => "");
        errs.push(`${model}: ${r.status} ${t.slice(0, 80)}`);
      }
    } catch (e: unknown) {
      errs.push(`${model}: ${e instanceof Error ? e.message : "fail"}`);
    }
  }

  return { parsed: null, engine: "", errs };
}

export async function POST(req: Request) {
  try {
    const { text, image } = await req.json();

    // 🔒 1. AUTHENTICATE USER (Crucial: previously this route had no auth!)
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

    // 🔒 2. AI GATE (Weight 3: Summaries are heavy operations)
    const gate = await aiGate(userId, "summarize", 3);
    if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 429 });

    const groqKey = process.env.GROQ_API_KEY;
    const gKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!groqKey && !gKey) {
      return NextResponse.json({ error: "API keys not configured." }, { status: 500 });
    }

    if (!text && !image) {
      return NextResponse.json({ error: "Give a topic or a photo." }, { status: 400 });
    }

    // 🔒 3. CACHE WRAPPER (Identical requests from any user = $0 cost)
    const cacheKey = `sum:${String(text || "").slice(0, 200)}:${image ? String(image).length : 0}`;

    const result = await cachedAi(cacheKey, async () => {
      const prompt = buildPrompt(text, Boolean(image));
      const errs: string[] = [];

      if (image && gKey) {
        const geminiImage = await callGeminiImage(prompt, image, gKey);
        errs.push(...geminiImage.errs);
        if (geminiImage.parsed) return { ...geminiImage.parsed, engine: geminiImage.engine };
      }

      if (text && groqKey) {
        const groq = await callGroq(buildPrompt(text, false), groqKey);
        errs.push(...groq.errs);
        if (groq.parsed) return { ...groq.parsed, engine: groq.engine };
      }

      if (text && gKey) {
        const geminiText = await callGeminiText(buildPrompt(text, false), gKey);
        errs.push(...geminiText.errs);
        if (geminiText.parsed) return { ...geminiText.parsed, engine: geminiText.engine };
      }

      // Throwing an error prevents cachedAi from saving the failure to the database
      throw new Error(
        image && !text
          ? "Could not read this photo. Try a clearer image or type the topic too."
          : "All AI engines are resting. Try again in a minute!"
      );
    }, 24); // Cache successful summaries for 24 hours

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error. Try again.";
    const status = msg.includes("engines are resting") || msg.includes("Could not read") ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}