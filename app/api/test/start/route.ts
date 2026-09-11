import { NextResponse } from "next/server";
import { getExamById } from "@/lib/examPatterns";
import { buildQuestionPlan, adminClient, userClientFromRequest, distributeByWeight, fillAttemptQuestions, type PlanSlot } from "@/lib/testEngine";
// 🔥 FIX #3: getLastGenError import REMOVED (global state is gone)

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// 🔥 FIX #3: safe time budget.
// Vercel FREE (Hobby) kills functions at ~10s → keep default 8000.
// On Vercel Pro / Railway / Render / local: set GEN_BUDGET_MS=45000 in env for fuller papers.
const BUDGET_MS = Math.min(Number(process.env.GEN_BUDGET_MS || 8000), 50000);

export async function POST(req: Request) {
  try {
    const { exam_id, section_id = null, year = null, source = "ai" } = await req.json();
    const exam = getExamById(exam_id);
    if (!exam) return NextResponse.json({ error: "Unknown exam" }, { status: 400 });

    const userClient = userClientFromRequest(req);
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return NextResponse.json({ error: "Please login to start a test" }, { status: 401 });

    const admin = adminClient();
    const isReal = source === "real";
    const mode = isReal ? "pyq-real" : year ? "pyq" : "mock";

    // ==========================================
    // 🔥 FIX #3 (BONUS): REAL PYQ MODE — was broken before!
    // Old code passed an EMPTY plan for real mode → have=0 → always 503.
    // Now we load the real questions straight from the DB.
    // ==========================================
    if (isReal) {
      const { data: realQs } = await admin
        .from("questions")
        .select("id")
        .eq("exam_id", exam.id)
        .eq("year", year)
        .in("source", ["official", "community"])
        .order("section_id", { ascending: true })
        .order("id", { ascending: true });

      const ids = (realQs || []).map((r: any) => r.id);
      if (ids.length === 0) {
        return NextResponse.json({
          error: `No real ${year} questions in the database yet. Upload a paper via the Admin Seeder first.`,
        }, { status: 404 });
      }

      const { data: attempt, error } = await admin.from("test_attempts").insert({
        user_id: userId, exam_id, mode, year,
        status: "in_progress",
        total_questions: ids.length,
        plan: [],
      }).select().single();
      if (error || !attempt) return NextResponse.json({ error: "Could not create attempt", debug: error?.message }, { status: 500 });

      const { error: linkErr } = await admin.from("test_attempt_questions").insert(
        ids.map((id: string, i: number) => ({ attempt_id: attempt.id, question_id: id, question_order: i }))
      );
      if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });

      return NextResponse.json({ attempt_id: attempt.id, have: ids.length, target: ids.length, done: true });
    }

    // ==========================================
    // AI MODE: build the plan
    // ==========================================
    let planObjs: { section: any; topic: any }[] = [];
    if (section_id) {
      const section = exam.sections.find((s) => s.id === section_id);
      if (!section) return NextResponse.json({ error: "Unknown section" }, { status: 400 });
      const dist = distributeByWeight(section.topics, section.questionCount);
      for (const { topic, count } of dist) for (let i = 0; i < count; i++) planObjs.push({ section, topic });
      for (let i = planObjs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [planObjs[i], planObjs[j]] = [planObjs[j], planObjs[i]]; }
    } else {
      planObjs = buildQuestionPlan(exam_id);
    }
    const planSlots: PlanSlot[] = planObjs.map((p) => ({ section_id: p.section.id, topic_id: p.topic.id }));

    // Seen-exclusion: avoid repeating last attempt's questions
    let seenIds: string[] = [];
    let lastQ = admin.from("test_attempts").select("id").eq("user_id", userId).eq("exam_id", exam_id);
    lastQ = year ? lastQ.eq("year", year) : lastQ.is("year", null);
    const { data: lastAtt } = await lastQ.order("created_at", { ascending: false }).limit(1);
    if (lastAtt && lastAtt[0]) {
      const { data: links } = await admin.from("test_attempt_questions").select("question_id").eq("attempt_id", lastAtt[0].id);
      seenIds = [...new Set((links || []).map((l: any) => l.question_id))];
    }

    // Auto-cleanup: cap 50 completed attempts per user
    const { data: oldRows } = await admin.from("test_attempts").select("id").eq("user_id", userId).eq("status", "completed").order("created_at", { ascending: false }).range(50, 200);
    if (oldRows && oldRows.length > 0) await admin.from("test_attempts").delete().in("id", oldRows.map((r: any) => r.id));

    // Create attempt shell
    const { data: attempt, error } = await admin.from("test_attempts").insert({
      user_id: userId, exam_id, mode, year,
      status: "preparing",
      total_questions: planSlots.length,
      plan: planSlots,
    }).select().single();
    if (error || !attempt) return NextResponse.json({ error: "Could not create attempt", debug: error?.message }, { status: 500 });

    // Fill it (DB cache first, AI only for missing slots)
    const res = await fillAttemptQuestions(admin, exam, attempt.id, planSlots, year, BUDGET_MS, new Set(seenIds));

    if (res.have > 0) {
      await admin.from("test_attempts").update({ status: "in_progress", total_questions: res.have }).eq("id", attempt.id);
    } else {
      await admin.from("test_attempts").delete().eq("id", attempt.id);
      // 🔥 FIX #3: show the REAL reason (model 404 / bad key / DB column missing / quota)
      return NextResponse.json({
        error: `Generation failed: ${res.error || "no questions available (empty DB and AI unreachable)"}`,
      }, { status: 503 });
    }

    return NextResponse.json({ attempt_id: attempt.id, have: res.have, target: res.target, done: res.done });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message || String(e) }, { status: 500 });
  }
}