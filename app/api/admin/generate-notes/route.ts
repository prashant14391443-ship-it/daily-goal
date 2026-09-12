import { NextResponse } from "next/server";
import { adminClient } from "@/lib/testEngine";
import { getExamById } from "@/lib/examPatterns";
import { getKeys, parseJsonResponse } from "@/lib/qGen";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type GeneratedNote = {
  concept_summary: string;
  key_formulas: string[];
  common_traps: string[];
  mnemonics: string;
};

const MODEL_CHAIN = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.7-flash"];

function avgDifficulty(rows: any[]): "easy" | "medium" | "hard" {
  if (!rows.length) return "medium";
  const score: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
  let total = 0;
  let count = 0;

  for (const r of rows) {
    const d = String(r.difficulty || "medium").toLowerCase();
    total += score[d] || 2;
    count++;
  }

  const avg = total / Math.max(1, count);
  if (avg < 1.6) return "easy";
  if (avg > 2.4) return "hard";
  return "medium";
}

function calculateImportanceScore(topicWeight: number, maxWeight: number, pyqCount: number, maxPyq: number) {
  const weightScore = maxWeight > 0 ? (topicWeight / maxWeight) * 60 : 30;
  const pyqScore = maxPyq > 0 ? (pyqCount / maxPyq) * 40 : 0;
  return Math.max(10, Math.min(100, Math.round(weightScore + pyqScore)));
}

function buildNotePrompt(params: {
  examName: string;
  sectionName: string;
  topicName: string;
  importanceScore: number;
  totalPyqCount: number;
  last5YearsCount: number;
  avgDifficulty: string;
  styleGuide?: string;
}) {
  const {
    examName,
    sectionName,
    topicName,
    importanceScore,
    totalPyqCount,
    last5YearsCount,
    avgDifficulty,
    styleGuide,
  } = params;

  return `You are an expert Indian competitive exam teacher.

Create high-quality smart study notes for this topic.

Exam: ${examName}
Section: ${sectionName}
Topic: ${topicName}

Topic data:
- Importance Score: ${importanceScore}/100
- Total PYQ Count: ${totalPyqCount}
- Last 5 Years PYQ Count: ${last5YearsCount}
- Average Difficulty: ${avgDifficulty}

${styleGuide ? `Exam Style Guide:\n${styleGuide}\n` : ""}

Return ONLY valid JSON. No markdown outside JSON.

JSON format:
{
  "concept_summary": "Write 5-8 bullet points. Focus on exam-useful concepts, definitions, patterns, and what students must remember.",
  "key_formulas": ["Formula or key fact 1", "Formula or key fact 2", "Formula or key fact 3"],
  "common_traps": ["Trap 1 that examiners use", "Trap 2 that students commonly make", "Trap 3"],
  "mnemonics": "Short memory trick or revision hack for this topic."
}

Rules:
- Keep language simple.
- Make it useful for revision.
- For Math/Physics/Chemistry, include formulas and shortcut methods.
- For GK/Polity/History/Biology, include high-yield facts.
- For Reasoning, include solving patterns and common traps.
- Do not hallucinate exact PYQ years unless given.
- concept_summary must be one string, not an array.
- key_formulas and common_traps must be arrays of strings.`;
}

async function callGeminiForNote(prompt: string, key: string): Promise<GeneratedNote> {
  const errors: string[] = [];

  for (const model of MODEL_CHAIN) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 25000);

      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.45,
              maxOutputTokens: 1800,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      clearTimeout(to);

      if (!r.ok) {
        const body = await r.text().catch(() => "");
        errors.push(`${model}: HTTP ${r.status} ${body.slice(0, 120)}`);
        if (r.status === 403) break;
        continue;
      }

      const d = await r.json();
      const raw = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!raw) {
        errors.push(`${model}: empty response`);
        continue;
      }

      const parsed = parseJsonResponse(raw);

      return {
        concept_summary: String(parsed.concept_summary || "").trim(),
        key_formulas: Array.isArray(parsed.key_formulas) ? parsed.key_formulas.map(String) : [],
        common_traps: Array.isArray(parsed.common_traps) ? parsed.common_traps.map(String) : [],
        mnemonics: String(parsed.mnemonics || "").trim(),
      };
    } catch (e: any) {
      errors.push(`${model}: ${e?.message || "network error"}`);
    }
  }

  throw new Error(errors.join(" | ") || "Gemini note generation failed");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const {
      secret,
      exam_id,
      section_id = null,
      topic_id = null,
      force = false,
      limit = 5,
    } = body;

    if (!process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { error: "ADMIN_SECRET missing in Vercel env" },
        { status: 500 }
      );
    }

    if (secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!exam_id) {
      return NextResponse.json({ error: "exam_id is required" }, { status: 400 });
    }

    const exam = getExamById(exam_id);
    if (!exam) {
      return NextResponse.json({ error: "Unknown exam_id" }, { status: 400 });
    }

    const keys = getKeys();
    if (!keys.gemini) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY missing in Vercel env" },
        { status: 500 }
      );
    }

    const admin = adminClient();

    // Build topic list from examPatterns.ts
    const allTopics = exam.sections.flatMap((section) =>
      section.topics.map((topic) => ({
        section_id: section.id,
        section_name: section.name,
        topic_id: topic.id,
        topic_name: topic.name,
        topic_weight: topic.weight,
      }))
    );

    let selectedTopics = allTopics;

    if (section_id) {
      selectedTopics = selectedTopics.filter((t) => t.section_id === section_id);
    }

    if (topic_id) {
      selectedTopics = selectedTopics.filter((t) => t.topic_id === topic_id);
    }

    if (selectedTopics.length === 0) {
      return NextResponse.json({ error: "No matching topics found" }, { status: 404 });
    }

    // Skip already generated notes unless force=true
    if (!force) {
      const { data: existingNotes } = await admin
        .from("topic_notes")
        .select("topic_id")
        .eq("exam_id", exam.id);

      const existingSet = new Set((existingNotes || []).map((n: any) => n.topic_id));
      selectedTopics = selectedTopics.filter((t) => !existingSet.has(t.topic_id));
    }

    // Limit to prevent timeout. Run repeatedly to finish full exam.
    const maxLimit = Math.min(Math.max(Number(limit) || 5, 1), 10);
    selectedTopics = selectedTopics.slice(0, maxLimit);

    if (selectedTopics.length === 0) {
      return NextResponse.json({
        status: "done",
        message: "All notes already exist. Use force=true to regenerate.",
        generated: [],
      });
    }

    // Fetch PYQs/questions for stats
    const { data: allQuestions } = await admin
      .from("questions")
      .select("topic_id, year, difficulty, source")
      .eq("exam_id", exam.id);

    const questions = allQuestions || [];
    const currentYear = new Date().getFullYear();

    const pyqByTopic = new Map<string, any[]>();
    for (const q of questions) {
      const source = String(q.source || "").toLowerCase();
      const isPyq =
        source.includes("official") ||
        source.includes("community") ||
        source.includes("pyq") ||
        !!q.year;

      if (!isPyq) continue;

      const arr = pyqByTopic.get(q.topic_id) || [];
      arr.push(q);
      pyqByTopic.set(q.topic_id, arr);
    }

    const maxWeight = Math.max(...allTopics.map((t) => t.topic_weight), 1);
    const maxPyq = Math.max(
      ...allTopics.map((t) => pyqByTopic.get(t.topic_id)?.length || 0),
      1
    );

    const generated: any[] = [];
    const failed: any[] = [];

    for (const t of selectedTopics) {
      try {
        const topicPyqs = pyqByTopic.get(t.topic_id) || [];
        const totalPyqCount = topicPyqs.length;
        const last5YearsCount = topicPyqs.filter((q) => {
          const y = Number(q.year);
          return y && y >= currentYear - 5;
        }).length;

        const difficulty = avgDifficulty(topicPyqs);
        const importanceScore = calculateImportanceScore(
          t.topic_weight,
          maxWeight,
          totalPyqCount,
          maxPyq
        );

        // Upsert stats first
        await admin.from("topic_stats").upsert(
          {
            exam_id: exam.id,
            topic_id: t.topic_id,
            total_pyq_count: totalPyqCount,
            last_5_years_count: last5YearsCount,
            avg_difficulty: difficulty,
            last_updated: new Date().toISOString(),
          },
          { onConflict: "exam_id,topic_id" }
        );

        const prompt = buildNotePrompt({
          examName: exam.name,
          sectionName: t.section_name,
          topicName: t.topic_name,
          importanceScore,
          totalPyqCount,
          last5YearsCount,
          avgDifficulty: difficulty,
          styleGuide: exam.style_guide,
        });

        const note = await callGeminiForNote(prompt, keys.gemini);

        const { data: saved, error } = await admin
          .from("topic_notes")
          .upsert(
            {
              exam_id: exam.id,
              topic_id: t.topic_id,
              topic_name: t.topic_name,
              section_name: t.section_name,
              concept_summary: note.concept_summary,
              key_formulas: note.key_formulas,
              common_traps: note.common_traps,
              mnemonics: note.mnemonics,
              importance_score: importanceScore,
              source: "ai-generated",
              last_updated: new Date().toISOString(),
            },
            { onConflict: "exam_id,topic_id" }
          )
          .select()
          .single();

        if (error) throw new Error(error.message);

        generated.push({
          topic_id: t.topic_id,
          topic_name: t.topic_name,
          section_name: t.section_name,
          importance_score: importanceScore,
          pyq_count: totalPyqCount,
          note_id: saved?.id,
        });
      } catch (e: any) {
        failed.push({
          topic_id: t.topic_id,
          topic_name: t.topic_name,
          error: e?.message || String(e),
        });
      }
    }

    // Count remaining topics without notes
    const { data: notesNow } = await admin
      .from("topic_notes")
      .select("topic_id")
      .eq("exam_id", exam.id);

    const noteSet = new Set((notesNow || []).map((n: any) => n.topic_id));
    const remaining = allTopics.filter((t) => !noteSet.has(t.topic_id)).length;

    return NextResponse.json({
      status: "success",
      exam_id: exam.id,
      exam_name: exam.name,
      generated_count: generated.length,
      failed_count: failed.length,
      remaining_without_notes: remaining,
      generated,
      failed,
      next_call_hint:
        remaining > 0
          ? "Run this endpoint again with the same exam_id to generate the next batch."
          : "All topics have notes.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server error", debug: e?.message || String(e) },
      { status: 500 }
    );
  }
}