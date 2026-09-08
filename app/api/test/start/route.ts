import { NextResponse } from "next/server";
import { getExamById } from "@/lib/examPatterns";
import { buildQuestionPlan, generateQuestionBatch, adminClient, userClientFromRequest, distributeByWeight, type LoadedQuestion } from "@/lib/testEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const TIME_BUDGET_MS = 40000; // never exceed Vercel limit

function mapRow(q: any): LoadedQuestion {
  return {
    id: q.id, exam_id: q.exam_id, section_id: q.section_id, topic_id: q.topic_id,
    question_text: q.question_text, options: q.options, correct_index: q.correct_index,
    explanation: q.explanation,
  };
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  try {
    const { exam_id, mode = "mock", section_id, year = null } = await req.json();
    const exam = getExamById(exam_id);
    if (!exam) return NextResponse.json({ error: "Unknown exam" }, { status: 400 });

    const userClient = userClientFromRequest(req);
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return NextResponse.json({ error: "Please login to start a test" }, { status: 401 });

    const admin = adminClient();

    // ── Build plan ──
    let plan: { section: any; topic: any }[] = [];
    let totalQuestions = exam.totalQuestions;
    if (section_id) {
      const section = exam.sections.find((s) => s.id === section_id);
      if (!section) return NextResponse.json({ error: "Unknown section" }, { status: 400 });
      const dist = distributeByWeight(section.topics, section.questionCount);
      for (const { topic, count } of dist) for (let i = 0; i < count; i++) plan.push({ section, topic });
      for (let i = plan.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [plan[i], plan[j]] = [plan[j], plan[i]];
      }
      totalQuestions = section.questionCount;
    } else {
      plan = buildQuestionPlan(exam_id);
    }

    // ── Seen = questions from user's LAST attempt of this exam+year (avoid immediate repeat) ──
    let lastQ = admin.from("test_attempts").select("id").eq("user_id", userId).eq("exam_id", exam_id);
    lastQ = year ? lastQ.eq("year", year) : lastQ.is("year", null);
    const { data: lastAtt } = await lastQ.order("created_at", { ascending: false }).limit(1);
    let seenIds: string[] = [];
    if (lastAtt && lastAtt[0]) {
      const { data: links } = await admin.from("test_attempt_questions").select("question_id").eq("attempt_id", lastAtt[0].id);
      seenIds = [...new Set((links || []).map((l: any) => l.question_id))];
    }

    // ── Revision picks: 5-10 random from last paper (spaced repetition) ──
    const revisionCount = Math.min(
      seenIds.length,
      Math.max(5, Math.floor(totalQuestions * 0.08)),
      10,
      Math.max(0, plan.length - 5)
    );
    let revisionQuestions: LoadedQuestion[] = [];
    if (revisionCount > 0) {
      const picks = [...seenIds].sort(() => Math.random() - 0.5).slice(0, revisionCount);
      const { data: revQs } = await admin.from("questions").select("*").in("id", picks);
      revisionQuestions = (revQs || []).map(mapRow);
    }

    // ── Generate NEW questions in safe rounds of 10 within time budget ──
    const exclude = new Set<string>([...seenIds, ...revisionQuestions.map((q) => q.id)]);
    const newSlots = plan.slice(revisionQuestions.length);
    let newQuestions: LoadedQuestion[] = [];
    while (newQuestions.length < newSlots.length && Date.now() - startedAt < TIME_BUDGET_MS) {
      const slice = newSlots.slice(newQuestions.length, newQuestions.length + 10);
      const batch = await generateQuestionBatch(admin, exam_id, slice, exclude, 10, year);
      if (batch.length === 0) break; // AI fully down → stop looping
      newQuestions.push(...batch);
    }

    // ── GUARANTEED TOP-UP from bank (older questions allowed) so paper is ALWAYS full ──
    let all = [...revisionQuestions, ...newQuestions];
    if (all.length < plan.length) {
      const paperIds = new Set(all.map((q) => q.id));
      let pq = admin.from("questions").select("*").eq("exam_id", exam_id);
      pq = year ? pq.eq("year", year) : pq.is("year", null);
      const idList = [...paperIds];
      if (idList.length > 0) pq = pq.not("id", "in", `(${idList.map((i) => `"${i}"`).join(",")})`);
      const { data: pool } = await pq.limit(400);

      const byTopic = new Map<string, any[]>();
      const globalQ: any[] = [];
      (pool || []).forEach((q) => {
        if (!byTopic.has(q.topic_id)) byTopic.set(q.topic_id, []);
        byTopic.get(q.topic_id)!.push(q);
        globalQ.push(q);
      });
      const takeFrom = (arr: any[]) => {
        while (arr.length) {
          const c = arr.shift()!;
          if (!paperIds.has(c.id)) { paperIds.add(c.id); return c; }
        }
        return null;
      };
      for (let i = all.length; i < plan.length; i++) {
        const slot = plan[i];
        let pick = takeFrom(byTopic.get(slot.topic.id) || []);
        if (!pick) pick = takeFrom(globalQ);
        if (!pick) break;
        all.push(mapRow(pick));
      }
    }

    // ── Shuffle + dedupe ──
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    const dup = new Set<string>();
    all = all.filter((q) => (dup.has(q.id) ? false : (dup.add(q.id), true)));

    if (all.length === 0) {
      return NextResponse.json({ error: "Question engines are busy — please try again in a minute." }, { status: 503 });
    }

    // ── Create attempt + link questions ──
    const { data: attempt, error: attemptErr } = await admin
      .from("test_attempts")
      .insert({ user_id: userId, exam_id, mode: year ? "pyq" : mode, year, status: "in_progress", total_questions: all.length })
      .select()
      .single();
    if (attemptErr || !attempt) {
      return NextResponse.json({ error: "Could not create attempt", debug: attemptErr?.message }, { status: 500 });
    }
    await admin.from("test_attempt_questions").insert(
      all.map((q, i) => ({ attempt_id: attempt.id, question_id: q.id, question_order: i }))
    );

    return NextResponse.json({
      attempt_id: attempt.id,
      total_questions: all.length,
      questions: all.map((q, i) => ({ id: q.id, order: i, section_id: q.section_id, topic_id: q.topic_id, question_text: q.question_text, options: q.options })),
      total_generated: all.length,
      revision_count: revisionQuestions.length,
      new_count: newQuestions.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message || String(e) }, { status: 500 });
  }
}