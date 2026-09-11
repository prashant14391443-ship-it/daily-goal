import { NextResponse } from "next/server";
import { adminClient, userClientFromRequest } from "@/lib/testEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { attempt_id, question_id, user_answer, time_taken_sec = 0 } = await req.json();

    const userClient = userClientFromRequest(req);
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const admin = adminClient();

    const { data: attempt } = await admin
      .from("test_attempts").select("id, status, exam_id")
      .eq("id", attempt_id).eq("user_id", userId).maybeSingle();

    if (!attempt || attempt.status === "completed") {
      return NextResponse.json({ error: "Invalid or finished attempt" }, { status: 400 });
    }

    const { data: link } = await admin
      .from("test_attempt_questions").select("question_order")
      .eq("attempt_id", attempt_id).eq("question_id", question_id).maybeSingle();
    if (!link) return NextResponse.json({ error: "Question not in this test" }, { status: 400 });

    // 🔥 NEW: Fetch full answer data to validate polymorphic questions
    const { data: q } = await admin
      .from("questions").select("question_type, correct_index, correct_value")
      .eq("id", question_id).maybeSingle();

    let isCorrect = false;
    if (q && user_answer !== null && user_answer !== undefined) {
      if (q.question_type === "nvt") {
        // Text/Numerical comparison
        isCorrect = String(user_answer).trim().toLowerCase() === String(q.correct_value).trim().toLowerCase();
      } else {
        // Standard MCQ comparison
        isCorrect = Number(user_answer) === q.correct_index;
      }
    }

    const { data: existing } = await admin
      .from("test_answers").select("id")
      .eq("attempt_id", attempt_id).eq("question_id", question_id).maybeSingle();

    if (existing) {
      await admin.from("test_answers").update({
        user_answer: String(user_answer),
        is_correct: isCorrect,
        time_taken_sec,
        answered_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await admin.from("test_answers").insert({
        attempt_id, question_id, question_order: link.question_order,
        user_answer: String(user_answer),
        is_correct: isCorrect, time_taken_sec,
      });
    }

    const { data: allAnswers } = await admin.from("test_answers").select("is_correct, user_answer").eq("attempt_id", attempt_id);
    const answered = (allAnswers || []).filter((a) => a.user_answer !== null && a.user_answer !== undefined && a.user_answer !== "null");
    const correctCount = answered.filter((a) => a.is_correct).length;

    await admin.from("test_attempts").update({
      questions_answered: answered.length,
      correct_count: correctCount,
    }).eq("id", attempt_id);

    // 🔥 SECURITY FIX: Do not leak isCorrect state back to the user!
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message || String(e) }, { status: 500 });
  }
}