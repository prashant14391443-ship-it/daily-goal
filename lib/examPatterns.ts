// Exam metadata + section definitions (matches the SQL seed above)

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
  description: string;
  totalQuestions: number;
  totalMarks: number;
  durationMin: number;
  negativeMarking: number;
  category: "competitive" | "university";
  gradient: string;
  icon: string;
  sections: ExamSection[];
};

export const SSC_CGL_T1: ExamPattern = {
  id: "SSC-CGL-T1",
  name: "SSC CGL Tier 1",
  description: "Staff Selection Commission — Combined Graduate Level (Prelims)",
  totalQuestions: 100,
  totalMarks: 200,
  durationMin: 60,
  negativeMarking: 0.5,
  category: "competitive",
  gradient: "from-orange-500 via-red-500 to-pink-600",
  icon: "Target",
  sections: [
    {
      id: "SSC-CGL-T1-GIR",
      name: "General Intelligence & Reasoning",
      shortName: "Reasoning",
      questionCount: 25,
      marksPerQ: 2,
      timeLimitMin: null,
      color: "violet",
      sortOrder: 1,
      topics: [
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
      ],
    },
    {
      id: "SSC-CGL-T1-GA",
      name: "General Awareness",
      shortName: "GK",
      questionCount: 25,
      marksPerQ: 2,
      timeLimitMin: null,
      color: "amber",
      sortOrder: 2,
      topics: [
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
      ],
    },
    {
      id: "SSC-CGL-T1-QA",
      name: "Quantitative Aptitude",
      shortName: "Quant",
      questionCount: 25,
      marksPerQ: 2,
      timeLimitMin: null,
      color: "blue",
      sortOrder: 3,
      topics: [
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
      ],
    },
    {
      id: "SSC-CGL-T1-EC",
      name: "English Comprehension",
      shortName: "English",
      questionCount: 25,
      marksPerQ: 2,
      timeLimitMin: null,
      color: "emerald",
      sortOrder: 4,
      topics: [
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
      ],
    },
  ],
};

export const ALL_EXAMS: ExamPattern[] = [SSC_CGL_T1];

export function getExamById(id: string): ExamPattern | undefined {
  return ALL_EXAMS.find((e) => e.id === id);
}