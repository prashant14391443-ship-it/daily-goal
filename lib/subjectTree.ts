// Exam → Subject → Topic hierarchy
export type TopicTree = {
  id: string;
  name: string;
  category: "competitive" | "university";
  color: string; // gradient tailwind classes
  subjects: {
    name: string;
    topics: string[];
  }[];
};

export const EXAMS: TopicTree[] = [
  // ── COMPETITIVE EXAMS ──
  {
    id: "GATE-CS",
    name: "GATE Computer Science",
    category: "competitive",
    color: "from-blue-600 to-indigo-600",
    subjects: [
      {
        name: "Data Structures",
        topics: ["Arrays", "Linked Lists", "Stacks & Queues", "Trees", "Graphs", "Hashing", "Heaps"],
      },
      {
        name: "Algorithms",
        topics: ["Sorting", "Searching", "Dynamic Programming", "Greedy Algorithms", "Graph Algorithms", "Divide & Conquer"],
      },
      {
        name: "Operating Systems",
        topics: ["Process Management", "CPU Scheduling", "Memory Management", "Deadlocks", "File Systems", "Synchronization"],
      },
      {
        name: "DBMS",
        topics: ["ER Model", "Relational Model", "SQL", "Normalization", "Transactions", "Indexing"],
      },
      {
        name: "Computer Networks",
        topics: ["OSI Model", "TCP/IP", "Routing", "Transport Layer", "Application Layer", "Network Security"],
      },
      {
        name: "Digital Logic",
        topics: ["Boolean Algebra", "Combinational Circuits", "Sequential Circuits", "Number Systems"],
      },
    ],
  },
  {
    id: "SSC-CGL",
    name: "SSC CGL",
    category: "competitive",
    color: "from-orange-500 to-red-600",
    subjects: [
      {
        name: "Quantitative Aptitude",
        topics: ["Number System", "Percentage", "Profit & Loss", "Time & Work", "Time Speed Distance", "Simple Interest", "Compound Interest", "Geometry", "Algebra", "Trigonometry"],
      },
      {
        name: "Reasoning",
        topics: ["Analogy", "Classification", "Series", "Coding-Decoding", "Blood Relations", "Direction", "Seating Arrangement", "Syllogism"],
      },
      {
        name: "English",
        topics: ["Synonyms", "Antonyms", "Idioms", "One Word Substitution", "Spotting Errors", "Sentence Improvement", "Cloze Test"],
      },
      {
        name: "General Awareness",
        topics: ["Indian History", "Geography", "Polity", "Economics", "Science", "Current Affairs"],
      },
    ],
  },
  {
    id: "RRB-NTPC",
    name: "RRB NTPC",
    category: "competitive",
    color: "from-emerald-500 to-green-600",
    subjects: [
      {
        name: "Mathematics",
        topics: ["Number System", "Decimals", "Fractions", "LCM HCF", "Ratio Proportion", "Percentage", "Mensuration", "Time & Work", "Time & Distance", "SI & CI"],
      },
      {
        name: "General Intelligence",
        topics: ["Analogies", "Coding-Decoding", "Mathematical Operations", "Series", "Relationships", "Syllogism", "Jumbling", "Venn Diagram"],
      },
      {
        name: "General Awareness",
        topics: ["Current Events", "Games & Sports", "Art & Culture", "Indian Literature", "Monuments", "General Science", "Indian History"],
      },
    ],
  },
  {
    id: "SBI-PO",
    name: "SBI PO",
    category: "competitive",
    color: "from-cyan-500 to-blue-600",
    subjects: [
      {
        name: "Quantitative Aptitude",
        topics: ["Simplification", "Number Series", "Data Interpretation", "Quadratic Equations", "Mensuration", "Probability"],
      },
      {
        name: "Reasoning",
        topics: ["Puzzles", "Seating Arrangement", "Syllogism", "Inequality", "Coding-Decoding", "Blood Relations"],
      },
      {
        name: "English",
        topics: ["Reading Comprehension", "Cloze Test", "Error Spotting", "Para Jumbles", "Fill in the Blanks"],
      },
    ],
  },
  // ── UNIVERSITY EXAMS ──
  {
    id: "BTECH-CSE",
    name: "B.Tech CSE",
    category: "university",
    color: "from-violet-500 to-purple-600",
    subjects: [
      {
        name: "Data Structures",
        topics: ["Arrays", "Linked Lists", "Stacks", "Queues", "Trees", "Graphs", "Hashing"],
      },
      {
        name: "DBMS",
        topics: ["ER Diagram", "Normalization", "SQL", "Transactions", "Concurrency Control"],
      },
      {
        name: "Operating Systems",
        topics: ["Process Scheduling", "Deadlock", "Memory Management", "Virtual Memory", "File Systems"],
      },
      {
        name: "Computer Networks",
        topics: ["OSI Model", "TCP/IP", "IP Addressing", "Routing", "Transport Layer"],
      },
      {
        name: "Software Engineering",
        topics: ["SDLC Models", "Requirements Engineering", "Design Patterns", "Testing", "Agile"],
      },
      {
        name: "Compiler Design",
        topics: ["Lexical Analysis", "Parsing", "Syntax Directed Translation", "Code Optimization"],
      },
    ],
  },
  {
    id: "BCA",
    name: "BCA",
    category: "university",
    color: "from-pink-500 to-rose-600",
    subjects: [
      {
        name: "Programming in C",
        topics: ["Data Types", "Control Statements", "Functions", "Arrays", "Pointers", "Structures"],
      },
      {
        name: "Data Structures",
        topics: ["Arrays", "Linked Lists", "Stacks", "Queues", "Trees"],
      },
      {
        name: "Database Systems",
        topics: ["ER Model", "SQL", "Normalization", "Transactions"],
      },
      {
        name: "Web Technology",
        topics: ["HTML", "CSS", "JavaScript", "PHP", "Node.js"],
      },
      {
        name: "Computer Networks",
        topics: ["OSI Model", "TCP/IP", "IP Addressing"],
      },
    ],
  },
  {
    id: "BBA",
    name: "BBA",
    category: "university",
    color: "from-amber-500 to-orange-600",
    subjects: [
      {
        name: "Principles of Management",
        topics: ["Functions of Management", "Planning", "Organizing", "Staffing", "Directing", "Controlling"],
      },
      {
        name: "Business Economics",
        topics: ["Demand & Supply", "Market Structures", "National Income", "Inflation"],
      },
      {
        name: "Financial Accounting",
        topics: ["Journal Entries", "Ledger", "Trial Balance", "Financial Statements"],
      },
      {
        name: "Marketing Management",
        topics: ["4Ps", "Consumer Behavior", "Market Segmentation", "Branding"],
      },
    ],
  },
  {
    id: "BCOM",
    name: "B.Com",
    category: "university",
    color: "from-teal-500 to-cyan-600",
    subjects: [
      {
        name: "Financial Accounting",
        topics: ["Journal Entries", "Ledger", "Trial Balance", "Final Accounts"],
      },
      {
        name: "Business Law",
        topics: ["Indian Contract Act", "Sale of Goods Act", "Companies Act"],
      },
      {
        name: "Cost Accounting",
        topics: ["Cost Sheet", "Marginal Costing", "Standard Costing", "Budgeting"],
      },
      {
        name: "Income Tax",
        topics: ["Residential Status", "Heads of Income", "Deductions", "Tax Computation"],
      },
    ],
  },
];

export const DIFFICULTIES = [
  { id: "easy", label: "Easy", color: "text-green-400 bg-green-500/15 border-green-500/30" },
  { id: "medium", label: "Medium", color: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
  { id: "hard", label: "Hard", color: "text-red-400 bg-red-500/15 border-red-500/30" },
];