import { NextResponse } from "next/server";
import { getExamById } from "@/lib/examPatterns";
import { adminClient, userClientFromRequest, fillAttemptQuestions, type PlanSlot } from "@/lib/testEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { attempt_id, budget = 9000 } = await req.json();

    const userClient = userClientFromRequest(req);
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const admin = adminClient();
    const { data: attempt } = await admin
      .from("test_attempts")
      .select("*")
      .eq("id", attempt_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    if (attempt.status === "completed") return NextResponse.json({ error: "Already finished" }, { status: 400 });

    const plan: PlanSlot[] = attempt.plan || [];
    if (plan.length === 0) {
      // Real PYQ mode: everything was loaded at start, nothing to top up
      return NextResponse.json({ have: attempt.total_questions, target: attempt.total_questions, done: true, new_questions: [] });
    }

    const exam = getExamById(attempt.exam_id);
    if (!exam) return NextResponse.json({ error: "Unknown exam" }, { status: 400 });

    const { count } = await admin
      .from("test_attempt_questions")
      .select("question_id", { count: "exact", head: true })
      .eq("attempt_id", attempt.id);
    const prevHave = count || 0;
    if (prevHave >= plan.length) {
      return NextResponse.json({ have: prevHave, target: plan.length, done: true, new_questions: [] });
    }

    // Background calls stay short so they never block or overlap badly
    const safeBudget = Math.min(Number(budget) || 9000, 15000);
    const res = await fillAttemptQuestions(admin, exam, attempt.id, plan, attempt.year, safeBudget, undefined);

    if (res.done && attempt.status !== "in_progress") {
      await admin.from("test_attempts").update({ status: "in_progress", total_questions: res.target }).eq("id", attempt.id);
    }

    // Return ONLY the newly added questions (safe: no correct_index / explanation)
    let newQs: any[] = [];
    if (res.have > prevHave) {
      const { data: links } = await admin
        .from("test_attempt_questions")
        .select("question_order, question_id")
        .eq("attempt_id", attempt.id)
        .gte("question_order", prevHave)
        .lt("question_order", res.have);
      const ids = (links || []).map((l: any) => l.question_id);
      if (ids.length > 0) {
        const { data: qs } = await admin
          .from("questions")
          .select("id, section_id, topic_id, question_type, question_text, options")
          .in("id", ids);
        const qmap = new Map((qs || []).map((q: any) => [q.id, q]));
        newQs = (links || [])
          .map((l: any) => {
            const q = qmap.get(l.question_id);
            return q
              ? {
                  id: q.id, order: l.question_order, section_id: q.section_id, topic_id: q.topic_id,
                  question_type: q.question_type || "mcq-4", question_text: q.question_text, options: q.options,
                }
              : null;
          })
          .filter(Boolean);
      }
    }

    return NextResponse.json({ have: res.have, target: res.target, done: res.done, new_questions: newQs });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message || String(e) }, { status: 500 });
  }
}