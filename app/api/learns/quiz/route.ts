import { NextResponse } from "next/server";
import { adminClient, userClientFromRequest } from "@/lib/testEngine";
import { LOCAL_QUIZ } from "@/lib/localQuizBank";
import { cheapGenerate } from "@/lib/aiBudget";
import { getTrackById } from "@/lib/learningTracks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const track_id = searchParams.get("track_id") || "web-dev";
    const milestone_id = searchParams.get("milestone_id") || "";
    const want_ai = searchParams.get("ai") === "1";

    const track = getTrackById(track_id);
    const milestone = track?.milestones.find((m) => m.id === milestone_id);
    if (!milestone) return NextResponse.json({ error: "Unknown milestone" }, { status: 400 });

    // LAYER 1 — ZERO COST: our own curated bank first
    const local = shuffle(LOCAL_QUIZ[milestone_id] || [])
      .slice(0, 6)
      .map((q) => ({ ...q, source: "local" }));

    let aiQs: any[] = [];
    if (want_ai) {
      const admin = adminClient();

      // LAYER 2 — ZERO COST: reuse previously generated quiz (shared by ALL users)
      const { data: bank } = await admin
        .from("quiz_bank").select("questions")
        .eq("track_id", track_id).eq("milestone_id", milestone_id)
        .maybeSingle();

      if (bank?.questions) {
        aiQs = (bank.questions as any[]).map((q) => ({ ...q, source: "ai-cached" }));
      } else {
        // LAYER 3+4 — CHEAP AI, generated ONCE ever, then cached in DB + Redis
        const userClient = userClientFromRequest(req);
        const { data: ud } = await userClient.auth.getUser();
        const uid = ud.user?.id || undefined;

        const prompt = `Create 5 multiple-choice questions (4 options each) for a coding student finishing this milestone:
Milestone: ${milestone.title}
Focus topics: ${milestone.aiQuizTopics.join(", ")}
Language: simple Hinglish-friendly English.
Reply ONLY JSON: {"questions":[{"q":"...","options":["a","b","c","d"],"correct":0,"explain":"one line"}]}`;

        const gen = await cheapGenerate({
          task: "quiz",
          prompt,
          userId: uid,
          cacheKey: `quiz:${track_id}:${milestone_id}`,
        });

        if (gen) {
          try {
            const cleaned = gen.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const parsed = JSON.parse(cleaned);
            const qs = (parsed.questions || []).slice(0, 5);
            if (qs.length) {
              aiQs = qs.map((q: any) => ({ ...q, source: "ai" }));
              await admin.from("quiz_bank").upsert(
                { track_id, milestone_id, questions: qs, source: "ai" },
                { onConflict: "track_id,milestone_id,source" }
              );
            }
          } catch {}
        }
      }
    }

    return NextResponse.json({
      milestone: milestone.title,
      questions: [...local, ...aiQs.slice(0, 2)],
      local_count: local.length,
      ai_count: aiQs.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}