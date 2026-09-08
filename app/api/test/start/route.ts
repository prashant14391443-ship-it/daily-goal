import { NextResponse } from "next/server";
import { getExamById } from "@/lib/examPatterns";
import { buildQuestionPlan, generateQuestionBatch, adminClient, userClientFromRequest, distributeByWeight } from "@/lib/testEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // ✅ Vercel: allow up to 60s (default 10s was killing generation)

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

    // Build plan: full exam OR single section
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

    // ✅ Never give the exact same paper as the user's LAST attempt of this exam+year
    const seenIds = new Set<string>();
    let lastQ = admin.from("test_attempts").select("id").eq("user_id", userId).eq("exam_id", exam_id);
    lastQ = year ? lastQ.eq("year", year) : lastQ.is("year", null);
    const { data: lastAtt } = await lastQ.order("created_at", { ascending: false }).limit(1);
    if (lastAtt && lastAtt[0]) {
      const { data: links } = await admin.from("test_attempt_questions").select("question_id").eq("attempt_id", lastAtt[0].id);
      (links || []).forEach((l: any) => seenIds.add(l.question_id));
    }

    // Create attempt
    const { data: attempt, error: attemptErr } = await admin
      .from("test_attempts")
      .insert({ user_id: userId, exam_id, mode: year ? "pyq" : mode, year, status: "in_progress", total_questions: totalQuestions })
      .select()
      .single();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: "Could not create attempt", debug: attemptErr?.message }, { status: 500 });
    }

    // ✅ Generate fast: parallel batches of 25, excluding last paper's questions
    const exclude = new Set<string>(seenIds);
    let questions = await generateQuestionBatch(admin, exam_id, plan, exclude, 25, year);

    // ✅ Fallback fill: if AI failed for some slots, fill from ANY cached (even seen) so test always starts
    if (questions.length < plan.length) {
      const missing = plan.length - questions.length;
      const within = new Set<string>(questions.map((q) => q.id));
      const extra = await generateQuestionBatch(admin, exam_id, plan.slice(0, missing), within, 25, year);
      questions = [...questions, ...extra.filter((q) => !within.has(q.id))];
    }

    if (questions.length === 0) {
      await admin.from("test_attempts").delete().eq("id", attempt.id);
      return NextResponse.json({ error: "Question engines are busy — please try again in a minute." }, { status: 503 });
    }

    await admin.from("test_attempt_questions").insert(
      questions.map((q, i) => ({ attempt_id: attempt.id, question_id: q.id, question_order: i }))
    );

    const safeQs = questions.map((q, i) => ({
      id: q.id, order: i, section_id: q.section_id, topic_id: q.topic_id,
      question_text: q.question_text, options: q.options,
    }));

    return NextResponse.json({
      attempt_id: attempt.id,
      total_questions: totalQuestions,
      questions: safeQs,
      total_generated: questions.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message || String(e) }, { status: 500 });
  }
}