export type ExamTopic = { id: string; name: string; weight: number };

export type ExamSection = {
  id: string;
  name: string;
  shortName: string;
  questionCount: number;
  marksPerQ: number; // Keep this here for DYNAMIC scoring later
  timeLimitMin: number | null;
  color: string;
  sortOrder: number;
  topics: ExamTopic[];
};

export type ExamPattern = {
  id: string;
  name: string;
  description: string;
  totalQuestions: number;
  totalMarks: number;
  durationMin: number;
  negativeMarking: number;
  category: "competitive" | "university";
  gradient: string;
  icon: string;
  sections: ExamSection[];
  style_guide: string;
  // 🔥 NEW: These tell the AI exactly how to generate the questions
  allowedOptionCounts: number[]; 
  supportedQuestionTypes: ("mcq-4" | "mcq-5" | "msq" | "nvt")[]; 
};

/* ────────────────────────────────────────────
   SEPARATED TOPIC POOLS (No more SSC Bias)
   ──────────────────────────────────────────── */

// SSC Topics
const SSC_QA: ExamTopic[] = [
  { id: "SSC-QA-01", name: "Number System & Simplification", weight: 3 },
  { id: "SSC-QA-09", name: "Geometry (Circles, Triangles)", weight: 3 }, // Only SSC gets Geometry
  { id: "SSC-QA-11", name: "Trigonometry", weight: 2 },                  // Only SSC gets Trig
];

// BANKING Topics (Notice: No Geometry or Trig)
const BANK_QA: ExamTopic[] = [
  { id: "BANK-QA-01", name: "Simplification & Approximation", weight: 4 },
  { id: "BANK-QA-02", name: "Quadratic Equations", weight: 3 },
  { id: "BANK-QA-03", name: "Data Interpretation (Pie/Bar/Caselet)", weight: 5 },
  { id: "BANK-QA-04", name: "Number Series (Missing/Wrong)", weight: 3 },
];

/* ────────────────────────────────────────────
   THE EXAM DEFINITIONS
   ──────────────────────────────────────────── */

export const SSC_CGL_T1: ExamPattern = {
  id: "SSC-CGL-T1",
  name: "SSC CGL Tier 1",
  description: "Staff Selection Commission",
  totalQuestions: 100, totalMarks: 200, durationMin: 60, negativeMarking: 0.5,
  category: "competitive", gradient: "from-orange-500 to-red-600", icon: "🎯",
  style_guide: "Graduate-level. 4 options. Math includes Geometry & Trig.",
  
  // 🔥 NEW: SSC Rules
  allowedOptionCounts: [4],
  supportedQuestionTypes: ["mcq-4"], 
  
  sections: [
    { id: "SSC-CGL-T1-QA", name: "Quantitative Aptitude", shortName: "Quant", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "blue", sortOrder: 3, topics: SSC_QA },
    // ... other sections
  ],
};

export const BANK_PO_PRELIMS: ExamPattern = {
  id: "BANK-PO-PRELIMS",
  name: "Banking Prelims (IBPS/SBI)",
  description: "IBPS PO / Clerk & SBI PO",
  totalQuestions: 100, totalMarks: 100, durationMin: 60, negativeMarking: 0.25,
  category: "competitive", gradient: "from-emerald-500 to-teal-600", icon: "🏦",
  style_guide: "Calculation heavy. 5 options. Puzzles and Data Interpretation.",
  
  // 🔥 NEW: Bank Rules (This fixes the AI crashing!)
  allowedOptionCounts: [5], 
  supportedQuestionTypes: ["mcq-5"],
  
  sections: [
    { id: "BANK-PO-QA", name: "Quantitative Aptitude", shortName: "Quant", questionCount: 35, marksPerQ: 1, timeLimitMin: 20, color: "blue", sortOrder: 2, topics: BANK_QA },
    // ... other sections
  ],
};

export const ALL_EXAMS: ExamPattern[] = [SSC_CGL_T1, BANK_PO_PRELIMS];

export function getExamById(id: string): ExamPattern | undefined {
  return ALL_EXAMS.find((e) => e.id === id);
}