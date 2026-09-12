import { NextResponse } from "next/server";
import { getExamById, type ExamSection, type ExamTopic } from "@/lib/examPatterns";
import { adminClient, userClientFromRequest } from "@/lib/testEngine";
import { getKeys, parseJsonResponse } from "@/lib/qGen";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function isAdmin(email?: string) {
  const list = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

const NOTE_PROMPT = (examName: string, sectionName: string, topicName: string) => `You are an expert tutor for the ${examName} examination.
Generate a concise, high-yield study cheat sheet for the topic: "${topicName}" in the section "${sectionName}".

Reply ONLY with valid JSON. No markdown. No preamble.
{
  "concept_summary": "- Bullet 1\\n- Bullet 2\\n- Bullet 3",
  "key_formulas": ["Formula 1", "Formula 2"],
  "common_traps": ["Trap 1: ...", "Trap 2: ..."],
  "mnemonics": "A short memory trick or acronym"
}

Rules:
- concept_summary must be 3 to 4 crisp bullet points starting with "- ".
- key_formulas should be an array of strings. Leave empty array [] if not applicable (e.g., GK/English).
- common_traps must highlight 2 specific ways examiners trick students in this topic.
- mnemonics should be a catchy phrase or acronym. Leave empty string "" if none.`;

async function generateOneNote(
  admin: any, examId: string, section: ExamSection, topic: ExamTopic,
  examName: string, keys: { gemini?: string }
) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${keys.gemini}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: NOTE_PROMPT(examName, section.name, topic.name) }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 1024, responseMimeType: "application/json" },
      }),
    }
  );
  if (!r.ok) throw new Error(`Gemini HTTP ${r.status}`);
  const d = await r.json();
  const raw = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const parsed = parseJsonResponse(raw);
  if (!parsed.concept_summary || !Array.isArray(parsed.key_formulas) || !Array.isArray(parsed.common_traps)) {
    throw new Error("Invalid note shape");
  }
  const { error } = await admin.from("topic_notes").upsert(
    {
      exam_id: examId, topic_id: topic.id, topic_name: topic.name, section_name: section.name,
      concept_summary: parsed.concept_summary, key_formulas: parsed.key_formulas,
      common_traps: parsed.common_traps, mnemonics: parsed.mnemonics || "",
      importance_score: Math.min(100, topic.weight * 20),
      source: "ai-generated", last_updated: new Date().toISOString(),
    },
    { onConflict: "exam_id,topic_id" }
  );
  if (error) throw new Error(`DB: ${error.message}`);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { exam_id, section_id = null, topic_id = null, force_overwrite = false, secret } = body;

    // 🔐 Auth: logged-in admin email OR admin secret
    const userClient = userClientFromRequest(req);
    const { data: userData } = await userClient.auth.getUser();
    const okAuth = isAdmin(userData.user?.email) || (!!process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET);
    if (!okAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const exam = getExamById(exam_id);
    if (!exam) return NextResponse.json({ error: "Unknown exam" }, { status: 400 });
    const keys = getKeys();
    if (!keys.gemini) return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 500 });

    const admin = adminClient();

    // Build job list: single topic → single section → whole exam
    let jobs: { section: ExamSection; topic: ExamTopic }[] = [];
    if (topic_id) {
      for (const s of exam.sections) {
        const t = s.topics.find((tp) => tp.id === topic_id);
        if (t) { jobs.push({ section: s, topic: t }); break; }
      }
      if (jobs.length === 0) return NextResponse.json({ error: "Unknown topic" }, { status: 400 });
    } else if (section_id) {
      const s = exam.sections.find((x) => x.id === section_id);
      if (!s) return NextResponse.json({ error: "Unknown section" }, { status: 400 });
      jobs = s.topics.map((t) => ({ section: s, topic: t }));
    } else {
      for (const s of exam.sections) for (const t of s.topics) jobs.push({ section: s, topic: t });
    }

    // Skip topics that already have notes (unless force_overwrite)
    if (!force_overwrite) {
      const { data: existing } = await admin.from("topic_notes").select("topic_id").eq("exam_id", exam.id);
      const have = new Set((existing || []).map((e: any) => e.topic_id));
      jobs = jobs.filter((j) => !have.has(j.topic.id));
    }

    let generated = 0, failed = 0;
    const errors: string[] = [];
    const deadline = Date.now() + 45000; // 🔥 stop before server timeout; run again to continue

    for (const j of jobs) {
      if (Date.now() > deadline) break;
      try {
        await generateOneNote(admin, exam.id, j.section, j.topic, exam.name, keys);
        generated++;
      } catch (e: any) {
        failed++;
        errors.push(`${j.topic.name}: ${e?.message}`);
      }
    }

    const { count } = await admin.from("topic_notes").select("topic_id", { count: "exact", head: true }).eq("exam_id", exam.id);
    const totalTopics = exam.sections.reduce((n, s) => n + s.topics.length, 0);
    const remaining = totalTopics - (count || 0);

    return NextResponse.json({
      generated, failed, notes_now: count || 0, total_topics: totalTopics, remaining,
      errors: errors.slice(0, 5),
      message: remaining > 0 ? `Generated ${generated}. ${remaining} remaining — run again to continue.` : `All ${count} notes ready!`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message }, { status: 500 });
  }
}