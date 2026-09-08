import { NextResponse } from "next/server";
import { getExamById } from "@/lib/examPatterns";
import { adminClient, userClientFromRequest } from "@/lib/testEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { attempt_id } = await req.json();

    const userClient = userClientFromRequest(req);
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

    // Fetch questions
    const qIds = (attempt.test_attempt_questions || []).map((l: any) => l.question_id);
    let questions: any[] = [];
    if (qIds.length > 0) {
      const { data: qs } = await admin.from("questions").select("*").in("id", qIds);
      questions = qs || [];
    }
    const qMap = new Map(questions.map((q) => [q.id, q]));

    // Build answer sheet (single source of truth)
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

    // ── Compute ALL stats from the answer sheet ──
    let correct = 0, wrong = 0, skipped = 0;
    const sectionStats: Record<string, { name: string; correct: number; wrong: number; skipped: number; total: number }> = {};
    for (const s of exam.sections) {
      sectionStats[s.id] = { name: s.shortName, correct: 0, wrong: 0, skipped: 0, total: s.questionCount };
    }
    const topicStats: Record<string, { total: number; correct: number }> = {};

    for (const q of answerSheet as any[]) {
      if (sectionStats[q.section_id]) {
        if (q.user_answer === null) sectionStats[q.section_id].skipped += 1;
        else if (q.is_correct) sectionStats[q.section_id].correct += 1;
        else sectionStats[q.section_id].wrong += 1;
      }
      if (!topicStats[q.topic_id]) topicStats[q.topic_id] = { total: 0, correct: 0 };
      topicStats[q.topic_id].total += 1;

      if (q.user_answer === null) skipped += 1;
      else if (q.is_correct) { correct += 1; topicStats[q.topic_id].correct += 1; }
      else wrong += 1;
    }

       // Paper not fully loaded? Attribute missing slots as skipped per stored plan
    const planSlots: any[] = attempt.plan || [];
    if (planSlots.length > answerSheet.length) {
      for (let i = answerSheet.length; i < planSlots.length; i++) {
        const sid = planSlots[i].section_id;
        if (sectionStats[sid]) sectionStats[sid].skipped += 1;
        skipped += 1;
      }
    }

    const marksPerQ = 2;
    const rawScore = correct * marksPerQ;
    const negMarks = wrong * exam.negativeMarking;
    const finalScore = rawScore - negMarks;
    const attempted = correct + wrong;
    const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;
    const timeTaken = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000);

    // Weak: <50% with ≥1 question • Strong: ≥75% with ≥2 questions
    const weak: { topic_id: string; accuracy: number; total: number }[] = [];
    const strong: { topic_id: string; accuracy: number; total: number }[] = [];
    for (const [tid, s] of Object.entries(topicStats)) {
      const acc = (s.correct / s.total) * 100;
      if (s.total >= 1 && acc < 50) weak.push({ topic_id: tid, accuracy: acc, total: s.total });
      else if (s.total >= 2 && acc >= 75) strong.push({ topic_id: tid, accuracy: acc, total: s.total });
    }
    weak.sort((a, b) => a.accuracy - b.accuracy);
    strong.sort((a, b) => b.accuracy - a.accuracy);

    // Save final stats
    const { data: updated } = await admin
      .from("test_attempts")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        time_taken_sec: timeTaken,
        correct_count: correct,
        wrong_count: wrong,
        skipped_count: skipped,
        questions_answered: attempted,
        raw_score: rawScore,
        negative_marks: negMarks,
        final_score: finalScore,
        accuracy,
        weak_topics: weak.slice(0, 6),
        strong_topics: strong.slice(0, 6),
      })
      .eq("id", attempt_id)
      .select()
      .single();

    return NextResponse.json({
      attempt: updated,
      exam: {
        id: exam.id, name: exam.name, totalMarks: exam.totalMarks,
        totalQuestions: exam.totalQuestions, durationMin: exam.durationMin, negativeMarking: exam.negativeMarking,
      },
      analytics: {
        correct, wrong, skipped, attempted,
        raw_score: rawScore, negative_marks: negMarks, final_score: finalScore, accuracy,
        weak_topics: weak.slice(0, 6), strong_topics: strong.slice(0, 6),
        time_taken_sec: timeTaken,
        sections: sectionStats,
      },
      answer_sheet: answerSheet,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message || String(e) }, { status: 500 });
  }
}