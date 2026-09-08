import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getExamById, type ExamSection, type ExamTopic } from "@/lib/examPatterns";
import { buildQuestionPrompt, generateOneQuestion, getKeys } from "@/lib/qGen";

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

// Distribute N questions across topics proportional to their weights
export function distributeByWeight(topics: ExamTopic[], total: number): { topic: ExamTopic; count: number }[] {
  const totalWeight = topics.reduce((sum, t) => sum + t.weight, 0);
  // Integer floor allocation first
  const allocation = topics.map((t) => ({
    topic: t,
    count: Math.floor((t.weight / totalWeight) * total),
  }));
  // Distribute remainder to topics with largest fractional parts
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

// Build a flat list of (section, topic) picks for a full exam
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
  // Shuffle so the test feels mixed
  for (let i = plan.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [plan[i], plan[j]] = [plan[j], plan[i]];
  }
  return plan;
}

// Try to find cached question first, else generate via AI
async function fetchOrGenerate(
  admin: SupabaseClient,
  examId: string,
  sectionId: string,
  topicId: string,
  topicName: string,
  sectionName: string,
  examName: string,
  usedIds: Set<string>,
  year: number | null = null // ✅ Added year parameter
): Promise<LoadedQuestion | null> {
  // 1. Try cache (year-aware for PYQ mode)
  let q = admin.from("questions").select("*")
    .eq("exam_id", examId).eq("section_id", sectionId).eq("topic_id", topicId);
  
  // ✅ Filter by year: null for mock mode, specific year for PYQ mode
  if (year) {
    q = q.eq("year", year);
  } else {
    q = q.is("year", null);
  }
  
  if (usedIds.size > 0) q = q.not("id", "in", `(${[...usedIds].map((i) => `"${i}"`).join(",")})`);
  const { data: cached } = await q.limit(10);
  
  if (cached && cached.length > 0) {
    const pick = cached[Math.floor(Math.random() * cached.length)];
    return {
      id: pick.id, exam_id: pick.exam_id, section_id: pick.section_id, topic_id: pick.topic_id,
      question_text: pick.question_text, options: pick.options, correct_index: pick.correct_index,
      explanation: pick.explanation,
    };
  }
  
  // 2. Generate new (pass year to prompt for PYQ style matching)
  const prompt = buildQuestionPrompt(examName, sectionName, topicName, "medium", year);
  const gen = await generateOneQuestion(prompt, getKeys());
  if (!gen) return null;
  
  const { data: saved, error } = await admin.from("questions")
    .insert({
      exam_id: examId, section_id: sectionId, topic_id: topicId,
      question_text: gen.q.question_text, options: gen.q.options,
      correct_index: gen.q.correct_index, explanation: gen.q.explanation,
      solution_steps: gen.q.solution_steps.join("\n"), memory_trick: gen.q.memory_trick,
      source: "ai-generated", difficulty: "medium",
      year, // ✅ Store year in database
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

// Generate N questions for an attempt in parallel batches
export async function generateQuestionBatch(
  admin: SupabaseClient,
  examId: string,
  plan: { section: ExamSection; topic: ExamTopic }[],
  usedIds: Set<string>,
  batchSize = 8,
  year: number | null = null // ✅ Added year parameter
): Promise<LoadedQuestion[]> {
  const exam = getExamById(examId);
  if (!exam) return [];
  const out: LoadedQuestion[] = [];
  for (let i = 0; i < plan.length; i += batchSize) {
    const slice = plan.slice(i, i + batchSize);
    const results = await Promise.all(
      slice.map((p) => fetchOrGenerate(admin, examId, p.section.id, p.topic.id, p.topic.name, p.section.name, exam.name, usedIds, year))
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

// Compute score with negative marking + identify weak/strong topics
export function computeAnalytics(
  answers: { question_id: string; user_answer: number | null; is_correct: boolean }[],
  questions: LoadedQuestion[],
  negativeMarking: number,
  marksPerQuestion: number
) {
  const qMap = new Map(questions.map((q) => [q.id, q]));
  let correct = 0, wrong = 0, skipped = 0;
  const topicStats: Record<string, { total: number; correct: number; name?: string; section?: string }> = {};

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

  // Weak topics: <50% accuracy, at least 2 questions attempted
  // Strong topics: >=75% accuracy, at least 2 questions attempted
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

  return {
    correct, wrong, skipped,
    attempted,
    raw_score: rawScore,
    negative_marks: negMarks,
    final_score: finalScore,
    accuracy,
    weak_topics: weak.slice(0, 5),
    strong_topics: strong.slice(0, 5),
  };
}

export function adminClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// Server-side: build a user client from the Authorization header
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
export type PlanSlot = { section_id: string; topic_id: string };

// Fill an attempt's question paper in safe chunks (bank-first, then AI)
export async function fillAttemptQuestions(
  admin: SupabaseClient,
  exam: ReturnType<typeof getExamById> & {},
  attemptId: string,
  plan: PlanSlot[],
  year: number | null,
  budgetMs: number,
  initialExclude?: Set<string>
): Promise<{ have: number; target: number; done: boolean }> {
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

  while (have < target && Date.now() - started < budgetMs) {
    const slice = plan.slice(have, have + 10).map(slotToObj);
    if (slice.length === 0) break;
    const batch = await generateQuestionBatch(admin, exam.id, slice, haveIds, 10, year);
    if (batch.length === 0) break;
    await admin.from("test_attempt_questions").insert(
      batch.map((q, i) => ({ attempt_id: attemptId, question_id: q.id, question_order: have + i }))
    );
    batch.forEach((q) => haveIds.add(q.id));
    have += batch.length;
  }
  return { have, target, done: have >= target };
}