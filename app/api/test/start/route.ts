import { NextResponse } from "next/server";
import { getExamById } from "@/lib/examPatterns";
import { buildQuestionPlan, generateQuestionBatch, adminClient, userClientFromRequest, distributeByWeight, type LoadedQuestion } from "@/lib/testEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { exam_id, mode = "mock", section_id, year = null } = await req.json();
    const exam = getExamById(exam_id);
    if (!exam) return NextResponse.json({ error: "Unknown exam" }, { status: 400 });

    const userClient = userClientFromRequest(req);
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return NextResponse.json({ error: "Please login to start a test" }, { status: 401 });

    const admin = adminClient();

    // ── Build plan: full exam OR single section ──
    let plan: { section: any; topic: any }[] = [];
    let totalQuestions = exam.totalQuestions;

    if (section_id) {
      const section = exam.sections.find((s) => s.id === section_id);
      if (!section) return NextResponse.json({ error: "Unknown section" }, { status: 400 });
      const dist = distributeByWeight(section.topics, section.questionCount);
      for (const { topic, count } of dist) {
        for (let i = 0; i < count; i++) plan.push({ section, topic });
      }
      for (let i = plan.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [plan[i], plan[j]] = [plan[j], plan[i]];
      }
      totalQuestions = section.questionCount;
    } else {
      plan = buildQuestionPlan(exam_id);
    }

    // ══════════════════════════════════════════════════════
    // SMART REPETITION: 90% unique + 5-10 revision repeats
    // ══════════════════════════════════════════════════════

    // Step 1: Find ALL question IDs this user has ever seen for this exam+year combo
    let pastQuery = admin.from("test_attempts").select("id").eq("user_id", userId).eq("exam_id", exam_id);
    if (year) pastQuery = pastQuery.eq("year", year);
    else pastQuery = pastQuery.is("year", null);
    if (section_id) {
      // For sectional: also check total_questions to distinguish from full mocks
      pastQuery = pastQuery.eq("total_questions", totalQuestions);
    }
    const { data: pastAttempts } = await pastQuery;
    const pastAttemptIds = (pastAttempts || []).map((a: any) => a.id);

    let seenQuestionIds: string[] = [];
    if (pastAttemptIds.length > 0) {
      const { data: pastLinks } = await admin
        .from("test_attempt_questions")
        .select("question_id")
        .in("attempt_id", pastAttemptIds);
      seenQuestionIds = [...new Set((pastLinks || []).map((l: any) => l.question_id))];
    }

    // Step 2: Pick 5-10 revision questions from seen pool (random)
    const REVISION_MIN = 5;
    const REVISION_MAX = 10;
    const revisionCount = seenQuestionIds.length > 0
      ? Math.min(
          Math.max(REVISION_MIN, Math.floor(totalQuestions * 0.08)),
          REVISION_MAX,
          seenQuestionIds.length
        )
      : 0;

    let revisionQuestions: LoadedQuestion[] = [];
    if (revisionCount > 0) {
      // Shuffle seen IDs and pick first N
      const shuffledSeen = [...seenQuestionIds].sort(() => Math.random() - 0.5);
      const revisionIds = shuffledSeen.slice(0, revisionCount);
      const { data: revQs } = await admin
        .from("questions")
        .select("*")
        .in("id", revisionIds);
      revisionQuestions = (revQs || []).map((q: any) => ({
        id: q.id,
        exam_id: q.exam_id,
        section_id: q.section_id,
        topic_id: q.topic_id,
        question_text: q.question_text,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation,
      }));
    }

    // Step 3: Generate NEW questions for remaining slots (excluding ALL seen)
    const newCount = totalQuestions - revisionQuestions.length;
    const newPlan = plan.slice(0, newCount);
    const excludeIds = new Set<string>(seenQuestionIds);
    // Also add revision IDs to exclude (already picked)
    revisionQuestions.forEach((q) => excludeIds.add(q.id));

    let newQuestions = await generateQuestionBatch(admin, exam_id, newPlan, excludeIds, 25, year);

    // Step 4: Fallback — if AI couldn't generate enough new ones, allow more repeats
    if (newQuestions.length < newCount) {
      const deficit = newCount - newQuestions.length;
      const alreadyUsed = new Set([...revisionQuestions.map((q) => q.id), ...newQuestions.map((q) => q.id)]);
      // Try generating with a fresh exclude set (only exclude what's already in this paper)
      const fallbackPlan = plan.slice(0, deficit);
      const fallback = await generateQuestionBatch(admin, exam_id, fallbackPlan, alreadyUsed, 25, year);
      newQuestions = [...newQuestions, ...fallback];
    }

    // Step 5: Combine revision + new, shuffle everything
    let allQuestions = [...revisionQuestions, ...newQuestions];
    for (let i = allQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
    }

    // Deduplicate (safety net)
    const seen = new Set<string>();
    allQuestions = allQuestions.filter((q) => {
      if (seen.has(q.id)) return false;
      seen.add(q.id);
      return true;
    });

    if (allQuestions.length === 0) {
      return NextResponse.json({ error: "Question engines are busy — please try again in a minute." }, { status: 503 });
    }

    // ── Create attempt ──
    const { data: attempt, error: attemptErr } = await admin
      .from("test_attempts")
      .insert({
        user_id: userId,
        exam_id,
        mode: year ? "pyq" : mode,
        year,
        status: "in_progress",
        total_questions: allQuestions.length,
      })
      .select()
      .single();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: "Could not create attempt", debug: attemptErr?.message }, { status: 500 });
    }

    // ── Link questions to attempt ──
    await admin.from("test_attempt_questions").insert(
      allQuestions.map((q, i) => ({ attempt_id: attempt.id, question_id: q.id, question_order: i }))
    );

    // ── Return (never leak correct_index to client) ──
    const safeQs = allQuestions.map((q, i) => ({
      id: q.id, order: i, section_id: q.section_id, topic_id: q.topic_id,
      question_text: q.question_text, options: q.options,
    }));

    return NextResponse.json({
      attempt_id: attempt.id,
      total_questions: allQuestions.length,
      questions: safeQs,
      total_generated: allQuestions.length,
      revision_count: revisionQuestions.length,
      new_count: newQuestions.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message || String(e) }, { status: 500 });
  }
}