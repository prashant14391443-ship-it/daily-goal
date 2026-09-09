import { NextResponse } from "next/server";
import { adminClient, userClientFromRequest } from "@/lib/testEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAdmin(email?: string) {
  const list = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, question_ids, reject_reason } = body;

    const userClient = userClientFromRequest(req);
    const { data: userData } = await userClient.auth.getUser();
    if (!isAdmin(userData.user?.email)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const admin = adminClient();

    if (action === "approve") {
      if (!Array.isArray(question_ids) || question_ids.length === 0) {
        return NextResponse.json({ error: "No questions selected" }, { status: 400 });
      }

      // Fetch pending questions
      const { data: pending } = await admin
        .from("community_questions")
        .select("*")
        .in("id", question_ids)
        .eq("status", "pending");

      if (!pending || pending.length === 0) {
        return NextResponse.json({ error: "No pending questions found" }, { status: 404 });
      }

      // Insert into main questions bank
      const rows = pending.map((q: any) => ({
        exam_id: q.exam_id,
        section_id: q.section_id,
        topic_id: q.topic_id,
        year: q.year,
        difficulty: "medium",
        question_text: q.question_text,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation,
        source: "community",
        contributor_id: q.user_id,
      }));

      const { error } = await admin.from("questions").insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Update status to approved
      await admin.from("community_questions").update({ status: "approved", reviewed_at: new Date().toISOString() }).in("id", question_ids);

      // Award coins to contributors (10 coins per approved question)
      const userIds = [...new Set(pending.map((q: any) => q.user_id))];
      for (const uid of userIds) {
        const count = pending.filter((q: any) => q.user_id === uid).length;

        const { data: profileData, error: profileError } = await admin
          .from("profiles")
          .select("coins")
          .eq("id", uid)
          .maybeSingle();

        if (profileError) {
          return NextResponse.json({ error: profileError.message }, { status: 500 });
        }

        const currentCoins = profileData?.coins ?? 0;
        const { error: updateError } = await admin
          .from("profiles")
          .update({ coins: currentCoins + count * 10 })
          .eq("id", uid);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
      }

      return NextResponse.json({ approved: pending.length, coins_awarded: pending.length * 10 });
    }

    if (action === "reject") {
      if (!Array.isArray(question_ids) || question_ids.length === 0) {
        return NextResponse.json({ error: "No questions selected" }, { status: 400 });
      }

      await admin.from("community_questions").update({ 
        status: "rejected", 
        reviewed_at: new Date().toISOString(),
        reject_reason: reject_reason || ""
      }).in("id", question_ids);

      return NextResponse.json({ rejected: question_ids.length });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", debug: e?.message || String(e) }, { status: 500 });
  }
}