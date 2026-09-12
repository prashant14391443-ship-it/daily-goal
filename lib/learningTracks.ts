// ==========================================
// LEARNING TRACKS (V1: hardcoded, fast to ship)
// ==========================================

export interface TrackResource {
  id: string;
  title: string;
  provider: string;
  lang: "hindi" | "english";
  type: "video" | "interactive" | "docs";
  url: string;
  minutes: number;
}

export interface TrackProject {
  title: string;
  brief: string;
  acceptanceCriteria: string[];
}

export interface TrackMilestone {
  id: string;
  order: number;
  title: string;
  summary: string; // Hinglish
  estimatedHours: number;
  resources: TrackResource[];
  project: TrackProject;
  aiQuizTopics: string[];
}

export interface LearningTrack {
  id: string;
  name: string;
  tagline: string;
  language: "hinglish";
  milestones: TrackMilestone[];
}

export const WEB_DEV_TRACK: LearningTrack = {
  id: "web-dev",
  name: "Web Development (Zero → Job Ready)",
  tagline: "8 milestones · real projects · Hinglish + English resources",
  language: "hinglish",
  milestones: [
    {
      id: "WD-1", order: 1, title: "HTML & CSS Foundations",
      summary: "Web ka skeleton HTML se banta hai aur skin CSS se. Semantic tags, box model, Flexbox aur Grid master karo.",
      estimatedHours: 20,
      resources: [
        { id: "WD-1-R1", title: "HTML Full Course (Hindi)", provider: "CodeWithHarry", lang: "hindi", type: "video", url: "https://www.youtube.com/playlist?list=PLu0W_9lII9kV5fRIr8IjJsB9Pz6p1526C", minutes: 180 },
        { id: "WD-1-R2", title: "Responsive Web Design Certification", provider: "freeCodeCamp", lang: "english", type: "interactive", url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/", minutes: 300 },
        { id: "WD-1-R3", title: "Flexbox Froggy + Grid Garden (games)", provider: "Flexbox Froggy", lang: "english", type: "interactive", url: "https://flexboxfroggy.com/", minutes: 45 },
        { id: "WD-1-R4", title: "CSS Box Model & Layout docs", provider: "MDN", lang: "english", type: "docs", url: "https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/The_box_model", minutes: 40 },
      ],
      project: {
        title: "Linktree Clone",
        brief: "Apna personal links page banao — profile photo, 5 buttons, dark theme. Sirf HTML + CSS, koi framework nahi.",
        acceptanceCriteria: [
          "Semantic tags use kiye (header, main, footer)",
          "Flexbox se center alignment",
          "Mobile + desktop dono pe clean dikhe",
          "Hover effects buttons pe",
        ],
      },
      aiQuizTopics: ["HTML5 semantic tags", "CSS box model", "Flexbox alignment", "CSS Grid basics"],
    },
    {
      id: "WD-2", order: 2, title: "Tailwind CSS & Responsive Design",
      summary: "Aaj ke time me utility-first CSS king hai. Tailwind se fast, consistent aur responsive UI banana seekho.",
      estimatedHours: 10,
      resources: [
        { id: "WD-2-R1", title: "Tailwind CSS Full Course (Hindi)", provider: "Chai aur Code", lang: "hindi", type: "video", url: "https://www.youtube.com/watch?v=9rcRb3wYbWk", minutes: 120 },
        { id: "WD-2-R2", title: "Official Tailwind Docs (start here)", provider: "Tailwind", lang: "english", type: "docs", url: "https://tailwindcss.com/docs", minutes: 60 },
        { id: "WD-2-R3", title: "Learn Tailwind in 15 minutes", provider: "Web Dev Simplified", lang: "english", type: "video", url: "https://www.youtube.com/watch?v=lCxcTsOHrjo", minutes: 15 },
      ],
      project: {
        title: "Responsive Pricing Page",
        brief: "3 pricing cards wala page jo mobile pe stack ho aur desktop pe row me ho. Dark mode toggle bonus.",
        acceptanceCriteria: [
          "Tailwind breakpoints use kiye (sm/md/lg)",
          "Mobile-first approach",
          "Dark mode variant support",
        ],
      },
      aiQuizTopics: ["Tailwind breakpoints", "utility-first vs traditional CSS", "responsive prefixes", "dark mode variant"],
    },
    {
      id: "WD-3", order: 3, title: "JavaScript Fundamentals + DOM",
      summary: "JS web ka dimaag hai. Variables se lekar DOM manipulation tak — yahi se asli programming shuru hoti hai.",
      estimatedHours: 30,
      resources: [
        { id: "WD-3-R1", title: "JavaScript Playlist (Hindi)", provider: "CodeWithHarry", lang: "hindi", type: "video", url: "https://www.youtube.com/playlist?list=PLu0W_9lII9kV5fRIr8IjJsB9Pz6p1526C", minutes: 400 },
        { id: "WD-3-R2", title: "JavaScript First Steps", provider: "MDN", lang: "english", type: "docs", url: "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/First_steps", minutes: 90 },
        { id: "WD-3-R3", title: "DOM Manipulation practice", provider: "freeCodeCamp", lang: "english", type: "interactive", url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/", minutes: 240 },
      ],
      project: {
        title: "To-Do List App",
        brief: "Add, delete, mark-complete aur LocalStorage me save karne wala to-do app. Pure JS, no framework.",
        acceptanceCriteria: [
          "Add + delete + toggle complete works",
          "LocalStorage me persist hota hai",
          "Empty state message dikhta hai",
        ],
      },
      aiQuizTopics: ["array methods map filter reduce", "DOM events", "localStorage API", "let vs const vs var"],
    },
    {
      id: "WD-4", order: 4, title: "Async JS, APIs & Fetch",
      summary: "Real apps servers se data maangte hain. Promises, async/await aur fetch API — interviews ka favourite topic.",
      estimatedHours: 20,
      resources: [
        { id: "WD-4-R1", title: "Namaste JavaScript (Hinglish, deep)", provider: "Akshay Saini", lang: "hindi", type: "video", url: "https://www.youtube.com/playlist?list=PLlasXeu85E9cQ32gLCvAvr9vNaUccPVNP", minutes: 300 },
        { id: "WD-4-R2", title: "Fetch API guide", provider: "MDN", lang: "english", type: "docs", url: "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch", minutes: 45 },
        { id: "WD-4-R3", title: "Async/Await crash course", provider: "Web Dev Simplified", lang: "english", type: "video", url: "https://www.youtube.com/watch?v=V_Kr9OSfDeU", minutes: 20 },
      ],
      project: {
        title: "Weather Dashboard",
        brief: "City search karo → live weather dikhao (OpenWeatherMap free API). Loading + error states zaroori.",
        acceptanceCriteria: [
          "fetch + async/await use kiya",
          "Loading spinner dikhta hai",
          "Error handle hota hai (galat city)",
        ],
      },
      aiQuizTopics: ["event loop", "promises", "async await", "HTTP methods GET POST", "error handling try catch"],
    },
    {
      id: "WD-5", order: 5, title: "React Foundations",
      summary: "Components me sochna seekho. State, props aur hooks — modern frontend ka core.",
      estimatedHours: 30,
      resources: [
        { id: "WD-5-R1", title: "Chai aur React (Hinglish)", provider: "Chai aur Code", lang: "hindi", type: "video", url: "https://www.youtube.com/playlist?list=PLu71SKxNbfoDqgPchmvIsL4hTnJIrtige", minutes: 360 },
        { id: "WD-5-R2", title: "Official React Tutorial", provider: "react.dev", lang: "english", type: "interactive", url: "https://react.dev/learn/tutorial-tic-tac-toe", minutes: 90 },
        { id: "WD-5-R3", title: "useState & useEffect deep dive", provider: "Web Dev Simplified", lang: "english", type: "video", url: "https://www.youtube.com/watch?v=0ZJgIjIuY7U", minutes: 30 },
      ],
      project: {
        title: "Movie Search App",
        brief: "OMDB API se movies search karo, cards me dikhao, favourite list state me manage karo.",
        acceptanceCriteria: [
          "Components me split hai (SearchBar, MovieCard, List)",
          "useState + useEffect sahi jagah",
          "API call React ke andar handle hui",
        ],
      },
      aiQuizTopics: ["virtual DOM", "useState vs useRef", "props drilling", "useEffect dependency array", "keys in lists"],
    },
    {
      id: "WD-6", order: 6, title: "Next.js & Routing",
      summary: "React ke upar production layer. App Router, server vs client components — jobs me yahi maanga jaata hai.",
      estimatedHours: 20,
      resources: [
        { id: "WD-6-R1", title: "Next.js Official Learn Course", provider: "next.js", lang: "english", type: "interactive", url: "https://nextjs.org/learn", minutes: 240 },
        { id: "WD-6-R2", title: "Chai aur Next.js (Hinglish)", provider: "Chai aur Code", lang: "hindi", type: "video", url: "https://www.youtube.com/playlist?list=PLu71SKxNbfoQ7BI8FzJ0MUHJsKKrG6GPD", minutes: 200 },
      ],
      project: {
        title: "Multi-page Blog",
        brief: "Home + blog list + dynamic blog post pages. Static generation use karo, dynamic routes [slug] banao.",
        acceptanceCriteria: [
          "App Router file structure sahi",
          "Dynamic route [slug] kaam karta hai",
          "Metadata/SEO per page",
        ],
      },
      aiQuizTopics: ["SSR vs SSG vs CSR", "App Router", "server vs client components", "dynamic routes", "metadata API"],
    },
    {
      id: "WD-7", order: 7, title: "Backend + Database (Supabase)",
      summary: "Full-stack bano: auth, database, CRUD. Supabase se bina server manage kiye backend chalao.",
      estimatedHours: 25,
      resources: [
        { id: "WD-7-R1", title: "Supabase Crash Course", provider: "Traversy Media", lang: "english", type: "video", url: "https://www.youtube.com/watch?v=ZVsuKXcRwDo", minutes: 60 },
        { id: "WD-7-R2", title: "Supabase Docs (auth + database)", provider: "Supabase", lang: "english", type: "docs", url: "https://supabase.com/docs", minutes: 120 },
        { id: "WD-7-R3", title: "SQL basics (Hindi)", provider: "CodeWithHarry", lang: "hindi", type: "video", url: "https://www.youtube.com/playlist?list=PLu0W_9lII9kVL3k0lV0nJmBSK0XZV0v0k", minutes: 120 },
      ],
      project: {
        title: "Full-Stack Habit Tracker",
        brief: "Login → habits add/edit/delete → dashboard. Data Supabase me, RLS policies ke saath.",
        acceptanceCriteria: [
          "Email auth kaam karta hai",
          "CRUD Supabase table me",
          "RLS policy lagi hai (sirf apna data)",
        ],
      },
      aiQuizTopics: ["SQL joins", "row level security", "CRUD", "JWT sessions", "environment variables"],
    },
    {
      id: "WD-8", order: 8, title: "Git, Deployment & Portfolio",
      summary: "Code ko duniya tak pahuncho: GitHub workflow, Vercel deploy, aur ek portfolio jo interviews bulaye.",
      estimatedHours: 15,
      resources: [
        { id: "WD-8-R1", title: "Learn Git Branching (interactive)", provider: "Git", lang: "english", type: "interactive", url: "https://learngitbranching.js.org/", minutes: 90 },
        { id: "WD-8-R2", title: "Git & GitHub (Hindi)", provider: "CodeWithHarry", lang: "hindi", type: "video", url: "https://www.youtube.com/watch?v=gwS9ZQVJmAk", minutes: 90 },
        { id: "WD-8-R3", title: "Vercel deployment docs", provider: "Vercel", lang: "english", type: "docs", url: "https://vercel.com/docs", minutes: 30 },
      ],
      project: {
        title: "Capstone Portfolio (DEPLOYED)",
        brief: "Apne 3 best projects Vercel pe deploy karo + ek portfolio site banao jisme wo sab linked hon. Live links = proof of work.",
        acceptanceCriteria: [
          "3+ projects live URLs ke saath",
          "Portfolio site deployed",
          "GitHub profile clean + pinned repos",
          "README har project me",
        ],
      },
      aiQuizTopics: ["git workflow branch merge", "CI/CD basics", "environment variables in production", "custom domains"],
    },
  ],
};

export const TRACKS: LearningTrack[] = [WEB_DEV_TRACK];
export function getTrackById(id: string) { return TRACKS.find((t) => t.id === id); }

// ==========================================
// PLAN ENGINE
// ==========================================
export interface ScheduleSlot { milestone: TrackMilestone; startDay: number; endDay: number; }

export function buildSchedule(track: LearningTrack, hoursPerDay: number): ScheduleSlot[] {
  let day = 1;
  return track.milestones.map((m) => {
    const days = Math.max(1, Math.ceil(m.estimatedHours / Math.max(0.5, hoursPerDay)));
    const slot = { milestone: m, startDay: day, endDay: day + days - 1 };
    day += days;
    return slot;
  });
}

export function dayNumber(startDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1);
}

export function trackTotalHours(track: LearningTrack): number {
  return track.milestones.reduce((n, m) => n + m.estimatedHours, 0);
}