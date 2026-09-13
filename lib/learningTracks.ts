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
  summary: string;
  estimatedHours: number;
  resources: TrackResource[];
  project: TrackProject;
  aiCoachPrompts: string[];
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
  name: "Full Stack Web Development",
  tagline: "Zero se job-ready · 8 milestones · real projects · AI coach",
  language: "hinglish",
  milestones: [
    {
      id: "WD-1",
      order: 1,
      title: "HTML & CSS Foundations",
      summary: "Web ka skeleton HTML hai aur skin CSS. Semantic tags, box model, Flexbox aur Grid — yeh base hai sab kuch ka.",
      estimatedHours: 20,
      resources: [
        { id: "WD-1-R1", title: "HTML Full Course (Hindi)", provider: "CodeWithHarry", lang: "hindi", type: "video", url: "https://www.youtube.com/watch?v=BsDoLVMnmZs", minutes: 180 },
        { id: "WD-1-R2", title: "Responsive Web Design", provider: "freeCodeCamp", lang: "english", type: "interactive", url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/", minutes: 240 },
        { id: "WD-1-R3", title: "Flexbox Froggy (game)", provider: "Froggy", lang: "english", type: "interactive", url: "https://flexboxfroggy.com/", minutes: 30 },
      ],
      project: {
        title: "Linktree Clone",
        brief: "Apna personal links page: photo, 5 buttons, dark theme. Sirf HTML + CSS, koi framework nahi. Deploy on Vercel.",
        acceptanceCriteria: ["Semantic tags (header/main/footer)", "Flexbox se centering", "Mobile + desktop clean"],
      },
      aiCoachPrompts: [
        "Act as a senior frontend developer. Explain HTML semantic tags in Hinglish with 5 real examples, then give me a 10-minute practice task.",
        "I'm stuck on CSS Flexbox. Explain justify-content vs align-items in Hinglish with a text diagram, then quiz me with 3 questions.",
      ],
    },
    {
      id: "WD-2",
      order: 2,
      title: "Tailwind CSS & Responsive Design",
      summary: "Aaj ki industry utility-first CSS use karti hai. Tailwind se fast, consistent aur responsive UI banana seekho.",
      estimatedHours: 10,
      resources: [
        { id: "WD-2-R1", title: "Official Tailwind Docs", provider: "Tailwind", lang: "english", type: "docs", url: "https://tailwindcss.com/docs", minutes: 60 },
        { id: "WD-2-R2", title: "Tailwind in 15 minutes", provider: "Web Dev Simplified", lang: "english", type: "video", url: "https://www.youtube.com/watch?v=lCxcTsOHrjo", minutes: 15 },
        { id: "WD-2-R3", title: "Tailwind Course (Hindi)", provider: "Chai aur Code", lang: "hindi", type: "video", url: "https://www.youtube.com/watch?v=9rcRb3wYbWk", minutes: 120 },
      ],
      project: {
        title: "Responsive Pricing Page",
        brief: "3 pricing cards jo mobile pe stack hon aur desktop pe row me. Dark mode toggle bonus.",
        acceptanceCriteria: ["Breakpoints use kiye (sm/md/lg)", "Mobile-first approach", "Dark mode variant"],
      },
      aiCoachPrompts: [
        "Explain Tailwind breakpoints and mobile-first design in Hinglish with 4 code examples. Then give me a small layout challenge.",
        "Convert this CSS to Tailwind classes and explain each class in Hinglish: [paste CSS]",
      ],
    },
    {
      id: "WD-3",
      order: 3,
      title: "JavaScript Fundamentals + DOM",
      summary: "JS web ka dimaag hai. Variables se DOM manipulation tak — yahan se asli programming shuru hoti hai.",
      estimatedHours: 30,
      resources: [
        { id: "WD-3-R1", title: "JavaScript Playlist (Hindi)", provider: "CodeWithHarry", lang: "hindi", type: "video", url: "https://www.youtube.com/playlist?list=PLu0W_9lII9kV5fRIr8IjJsB9Pz6p1526C", minutes: 300 },
        { id: "WD-3-R2", title: "JavaScript First Steps", provider: "MDN", lang: "english", type: "docs", url: "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/First_steps", minutes: 90 },
        { id: "WD-3-R3", title: "The Modern JS Tutorial", provider: "javascript.info", lang: "english", type: "docs", url: "https://javascript.info/", minutes: 180 },
      ],
      project: {
        title: "To-Do List App",
        brief: "Add, delete, mark-complete + LocalStorage me save. Pure JavaScript, koi framework nahi.",
        acceptanceCriteria: ["Add/delete/toggle kaam kare", "LocalStorage me persist ho", "Empty state message"],
      },
      aiCoachPrompts: [
        "Explain JavaScript closures in Hinglish with 3 real-life analogies, then give me 2 code puzzles to solve.",
        "Review my JavaScript code like a senior dev, in Hinglish. Point out bugs and bad practices: [paste code]",
      ],
    },
    {
      id: "WD-4",
      order: 4,
      title: "Async JS, APIs & Fetch",
      summary: "Real apps server se data maangte hain. Promises, async/await aur fetch — interviews ka favourite topic.",
      estimatedHours: 20,
      resources: [
        { id: "WD-4-R1", title: "Namaste JavaScript (Hinglish)", provider: "Akshay Saini", lang: "hindi", type: "video", url: "https://www.youtube.com/playlist?list=PLlasXeu85E9cQ32gLCvAvr9vNaUccPVNP", minutes: 240 },
        { id: "WD-4-R2", title: "Using the Fetch API", provider: "MDN", lang: "english", type: "docs", url: "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch", minutes: 45 },
      ],
      project: {
        title: "Weather Dashboard",
        brief: "City search → live weather (free API). Loading spinner aur error handling zaroori.",
        acceptanceCriteria: ["fetch + async/await use kiya", "Loading state dikhta hai", "Error handle hota hai"],
      },
      aiCoachPrompts: [
        "Explain the JavaScript event loop and promise chain in Hinglish with a step-by-step trace of this code: [paste code]",
        "Give me 5 interview questions on async/await and fetch with model answers in Hinglish.",
      ],
    },
    {
      id: "WD-5",
      order: 5,
      title: "React Foundations",
      summary: "Components me sochna seekho. State, props aur hooks — modern frontend ka core.",
      estimatedHours: 30,
      resources: [
        { id: "WD-5-R1", title: "Official React Course", provider: "react.dev", lang: "english", type: "interactive", url: "https://react.dev/learn", minutes: 180 },
        { id: "WD-5-R2", title: "Chai aur React (Hinglish)", provider: "Chai aur Code", lang: "hindi", type: "video", url: "https://www.youtube.com/playlist?list=PLu71SKxNbfoDqgPchmvIsL4hTnJIrtige", minutes: 300 },
      ],
      project: {
        title: "Movie Search App",
        brief: "API se movies search karo, cards me dikhao, favourites list state me manage karo.",
        acceptanceCriteria: ["Components me split hai", "useState + useEffect sahi jagah", "API call handle hui"],
      },
      aiCoachPrompts: [
        "Explain useState vs useEffect vs useRef in Hinglish with one mini example each. Then give me a component to build as practice.",
        "My React component re-renders too much. Debug it like a senior dev and explain the fix in Hinglish: [paste code]",
      ],
    },
    {
      id: "WD-6",
      order: 6,
      title: "Next.js & Routing",
      summary: "React ke upar production layer. App Router, server vs client components — jobs me yahi maanga jaata hai.",
      estimatedHours: 20,
      resources: [
        { id: "WD-6-R1", title: "Official Next.js Learn", provider: "next.js", lang: "english", type: "interactive", url: "https://nextjs.org/learn", minutes: 240 },
        { id: "WD-6-R2", title: "Chai aur Next.js (Hinglish)", provider: "Chai aur Code", lang: "hindi", type: "video", url: "https://www.youtube.com/playlist?list=PLu71SKxNbfoQ7BI8FzJ0MUHJsKKrG6GPD", minutes: 200 },
      ],
      project: {
        title: "Multi-page Blog",
        brief: "Home + blog list + dynamic [slug] post pages. Static generation use karo.",
        acceptanceCriteria: ["App Router structure sahi", "Dynamic route kaam karta hai", "Per-page metadata"],
      },
      aiCoachPrompts: [
        "Explain Server Components vs Client Components in Next.js in Hinglish with a clear rule of thumb for when to use 'use client'.",
        "Give me a Next.js App Router folder-structure exercise for a job portal site, then check my answer.",
      ],
    },
    {
      id: "WD-7",
      order: 7,
      title: "Backend + Database (Supabase)",
      summary: "Full-stack bano: auth, database, CRUD. Supabase se bina server manage kiye backend chalao.",
      estimatedHours: 25,
      resources: [
        { id: "WD-7-R1", title: "Supabase Docs", provider: "Supabase", lang: "english", type: "docs", url: "https://supabase.com/docs", minutes: 120 },
        { id: "WD-7-R2", title: "Supabase Crash Course", provider: "Traversy Media", lang: "english", type: "video", url: "https://www.youtube.com/watch?v=ZVsuKXcRwDo", minutes: 60 },
      ],
      project: {
        title: "Full-Stack Habit Tracker",
        brief: "Login → habits add/edit/delete → dashboard. Data Supabase me, RLS policies ke saath.",
        acceptanceCriteria: ["Email auth kaam karta hai", "CRUD table me hota hai", "RLS policy lagi hai"],
      },
      aiCoachPrompts: [
        "Explain Row Level Security in Supabase in Hinglish with 2 example policies I should always add.",
        "Design a Supabase schema (tables + columns + relations) for a notes app, then explain each choice in Hinglish.",
      ],
    },
    {
      id: "WD-8",
      order: 8,
      title: "Git, Deployment & Portfolio",
      summary: "Code ko duniya tak pahuncho: GitHub workflow, Vercel deploy, aur portfolio jo interviews bulaye.",
      estimatedHours: 15,
      resources: [
        { id: "WD-8-R1", title: "Learn Git Branching (game)", provider: "Git", lang: "english", type: "interactive", url: "https://learngitbranching.js.org/", minutes: 90 },
        { id: "WD-8-R2", title: "Vercel Deployment Docs", provider: "Vercel", lang: "english", type: "docs", url: "https://vercel.com/docs", minutes: 30 },
      ],
      project: {
        title: "Capstone Portfolio (DEPLOYED)",
        brief: "3 best projects Vercel pe deploy + ek portfolio site jisme sab linked hon. Live links = proof of work.",
        acceptanceCriteria: ["3+ live project URLs", "Portfolio site deployed", "Har repo me README"],
      },
      aiCoachPrompts: [
        "Review my GitHub profile like a hiring manager in Hinglish: what should I pin, fix in READMEs, and add before applying to jobs?",
        "Write me a Hinglish checklist for deploying a Next.js + Supabase app on Vercel without leaking secrets.",
      ],
    },
  ],
};

export const TRACKS: LearningTrack[] = [WEB_DEV_TRACK];

export function getTrackById(id: string) {
  return TRACKS.find((t) => t.id === id);
}

export function trackTotalHours(t: LearningTrack) {
  return t.milestones.reduce((n, m) => n + m.estimatedHours, 0);
}

export interface ScheduleSlot {
  milestone: TrackMilestone;
  startDay: number;
  endDay: number;
}

export function buildSchedule(t: LearningTrack, hoursPerDay: number): ScheduleSlot[] {
  let day = 1;
  return t.milestones.map((m) => {
    const days = Math.max(1, Math.ceil(m.estimatedHours / Math.max(0.5, hoursPerDay)));
    const slot = { milestone: m, startDay: day, endDay: day + days - 1 };
    day += days;
    return slot;
  });
}

export function dayNumber(startDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1);
}