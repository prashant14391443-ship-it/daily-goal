import { NextResponse } from "next/server";
import { aiGate } from "@/lib/aiGate";
import { getExamById } from "@/lib/examPatterns";
import { 
  buildQuestionPlan, 
  adminClient, 
  userClientFromRequest, 
  distributeByWeight, 
  quickFill, 
  paperKey, 
  type PlanSlot, 
  type LoadedQuestion 
} from "@/lib/testEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const QUICK_TARGET = 8;

export async function POST(req: Request) {
  try {
    const { exam_id, section_id = null, topic_id = null, year = null, source = "ai" } = await req.json();
    const exam = getExamById(exam_id);
    if (!exam) return NextResponse.json({ error: "Unknown exam" }, { status: 400 });

    const userClient = userClientFromRequest(req);
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return NextResponse.json({ error: "Please login to start a test" }, { status: 401 });

    // 🔒 GUEST WALL: AI generation needs a free account. Real DB papers stay open as a teaser.
    if (userData.user?.is_anonymous && source !== "real") {
      return NextResponse.json(
        { error: "🔒 Guests can preview real previous-year papers only — sign up free (10 seconds) to unlock AI Mock Tests, Pattern Papers & Topic Practice!" },
        { status: 403 }
      );
    }

    // 🔒 AI GATE — weight based on expected question count
    let expectedQs = QUICK_TARGET; 
    if (topic_id) expectedQs = 10;
    else if (section_id) {
      const section = exam.sections.find((s) => s.id === section_id);
      expectedQs = section?.questionCount || QUICK_TARGET;
    } else {
      expectedQs = 100; 
    }
    const weight = Math.max(1, Math.ceil(expectedQs / 10));
    
    if (source !== "real") {
      const gate = await aiGate(userId, "test", weight);
      if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 429 });
    }

    const admin = adminClient();
    const isReal = source === "real";
    const mode = isReal ? "pyq-real" : year ? "pyq" : "mock";

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
        return NextResponse.json({ error: `No real ${year} questions in the database yet. Upload a paper via the Admin Seeder first.` }, { status: 404 });
      }

      const { data: attempt, error } = await admin.from("test_attempts").insert({
        user_id: userId, exam_id, mode, year,
        status: "in_progress",
        total_questions: ids.length,
        plan: [],
      }).select().single();
      if (error || !attempt) return NextResponse.json({ error: "Could not create attempt", debug: error?.message }, { status: 500 });

      const uniqueIds = Array.from(new Set(ids));
      const { error: linkErr } = await admin.from("test_attempt_questions").insert(
        uniqueIds.map((id: string, i: number) => ({ attempt_id: attempt.id, question_id: id, question_order: i }))
      );
      if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });

      return NextResponse.json({ attempt_id: attempt.id, have: uniqueIds.length, target: uniqueIds.length, done: true });
    }

    // ==========================================
    // AI MODE: build the full plan
    // ==========================================
    let planObjs: { section: any; topic: any }[] = [];
    if (topic_id) {
      for (const s of exam.sections) {
        const t = s.topics.find((tp) => tp.id === topic_id);
        if (t) {
          for (let i = 0; i < 10; i++) planObjs.push({ section: s, topic: t });
          break;
        }
      }
      if (planObjs.length === 0) return NextResponse.json({ error: "Unknown topic" }, { status: 400 });
    } else if (section_id) {
      const section = exam.sections.find((s) => s.id === section_id);
      if (!section) return NextResponse.json({ error: "Unknown section" }, { status: 400 });
      const dist = distributeByWeight(section.topics, section.questionCount);
      for (const { topic, count } of dist) for (let i = 0; i < count; i++) planObjs.push({ section, topic });
      for (let i = planObjs.length - 1; i > 0; i--) { 
        const j = Math.floor(Math.random() * (i + 1)); 
        [planObjs[i], planObjs[j]] = [planObjs[j], planObjs[i]]; 
      }
    } else {
      planObjs = buildQuestionPlan(exam_id);
    }
    
    const planSlots: PlanSlot[] = planObjs.map((p) => ({ section_id: p.section.id, topic_id: p.topic.id }));

    // 🆕 SHARED VARIANT POOL
    const scope = topic_id ? "topic" : section_id ? "section" : year ? "pyq" : "mock";
    const scopeId = topic_id || section_id || "-";
    const pk = paperKey(exam_id, scope, scopeId, year);
    
    // Count how many times THIS user has attempted this specific syllabus slice
    const { count: prevCount } = await admin
      .from("test_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("paper_key", pk);
      
    const variant = (prevCount || 0) + 1;

    // Claim this paper batch (upsert prevents race condition crashes)
    await admin.from("paper_variants").upsert({
      exam_id, scope, scope_id: scopeId, year, variant,
      paper_key: pk, status: "generating", total: planSlots.length,
    }, { onConflict: "paper_key,variant" });

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
      paper_key: pk,
      variant,
      scope,
      scope_id: scopeId,
    }).select().single();
    if (error || !attempt) return NextResponse.json({ error: "Could not create attempt", debug: error?.message }, { status: 500 });

    // QUICK START
    const quickSlots = planSlots.slice(0, Math.min(QUICK_TARGET, planSlots.length));
    const restSlots = planSlots.slice(quickSlots.length);

    const { results, firstError } = await quickFill(admin, exam, quickSlots, new Set(seenIds), year, 8000, 4, pk, variant);

    const rawOkPairs = results.filter((r) => r.q !== null) as { slot: PlanSlot; q: LoadedQuestion }[];
    const failedSlots = results.filter((r) => r.q === null).map((r) => r.slot);

    const usedQIds = new Set<string>();
    const okPairs: { slot: PlanSlot; q: LoadedQuestion }[] = [];
    
    for (const pair of rawOkPairs) {
      if (usedQIds.has(pair.q.id)) {
        failedSlots.push(pair.slot);
      } else {
        usedQIds.add(pair.q.id);
        okPairs.push(pair);
      }
    }

    if (okPairs.length === 0) {
      await admin.from("test_attempts").delete().eq("id", attempt.id);
      return NextResponse.json({ error: `Could not prepare the first questions: ${firstError || "unknown error"}` }, { status: 503 });
    }

    const newPlan: PlanSlot[] = [...okPairs.map((p) => p.slot), ...restSlots, ...failedSlots];

    const { error: linkErr } = await admin.from("test_attempt_questions").insert(
      okPairs.map((p, i) => ({ attempt_id: attempt.id, question_id: p.q.id, question_order: i }))
    );
    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });

    await admin.from("test_attempts").update({
      status: "in_progress",
      total_questions: planSlots.length,
      plan: newPlan,
    }).eq("id", attempt.id);

    // If the whole paper finished instantly, mark it ready for everyone
    if (okPairs.length >= planSlots.length) {
      await admin.from("paper_variants").update({ status: "ready", total: okPairs.length }).eq("paper_key", pk).eq("variant", variant);
    }

    return NextResponse.json({ attempt_id: attempt.id, have: okPairs.length, target: planSlots.length, done: okPairs.length >= planSlots.length });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message || String(e) }, { status: 500 });
  }
}