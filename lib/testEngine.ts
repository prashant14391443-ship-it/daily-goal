import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getExamById, type ExamSection, type ExamTopic } from "@/lib/examPatterns";
import { buildQuestionPrompt, generateOneQuestion, getKeys } from "@/lib/qGen";

export type LoadedQuestion = {
  id: string;
  exam_id: string;
  section_id: string;
  topic_id: string;
  question_type: string;
  question_text: string;
  options: string[];
  correct_index: number | null;
  correct_value: string | null;
  explanation: string | null;
};

export type PlanSlot = { section_id: string; topic_id: string };

// ==========================================
// PLAN BUILDERS
// ==========================================

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

// ==========================================
// FETCH OR GENERATE (throws real errors — no silent nulls)
// ==========================================

async function fetchOrGenerate(
  admin: SupabaseClient,
  examId: string,
  sectionId: string,
  topicId: string,
  topicName: string,
  sectionName: string,
  examName: string,
  usedIds: Set<string>,
  year: number | null,
  styleGuide: string | undefined,
  yearPatterns: any,
  optionCount: number = 4,
  difficulty: "easy" | "medium" | "hard" = "medium"
): Promise<LoadedQuestion> {
  // 1) Try the database cache first (free + instant)
  let q = admin.from("questions").select("*")
    .eq("exam_id", examId).eq("section_id", sectionId).eq("topic_id", topicId);
  if (year) q = q.eq("year", year);
  else q = q.is("year", null);
  if (usedIds.size > 0) q = q.not("id", "in", `(${[...usedIds].map((i) => `"${i}"`).join(",")})`);
  const { data: cached } = await q.limit(10);

  if (cached && cached.length > 0) {
    const pick = cached[Math.floor(Math.random() * cached.length)];
    return {
      id: pick.id, exam_id: pick.exam_id, section_id: pick.section_id, topic_id: pick.topic_id,
      question_type: pick.question_type || `mcq-${optionCount}`,
      question_text: pick.question_text, options: pick.options,
      correct_index: pick.correct_index, correct_value: pick.correct_value,
      explanation: pick.explanation,
    };
  }

  // 2) DB empty for this slot → ask the AI
  const prompt = buildQuestionPrompt(examName, sectionName, topicName, difficulty, optionCount, year, styleGuide, yearPatterns);
  const gen = await generateOneQuestion(prompt, getKeys());

  // 3) Save it so we never pay for the same question twice
  const { data: saved, error } = await admin.from("questions")
    .insert({
      exam_id: examId, section_id: sectionId, topic_id: topicId,
      question_type: gen.q.question_type || `mcq-${optionCount}`,
      question_text: gen.q.question_text, options: gen.q.options,
      correct_index: gen.q.correct_index === -1 ? null : gen.q.correct_index,
      correct_value: gen.q.correct_value,
      explanation: gen.q.explanation,
      solution_steps: (gen.q.solution_steps || []).join("\n"),
      memory_trick: gen.q.memory_trick,
      source: "ai-generated", difficulty: difficulty,
      year,
    })
    .select()
    .single();

  if (error || !saved) throw new Error(`DB insert failed: ${error?.message || "no row returned"}`);

  return {
    id: saved.id, exam_id: saved.exam_id, section_id: saved.section_id, topic_id: saved.topic_id,
    question_type: saved.question_type,
    question_text: saved.question_text, options: saved.options,
    correct_index: saved.correct_index, correct_value: saved.correct_value,
    explanation: saved.explanation,
  };
}

// ==========================================
// BATCH GENERATOR
// ==========================================

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

  const styleGuide = exam.style_guide;
  const optionCount = exam.allowedOptionCounts?.[0] || 4;
  let yearPatterns: any = null;

  if (year) {
    const { data } = await admin.from("year_patterns").select("*").eq("exam_id", examId).eq("year", year).maybeSingle();
    yearPatterns = data;
  }

  const out: LoadedQuestion[] = [];
  let firstError: Error | null = null;

  for (let i = 0; i < plan.length; i += batchSize) {
    const slice = plan.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      slice.map((p) =>
        fetchOrGenerate(
          admin, examId, p.section.id, p.topic.id, p.topic.name, p.section.name,
          exam.name, usedIds, year, styleGuide, yearPatterns, optionCount, "medium"
        )
      )
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        const q = r.value;
        if (q && !usedIds.has(q.id)) {
          out.push(q);
          usedIds.add(q.id);
        }
      } else if (!firstError) {
        firstError = r.reason instanceof Error ? r.reason : new Error(String(r.reason));
      }
    }
  }

  if (out.length === 0 && firstError) throw firstError;
  return out;
}

// ==========================================
// 🔥 QUICK FILL: fast first batch so the test opens instantly
// ==========================================

export async function quickFill(
  admin: SupabaseClient,
  exam: ReturnType<typeof getExamById> & {},
  slots: PlanSlot[],
  usedIds: Set<string>,
  year: number | null,
  deadlineMs = 8000,
  waveSize = 4
): Promise<{ results: { slot: PlanSlot; q: LoadedQuestion | null }[]; firstError: string }> {
  const started = Date.now();
  const results: { slot: PlanSlot; q: LoadedQuestion | null }[] = [];
  let firstError = "";

  const slotToObj = (s: PlanSlot) => {
    const section = exam.sections.find((x) => x.id === s.section_id)!;
    const topic = section.topics.find((t) => t.id === s.topic_id)!;
    return { section, topic };
  };

  for (let i = 0; i < slots.length; i += waveSize) {
    if (Date.now() - started > deadlineMs) {
      // Out of time budget → remaining slots go to the background top-up
      for (let j = i; j < slots.length; j++) results.push({ slot: slots[j], q: null });
      break;
    }
    const wave = slots.slice(i, i + waveSize);
    const settled = await Promise.allSettled(
      wave.map((s) => {
        const { section, topic } = slotToObj(s);
        return fetchOrGenerate(
          admin, exam.id, section.id, topic.id, topic.name, section.name,
          exam.name, usedIds, year, exam.style_guide, null,
          exam.allowedOptionCounts?.[0] || 4, "medium"
        );
      })
    );
    settled.forEach((r, k) => {
      if (r.status === "fulfilled") {
        usedIds.add(r.value.id);
        results.push({ slot: wave[k], q: r.value });
      } else {
        if (!firstError) firstError = r.reason?.message || "generation failed";
        results.push({ slot: wave[k], q: null });
      }
    });
  }

  return { results, firstError };
}

// ==========================================
// ANALYTICS
// ==========================================

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
    if (ans.user_answer === null || ans.user_answer === undefined) skipped += 1;
    else if (ans.is_correct) { correct += 1; topicStats[q.topic_id].correct += 1; }
    else wrong += 1;
  }

  const rawScore = correct * marksPerQuestion;
  const negMarks = wrong * negativeMarking;
  const finalScore = rawScore - negMarks;
  const attempted = correct + wrong;
  const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;

  const weak: { topic_id: string; accuracy: number; total: number }[] = [];
  const strong: { topic_id: string; accuracy: number; total: number }[] = [];
  for (const [tid, s] of Object.entries(topicStats)) {
    if (s.total < 2) continue;
    const acc = (s.correct / s.total) * 100;
    if (acc < 50) weak.push({ topic_id: tid, accuracy: acc, total: s.total });
    else if (acc >= 75) strong.push({ topic_id: tid, accuracy: acc, total: s.total });
  }
  weak.sort((a, b) => a.accuracy - b.accuracy);
  strong.sort((a, b) => b.accuracy - a.accuracy);

  return { correct, wrong, skipped, attempted, raw_score: rawScore, negative_marks: negMarks, final_score: finalScore, accuracy, weak_topics: weak.slice(0, 5), strong_topics: strong.slice(0, 5) };
}

// ==========================================
// SUPABASE CLIENTS
// ==========================================

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

// ==========================================
// FILL ATTEMPT (background builder)
// ==========================================

export async function fillAttemptQuestions(
  admin: SupabaseClient,
  exam: ReturnType<typeof getExamById> & {},
  attemptId: string,
  plan: PlanSlot[],
  year: number | null,
  budgetMs: number,
  initialExclude?: Set<string>
): Promise<{ have: number; target: number; done: boolean; error?: string }> {
  const started = Date.now();
  const { data: linked } = await admin
    .from("test_attempt_questions")
    .select("question_id, question_order")
    .eq("attempt_id", attemptId);
  const haveIds = new Set<string>((linked || []).map((l: any) => l.question_id));
  (initialExclude || []).forEach((id) => haveIds.add(id));
  let have = linked?.length || 0;
  const target = plan.length;
  if (have >= target) return { have, target, done: true };

  const slotToObj = (s: PlanSlot) => {
    const section = exam.sections.find((x) => x.id === s.section_id)!;
    const topic = section.topics.find((t) => t.id === s.topic_id)!;
    return { section, topic };
  };

  let lastError = "";
  let failures = 0;
  const MAX_FAILURES = 2;

  while (have < target && Date.now() - started < budgetMs && failures < MAX_FAILURES) {
    const slice = plan.slice(have, have + 3).map(slotToObj);
    if (slice.length === 0) break;

    try {
      const batch = await generateQuestionBatch(admin, exam.id, slice, haveIds, 3, year);
      if (batch.length === 0) { failures++; continue; }
      failures = 0;
      await admin.from("test_attempt_questions").insert(
        batch.map((q, i) => ({ attempt_id: attemptId, question_id: q.id, question_order: have + i }))
      );
      batch.forEach((q) => haveIds.add(q.id));
      have += batch.length;
    } catch (e: any) {
      lastError = e?.message || "unknown generation error";
      failures++;
      console.error("[fillAttemptQuestions]", lastError);
    }
  }

  return { have, target, done: have >= target, error: lastError };
}