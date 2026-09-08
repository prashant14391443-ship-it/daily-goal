import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getExamById } from "@/lib/examPatterns";
import { buildQuestionPlan, generateQuestionBatch, adminClient } from "@/lib/testEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { exam_id, mode = "mock" } = await req.json();
    const exam = getExamById(exam_id);
    if (!exam) return NextResponse.json({ error: "Unknown exam" }, { status: 400 });

    // 1. Auth — user must be logged in (session comes via cookies)
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { cookie: req.headers.get("cookie") || "" } } }
    );
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return NextResponse.json({ error: "Please login to start a test" }, { status: 401 });

    // 2. Create the attempt record
    const admin = adminClient();
    const { data: attempt, error: attemptErr } = await admin
      .from("test_attempts")
      .insert({
        user_id: userId,
        exam_id,
        mode,
        status: "in_progress",
        total_questions: exam.totalQuestions,
      })
      .select()
      .single();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: "Could not create attempt", debug: attemptErr?.message }, { status: 500 });
    }

    // 3. Build question plan (respects topic weights)
    const plan = buildQuestionPlan(exam_id);

    // 4. Generate first batch (all questions upfront for SSC — 100 Qs parallelized in groups of 10 ≈ 10s)
    const usedIds = new Set<string>();
    const questions = await generateQuestionBatch(admin, exam_id, plan, usedIds, 10);

    // 5. Link questions to attempt with order
    if (questions.length > 0) {
      const rows = questions.map((q, i) => ({
        attempt_id: attempt.id,
        question_id: q.id,
        question_order: i,
      }));
      await admin.from("test_attempt_questions").insert(rows);
    }

    // 6. Strip correct_index from client payload (never leak answers!)
    const safeQs = questions.map((q, i) => ({
      id: q.id,
      order: i,
      section_id: q.section_id,
      topic_id: q.topic_id,
      question_text: q.question_text,
      options: q.options,
    }));

    return NextResponse.json({
      attempt_id: attempt.id,
      exam: {
        id: exam.id,
        name: exam.name,
        totalQuestions: exam.totalQuestions,
        totalMarks: exam.totalMarks,
        durationMin: exam.durationMin,
        negativeMarking: exam.negativeMarking,
        sections: exam.sections.map((s) => ({
          id: s.id,
          name: s.name,
          shortName: s.shortName,
          questionCount: s.questionCount,
          color: s.color,
        })),
      },
      questions: safeQs,
      total_generated: questions.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message || String(e) }, { status: 500 });
  }
}