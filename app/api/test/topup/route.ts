import { NextResponse } from "next/server";
import { getExamById } from "@/lib/examPatterns";
import { adminClient, userClientFromRequest, fillAttemptQuestions, type PlanSlot } from "@/lib/testEngine";

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
      .select("*")
      .eq("id", attempt_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    if (attempt.status === "completed") return NextResponse.json({ error: "Already finished" }, { status: 400 });

    const exam = getExamById(attempt.exam_id);
    if (!exam) return NextResponse.json({ error: "Unknown exam" }, { status: 400 });
    const plan: PlanSlot[] = attempt.plan || [];
    if (plan.length === 0) return NextResponse.json({ error: "No plan stored" }, { status: 400 });

    const res = await fillAttemptQuestions(admin, exam, attempt.id, plan, attempt.year, 35000);
    if (res.done) await admin.from("test_attempts").update({ status: "in_progress" }).eq("id", attempt.id);

    return NextResponse.json({ have: res.have, target: res.target, done: res.done });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message || String(e) }, { status: 500 });
  }
}