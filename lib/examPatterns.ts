export type ExamTopic = { id: string; name: string; weight: number };

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
};

/* ────────────────────────────────────────────
   SHARED TOPIC POOLS (SSC-family reuse; each exam picks what matches its syllabus)
   ──────────────────────────────────────────── */
const GIR: ExamTopic[] = [
  { id: "SSC-GIR-01", name: "Coding-Decoding", weight: 3 },
  { id: "SSC-GIR-02", name: "Analogy", weight: 3 },
  { id: "SSC-GIR-03", name: "Classification (Odd One Out)", weight: 3 },
  { id: "SSC-GIR-04", name: "Number & Alphabet Series", weight: 4 },
  { id: "SSC-GIR-05", name: "Blood Relations", weight: 2 },
  { id: "SSC-GIR-06", name: "Direction & Distance", weight: 2 },
  { id: "SSC-GIR-07", name: "Syllogism", weight: 2 },
  { id: "SSC-GIR-08", name: "Seating Arrangement & Puzzles", weight: 2 },
  { id: "SSC-GIR-09", name: "Venn Diagrams", weight: 2 },
  { id: "SSC-GIR-10", name: "Dice, Cubes & Paper Folding", weight: 2 },
  { id: "SSC-GIR-11", name: "Mathematical Operations", weight: 2 },
  { id: "SSC-GIR-12", name: "Mirror & Water Images", weight: 1 },
];

const GA: ExamTopic[] = [
  { id: "SSC-GA-01", name: "Indian History & Freedom Movement", weight: 3 },
  { id: "SSC-GA-02", name: "Indian Polity & Constitution", weight: 3 },
  { id: "SSC-GA-03", name: "Indian & World Geography", weight: 2 },
  { id: "SSC-GA-04", name: "Indian Economy", weight: 2 },
  { id: "SSC-GA-05", name: "General Science (Phy/Chem/Bio)", weight: 4 },
  { id: "SSC-GA-06", name: "Current Affairs", weight: 4 },
  { id: "SSC-GA-07", name: "Static GK (Days, Books, Capitals)", weight: 2 },
  { id: "SSC-GA-08", name: "Sports & Awards", weight: 1 },
  { id: "SSC-GA-09", name: "Government Schemes", weight: 2 },
  { id: "SSC-GA-10", name: "Computer Awareness", weight: 2 },
  { id: "SSC-GA-11", name: "Art & Culture", weight: 1 },
];

const QA: ExamTopic[] = [
  { id: "SSC-QA-01", name: "Number System & Simplification", weight: 3 },
  { id: "SSC-QA-02", name: "Percentage", weight: 3 },
  { id: "SSC-QA-03", name: "Profit, Loss & Discount", weight: 3 },
  { id: "SSC-QA-04", name: "Ratio, Proportion & Mixture", weight: 2 },
  { id: "SSC-QA-05", name: "Time & Work / Pipes & Cistern", weight: 3 },
  { id: "SSC-QA-06", name: "Time, Speed & Distance / Trains", weight: 3 },
  { id: "SSC-QA-07", name: "Simple & Compound Interest", weight: 2 },
  { id: "SSC-QA-08", name: "Algebra", weight: 2 },
  { id: "SSC-QA-09", name: "Geometry", weight: 3 },
  { id: "SSC-QA-10", name: "Mensuration (2D/3D)", weight: 2 },
  { id: "SSC-QA-11", name: "Trigonometry & Heights-Distances", weight: 2 },
  { id: "SSC-QA-12", name: "Data Interpretation (Tables/Charts)", weight: 2 },
  { id: "SSC-QA-13", name: "Average, Age & Partnership", weight: 2 },
];

const EC: ExamTopic[] = [
  { id: "SSC-EC-01", name: "Spotting Errors", weight: 3 },
  { id: "SSC-EC-02", name: "Fill in the Blanks", weight: 2 },
  { id: "SSC-EC-03", name: "Synonyms & Antonyms", weight: 3 },
  { id: "SSC-EC-04", name: "Idioms & Phrases", weight: 3 },
  { id: "SSC-EC-05", name: "One Word Substitution", weight: 2 },
  { id: "SSC-EC-06", name: "Spelling Correction", weight: 2 },
  { id: "SSC-EC-07", name: "Active / Passive Voice", weight: 2 },
  { id: "SSC-EC-08", name: "Direct / Indirect Speech", weight: 2 },
  { id: "SSC-EC-09", name: "Sentence Improvement / Para-jumbles", weight: 3 },
  { id: "SSC-EC-10", name: "Cloze Test & Reading Comprehension", weight: 3 },
];

const SCI: ExamTopic[] = [
  { id: "SCI-01", name: "Physics (Motion, Light, Electricity)", weight: 3 },
  { id: "SCI-02", name: "Chemistry (Acids, Bases, Metals)", weight: 3 },
  { id: "SCI-03", name: "Biology (Human Body, Diseases, Nutrition)", weight: 3 },
  { id: "SCI-04", name: "Everyday Science & Environment", weight: 1 },
];

/* UPSC-specific pool (official GS-1 syllabus) */
const UPSC: ExamTopic[] = [
  { id: "UPSC-01", name: "Current Events (National & International)", weight: 4 },
  { id: "UPSC-02", name: "Modern Indian History & Freedom Struggle", weight: 3 },
  { id: "UPSC-03", name: "Ancient & Medieval History + Art & Culture", weight: 2 },
  { id: "UPSC-04", name: "Indian Polity, Constitution & Governance", weight: 4 },
  { id: "UPSC-05", name: "Indian & World Geography", weight: 3 },
  { id: "UPSC-06", name: "Economy & Social Development", weight: 3 },
  { id: "UPSC-07", name: "Environment, Ecology & Biodiversity", weight: 3 },
  { id: "UPSC-08", name: "General Science & Technology", weight: 3 },
  { id: "UPSC-09", name: "Government Schemes & Policies", weight: 2 },
  { id: "UPSC-10", name: "International Relations & Organizations", weight: 2 },
];

/* NDA GAT pools */
const NDA_ENG: ExamTopic[] = [
  { id: "NDA-E1", name: "Grammar & Usage (Tenses, Articles, Prepositions)", weight: 3 },
  { id: "NDA-E2", name: "Vocabulary (Synonyms, Antonyms, Idioms)", weight: 3 },
  { id: "NDA-E3", name: "Reading Comprehension & Cohesion", weight: 3 },
  { id: "NDA-E4", name: "Spotting Errors & Sentence Ordering", weight: 2 },
];

/* CTET Paper-1 pools (official syllabus) */
const CDP: ExamTopic[] = [
  { id: "CTET-C1", name: "Child Development Theories (Piaget, Vygotsky, Kohlberg)", weight: 3 },
  { id: "CTET-C2", name: "Learning & Pedagogy", weight: 3 },
  { id: "CTET-C3", name: "Inclusive Education & Special Needs", weight: 2 },
  { id: "CTET-C4", name: "Language & Thought Acquisition", weight: 2 },
  { id: "CTET-C5", name: "Assessment & Evaluation (CCE, Feedback)", weight: 2 },
];
const LANG: ExamTopic[] = [
  { id: "CTET-L1", name: "Language Comprehension (Passages & Poems)", weight: 3 },
  { id: "CTET-L2", name: "Grammar & Language Usage", weight: 2 },
  { id: "CTET-L3", name: "Language Teaching Pedagogy", weight: 3 },
];
const CTET_MATH: ExamTopic[] = [
  { id: "CTET-M1", name: "Primary Maths Content (Numbers, Shapes, Data)", weight: 3 },
  { id: "CTET-M2", name: "Mathematics Pedagogy (How to teach, errors)", weight: 2 },
];
const CTET_EVS: ExamTopic[] = [
  { id: "CTET-V1", name: "EVS Content (Family, Food, Water, Shelter, Travel)", weight: 3 },
  { id: "CTET-V2", name: "EVS Pedagogy (Experiments, Discussion, Assessment)", weight: 2 },
];

/* ────────────────────────────────────────────
   THE 9 EXAMS — official pattern + syllabus + style guide
   ──────────────────────────────────────────── */

export const SSC_CGL_T1: ExamPattern = {
  id: "SSC-CGL-T1",
  name: "SSC CGL Tier 1",
  description: "Staff Selection Commission — Combined Graduate Level (Prelims)",
  totalQuestions: 100, totalMarks: 200, durationMin: 60, negativeMarking: 0.5,
  category: "competitive", gradient: "from-orange-500 to-red-600", icon: "🎯",
  style_guide:
    "Graduate-level. Reasoning uses standard SSC patterns (coding, series, analogy, puzzles). Quant is arithmetic+algebra+geometry+trig with clean integer answers. GK is factual recall (current affairs, polity, history, science). English tests grammar, vocab, comprehension. Each question solvable in 30-45 sec. Moderate difficulty with one clear answer.",
  sections: [
    { id: "SSC-CGL-T1-GIR", name: "General Intelligence & Reasoning", shortName: "Reasoning", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "violet", sortOrder: 1, topics: GIR },
    { id: "SSC-CGL-T1-GA", name: "General Awareness", shortName: "GK", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "amber", sortOrder: 2, topics: GA },
    { id: "SSC-CGL-T1-QA", name: "Quantitative Aptitude", shortName: "Quant", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "blue", sortOrder: 3, topics: QA },
    { id: "SSC-CGL-T1-EC", name: "English Comprehension", shortName: "English", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "emerald", sortOrder: 4, topics: EC },
  ],
};

export const SSC_CHSL_T1: ExamPattern = {
  id: "SSC-CHSL-T1",
  name: "SSC CHSL Tier 1",
  description: "Staff Selection Commission — Higher Secondary (10+2) Level",
  totalQuestions: 100, totalMarks: 200, durationMin: 60, negativeMarking: 0.5,
  category: "competitive", gradient: "from-sky-500 to-blue-600", icon: "🎓",
  style_guide:
    "12th-pass level — EASIER than CGL. Reasoning is simple (coding, analogy, series). Quant is basic arithmetic only (no advanced trig/geometry). English is grammar + vocab. GK is general awareness + current affairs. Questions short and direct, solvable in 25-40 sec.",
  sections: [
    { id: "SSC-CHSL-T1-GIR", name: "General Intelligence", shortName: "Reasoning", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "violet", sortOrder: 1, topics: GIR },
    { id: "SSC-CHSL-T1-EC", name: "English Language", shortName: "English", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "emerald", sortOrder: 2, topics: EC },
    { id: "SSC-CHSL-T1-QA", name: "Quantitative Aptitude", shortName: "Quant", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "blue", sortOrder: 3, topics: QA },
    { id: "SSC-CHSL-T1-GA", name: "General Awareness", shortName: "GK", questionCount: 25, marksPerQ: 2, timeLimitMin: null, color: "amber", sortOrder: 4, topics: GA },
  ],
};

export const SSC_GD: ExamPattern = {
  id: "SSC-GD",
  name: "SSC GD Constable",
  description: "Staff Selection Commission — General Duty (Constable) CBT",
  totalQuestions: 80, totalMarks: 160, durationMin: 60, negativeMarking: 0.25,
  category: "competitive", gradient: "from-amber-500 to-orange-600", icon: "🛡️",
  style_guide:
    "10th-pass level, SPEED-focused. Reasoning is very basic (coding, analogy, classification). Maths is elementary arithmetic (simplification, percentage, average). GK is Indian history/geography/current affairs/sports at school level. English/Hindi is basic grammar + vocab. Very short direct questions, solvable in 20-35 sec.",
  sections: [
    { id: "SSC-GD-GA", name: "General Knowledge & Awareness", shortName: "GK", questionCount: 20, marksPerQ: 2, timeLimitMin: null, color: "amber", sortOrder: 1, topics: GA },
    { id: "SSC-GD-GIR", name: "General Intelligence & Reasoning", shortName: "Reasoning", questionCount: 20, marksPerQ: 2, timeLimitMin: null, color: "violet", sortOrder: 2, topics: GIR },
    { id: "SSC-GD-QA", name: "Elementary Mathematics", shortName: "Maths", questionCount: 20, marksPerQ: 2, timeLimitMin: null, color: "blue", sortOrder: 3, topics: QA },
    { id: "SSC-GD-EC", name: "English / Hindi", shortName: "English", questionCount: 20, marksPerQ: 2, timeLimitMin: null, color: "emerald", sortOrder: 4, topics: EC },
  ],
};

export const BANK_PO_PRELIMS: ExamPattern = {
  id: "BANK-PO-PRELIMS",
  name: "Banking Prelims (IBPS/SBI)",
  description: "IBPS PO / Clerk & SBI PO — Preliminary Examination",
  totalQuestions: 100, totalMarks: 100, durationMin: 60, negativeMarking: 0.25,
  category: "competitive", gradient: "from-emerald-500 to-teal-600", icon: "🏦",
  style_guide:
    "SPEED + ACCURACY exam with sectional timing. Quant is calculation-heavy: simplification, approximation, number series, quadratic equations, data interpretation (bar/line/pie + caselets), arithmetic word problems. Reasoning is PUZZLE-heavy: seating arrangement, floor/box puzzles, syllogism, inequality, coding-decoding, input-output. English is comprehension + cloze test + error spotting + para-jumbles. Questions designed for 20-40 sec using shortcuts; avoid long manual calculation.",
  sections: [
    { id: "BANK-PO-EC", name: "English Language", shortName: "English", questionCount: 30, marksPerQ: 1, timeLimitMin: 20, color: "emerald", sortOrder: 1, topics: EC },
    { id: "BANK-PO-QA", name: "Quantitative Aptitude", shortName: "Quant", questionCount: 35, marksPerQ: 1, timeLimitMin: 20, color: "blue", sortOrder: 2, topics: QA },
    { id: "BANK-PO-GIR", name: "Reasoning Ability", shortName: "Reasoning", questionCount: 35, marksPerQ: 1, timeLimitMin: 20, color: "violet", sortOrder: 3, topics: GIR },
  ],
};

export const RRB_NTPC_CBT1: ExamPattern = {
  id: "RRB-NTPC-CBT1",
  name: "RRB NTPC (CBT-1)",
  description: "Railway Recruitment Board — Non-Technical Popular Categories",
  totalQuestions: 100, totalMarks: 100, durationMin: 90, negativeMarking: 0.33,
  category: "competitive", gradient: "from-cyan-500 to-sky-600", icon: "🚆",
  style_guide:
    "BASIC and DIRECT. Maths is school-level arithmetic (percentage, ratio, time-work, simple interest) with simple numbers. Reasoning is basic patterns (coding, direction, blood relations, Venn). General Awareness is the LARGEST section: current affairs, Indian geography, history, polity, and GENERAL SCIENCE (physics/chemistry/biology basics). Straightforward questions, solvable in 40-55 sec, no tricks.",
  sections: [
    { id: "RRB-NTPC-QA", name: "Mathematics", shortName: "Maths", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "blue", sortOrder: 1, topics: QA },
    { id: "RRB-NTPC-GIR", name: "General Intelligence & Reasoning", shortName: "Reasoning", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "violet", sortOrder: 2, topics: GIR },
    { id: "RRB-NTPC-GA", name: "General Awareness (incl. Science)", shortName: "GA", questionCount: 40, marksPerQ: 1, timeLimitMin: null, color: "amber", sortOrder: 3, topics: [...GA, ...SCI] },
  ],
};

export const RRB_GROUP_D: ExamPattern = {
  id: "RRB-GROUP-D",
  name: "RRB Group D",
  description: "Railway Recruitment Board — Level-1 Posts",
  totalQuestions: 100, totalMarks: 100, durationMin: 90, negativeMarking: 0.33,
  category: "competitive", gradient: "from-rose-500 to-pink-600", icon: "🛤️",
  style_guide:
    "10th-pass level, EASY-MODERATE. Maths is basic arithmetic (fractions, decimals, simple interest, average). Reasoning is simple (mirror images, paper folding, basic coding, classification). GENERAL SCIENCE is a full separate section (physics/chemistry/biology at school level). GA covers current affairs, Indian culture, sports, geography. Very direct questions, solvable in 30-50 sec.",
  sections: [
    { id: "RRB-GD-QA", name: "Mathematics", shortName: "Maths", questionCount: 25, marksPerQ: 1, timeLimitMin: null, color: "blue", sortOrder: 1, topics: QA },
    { id: "RRB-GD-GIR", name: "General Intelligence & Reasoning", shortName: "Reasoning", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "violet", sortOrder: 2, topics: GIR },
    { id: "RRB-GD-GS", name: "General Science", shortName: "Science", questionCount: 25, marksPerQ: 1, timeLimitMin: null, color: "teal", sortOrder: 3, topics: SCI },
    { id: "RRB-GD-GA", name: "General Awareness & Current Affairs", shortName: "GA", questionCount: 20, marksPerQ: 1, timeLimitMin: null, color: "amber", sortOrder: 4, topics: GA },
  ],
};

export const UPSC_PRELIMS_GS1: ExamPattern = {
  id: "UPSC-PRELIMS-GS1",
  name: "UPSC Prelims (GS-1)",
  description: "Civil Services Examination — General Studies Paper I",
  totalQuestions: 100, totalMarks: 200, durationMin: 120, negativeMarking: 0.33,
  category: "competitive", gradient: "from-blue-600 to-indigo-700", icon: "🏛️",
  style_guide:
    "ANALYTICAL and CONCEPTUAL — the hardest of all. Frequently use STATEMENT-BASED format ('Consider the following statements: 1... 2... Which is/are correct?'). Polity tests constitutional articles, amendments, bodies, rights with nuance. History tests causes/consequences, not just dates. Geography is map + concept based. Economy tests concepts + schemes + reports. Environment tests ecology, climate, biodiversity, conventions. Current Affairs are national/international importance. Questions are LONG (2-4 sentences), require elimination, solvable in 60-90 sec. NEVER simple one-line factual recall.",
  sections: [
    { id: "UPSC-HIST", name: "History & Culture", shortName: "History", questionCount: 15, marksPerQ: 2, timeLimitMin: null, color: "amber", sortOrder: 1, topics: [UPSC[2], UPSC[1]] },
    { id: "UPSC-POL", name: "Polity & Governance", shortName: "Polity", questionCount: 15, marksPerQ: 2, timeLimitMin: null, color: "violet", sortOrder: 2, topics: [UPSC[3]] },
    { id: "UPSC-GEO", name: "Geography", shortName: "Geography", questionCount: 15, marksPerQ: 2, timeLimitMin: null, color: "teal", sortOrder: 3, topics: [UPSC[4]] },
    { id: "UPSC-ECO", name: "Economy & Development", shortName: "Economy", questionCount: 12, marksPerQ: 2, timeLimitMin: null, color: "emerald", sortOrder: 4, topics: [UPSC[5], UPSC[8]] },
    { id: "UPSC-ENV", name: "Environment & Ecology", shortName: "Environment", questionCount: 12, marksPerQ: 2, timeLimitMin: null, color: "green", sortOrder: 5, topics: [UPSC[6]] },
    { id: "UPSC-ST", name: "Science & Technology", shortName: "Sci-Tech", questionCount: 12, marksPerQ: 2, timeLimitMin: null, color: "cyan", sortOrder: 6, topics: [UPSC[7]] },
    { id: "UPSC-CA", name: "Current Affairs & IR", shortName: "Current", questionCount: 19, marksPerQ: 2, timeLimitMin: null, color: "rose", sortOrder: 7, topics: [UPSC[0], UPSC[9]] },
  ],
};

export const NDA_GAT: ExamPattern = {
  id: "NDA-GAT",
  name: "NDA Paper-2 (GAT)",
  description: "National Defence Academy — General Ability Test",
  totalQuestions: 150, totalMarks: 600, durationMin: 150, negativeMarking: 0.33,
  category: "competitive", gradient: "from-green-500 to-emerald-600", icon: "⚔️",
  style_guide:
    "12th-level across many subjects. English (50 Qs) is grammar + vocab + comprehension with formal/military tone. Physics/Chemistry/Biology test NCERT concepts, application-based where possible. History focuses on Indian freedom struggle + world wars. Geography is physical + Indian. Current affairs are defence + national. Moderate difficulty, mix of factual and conceptual, solvable in 45-60 sec.",
  sections: [
    { id: "NDA-EC", name: "English", shortName: "English", questionCount: 50, marksPerQ: 4, timeLimitMin: null, color: "emerald", sortOrder: 1, topics: NDA_ENG },
    { id: "NDA-PHY", name: "Physics", shortName: "Physics", questionCount: 25, marksPerQ: 4, timeLimitMin: null, color: "cyan", sortOrder: 2, topics: [SCI[0]] },
    { id: "NDA-CHE", name: "Chemistry", shortName: "Chemistry", questionCount: 15, marksPerQ: 4, timeLimitMin: null, color: "teal", sortOrder: 3, topics: [SCI[1]] },
    { id: "NDA-BIO", name: "Biology & General Science", shortName: "Biology", questionCount: 15, marksPerQ: 4, timeLimitMin: null, color: "green", sortOrder: 4, topics: [SCI[2], SCI[3]] },
    { id: "NDA-HIS", name: "History & Polity", shortName: "History", questionCount: 20, marksPerQ: 4, timeLimitMin: null, color: "amber", sortOrder: 5, topics: [GA[0], GA[1], GA[10]] },
    { id: "NDA-GEO", name: "Geography & Current Affairs", shortName: "Geo/CA", questionCount: 25, marksPerQ: 4, timeLimitMin: null, color: "rose", sortOrder: 6, topics: [GA[2], GA[5], GA[6]] },
  ],
};

export const CTET_PAPER1: ExamPattern = {
  id: "CTET-PAPER1",
  name: "CTET Paper-I",
  description: "Central Teacher Eligibility Test — Primary Stage (Class I-V)",
  totalQuestions: 150, totalMarks: 150, durationMin: 150, negativeMarking: 0,
  category: "competitive", gradient: "from-fuchsia-500 to-purple-600", icon: "👩‍🏫",
  style_guide:
    "TEACHING-APTITUDE exam for primary teachers — NO negative marking. Child Development tests theories (Piaget, Vygotsky, Kohlberg), learning psychology, inclusive education. Language sections test pedagogy (how to teach language) + comprehension. Maths/EVS test BOTH content (Class 1-5 level) AND pedagogy (how to teach, common child errors, assessment). Many questions are SCENARIO-based ('A teacher notices... What should she do?'). Conceptual, not factual recall. Solvable in 45-60 sec.",
  sections: [
    { id: "CTET-CDP", name: "Child Development & Pedagogy", shortName: "CDP", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "violet", sortOrder: 1, topics: CDP },
    { id: "CTET-L1", name: "Language I", shortName: "Lang-I", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "emerald", sortOrder: 2, topics: LANG },
    { id: "CTET-L2", name: "Language II", shortName: "Lang-II", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "teal", sortOrder: 3, topics: LANG },
    { id: "CTET-MATH", name: "Mathematics", shortName: "Maths", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "blue", sortOrder: 4, topics: CTET_MATH },
    { id: "CTET-EVS", name: "Environmental Studies", shortName: "EVS", questionCount: 30, marksPerQ: 1, timeLimitMin: null, color: "green", sortOrder: 5, topics: CTET_EVS },
  ],
};

export const ALL_EXAMS: ExamPattern[] = [
  SSC_CGL_T1, SSC_CHSL_T1, SSC_GD, BANK_PO_PRELIMS, RRB_NTPC_CBT1,
  RRB_GROUP_D, UPSC_PRELIMS_GS1, NDA_GAT, CTET_PAPER1,
];

export function getExamById(id: string): ExamPattern | undefined {
  return ALL_EXAMS.find((e) => e.id === id);
}