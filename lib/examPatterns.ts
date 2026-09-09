export type ExamTopic = { id: string; name: string; weight: number };

export type ExamSection = {
  id: string; name: string; shortName: string; questionCount: number;
  marksPerQ: number; timeLimitMin: number | null; color: string; sortOrder: number;
  topics: ExamTopic[];
};

export type ExamPattern = {
  id: string; name: string; description: string;
  totalQuestions: number; totalMarks: number; durationMin: number; negativeMarking: number;
  category: "competitive" | "university"; gradient: string; icon: string;
  sections: ExamSection[];
};

// ── Shared topic pools (reused across exams = one question bank serves all) ──
const GIR: ExamTopic[] = [
  { id: "SSC-GIR-01", name: "Coding-Decoding", weight: 3 },
  { id: "SSC-GIR-02", name: "Analogy", weight: 3 },
  { id: "SSC-GIR-03", name: "Classification (Odd One Out)", weight: 3 },
  { id: "SSC-GIR-04", name: "Series", weight: 4 },
  { id: "SSC-GIR-05", name: "Blood Relations", weight: 2 },
  { id: "SSC-GIR-06", name: "Direction & Distance", weight: 2 },
  { id: "SSC-GIR-07", name: "Syllogism", weight: 2 },
  { id: "SSC-GIR-08", name: "Seating Arrangement", weight: 2 },
  { id: "SSC-GIR-09", name: "Venn Diagrams", weight: 2 },
  { id: "SSC-GIR-10", name: "Dice, Cubes & Paper Folding", weight: 2 },
];
const GA: ExamTopic[] = [
  { id: "SSC-GA-01", name: "Indian History & Freedom Movement", weight: 3 },
  { id: "SSC-GA-02", name: "Indian Polity & Constitution", weight: 3 },
  { id: "SSC-GA-03", name: "Indian Geography", weight: 2 },
  { id: "SSC-GA-04", name: "Indian Economy", weight: 2 },
  { id: "SSC-GA-05", name: "General Science", weight: 4 },
  { id: "SSC-GA-06", name: "Current Affairs", weight: 4 },
  { id: "SSC-GA-07", name: "Static GK", weight: 2 },
  { id: "SSC-GA-08", name: "Sports & Games", weight: 1 },
  { id: "SSC-GA-09", name: "Important Days & Schemes", weight: 1 },
  { id: "SSC-GA-10", name: "Computer Awareness", weight: 2 },
  { id: "SSC-GA-11", name: "Art & Culture", weight: 1 },
  { id: "SSC-GA-12", name: "Environmental Studies", weight: 1 },
];
const QA: ExamTopic[] = [
  { id: "SSC-QA-01", name: "Number System & Simplification", weight: 3 },
  { id: "SSC-QA-02", name: "Percentage & Profit/Loss", weight: 3 },
  { id: "SSC-QA-03", name: "Ratio, Proportion & Mixture", weight: 2 },
  { id: "SSC-QA-04", name: "Time, Work & Pipes", weight: 3 },
  { id: "SSC-QA-05", name: "Time, Speed & Distance", weight: 3 },
  { id: "SSC-QA-06", name: "Simple & Compound Interest", weight: 2 },
  { id: "SSC-QA-07", name: "Algebra", weight: 2 },
  { id: "SSC-QA-08", name: "Geometry", weight: 3 },
  { id: "SSC-QA-09", name: "Mensuration", weight: 2 },
  { id: "SSC-QA-10", name: "Trigonometry", weight: 2 },
  { id: "SSC-QA-11", name: "Data Interpretation", weight: 2 },
  { id: "SSC-QA-12", name: "Average & Age Problems", weight: 2 },
];
const EC: ExamTopic[] = [
  { id: "SSC-EC-01", name: "Spotting Errors", weight: 3 },
  { id: "SSC-EC-02", name: "Fill in the Blanks", weight: 2 },
  { id: "SSC-EC-03", name: "Synonyms & Antonyms", weight: 3 },
  { id: "SSC-EC-04", name: "Idioms & Phrases", weight: 3 },
  { id: "SSC-EC-05", name: "One Word Substitution", weight: 2 },
  { id: "SSC-EC-06", name: "Spelling Correction", weight: 2 },
  { id: "SSC-EC-07", name: "Active/Passive Voice", weight: 2 },
  { id: "SSC-EC-08", name: "Direct/Indirect Speech", weight: 2 },
  { id: "SSC-EC-09", name: "Sentence Improvement", weight: 3 },
  { id: "SSC-EC-10", name: "Cloze Test & Comprehension", weight: 3 },
];
const GS: ExamTopic[] = [
  { id: "RRB-GS-01", name: "Physics", weight: 3 },
  { id: "RRB-GS-02", name: "Chemistry", weight: 3 },
  { id: "RRB-GS-03", name: "Biology", weight: 3 },
  { id: "SSC-GA-12", name: "Environmental Studies", weight: 1 },
];

// ── 1. SSC CGL Tier 1 ──
export const SSC_CGL_T1: ExamPattern = {
  id: "SSC-CGL-T1", name: "SSC CGL Tier 1",
  description: "Staff Selection Commission — Combined Graduate Level (Prelims)",
  totalQuestions: 100, totalMarks: 200, durationMin: 60, negativeMarking: 0.5,
  category: "competitive", gradient: "from-indigo-500 to-violet-600", icon: "Target",
  sections: [
    { id: "SSC-CGL-T1-GIR", name: "General Intelligence & Reasoning", shortName: "Reasoning", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "violet", sortOrder: 1, topics: GIR },
    { id: "SSC-CGL-T1-GA", name: "General Awareness", shortName: "GK", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "amber", sortOrder: 2, topics: GA },
    { id: "SSC-CGL-T1-QA", name: "Quantitative Aptitude", shortName: "Quant", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "blue", sortOrder: 3, topics: QA },
    { id: "SSC-CGL-T1-EC", name: "English Comprehension", shortName: "English", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "emerald", sortOrder: 4, topics: EC },
  ],
};

// ── 2. SSC CHSL Tier 1 ──
export const SSC_CHSL_T1: ExamPattern = {
  id: "SSC-CHSL-T1", name: "SSC CHSL Tier 1",
  description: "Staff Selection Commission — Higher Secondary (10+2) Level",
  totalQuestions: 100, totalMarks: 200, durationMin: 60, negativeMarking: 0.5,
  category: "competitive", gradient: "from-sky-500 to-blue-600", icon: "Target",
  sections: [
    { id: "SSC-CHSL-T1-GIR", name: "General Intelligence", shortName: "Reasoning", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "violet", sortOrder: 1, topics: GIR },
    { id: "SSC-CHSL-T1-EC", name: "English Language", shortName: "English", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "emerald", sortOrder: 2, topics: EC },
    { id: "SSC-CHSL-T1-QA", name: "Quantitative Aptitude", shortName: "Quant", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "blue", sortOrder: 3, topics: QA },
    { id: "SSC-CHSL-T1-GA", name: "General Awareness", shortName: "GK", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "amber", sortOrder: 4, topics: GA },
  ],
};

// ── 3. Banking (IBPS / SBI) Prelims ──
export const BANK_PO_PRELIMS: ExamPattern = {
  id: "BANK-PO-PRELIMS", name: "Banking Prelims (IBPS/SBI)",
  description: "IBPS PO / Clerk & SBI PO — Preliminary Examination",
  totalQuestions: 100, totalMarks: 100, durationMin: 60, negativeMarking: 0.25,
  category: "competitive", gradient: "from-emerald-500 to-teal-600", icon: "Target",
  sections: [
    { id: "BANK-PO-EC", name: "English Language", shortName: "English", questionCount: 30, marksPerQ: 1, timeLimitMin: 20, color: "emerald", sortOrder: 1, topics: EC },
    { id: "BANK-PO-QA", name: "Quantitative Aptitude", shortName: "Quant", questionCount: 35, marksPerQ: 1, timeLimitMin: 20, color: "blue", sortOrder: 2, topics: QA },
    { id: "BANK-PO-GIR", name: "Reasoning Ability", shortName: "Reasoning", questionCount: 35, marksPerQ: 1, timeLimitMin: 20, color: "violet", sortOrder: 3, topics: GIR },
  ],
};

// ── 4. RRB NTPC CBT-1 ──
export const RRB_NTPC_CBT1: ExamPattern = {
  id: "RRB-NTPC-CBT1", name: "RRB NTPC (CBT-1)",
  description: "Railway Recruitment Board — Non-Technical Popular Categories",
  totalQuestions: 100, totalMarks: 100, durationMin: 90, negativeMarking: 0.33,
  category: "competitive", gradient: "from-cyan-500 to-sky-600", icon: "Target",
  sections: [
    { id: "RRB-NTPC-QA", name: "Mathematics", shortName: "Maths", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "blue", sortOrder: 1, topics: QA },
    { id: "RRB-NTPC-GIR", name: "General Intelligence & Reasoning", shortName: "Reasoning", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "violet", sortOrder: 2, topics: GIR },
    { id: "RRB-NTPC-GA", name: "General Awareness", shortName: "GA", questionCount: 40, marksPerQ: 1, timeLimitMin: null, color: "amber", sortOrder: 3, topics: [...GA, ...GS] },
  ],
};

// ── 5. RRB Group D ──
export const RRB_GROUP_D: ExamPattern = {
  id: "RRB-GROUP-D", name: "RRB Group D",
  description: "Railway Recruitment Board — Level-1 Posts",
  totalQuestions: 100, totalMarks: 100, durationMin: 90, negativeMarking: 0.33,
  category: "competitive", gradient: "from-rose-500 to-pink-600", icon: "Target",
  sections: [
    { id: "RRB-GD-QA", name: "Mathematics", shortName: "Maths", questionCount: 25, marksPerQ: 1, timeLimitMin: null, color: "blue", sortOrder: 1, topics: QA },
    { id: "RRB-GD-GIR", name: "General Intelligence & Reasoning", shortName: "Reasoning", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "violet", sortOrder: 2, topics: GIR },
    { id: "RRB-GD-GS", name: "General Science", shortName: "Science", questionCount: 25, marksPerQ: 1, timeLimitMin: null, color: "teal", sortOrder: 3, topics: GS },
    { id: "RRB-GD-GA", name: "General Awareness & Current Affairs", shortName: "GA", questionCount: 20, marksPerQ: 1, timeLimitMin: null, color: "amber", sortOrder: 4, topics: GA },
  ],
};

export const ALL_EXAMS: ExamPattern[] = [SSC_CGL_T1, SSC_CHSL_T1, BANK_PO_PRELIMS, RRB_NTPC_CBT1, RRB_GROUP_D];

export function getExamById(id: string): ExamPattern | undefined {
  return ALL_EXAMS.find((e) => e.id === id);
}