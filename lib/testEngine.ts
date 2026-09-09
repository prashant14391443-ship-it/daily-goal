import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getExamById, type ExamSection, type ExamTopic } from "@/lib/examPatterns";
import { buildQuestionPrompt, generateOneQuestion, getKeys } from "@/lib/qGen";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type LoadedQuestion = {
  id: string;
  exam_id: string;
  section_id: string;
  topic_id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
};

export type PlanSlot = { section_id: string; topic_id: string };

export type YearPatterns = {
  difficulty_mix: { easy?: number; medium?: number; hard?: number };
  topic_distribution: Record<string, number>;
  style_notes: string[];
  avg_question_length: number;
  trap_patterns: string[];
  time_pressure: string;
};

// ─────────────────────────────────────────────
// Clients
// ─────────────────────────────────────────────

export function adminClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export function userClientFromRequest(req: Request) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: req.headers.get("authorization") || "" } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

// ─────────────────────────────────────────────
// Year patterns (cached per process to avoid repeated queries)
// ─────────────────────────────────────────────

const patternCache = new Map<string, YearPatterns | null>();

async function getYearPatterns(
  admin: SupabaseClient,
  examId: string,
  year: number | null
): Promise<YearPatterns | null> {
  if (!year) return null;
  const key = `${examId}:${year}`;
  if (patternCache.has(key)) return patternCache.get(key) || null;
  const { data } = await admin
    .from("year_patterns")
    .select("*")
    .eq("exam_id", examId)
    .eq("year", year)
    .maybeSingle();
  const patterns = data
    ? {
        difficulty_mix: data.difficulty_mix || {},
        topic_distribution: data.topic_distribution || {},
        style_notes: data.style_notes || [],
        avg_question_length: data.avg_question_length || 40,
        trap_patterns: data.trap_patterns || [],
        time_pressure: data.time_pressure || "medium",
      }
    : null;
  patternCache.set(key, patterns);
  return patterns;
}

// Pick a difficulty per question using the year's real difficulty mix
function pickDifficulty(mix: { easy?: number; medium?: number; hard?: number } | null | undefined): "easy" | "medium" | "hard" {
  if (!mix) return "medium";
  const e = Number(mix.easy ?? 33);
  const m = Number(mix.medium ?? 34);
  const h = Number(mix.hard ?? 33);
  const r = Math.random() * (e + m + h);
  if (r < e) return "easy";
  if (r < e + m) return "medium";
  return "hard";
}

// Build the year-specific instruction block for the AI prompt
function buildYearContext(year: number | null, patterns: YearPatterns | null): string {
  if (!year || !patterns) return "";
  const notes = (patterns.style_notes || []).slice(0, 5).join("; ");
  const traps = (patterns.trap_patterns || []).slice(0, 4).join("; ");
  const emphasis = Object.entries(patterns.topic_distribution || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([t, c]) => `${t} (${c} Qs)`)
    .join(", ");
  return `

YEAR-SPECIFIC PATTERN (analyzed from the REAL ${year} paper — follow it strictly):
- Difficulty mix of the real paper: easy ${patterns.difficulty_mix?.easy ?? 33}%, medium ${patterns.difficulty_mix?.medium ?? 34}%, hard ${patterns.difficulty_mix?.hard ?? 33}%
- Topics emphasized in the real paper: ${emphasis || "balanced"}
- Style notes: ${notes || "standard style"}
- Average question length: ~${patterns.avg_question_length} words
- Common trap styles in wrong options: ${traps || "plausible misconceptions"}
- Time pressure: ${patterns.time_pressure}
Your generated question must feel like it came from the REAL ${year} paper.`;
}

// ─────────────────────────────────────────────
// Plan building
// ─────────────────────────────────────────────

export function distributeByWeight(topics: ExamTopic[], total: number): { topic: ExamTopic; count: number }[] {
  const totalWeight = topics.reduce((sum, t) => sum + t.weight, 0);
  const allocation = topics.map((t) => ({
    topic: t,
    count: Math.floor((t.weight / totalWeight) * total),
  }));
  let assigned = allocation.reduce((s, a) => s + a.count, 0);
  const remainders = topics
    .map((t) => ({ topic: t, frac: ((t.weight / totalWeight) * total) % 1 }))
    .sort((a, b) => b.frac - a.frac);
  let i = 0;
  while (assigned < total) {
    allocation.find((a) => a.topic.id === remainders[i % remainders.length].topic.id)!.count += 1;
    assigned += 1;
    i += 1;
  }
  return allocation.filter((a) => a.count > 0);
}

export function buildQuestionPlan(examId: string): { section: ExamSection; topic: ExamTopic }[] {
  const exam = getExamById(examId);
  if (!exam) throw new Error(`Unknown exam: ${examId}`);
  const plan: { section: ExamSection; topic: ExamTopic }[] = [];
  for (const section of exam.sections) {
    const dist = distributeByWeight(section.topics, section.questionCount);
    for (const { topic, count } of dist) {
      for (let i = 0; i < count; i++) plan.push({ section, topic });
    }
  }
  for (let i = plan.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [plan[i], plan[j]] = [plan[j], plan[i]];
  }
  return plan;
}

// ─────────────────────────────────────────────
// AI generation (bank-first, year-pattern aware)
// ─────────────────────────────────────────────

async function fetchOrGenerate(
  admin: SupabaseClient,
  examId: string,
  sectionId: string,
  topicId: string,
  topicName: string,
  sectionName: string,
  examName: string,
  usedIds: Set<string>,
  year: number | null = null
): Promise<LoadedQuestion | null> {
  // 1. Try cache — AI-generated questions only (real questions served separately)
  let q = admin.from("questions").select("*")
    .eq("exam_id", examId)
    .eq("section_id", sectionId)
    .eq("topic_id", topicId)
    .eq("source", "ai-generated");

  if (year) q = q.eq("year", year);
  else q = q.is("year", null);

  if (usedIds.size > 0) {
    q = q.not("id", "in", `(${[...usedIds].map((i) => `"${i}"`).join(",")})`);
  }

  const { data: cached } = await q.limit(10);
  if (cached && cached.length > 0) {
    const pick = cached[Math.floor(Math.random() * cached.length)];
    return {
      id: pick.id, exam_id: pick.exam_id, section_id: pick.section_id, topic_id: pick.topic_id,
      question_text: pick.question_text, options: pick.options, correct_index: pick.correct_index,
      explanation: pick.explanation,
    };
  }

  // 2. Load year patterns (real-paper analysis) and build context
  const patterns = await getYearPatterns(admin, examId, year);
  const difficulty = pickDifficulty(patterns?.difficulty_mix);
  const yearContext = buildYearContext(year, patterns);

  // 3. Generate new via AI with year-specific instructions
  const prompt = buildQuestionPrompt(examName, sectionName, topicName, difficulty, year) + yearContext;
  const gen = await generateOneQuestion(prompt, getKeys());
  if (!gen) return null;

  const { data: saved, error } = await admin.from("questions")
    .insert({
      exam_id: examId, section_id: sectionId, topic_id: topicId,
      question_text: gen.q.question_text, options: gen.q.options,
      correct_index: gen.q.correct_index, explanation: gen.q.explanation,
      solution_steps: gen.q.solution_steps.join("\n"), memory_trick: gen.q.memory_trick,
      source: "ai-generated", difficulty,
      year,
    })
    .select()
    .single();

  if (error || !saved) return null;
  return {
    id: saved.id, exam_id: saved.exam_id, section_id: saved.section_id, topic_id: saved.topic_id,
    question_text: saved.question_text, options: saved.options, correct_index: saved.correct_index,
    explanation: saved.explanation,
  };
}

export async function generateQuestionBatch(
  admin: SupabaseClient,
  examId: string,
  plan: { section: ExamSection; topic: ExamTopic }[],
  usedIds: Set<string>,
  batchSize = 8,
  year: number | null = null
): Promise<LoadedQuestion[]> {
  const exam = getExamById(examId);
  if (!exam) return [];
  const out: LoadedQuestion[] = [];
  for (let i = 0; i < plan.length; i += batchSize) {
    const slice = plan.slice(i, i + batchSize);
    const results = await Promise.all(
      slice.map((p) =>
        fetchOrGenerate(admin, examId, p.section.id, p.topic.id, p.topic.name, p.section.name, exam.name, usedIds, year)
      )
    );
    for (const q of results) {
      if (q && !usedIds.has(q.id)) {
        out.push(q);
        usedIds.add(q.id);
      }
    }
  }
  return out;
}

// ─────────────────────────────────────────────
// Attempt filling (AI mode + REAL mode)
// ─────────────────────────────────────────────

export async function fillAttemptQuestions(
  admin: SupabaseClient,
  exam: ReturnType<typeof getExamById> & {},
  attemptId: string,
  plan: PlanSlot[],
  year: number | null,
  budgetMs: number,
  initialExclude?: Set<string>,
  sourceMode: "ai" | "real" = "ai"
): Promise<{ have: number; target: number; done: boolean }> {
  const started = Date.now();

  const { data: linked } = await admin
    .from("test_attempt_questions")
    .select("question_id, question_order")
    .eq("attempt_id", attemptId);
  const haveIds = new Set<string>((linked || []).map((l: any) => l.question_id));
  if (initialExclude) initialExclude.forEach((id) => haveIds.add(id));
  let have = linked?.length || 0;

  // ── REAL MODE: ONLY official/community questions for this year ──
  if (sourceMode === "real") {
    let q = admin.from("questions").select("*")
      .eq("exam_id", exam.id)
      .in("source", ["official", "community"]);
    if (year) q = q.eq("year", year);

    const { data: realQs } = await q.limit(300);
    const pool = (realQs || []).filter((qq: any) => !haveIds.has(qq.id));

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    if (pool.length > 0) {
      await admin.from("test_attempt_questions").insert(
        pool.map((qq: any, i: number) => ({
          attempt_id: attemptId,
          question_id: qq.id,
          question_order: have + i,
        }))
      );
      have += pool.length;
    }
    return { have, target: have, done: true };
  }

  // ── AI MODE: topic-weighted plan, bank-first then generate ──
  const target = plan.length;
  if (have >= target) return { have, target, done: true };

  const slotToObj = (s: PlanSlot) => {
    const section = exam.sections.find((x) => x.id === s.section_id)!;
    const topic = section.topics.find((t) => t.id === s.topic_id)!;
    return { section, topic };
  };

  while (have < target && Date.now() - started < budgetMs) {
    const slice = plan.slice(have, have + 10).map(slotToObj);
    if (slice.length === 0) break;

    const batch = await generateQuestionBatch(admin, exam.id, slice, haveIds, 10, year);
    if (batch.length === 0) break;

    await admin.from("test_attempt_questions").insert(
      batch.map((q, i) => ({
        attempt_id: attemptId,
        question_id: q.id,
        question_order: have + i,
      }))
    );
    batch.forEach((q) => haveIds.add(q.id));
    have += batch.length;
  }

  return { have, target, done: have >= target };
}

// ─────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────

export function computeAnalytics(
  answers: { question_id: string; user_answer: number | null; is_correct: boolean }[],
  questions: LoadedQuestion[],
  negativeMarking: number,
  marksPerQuestion: number
) {
  const qMap = new Map(questions.map((q) => [q.id, q]));
  let correct = 0, wrong = 0, skipped = 0;
  const topicStats: Record<string, { total: number; correct: number }> = {};

  for (const ans of answers) {
    const q = qMap.get(ans.question_id);
    if (!q) continue;
    if (!topicStats[q.topic_id]) topicStats[q.topic_id] = { total: 0, correct: 0 };
    topicStats[q.topic_id].total += 1;

    if (ans.user_answer === null || ans.user_answer === undefined) {
      skipped += 1;
    } else if (ans.is_correct) {
      correct += 1;
      topicStats[q.topic_id].correct += 1;
    } else {
      wrong += 1;
    }
  }

  const rawScore = correct * marksPerQuestion;
  const negMarks = wrong * negativeMarking;
  const finalScore = rawScore - negMarks;
  const attempted = correct + wrong;
  const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;

  const weak: { topic_id: string; accuracy: number; total: number }[] = [];
  const strong: { topic_id: string; accuracy: number; total: number }[] = [];
  for (const [tid, s] of Object.entries(topicStats)) {
    if (s.total < 1) continue;
    const acc = (s.correct / s.total) * 100;
    if (acc < 50) weak.push({ topic_id: tid, accuracy: acc, total: s.total });
    else if (s.total >= 2 && acc >= 75) strong.push({ topic_id: tid, accuracy: acc, total: s.total });
  }
  weak.sort((a, b) => a.accuracy - b.accuracy);
  strong.sort((a, b) => b.accuracy - a.accuracy);

  return {
    correct, wrong, skipped, attempted,
    raw_score: rawScore,
    negative_marks: negMarks,
    final_score: finalScore,
    accuracy,
    weak_topics: weak.slice(0, 6),
    strong_topics: strong.slice(0, 6),
  };
}