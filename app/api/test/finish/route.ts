import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getExamById } from "@/lib/examPatterns";
import { adminClient, computeAnalytics } from "@/lib/testEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { attempt_id } = await req.json();

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { cookie: req.headers.get("cookie") || "" } } }
    );
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const admin = adminClient();

    const { data: attempt } = await admin
      .from("test_attempts")
      .select("*, test_attempt_questions(question_id, question_order), test_answers(*)")
      .eq("id", attempt_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

    const exam = getExamById(attempt.exam_id);
    if (!exam) return NextResponse.json({ error: "Unknown exam" }, { status: 400 });

    // Fetch all questions in this attempt
    const qIds = (attempt.test_attempt_questions || []).map((l: any) => l.question_id);
    let questions: any[] = [];
    if (qIds.length > 0) {
      const { data: qs } = await admin
        .from("questions")
        .select("*")
        .in("id", qIds);
      questions = qs || [];
    }

    // Compute analytics
    const analytics = computeAnalytics(
      (attempt.test_answers || []).map((a: any) => ({
        question_id: a.question_id,
        user_answer: a.user_answer,
        is_correct: a.is_correct,
      })),
      questions,
      exam.negativeMarking,
      2 // marks per question for SSC CGL
    );

    const timeTaken = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000);

    // Update attempt with final stats
    const { data: updated } = await admin
      .from("test_attempts")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        time_taken_sec: timeTaken,
        correct_count: analytics.correct,
        wrong_count: analytics.wrong,
        skipped_count: analytics.skipped,
        questions_answered: analytics.attempted,
        raw_score: analytics.raw_score,
        negative_marks: analytics.negative_marks,
        final_score: analytics.final_score,
        accuracy: analytics.accuracy,
        weak_topics: analytics.weak_topics,
        strong_topics: analytics.strong_topics,
      })
      .eq("id", attempt_id)
      .select()
      .single();

    // Build section-wise breakdown
    const sectionStats: Record<string, { name: string; correct: number; wrong: number; skipped: number; total: number }> = {};
    for (const s of exam.sections) {
      sectionStats[s.id] = { name: s.shortName, correct: 0, wrong: 0, skipped: 0, total: s.questionCount };
    }
    const qMap = new Map(questions.map((q) => [q.id, q]));
    for (const a of attempt.test_answers || []) {
      const q = qMap.get(a.question_id);
      if (!q || !sectionStats[q.section_id]) continue;
      if (a.user_answer === null || a.user_answer === undefined) sectionStats[q.section_id].skipped += 1;
      else if (a.is_correct) sectionStats[q.section_id].correct += 1;
      else sectionStats[q.section_id].wrong += 1;
    }

    // Build full answer sheet (with correct answers now revealed)
    const answerSheet = (attempt.test_attempt_questions || [])
      .sort((a: any, b: any) => a.question_order - b.question_order)
      .map((link: any) => {
        const q = qMap.get(link.question_id);
        const ans = (attempt.test_answers || []).find((a: any) => a.question_id === link.question_id);
        if (!q) return null;
        return {
          order: link.question_order,
          question_id: q.id,
          section_id: q.section_id,
          topic_id: q.topic_id,
          question_text: q.question_text,
          options: q.options,
          correct_index: q.correct_index,
          explanation: q.explanation,
          user_answer: ans?.user_answer ?? null,
          is_correct: ans?.is_correct ?? false,
          time_taken_sec: ans?.time_taken_sec ?? 0,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      attempt: updated,
      exam: {
        id: exam.id,
        name: exam.name,
        totalMarks: exam.totalMarks,
        totalQuestions: exam.totalQuestions,
        durationMin: exam.durationMin,
        negativeMarking: exam.negativeMarking,
      },
      analytics: {
        ...analytics,
        time_taken_sec: timeTaken,
        sections: sectionStats,
      },
      answer_sheet: answerSheet,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message || String(e) }, { status: 500 });
  }
}