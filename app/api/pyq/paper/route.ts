import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { EXAMS } from "@/lib/subjectTree";
import { buildPrompt, generateQuestion } from "@/lib/pyqGen";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const exam: string = body.exam;
    const year: number = body.year;
    const batch: number = body.batch ?? 5;
    const excludeIds: string[] = body.excludeIds ?? [];

    const tree = EXAMS.find((e) => e.id === exam);
    if (!tree || !year) {
      return NextResponse.json({ error: "Unknown exam/year" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Build subject+topic pool, shuffle for variety
    const pool: { subject: string; topic: string }[] = [];
    tree.subjects.forEach((s) => s.topics.forEach((t) => pool.push({ subject: s.name, topic: t })));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const used = new Set<string>(excludeIds);
    const slots = pool.slice(0, Math.min(batch, pool.length));
    const keys = {
      groq: process.env.GROQ_API_KEY,
      gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    };

    const results = await Promise.all(
      slots.map(async (pick) => {
        let q = supabaseAdmin
          .from("pyq_questions")
          .select("*")
          .eq("exam", exam)
          .eq("subject", pick.subject)
          .eq("topic", pick.topic)
          .eq("year", year);

        if (used.size > 0) {
          q = q.not("id", "in", `(${[...used].join(",")})`);
        }

        const { data } = await q.limit(5);
        if (data && data.length > 0) {
          return data[Math.floor(Math.random() * data.length)];
        }

        const gen = await generateQuestion(
          buildPrompt(exam, pick.subject, pick.topic, "medium", year),
          keys
        );
        if (!gen) return null;

        const { data: saved, error } = await supabaseAdmin
          .from("pyq_questions")
          .insert({
            exam,
            subject: pick.subject,
            topic: pick.topic,
            difficulty: "medium",
            question: gen.parsed.question,
            options: gen.parsed.options,
            correct: gen.parsed.correct,
            explanation: gen.parsed.explanation || "",
            year,
            source: "ai-generated",
          })
          .select()
          .single();

        return error ? null : saved;
      })
    );

    const out: any[] = [];
    results.forEach((r) => {
      if (r && !used.has(r.id)) {
        out.push(r);
        used.add(r.id);
      }
    });

    return NextResponse.json({ questions: out });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server error", debug: e?.message || String(e) },
      { status: 500 }
    );
  }
}