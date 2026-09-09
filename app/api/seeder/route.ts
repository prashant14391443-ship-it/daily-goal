import { NextResponse } from "next/server";
import { adminClient, userClientFromRequest } from "@/lib/testEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_MODELS = ["gemini-3-flash-preview", "gemini-3.7-flash"];

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

const EXTRACT_PROMPT = `You are an exam paper digitizer. Extract EVERY multiple-choice question visible in this document.

Return ONLY a valid JSON array. No markdown. Each item:
{
  "question_text": "full question text",
  "options": ["A", "B", "C", "D"],
  "correct_index": 0,
  "explanation": "1-sentence reason (or empty string if unknown)",
  "topic": "best-matching topic name (e.g. 'Trigonometry', 'Indian Polity & Constitution', 'Idioms & Phrases')"
}

Rules:
- If the correct answer is not marked in the paper, set correct_index to -1
- Keep options exactly as printed (4 options; if fewer, pad with empty strings to 4)
- Preserve numbers, formulas and units exactly
- Skip non-MCQ questions`;

const ANALYZE_PROMPT = `You are an exam pattern analyst. Analyze this exam paper and extract its unique characteristics.

Return ONLY valid JSON. No markdown.

{
  "difficulty_mix": { "easy": 35, "medium": 45, "hard": 20 },
  "topic_distribution": { "Geometry": 8, "Current Affairs": 12, "Coding-Decoding": 2 },
  "style_notes": ["More data interpretation", "Longer passages", "Complex calculations"],
  "avg_question_length": 45,
  "trap_patterns": ["close options", "unit conversion tricks"],
  "time_pressure": "medium"
}

Analyze:
- difficulty_mix: percentage of easy/medium/hard questions (must sum to 100)
- topic_distribution: count of questions per topic
- style_notes: 3-5 bullet points about what makes this year's paper unique
- avg_question_length: average words per question (estimate)
- trap_patterns: common tricks used in wrong options
- time_pressure: "low" / "medium" / "high" (based on question complexity and length)`;

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

    if (action === "extract") {
      const { dataUrl } = body;
      if (!gKey) return NextResponse.json({ error: "GEMINI_API_KEY missing in Vercel env" }, { status: 500 });
      const base64 = String(dataUrl || "").split(",")[1];
      const mime = String(dataUrl || "").split(";")[0].split(":")[1] || "application/pdf";
      if (!base64 || base64.length < 100) return NextResponse.json({ error: "Invalid file" }, { status: 400 });

      let questions: any[] = [];
      let lastErr = "";
      for (const model of GEMINI_MODELS) {
        try {
          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: EXTRACT_PROMPT }, { inline_data: { mime_type: mime, data: base64 } }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 8192, responseMimeType: "application/json" },
            }),
          });
          if (!r.ok) { lastErr = `${model}: ${r.status}`; continue; }
          const d = await r.json();
          const raw = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const parsed = JSON.parse(cleanJsonArr(raw));
          if (Array.isArray(parsed) && parsed.length > 0) {
            questions = parsed
              .filter((q: any) => q && typeof q.question_text === "string" && Array.isArray(q.options))
              .map((q: any) => ({
                question_text: q.question_text,
                options: [q.options[0] || "", q.options[1] || "", q.options[2] || "", q.options[3] || ""],
                correct_index: typeof q.correct_index === "number" ? q.correct_index : -1,
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

      // Save questions
      const rows = questions.map((q: any) => ({
        exam_id,
        section_id: q.section_id,
        topic_id: q.topic_id,
        year: year || null,
        difficulty: q.difficulty || "medium",
        question_text: q.question_text,
        options: q.options,
        correct_index: Math.max(0, Number(q.correct_index) || 0),
        explanation: q.explanation || "",
        source: "official",
      }));
      const { error } = await admin.from("questions").insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Analyze patterns
      let patterns = null;
      if (gKey && questions.length > 10) {
        const questionsText = questions.map((q: any, i: number) => 
          `Q${i+1}: ${q.question_text}\nOptions: ${q.options.join(", ")}\nCorrect: ${String.fromCharCode(65 + q.correct_index)}`
        ).join("\n\n");

        for (const model of GEMINI_MODELS) {
          try {
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `${ANALYZE_PROMPT}\n\nPaper content:\n${questionsText}` }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 2048, responseMimeType: "application/json" },
              }),
            });
            if (!r.ok) continue;
            const d = await r.json();
            const raw = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
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

      // Store patterns
      if (patterns && year) {
        await admin.from("year_patterns").upsert({
          exam_id,
          year,
          ...patterns,
          updated_at: new Date().toISOString(),
        }, { onConflict: "exam_id,year" });
      }

      return NextResponse.json({ 
        saved: rows.length, 
        patterns_analyzed: !!patterns,
        message: patterns 
          ? `Saved ${rows.length} questions + analyzed ${year} patterns!`
          : `Saved ${rows.length} questions (pattern analysis skipped).`
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message || String(e) }, { status: 500 });
  }
}