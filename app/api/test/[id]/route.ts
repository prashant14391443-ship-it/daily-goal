import { NextResponse } from "next/server";
import { getExamById } from "@/lib/examPatterns";
import { adminClient, userClientFromRequest } from "@/lib/testEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const userClient = userClientFromRequest(req);
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const admin = adminClient();
    const { data: attempt } = await admin
      .from("test_attempts")
      .select("*, test_attempt_questions(question_id, question_order), test_answers(*)")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

    const exam = getExamById(attempt.exam_id);
    const qIds = (attempt.test_attempt_questions || []).map((l: any) => l.question_id);
    let questions: any[] = [];
    if (qIds.length > 0) {
      const { data: qs } = await admin.from("questions").select("*").in("id", qIds);
      questions = qs || [];
    }
    const qMap = new Map(questions.map((q) => [q.id, q]));

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
      attempt,
      exam: exam ? { id: exam.id, name: exam.name, totalMarks: exam.totalMarks, totalQuestions: exam.totalQuestions } : null,
      answer_sheet: answerSheet,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message || String(e) }, { status: 500 });
  }
}