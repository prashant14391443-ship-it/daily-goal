import { NextResponse } from "next/server";
import { adminClient, userClientFromRequest } from "@/lib/testEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_MODELS = ["gemini-3-flash-preview", "gemini-3.7-flash"];

function cleanJsonArr(raw: string) {
  let t = (raw || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const m = t.match(/\[[\s\S]*\]/);
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
  "topic": "best-matching topic name"
}

Rules:
- If the correct answer is not marked, set correct_index to -1
- Keep options exactly as printed (4 options; if fewer, pad with empty strings to 4)
- Preserve numbers, formulas and units exactly
- Skip non-MCQ questions`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    const userClient = userClientFromRequest(req);
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const admin = adminClient();
    const gKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // ACTION: Extract questions from uploaded file
    if (action === "extract") {
      const { dataUrl } = body;
      if (!gKey) return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 500 });
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

    // ACTION: Submit questions for review (community contribution)
    if (action === "submit") {
      const { exam_id, year, questions } = body;
      if (!exam_id || !Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json({ error: "Nothing to submit" }, { status: 400 });
      }

      // Insert into community_questions table (pending review)
      const rows = questions.map((q: any) => ({
        user_id: userId,
        exam_id,
        section_id: q.section_id,
        topic_id: q.topic_id,
        year: year || null,
        question_text: q.question_text,
        options: q.options,
        correct_index: Math.max(0, Number(q.correct_index) || 0),
        explanation: q.explanation || "",
        status: "pending",
        submitted_at: new Date().toISOString(),
      }));

      const { error } = await admin.from("community_questions").insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({ submitted: rows.length, message: "Questions submitted for review. You'll earn coins when approved!" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message || String(e) }, { status: 500 });
  }
}