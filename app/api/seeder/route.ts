import { NextResponse } from "next/server";
import { adminClient, userClientFromRequest } from "@/lib/testEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function isAdmin(email?: string) {
  const list = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

function cleanJsonArr(raw: string) {
  let t = (raw || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const m = t.match(/\[[\s\S]*\]/);
  if (m) t = m[0];
  return t;
}

function cleanJsonObj(raw: string) {
  let t = (raw || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const m = t.match(/\{[\s\S]*\}/);
  if (m) t = m[0];
  return t;
}

let modelCache: { models: string[]; at: number } | null = null;
async function discoverGeminiModels(key: string): Promise<string[]> {
  if (modelCache && Date.now() - modelCache.at < 30 * 60 * 1000) return modelCache.models;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=200`);
    if (r.ok) {
      const d = await r.json();
      const all = (d.models || [])
        .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m: any) => (m.name || "").replace("models/", ""))
        .filter((n: string) => n && !/embedding|tts|imagen|aqa|safeguard|guard|veo/i.test(n));
      const flashStable = all.filter((n: string) => n.includes("flash") && !n.includes("preview") && !n.includes("lite"));
      const flashPrev = all.filter((n: string) => n.includes("flash") && n.includes("preview"));
      const pro = all.filter((n: string) => n.includes("pro"));
      const models = [...flashStable, ...flashPrev, ...pro].slice(0, 5);
      if (models.length > 0) { modelCache = { models, at: Date.now() }; return models; }
    }
  } catch {}
  return ["gemini-2.5-flash", "gemini-2.0-flash"]; 
}

// 🔥 UPDATED: Tells AI to look for 4 OR 5 options, or numerical inputs
const EXTRACT_PROMPT = `You are an exam paper digitizer. Extract EVERY multiple-choice or numerical question visible in this document.

Return ONLY a valid JSON array. No markdown. Each item:
{
  "question_type": "mcq-4", // use "mcq-4", "mcq-5", or "nvt" (for numerical/text input)
  "question_text": "full question text",
  "options": ["A", "B", "C", "D", "E"], // Extract all printed options. Empty array if NVT.
  "correct_index": 0, // 0-based index. Use -1 if unknown or NVT.
  "correct_value": "42.5", // Only use if NVT. Otherwise null.
  "explanation": "1-sentence reason (or empty string)",
  "topic": "best-matching topic name"
}

Rules:
- If the correct answer is not marked, set correct_index to -1
- Keep options exactly as printed. Do not limit to 4 if 5 are present.
- Preserve numbers, formulas and units exactly
- Skip non-question text`;

const ANALYZE_PROMPT = `You are an exam pattern analyst. Analyze this exam paper and extract its unique characteristics.

Return ONLY valid JSON. No markdown.

{
  "difficulty_mix": { "easy": 35, "medium": 45, "hard": 20 },
  "topic_distribution": { "Geometry": 8, "Current Affairs": 12 },
  "style_notes": ["More data interpretation", "Longer passages"],
  "avg_question_length": 45,
  "trap_patterns": ["close options", "unit conversion tricks"],
  "time_pressure": "medium"
}

difficulty_mix must sum to 100. style_notes: 3-5 bullets. time_pressure: low/medium/high.`;

async function callGemini(key: string, model: string, prompt: string, image?: { mime: string; base64: string }) {
  const parts: any[] = [{ text: prompt }];
  if (image) parts.push({ inline_data: { mime_type: image.mime, data: image.base64 } });
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.25, maxOutputTokens: 8192, responseMimeType: "application/json" },
    }),
  });
  if (!r.ok) throw new Error(`${model}: HTTP ${r.status}`);
  const d = await r.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    const userClient = userClientFromRequest(req);
    const { data: userData } = await userClient.auth.getUser();
    const email = userData.user?.email;

    if (action === "ping") return NextResponse.json({ admin: isAdmin(email) });
    if (!isAdmin(email)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const admin = adminClient();
    const gKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!gKey) return NextResponse.json({ error: "GEMINI_API_KEY missing in Vercel env" }, { status: 500 });

    if (action === "extract") {
      const { dataUrl } = body;
      const base64 = String(dataUrl || "").split(",")[1];
      const mime = String(dataUrl || "").split(";")[0].split(":")[1] || "application/pdf";
      if (!base64 || base64.length < 100) return NextResponse.json({ error: "Invalid file" }, { status: 400 });

      const models = await discoverGeminiModels(gKey);
      let questions: any[] = [];
      let lastErr = "";

      for (const model of models) {
        try {
          const raw = await callGemini(gKey, model, EXTRACT_PROMPT, { mime, base64 });
          const parsed = JSON.parse(cleanJsonArr(raw));
          if (Array.isArray(parsed) && parsed.length > 0) {
            questions = parsed
              .filter((q: any) => q && typeof q.question_text === "string")
              .map((q: any) => ({
                // 🔥 UPDATED: Dynamic parsing for options and polymorphic types
                question_type: q.question_type || (Array.isArray(q.options) && q.options.length === 5 ? "mcq-5" : "mcq-4"),
                question_text: q.question_text,
                options: Array.isArray(q.options) ? q.options.filter(Boolean) : [],
                correct_index: typeof q.correct_index === "number" ? q.correct_index : -1,
                correct_value: q.correct_value || null,
                explanation: q.explanation || "",
                topic: q.topic || "",
              }));
            break;
          }
          lastErr = `${model}: empty parse`;
        } catch (e: any) { lastErr = e?.message || "fail"; }
      }
      if (questions.length === 0) return NextResponse.json({ error: `Extraction failed: ${lastErr}` }, { status: 503 });
      return NextResponse.json({ questions });
    }

    if (action === "save") {
      const { exam_id, year, questions } = body;
      if (!exam_id || !Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
      }

      const rows = questions.map((q: any) => ({
        exam_id,
        section_id: q.section_id,
        topic_id: q.topic_id,
        year: year || null,
        difficulty: q.difficulty || "medium",
        // 🔥 UPDATED: Saving the polymorphic fields safely to Supabase
        question_type: q.question_type || "mcq-4",
        question_text: q.question_text,
        options: q.options || [],
        correct_index: typeof q.correct_index === "number" && q.correct_index >= 0 ? q.correct_index : null,
        correct_value: q.correct_value || null,
        explanation: q.explanation || "",
        source: "official",
      }));
      
      const { error } = await admin.from("questions").insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      let patterns = null;
      if (questions.length > 10) {
        const questionsText = questions.map((q: any, i: number) =>
          `Q${i+1}: ${q.question_text}\nOptions: ${(q.options||[]).join(", ")}\nCorrect Index: ${q.correct_index}`
        ).join("\n\n");

        const models = await discoverGeminiModels(gKey);
        for (const model of models) {
          try {
            const raw = await callGemini(gKey, model, `${ANALYZE_PROMPT}\n\nPaper content:\n${questionsText}`);
            const parsed = JSON.parse(cleanJsonObj(raw));
            if (parsed && parsed.difficulty_mix && parsed.topic_distribution) {
              patterns = {
                difficulty_mix: parsed.difficulty_mix,
                topic_distribution: parsed.topic_distribution,
                style_notes: parsed.style_notes || [],
                avg_question_length: parsed.avg_question_length || 40,
                trap_patterns: parsed.trap_patterns || [],
                time_pressure: parsed.time_pressure || "medium",
              };
              break;
            }
          } catch {}
        }
      }

      if (patterns && year) {
        await admin.from("year_patterns").upsert({
          exam_id, year, ...patterns, updated_at: new Date().toISOString(),
        }, { onConflict: "exam_id,year" });
      }

      return NextResponse.json({
        saved: rows.length,
        patterns_analyzed: !!patterns,
        message: patterns
          ? `Saved ${rows.length} questions + analyzed ${year} patterns!`
          : `Saved ${rows.length} questions (pattern analysis skipped).`,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message || String(e) }, { status: 500 });
  }
}