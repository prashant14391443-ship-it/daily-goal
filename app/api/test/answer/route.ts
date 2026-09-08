import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminClient } from "@/lib/testEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { attempt_id, question_id, user_answer, time_taken_sec = 0 } = await req.json();

    // Auth check
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { cookie: req.headers.get("cookie") || "" } } }
    );
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const admin = adminClient();

    // Verify this attempt belongs to the user and is in progress
    const { data: attempt } = await admin
      .from("test_attempts")
      .select("id, status, exam_id")
      .eq("id", attempt_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    if (attempt.status !== "in_progress") return NextResponse.json({ error: "Test already finished" }, { status: 400 });

    // Verify this question belongs to the attempt
    const { data: link } = await admin
      .from("test_attempt_questions")
      .select("question_order")
      .eq("attempt_id", attempt_id)
      .eq("question_id", question_id)
      .maybeSingle();

    if (!link) return NextResponse.json({ error: "Question not in this test" }, { status: 400 });

    // Fetch correct_index to determine correctness
    const { data: q } = await admin
      .from("questions")
      .select("correct_index")
      .eq("id", question_id)
      .maybeSingle();

    const isCorrect = q && user_answer !== null && user_answer !== undefined && user_answer === q.correct_index;

    // Upsert the answer (user can change their answer)
    const { data: existing } = await admin
      .from("test_answers")
      .select("id")
      .eq("attempt_id", attempt_id)
      .eq("question_id", question_id)
      .maybeSingle();

    if (existing) {
      await admin.from("test_answers").update({
        user_answer,
        is_correct: isCorrect,
        time_taken_sec,
        answered_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await admin.from("test_answers").insert({
        attempt_id,
        question_id,
        question_order: link.question_order,
        user_answer,
        is_correct: isCorrect,
        time_taken_sec,
      });
    }

    // Update attempt counters
    const { data: allAnswers } = await admin
      .from("test_answers")
      .select("is_correct, user_answer")
      .eq("attempt_id", attempt_id);

    const answered = (allAnswers || []).filter((a) => a.user_answer !== null && a.user_answer !== undefined);
    const correctCount = answered.filter((a) => a.is_correct).length;

    await admin.from("test_attempts").update({
      questions_answered: answered.length,
      correct_count: correctCount,
    }).eq("id", attempt_id);

    return NextResponse.json({ ok: true, is_correct: isCorrect });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message || String(e) }, { status: 500 });
  }
}