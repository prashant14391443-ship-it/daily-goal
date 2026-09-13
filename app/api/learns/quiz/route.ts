import { NextResponse } from "next/server";
import { LOCAL_QUIZ } from "@/lib/localQuizBank";
import { cheapGenerate } from "@/lib/aiBudget";
import { getTrackById } from "@/lib/learningTracks";

export const dynamic = "force-dynamic";

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

    const track = getTrackById(track_id);
    const milestone = track?.milestones.find((m) => m.id === milestone_id);
    if (!milestone) return NextResponse.json({ error: "Unknown milestone" }, { status: 400 });

    // LAYER 1: ZERO COST - Local Bank
    const localQs = shuffle(LOCAL_QUIZ[milestone_id] || []).slice(0, 5).map((q) => ({ ...q, source: "local" }));

    if (localQs.length > 0) {
      return NextResponse.json({ milestone: milestone.title, questions: localQs, source: "local" });
    }

    // LAYER 2: CHEAP AI FALLBACK (Only if local bank is empty)
    // FIX: Changed aiQuizTopics to aiCoachPrompts
    const prompt = `Create 5 multiple-choice questions (4 options each) for: ${milestone.title}. Topics: ${milestone.aiCoachPrompts.join(", ")}. 
    Reply ONLY JSON: {"questions":[{"q":"...","options":["a","b","c","d"],"correct":0,"explain":"..."}]}`;

    const gen = await cheapGenerate({ task: "quiz", prompt, cacheKey: `quiz:${track_id}:${milestone_id}` });
    
    if (gen) {
      try {
        const parsed = JSON.parse(gen.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        const aiQs = (parsed.questions || []).slice(0, 5).map((q: any) => ({ ...q, source: "ai" }));
        return NextResponse.json({ milestone: milestone.title, questions: aiQs, source: "ai" });
      } catch {}
    }

    return NextResponse.json({ milestone: milestone.title, questions: [], source: "none" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}