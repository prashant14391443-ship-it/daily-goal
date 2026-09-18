import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { aiGate } from "@/lib/aiGate"; // 🛡 NEW
import { cheapGenerate, getCached, setCache } from "@/lib/aiBudget";
import { getTrackById } from "@/lib/learningTracks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseGithub(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com\/([^\/\?#]+)\/([^\/\?#]+)/i);
  return m ? { owner: m[1], repo: m[2] } : null;
}

export async function POST(req: Request) {
  try {
    // 🔒 1. AUTHENTICATE USER
    const jwt = (req.headers.get("authorization") || "").replace("Bearer ", "");
    let userId = "anon-ip-" + (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    if (jwt) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      );
      const { data } = await supabase.auth.getUser(jwt);
      if (data.user) {
        userId = data.user.id;
        // 🔒 OPTION A — GUEST WALL: heavy AI needs a free real account
        if (data.user.is_anonymous) {
          return NextResponse.json(
            { error: "🔒 Guest preview is for exploring only — sign up free (10 seconds) to unlock this AI feature!" },
            { status: 403 }
          );
        }
      }
    }

    const { track_id, milestone_id, project_url } = await req.json();
    const track = getTrackById(track_id);
    const milestone = track?.milestones.find((m) => m.id === milestone_id);
    if (!milestone || !project_url) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    // LAYER 1 — ZERO COST: rule-based signals (free GitHub API, no AI)
    const gh = parseGithub(project_url);
    let signals: any = { url_type: gh ? "github" : "other", files: 0, has_readme: false, language: null };
    if (gh) {
      const meta = await fetch(`https://api.github.com/repos/${gh.owner}/${gh.repo}`)
        .then((r) => (r.ok ? r.json() : null)).catch(() => null);
      const contents = await fetch(`https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/`)
        .then((r) => (r.ok ? r.json() : null)).catch(() => null);
      signals.language = meta?.language || null;
      signals.description = meta?.description || "";
      signals.files = Array.isArray(contents) ? contents.length : 0;
      signals.has_readme = Array.isArray(contents) && contents.some((f: any) => /^readme/i.test(f.name || ""));
    }

    // Instant rule-based feedback (always returned, even if AI fails)
    const ruleChecks = [
      { check: "Project link submitted", ok: true },
      { check: "GitHub repo detected", ok: !!gh },
      { check: "README present", ok: !!signals.has_readme },
      { check: "Repo has 3+ files", ok: signals.files >= 3 },
    ];

    // LAYER 2 — CACHE: same repo URL reviewed before? free repeat (Does NOT trigger AI Gate)
    const cacheKey = `review:${project_url.toLowerCase()}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ review: JSON.parse(cached), signals, rule_checks: ruleChecks, source: "cache" });
    }

    // 🔒 3. AI GATE (Only triggers if we actually need to call AI. Code review is heavy, weight 3)
    const gate = await aiGate(userId, "coach", 3);
    if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 429 });

    // LAYER 3 — CHEAP AI (700 token cap), only once per repo URL
    const prompt = `You are a senior developer reviewing a student project.
Milestone: ${milestone.title}
Acceptance criteria: ${milestone.project.acceptanceCriteria.join(" | ")}
Repo signals: language=${signals.language || "unknown"}, files=${signals.files}, hasREADME=${signals.has_readme}, description="${signals.description || ""}"
Reply ONLY JSON: {"score":70,"strengths":["..."],"fixes":["..."],"next_step":"..."}
Max 3 strengths, 3 fixes, each under 12 words.`;

    const gen = await cheapGenerate({ task: "review", prompt, cacheKey });
    if (!gen) {
      return NextResponse.json({
        review: {
          score: ruleChecks.filter((c) => c.ok).length * 25,
          strengths: ["Project submitted on time"],
          fixes: signals.has_readme ? [] : ["Add a README with setup steps"],
          next_step: "Keep building — detailed AI review unavailable right now.",
        },
        signals, rule_checks: ruleChecks, source: "rules-only",
      });
    }

    try {
      const review = JSON.parse(gen.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      return NextResponse.json({ review, signals, rule_checks: ruleChecks, source: gen.source });
    } catch {
      return NextResponse.json({ error: "Bad review format" }, { status: 502 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}