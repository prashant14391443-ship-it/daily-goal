export type ExamTopic = {
  id: string;
  name: string;
  weight: number;
};

export type ExamSection = {
  id: string;
  name: string;
  shortName: string;
  questionCount: number;
  marksPerQ: number;
  timeLimitMin: number | null;
  color: string;
  sortOrder: number;
  topics: ExamTopic[];
};

export type ExamPattern = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  totalMarks: number;
  totalQuestions: number;
  durationMin: number;
  negativeMarking: number;
  allowedOptionCounts?: number[];
  style_guide?: string;
  sections: ExamSection[];
};

// ==========================================
// 1. TOPIC POOLS 
// ==========================================

const SSC_MATH: ExamTopic[] = [
  { id: "SSC-M-1", name: "Algebra & Polynomials", weight: 3 },
  { id: "SSC-M-2", name: "Geometry & Mensuration", weight: 4 },
  { id: "SSC-M-3", name: "Trigonometry", weight: 3 },
  { id: "SSC-M-4", name: "Profit, Loss & Discount", weight: 2 },
  { id: "SSC-M-5", name: "Time, Speed & Distance", weight: 2 },
];
const SSC_REAS: ExamTopic[] = [
  { id: "SSC-R-1", name: "Analogies & Classification", weight: 3 },
  { id: "SSC-R-2", name: "Visual Reasoning & Mirror Images", weight: 2 },
  { id: "SSC-R-3", name: "Blood Relations", weight: 2 },
  { id: "SSC-R-4", name: "Series (Number & Alphabet)", weight: 3 },
];

const BANK_QUANT: ExamTopic[] = [
  { id: "BNK-Q-1", name: "Data Interpretation (Pie/Bar/Table)", weight: 5 },
  { id: "BNK-Q-2", name: "Number Series (Missing/Wrong)", weight: 3 },
  { id: "BNK-Q-3", name: "Quadratic Equations", weight: 3 },
  { id: "BNK-Q-4", name: "Simplification & Approximation", weight: 4 },
];
const BANK_REAS: ExamTopic[] = [
  { id: "BNK-R-1", name: "Puzzles & Seating Arrangement", weight: 5 },
  { id: "BNK-R-2", name: "Syllogism", weight: 3 },
  { id: "BNK-R-3", name: "Inequalities", weight: 3 },
  { id: "BNK-R-4", name: "Coding-Decoding", weight: 2 },
];

const ENGLISH: ExamTopic[] = [
  { id: "ENG-1", name: "Reading Comprehension", weight: 4 },
  { id: "ENG-2", name: "Error Spotting & Grammar", weight: 3 },
  { id: "ENG-3", name: "Vocabulary (Synonyms/Antonyms)", weight: 3 },
];
const GK_GS: ExamTopic[] = [
  { id: "GK-1", name: "Current Affairs (Last 6 Months)", weight: 4 },
  { id: "GK-2", name: "Indian Polity & Constitution", weight: 3 },
  { id: "GK-3", name: "History (Ancient & Modern India)", weight: 3 },
  { id: "GK-4", name: "Geography & Economy", weight: 2 },
];
const GENERAL_SCIENCE: ExamTopic[] = [
  { id: "SCI-1", name: "Physics (Basic Principles)", weight: 3 },
  { id: "SCI-2", name: "Chemistry (Everyday usage)", weight: 3 },
  { id: "SCI-3", name: "Biology & Human Body", weight: 4 },
];
const CDP_TOPICS: ExamTopic[] = [
  { id: "CDP-1", name: "Child Development & Learning", weight: 5 },
  { id: "CDP-2", name: "Inclusive Education", weight: 3 },
  { id: "CDP-3", name: "Pedagogy & Teaching Methods", weight: 4 },
];
const CSAT_RC: ExamTopic[] = [
  { id: "CSAT-RC-1", name: "Passage Comprehension & Inference", weight: 5 },
  { id: "CSAT-RC-2", name: "Author's Tone, Main Idea & Crux", weight: 3 },
];
const CSAT_REASON: ExamTopic[] = [
  { id: "CSAT-R-1", name: "Logical & Analytical Reasoning", weight: 4 },
  { id: "CSAT-R-2", name: "Syllogism, Venn Diagrams & Data Sufficiency", weight: 3 },
  { id: "CSAT-R-3", name: "Decision Making & Problem Solving", weight: 2 },
];
const CSAT_MATH: ExamTopic[] = [
  { id: "CSAT-M-1", name: "Number System & Basic Numeracy", weight: 4 },
  { id: "CSAT-M-2", name: "Percentages, Ratio & Averages", weight: 3 },
  { id: "CSAT-M-3", name: "Time, Speed, Distance & Work", weight: 3 },
  { id: "CSAT-M-4", name: "Data Interpretation (Charts & Graphs)", weight: 3 },
];
const CUET_GEN: ExamTopic[] = [
  { id: "CUET-1", name: "General Awareness & Current Affairs", weight: 4 },
  { id: "CUET-2", name: "Logical & Numerical Reasoning", weight: 3 },
  { id: "CUET-3", name: "Quantitative Aptitude", weight: 3 },
  { id: "CUET-4", name: "English & Comprehension", weight: 2 },
];
// ==========================================
// 2. 9 EXAM PATTERNS
// ==========================================

export const SSC_CGL_TIER1: ExamPattern = {
  id: "SSC-CGL-T1", name: "SSC CGL Tier 1", shortName: "SSC CGL", description: "Combined Graduate Level Examination", totalMarks: 200, totalQuestions: 100, durationMin: 60, negativeMarking: 0.5, allowedOptionCounts: [4],
  sections: [
    { id: "CGL-REAS", name: "General Intelligence & Reasoning", shortName: "Reasoning", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "blue", sortOrder: 1, topics: SSC_REAS },
    { id: "CGL-GK", name: "General Awareness", shortName: "GK", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "emerald", sortOrder: 2, topics: GK_GS },
    { id: "CGL-MATH", name: "Quantitative Aptitude", shortName: "Quant", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "orange", sortOrder: 3, topics: SSC_MATH },
    { id: "CGL-ENG", name: "English Comprehension", shortName: "English", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "purple", sortOrder: 4, topics: ENGLISH },
  ],
};

export const SSC_CHSL_TIER1: ExamPattern = {
  id: "SSC-CHSL-T1", name: "SSC CHSL Tier 1", shortName: "SSC CHSL", description: "Combined Higher Secondary Level (10+2)", totalMarks: 200, totalQuestions: 100, durationMin: 60, negativeMarking: 0.5, allowedOptionCounts: [4],
  sections: [
    { id: "CHSL-ENG", name: "English Language", shortName: "English", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "purple", sortOrder: 1, topics: ENGLISH },
    { id: "CHSL-REAS", name: "General Intelligence", shortName: "Reasoning", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "blue", sortOrder: 2, topics: SSC_REAS },
    { id: "CHSL-MATH", name: "Quantitative Aptitude", shortName: "Quant", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "orange", sortOrder: 3, topics: SSC_MATH },
    { id: "CHSL-GK", name: "General Awareness", shortName: "GK", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "emerald", sortOrder: 4, topics: GK_GS },
  ],
};

export const BANK_PO_PRELIMS: ExamPattern = {
  id: "BANK-PO-PRE", name: "IBPS / SBI PO Prelims", shortName: "Bank PO", description: "Probationary Officer Preliminary Exam", totalMarks: 100, totalQuestions: 100, durationMin: 60, negativeMarking: 0.25, allowedOptionCounts: [5],
  sections: [
    { id: "PO-ENG", name: "English Language", shortName: "English", questionCount: 30, marksPerQ: 1, timeLimitMin: 20, color: "purple", sortOrder: 1, topics: ENGLISH },
    { id: "PO-QUANT", name: "Quantitative Aptitude", shortName: "Quant", questionCount: 35, marksPerQ: 1, timeLimitMin: 20, color: "orange", sortOrder: 2, topics: BANK_QUANT },
    { id: "PO-REAS", name: "Reasoning Ability", shortName: "Reasoning", questionCount: 35, marksPerQ: 1, timeLimitMin: 20, color: "blue", sortOrder: 3, topics: BANK_REAS },
  ],
};

export const BANK_CLERK_PRELIMS: ExamPattern = {
  id: "BANK-CLERK-PRE", name: "IBPS / SBI Clerk Prelims", shortName: "Bank Clerk", description: "Clerical Cadre Preliminary Exam", totalMarks: 100, totalQuestions: 100, durationMin: 60, negativeMarking: 0.25, allowedOptionCounts: [5],
  sections: [
    { id: "CLK-ENG", name: "English Language", shortName: "English", questionCount: 30, marksPerQ: 1, timeLimitMin: 20, color: "purple", sortOrder: 1, topics: ENGLISH },
    { id: "CLK-QUANT", name: "Numerical Ability", shortName: "Quant", questionCount: 35, marksPerQ: 1, timeLimitMin: 20, color: "orange", sortOrder: 2, topics: BANK_QUANT },
    { id: "CLK-REAS", name: "Reasoning Ability", shortName: "Reasoning", questionCount: 35, marksPerQ: 1, timeLimitMin: 20, color: "blue", sortOrder: 3, topics: BANK_REAS },
  ],
};

export const RRB_NTPC_CBT1: ExamPattern = {
  id: "RRB-NTPC-CBT1", name: "RRB NTPC CBT 1", shortName: "RRB NTPC", description: "Non-Technical Popular Categories", totalMarks: 100, totalQuestions: 100, durationMin: 90, negativeMarking: 0.33, allowedOptionCounts: [4],
  sections: [
    { id: "NTPC-GK", name: "General Awareness", shortName: "GK", questionCount: 40, marksPerQ: 1, timeLimitMin: null, color: "emerald", sortOrder: 1, topics: GK_GS },
    { id: "NTPC-MATH", name: "Mathematics", shortName: "Math", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "orange", sortOrder: 2, topics: SSC_MATH },
    { id: "NTPC-REAS", name: "General Intelligence & Reasoning", shortName: "Reasoning", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "blue", sortOrder: 3, topics: SSC_REAS },
  ],
};

export const RRB_GROUP_D: ExamPattern = {
  id: "RRB-GROUP-D", name: "RRB Group D", shortName: "Railway Gr. D", description: "Railway Recruitment Board Group D", totalMarks: 100, totalQuestions: 100, durationMin: 90, negativeMarking: 0.33, allowedOptionCounts: [4],
  sections: [
    { id: "RRB-SCI", name: "General Science", shortName: "Science", questionCount: 25, marksPerQ: 1, timeLimitMin: null, color: "emerald", sortOrder: 1, topics: GENERAL_SCIENCE },
    { id: "RRB-MATH", name: "Mathematics", shortName: "Math", questionCount: 25, marksPerQ: 1, timeLimitMin: null, color: "orange", sortOrder: 2, topics: SSC_MATH },
    { id: "RRB-REAS", name: "General Intelligence & Reasoning", shortName: "Reasoning", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "blue", sortOrder: 3, topics: SSC_REAS },
    { id: "RRB-GK", name: "General Awareness", shortName: "GK", questionCount: 20, marksPerQ: 1, timeLimitMin: null, color: "purple", sortOrder: 4, topics: GK_GS },
  ],
};

export const UPSC_PRELIMS_GS: ExamPattern = {
  id: "UPSC-PRE-GS1", name: "UPSC CSE Prelims", shortName: "UPSC Prelims", description: "Civil Services GS Paper 1", totalMarks: 200, totalQuestions: 100, durationMin: 120, negativeMarking: 0.66, allowedOptionCounts: [4],
  sections: [
    { id: "UPSC-GS", name: "General Studies", shortName: "GS", questionCount: 100, marksPerQ: 2, timeLimitMin: null, color: "emerald", sortOrder: 1, topics: GK_GS },
  ],
};

export const STATE_PSC_PRELIMS: ExamPattern = {
  id: "STATE-PSC-PRE", name: "State PSC Prelims", shortName: "State PSC", description: "State Public Service Commission (General)", totalMarks: 150, totalQuestions: 150, durationMin: 120, negativeMarking: 0.33, allowedOptionCounts: [4],
  sections: [
    { id: "PSC-GS", name: "General Studies & State GK", shortName: "GS", questionCount: 150, marksPerQ: 1, timeLimitMin: null, color: "orange", sortOrder: 1, topics: GK_GS },
  ],
};

export const CTET_PAPER_1: ExamPattern = {
  id: "CTET-P1", name: "CTET Paper 1", shortName: "CTET P1", description: "Central Teacher Eligibility Test (Primary)", totalMarks: 150, totalQuestions: 150, durationMin: 150, negativeMarking: 0, allowedOptionCounts: [4],
  sections: [
    { id: "CTET-CDP", name: "Child Development & Pedagogy", shortName: "CDP", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "purple", sortOrder: 1, topics: CDP_TOPICS },
    { id: "CTET-MATH", name: "Mathematics", shortName: "Math", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "orange", sortOrder: 2, topics: SSC_MATH },
    { id: "CTET-EVS", name: "Environmental Studies", shortName: "EVS", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "emerald", sortOrder: 3, topics: GENERAL_SCIENCE },
    { id: "CTET-ENG", name: "Language I (English)", shortName: "English", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "blue", sortOrder: 4, topics: ENGLISH },
  ],
};
export const SSC_MTS: ExamPattern = {
  id: "SSC-MTS", name: "SSC MTS / Havaldar", shortName: "SSC MTS",
  description: "Multi Tasking Staff (Non-Technical) — Paper I",
  totalMarks: 230, totalQuestions: 90, durationMin: 90, negativeMarking: 1,
  allowedOptionCounts: [4],
  sections: [
    { id: "MTS-MATH", name: "Numerical & Mathematical Ability", shortName: "Math", questionCount: 20, marksPerQ: 2, timeLimitMin: null, color: "orange", sortOrder: 1, topics: SSC_MATH },
    { id: "MTS-REAS", name: "Reasoning Ability & Problem Solving", shortName: "Reasoning", questionCount: 20, marksPerQ: 2, timeLimitMin: null, color: "blue", sortOrder: 2, topics: SSC_REAS },
    { id: "MTS-GK", name: "General Awareness", shortName: "GK", questionCount: 25, marksPerQ: 3, timeLimitMin: null, color: "emerald", sortOrder: 3, topics: GK_GS },
    { id: "MTS-ENG", name: "English Language & Comprehension", shortName: "English", questionCount: 25, marksPerQ: 3, timeLimitMin: null, color: "purple", sortOrder: 4, topics: ENGLISH },
  ],
};

export const SSC_CPO_SI: ExamPattern = {
  id: "SSC-CPO-SI", name: "SSC CPO (SI / ASI)", shortName: "SSC CPO",
  description: "Sub-Inspector, Delhi Police & CAPFs — Tier 1",
  totalMarks: 200, totalQuestions: 100, durationMin: 60, negativeMarking: 0.5,
  allowedOptionCounts: [4],
  sections: [
    { id: "CPO-REAS", name: "General Intelligence & Reasoning", shortName: "Reasoning", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "blue", sortOrder: 1, topics: SSC_REAS },
    { id: "CPO-GK", name: "General Knowledge & Awareness", shortName: "GK", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "emerald", sortOrder: 2, topics: GK_GS },
    { id: "CPO-MATH", name: "Quantitative Aptitude", shortName: "Quant", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "orange", sortOrder: 3, topics: SSC_MATH },
    { id: "CPO-ENG", name: "English Comprehension", shortName: "English", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "purple", sortOrder: 4, topics: ENGLISH },
  ],
};

export const RRB_ALP: ExamPattern = {
  id: "RRB-ALP", name: "RRB ALP (Loco Pilot)", shortName: "RRB ALP",
  description: "Assistant Loco Pilot — CBT Stage 1",
  totalMarks: 75, totalQuestions: 75, durationMin: 60, negativeMarking: 0.33,
  allowedOptionCounts: [4],
  sections: [
    { id: "ALP-MATH", name: "Mathematics", shortName: "Math", questionCount: 20, marksPerQ: 1, timeLimitMin: null, color: "orange", sortOrder: 1, topics: SSC_MATH },
    { id: "ALP-REAS", name: "General Intelligence & Reasoning", shortName: "Reasoning", questionCount: 25, marksPerQ: 1, timeLimitMin: null, color: "blue", sortOrder: 2, topics: SSC_REAS },
    { id: "ALP-SCI", name: "General Science", shortName: "Science", questionCount: 20, marksPerQ: 1, timeLimitMin: null, color: "emerald", sortOrder: 3, topics: GENERAL_SCIENCE },
    { id: "ALP-GK", name: "General Awareness & Current Affairs", shortName: "GK", questionCount: 10, marksPerQ: 1, timeLimitMin: null, color: "purple", sortOrder: 4, topics: GK_GS },
  ],
};

export const UPSC_CSAT: ExamPattern = {
  id: "UPSC-PRE-CSAT", name: "UPSC Prelims (CSAT Paper-II)", shortName: "UPSC CSAT",
  description: "Civil Services Aptitude Test (qualifying, 33% needed)",
  totalMarks: 200, totalQuestions: 80, durationMin: 120, negativeMarking: 0.83,
  allowedOptionCounts: [4],
  sections: [
    { id: "CSAT-RC", name: "Reading Comprehension", shortName: "RC", questionCount: 30, marksPerQ: 2.5, timeLimitMin: null, color: "purple", sortOrder: 1, topics: CSAT_RC },
    { id: "CSAT-REAS", name: "Logical Reasoning & Analytical Ability", shortName: "Reasoning", questionCount: 35, marksPerQ: 2.5, timeLimitMin: null, color: "blue", sortOrder: 2, topics: CSAT_REASON },
    { id: "CSAT-MATH", name: "Quantitative & Mental Ability", shortName: "Numeracy", questionCount: 15, marksPerQ: 2.5, timeLimitMin: null, color: "orange", sortOrder: 3, topics: CSAT_MATH },
  ],
};

export const CDS_COMBINED: ExamPattern = {
  id: "CDS-COMBINED", name: "CDS (Combined Defence Services)", shortName: "CDS",
  description: "IMA / INA / AFA / OTA — combined practice (30 Qs per paper)",
  totalMarks: 90, totalQuestions: 90, durationMin: 120, negativeMarking: 0.33,
  allowedOptionCounts: [4],
  sections: [
    { id: "CDS-ENG", name: "English", shortName: "English", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "purple", sortOrder: 1, topics: ENGLISH },
    { id: "CDS-GK", name: "General Knowledge", shortName: "GK", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "emerald", sortOrder: 2, topics: GK_GS },
    { id: "CDS-MATH", name: "Elementary Mathematics", shortName: "Math", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "orange", sortOrder: 3, topics: SSC_MATH },
  ],
};

export const CUET_GENERAL: ExamPattern = {
  id: "CUET-UG-GEN", name: "CUET UG (General Test)", shortName: "CUET General",
  description: "Common University Entrance Test — General Test section",
  totalMarks: 375, totalQuestions: 75, durationMin: 60, negativeMarking: 1,
  allowedOptionCounts: [4],
  sections: [
    { id: "CUET-GK", name: "General Awareness & Current Affairs", shortName: "GK", questionCount: 25, marksPerQ: 5, timeLimitMin: null, color: "emerald", sortOrder: 1, topics: CUET_GEN },
    { id: "CUET-REAS", name: "Logical & Numerical Reasoning", shortName: "Reasoning", questionCount: 20, marksPerQ: 5, timeLimitMin: null, color: "blue", sortOrder: 2, topics: SSC_REAS },
    { id: "CUET-MATH", name: "Quantitative Aptitude", shortName: "Quant", questionCount: 15, marksPerQ: 5, timeLimitMin: null, color: "orange", sortOrder: 3, topics: SSC_MATH },
    { id: "CUET-ENG", name: "English & Comprehension", shortName: "English", questionCount: 15, marksPerQ: 5, timeLimitMin: null, color: "purple", sortOrder: 4, topics: ENGLISH },
  ],
};

// ==========================================
// 3. EXPORT LIST & HELPERS
// ==========================================

export const EXAMS: ExamPattern[] = [
  SSC_CGL_TIER1,
  SSC_CHSL_TIER1,
  BANK_PO_PRELIMS,
  BANK_CLERK_PRELIMS,
  RRB_NTPC_CBT1,
  RRB_GROUP_D,
  UPSC_PRELIMS_GS,
  STATE_PSC_PRELIMS,
  CTET_PAPER_1,
    SSC_MTS,
  SSC_CPO_SI,
  RRB_ALP,
  UPSC_CSAT,
  CDS_COMBINED,
  CUET_GENERAL,
];

// Provide aliases for older frontend pages
export const ALL_EXAMS = EXAMS;
export const SSC_CGL_T1 = SSC_CGL_TIER1;

export function getExamById(id: string): ExamPattern | undefined {
  return EXAMS.find((e) => e.id === id);
}