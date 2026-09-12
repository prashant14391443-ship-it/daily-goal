// 🔥 ZERO-COST QUIZ BANK: curated by us, served before any AI call.
export interface LocalQuizQ { q: string; options: string[]; correct: number; explain: string; }

export const LOCAL_QUIZ: Record<string, LocalQuizQ[]> = {
  "WD-1": [
    { q: "Which tag creates the MOST important heading on a page?", options: ["<head>", "<h6>", "<h1>", "<header>"], correct: 2, explain: "h1 = top-level heading; header is a semantic container, head is metadata." },
    { q: "Space INSIDE an element (between content and border) is called?", options: ["margin", "padding", "gap", "outline"], correct: 1, explain: "Padding = inside space, margin = outside space." },
    { q: "In Flexbox, which property aligns items along the MAIN axis?", options: ["align-items", "justify-content", "place-self", "flex-wrap"], correct: 1, explain: "justify-content = main axis; align-items = cross axis." },
    { q: "Which is a SEMANTIC HTML tag?", options: ["<div>", "<span>", "<nav>", "<b>"], correct: 2, explain: "nav describes its purpose (navigation) to browsers & screen readers." },
  ],
  "WD-2": [
    { q: "Tailwind CSS is best described as?", options: ["Component library", "Utility-first CSS framework", "CSS preprocessor", "JS framework"], correct: 1, explain: "Tailwind = small single-purpose utility classes composed in HTML." },
    { q: "Which class applies padding-4 only on medium screens and up?", options: ["p-md-4", "md:p-4", "md-p-4", "p-4:md"], correct: 1, explain: "Breakpoint prefix + colon: md:p-4 (mobile-first)." },
    { q: "Mobile-first means:", options: ["Styles written for desktop first", "Base styles target mobile, prefixes add larger screens", "Only mobile works", "Use px everywhere"], correct: 1, explain: "Base = mobile; sm:/md:/lg: progressively enhance." },
    { q: "Class to stack flex children vertically?", options: ["flex-row", "flex-col", "col-flex", "vertical"], correct: 1, explain: "flex-col sets flex-direction: column." },
  ],
  "WD-3": [
    { q: "Which array method adds an item to the END?", options: ["shift()", "pop()", "push()", "unshift()"], correct: 2, explain: "push adds to end; pop removes from end." },
    { q: "typeof null returns?", options: ["'null'", "'undefined'", "'object'", "'number'"], correct: 2, explain: "Historic JS quirk: typeof null === 'object'." },
    { q: "localStorage stores values as?", options: ["objects", "strings", "numbers", "blobs"], correct: 1, explain: "Everything is stringified; parse when reading." },
    { q: "Which method returns a NEW transformed array?", options: ["forEach", "map", "sort", "splice"], correct: 1, explain: "map returns new array; forEach returns undefined." },
  ],
  "WD-4": [
    { q: "fetch() immediately returns?", options: ["JSON data", "A Promise", "A string", "An array"], correct: 1, explain: "fetch returns a Promise of a Response." },
    { q: "Which keyword pauses an async function until a Promise settles?", options: ["wait", "await", "hold", "yield"], correct: 1, explain: "await unwraps a Promise inside async functions." },
    { q: "HTTP status code for 'Not Found'?", options: ["200", "301", "404", "500"], correct: 2, explain: "404 = resource missing; 500 = server error." },
    { q: "try/catch is used to?", options: ["Loop faster", "Handle runtime errors", "Define variables", "Style errors"], correct: 1, explain: "catch receives thrown errors so app doesn't crash." },
  ],
  "WD-5": [
    { q: "Which hook stores local state in a component?", options: ["useEffect", "useState", "useRef", "useMemo"], correct: 1, explain: "useState returns [value, setter]." },
    { q: "useEffect with an EMPTY dependency array runs:", options: ["Every render", "Once after first render", "Never", "Only on unmount"], correct: 1, explain: "[] = mount-only effect." },
    { q: "Props are:", options: ["Mutable state", "Read-only inputs from parent", "Global variables", "Hooks"], correct: 1, explain: "Never mutate props; lift state up instead." },
    { q: "Keys in lists help React:", options: ["Style items", "Identify items across renders", "Sort items", "Fetch items"], correct: 1, explain: "Stable keys = correct reconciliation, no buggy re-renders." },
  ],
  "WD-6": [
    { q: "In Next.js App Router, components are by default:", options: ["Client Components", "Server Components", "Static HTML only", "Workers"], correct: 1, explain: "Server Components render on server; add 'use client' for interactivity." },
    { q: "Which file creates the route /blog/[slug]?", options: ["app/blog/slug/page.tsx", "app/blog/[slug]/page.tsx", "pages/blog/[slug].js only", "routes/blog.ts"], correct: 1, explain: "Folder name in brackets = dynamic segment." },
    { q: "'use client' at top of a file means:", options: ["File runs only in terminal", "File opts into client-side rendering/interactivity", "File is private", "File skips build"], correct: 1, explain: "Marks the boundary where client JS bundle starts." },
    { q: "Per-page SEO title/description is set via:", options: ["<title> in layout only", "export const metadata", "document.title in useEffect always", "next/head in every page"], correct: 1, explain: "App Router: export metadata object from page/layout." },
  ],
  "WD-7": [
    { q: "Supabase is built on top of which database?", options: ["MySQL", "MongoDB", "PostgreSQL", "SQLite"], correct: 2, explain: "Supabase = hosted Postgres + auth + storage + realtime." },
    { q: "RLS stands for:", options: ["Realtime Live Sync", "Row Level Security", "Remote Login Service", "Read Limit System"], correct: 1, explain: "RLS policies enforce per-row access in the DB itself." },
    { q: "Secret keys (service role) must live in:", options: ["Client code", "localStorage", "Server environment variables", "GitHub README"], correct: 2, explain: "Anything shipped to browser is public. Server env only." },
    { q: "Which SDK call adds a new row?", options: [".select()", ".insert()", ".update()", ".delete()"], correct: 1, explain: "insert() creates rows; update() modifies existing." },
  ],
  "WD-8": [
    { q: "Which command sends local commits to GitHub?", options: ["git commit", "git push", "git pull", "git add"], correct: 1, explain: "push uploads commits; pull downloads." },
    { q: "Create AND switch to a new branch in one command:", options: ["git branch new", "git checkout -b new", "git merge new", "git init new"], correct: 1, explain: "checkout -b (or git switch -c) creates + switches." },
    { q: "Vercel environment secrets are configured in:", options: ["package.json", "Vercel dashboard Environment Variables", "index.html", ".git folder"], correct: 1, explain: "Dashboard env vars inject at build/runtime, never in repo." },
    { q: "CI/CD means:", options: ["Code Inspection / Code Delivery", "Continuous Integration / Continuous Deployment", "Central Index / Cache Data", "Compiled Input / Compiled Output"], correct: 1, explain: "Automated test/build on push + automated deploy." },
  ],
};