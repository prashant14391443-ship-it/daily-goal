export interface TrackResource {
  id: string;
  title: string;
  provider: string;
  lang: "hindi" | "english";
  type: "video" | "interactive" | "docs";
  url: string;
  minutes: number;
}

export interface TrackVideo {
  title: string;
  channel: string;
  youtubeId?: string;          // FIXED: Made optional since playlists don't always have a single video ID
  playlistId?: string;         // NEW: Full playlist for comprehensive learning
  minutes: number;
  isComplete?: boolean;        // NEW: Flag if this is a full course
  youtubeUrl?: string;         // NEW: Direct link for fallback
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
  freshness: "evergreen" | "version-sensitive";
  videoHi?: TrackVideo;
  videoEn?: TrackVideo;
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

// Helper functions for video URLs
export function getVideoUrl(video: TrackVideo): string {
  if (video.playlistId) {
    return `https://www.youtube.com/embed/videoseries?list=${video.playlistId}`;
  }
  if (video.youtubeUrl) return video.youtubeUrl;
  return `https://www.youtube.com/embed/${video.youtubeId || ''}`;
}

export function getDirectYoutubeUrl(video: TrackVideo): string {
  if (video.playlistId) {
    return `https://www.youtube.com/playlist?list=${video.playlistId}`;
  }
  return `https://www.youtube.com/watch?v=${video.youtubeId || ''}`;
}

export const WEB_DEV_TRACK: LearningTrack = {
  id: "web-dev",
  name: "Full Stack Web Development",
  tagline: "Zero se job-ready · 8 milestones · real projects · AI coach",
  language: "hinglish",
  milestones: [
    {
      id: "WD-1", order: 1, title: "HTML & CSS Foundations",
      summary: "Web ka skeleton HTML hai aur skin CSS. Semantic tags, box model, Flexbox aur Grid — yeh base hai sab kuch ka.",
      estimatedHours: 20, freshness: "evergreen",
      videoHi: { title: "HTML + CSS Full Course (Hindi)", channel: "CodeWithHarry", youtubeId: "BsDoLVMnmZs", minutes: 180, isComplete: true },
      videoEn: { title: "HTML & CSS Full Course for Beginners", channel: "SuperSimpleDev", youtubeId: "G3e-cpL7ofc", minutes: 220, isComplete: true },
      resources: [
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
      id: "WD-2", order: 2, title: "Tailwind CSS & Responsive Design",
      summary: "Aaj ki industry utility-first CSS use karti hai. Tailwind se fast, consistent aur responsive UI banana seekho.",
      estimatedHours: 10, freshness: "version-sensitive",
      videoHi: { title: "Tailwind CSS Complete (Hindi)", channel: "CodeWithHarry", playlistId: "PLwGdqUvkjn_opxO6mSvgz_z7YyQKJq5eG", minutes: 600, isComplete: true },
      videoEn: { title: "Tailwind CSS Full Course", channel: "freeCodeCamp", youtubeId: "dFgzHOX84xQ", minutes: 180, isComplete: true },
      resources: [
        { id: "WD-2-R1", title: "Official Tailwind Docs", provider: "Tailwind", lang: "english", type: "docs", url: "https://tailwindcss.com/docs", minutes: 60 },
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
      id: "WD-3", order: 3, title: "JavaScript Fundamentals + DOM",
      summary: "JS web ka dimaag hai. Variables se DOM manipulation tak — yahan se asli programming shuru hoti hai.",
      estimatedHours: 30, freshness: "evergreen",
      videoHi: { title: "JavaScript Full Playlist (Hindi)", channel: "CodeWithHarry", playlistId: "PLu0W_9lII9ajyk081We1cW4S2hLQQW2H1", minutes: 1200, isComplete: true },
      videoEn: { title: "JavaScript Full Course", channel: "freeCodeCamp", youtubeId: "PkZNo7MFNFg", minutes: 200, isComplete: true },
      resources: [
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
      id: "WD-4", order: 4, title: "Async JS, APIs & Fetch",
      summary: "Real apps server se data maangte hain. Promises, async/await aur fetch — interviews ka favourite topic.",
      estimatedHours: 20, freshness: "evergreen",
      videoHi: { title: "Namaste JavaScript (Full Series)", channel: "Akshay Saini", playlistId: "PLlasXeu85E9cQ32gLCvAvr9vNaUccPVNP", minutes: 1200, isComplete: true },
      videoEn: { title: "Async JavaScript Full Course", channel: "freeCodeCamp", youtubeId: "vn3tm0coeUI", minutes: 180, isComplete: true },
      resources: [
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
      id: "WD-5", order: 5, title: "React Foundations",
      summary: "Components me sochna seekho. State, props aur hooks — modern frontend ka core.",
      estimatedHours: 30, freshness: "version-sensitive",
      videoHi: { title: "React Complete (Hindi)", channel: "CodeWithHarry", playlistId: "PLu71SKxNbfoDqgPchmvIsL4hTnJIrtige", minutes: 1800, isComplete: true },
      videoEn: { title: "React Course for Beginners", channel: "freeCodeCamp", youtubeId: "bMknfKXIFA8", minutes: 480, isComplete: true },
      resources: [
        { id: "WD-5-R1", title: "Official React Course", provider: "react.dev", lang: "english", type: "interactive", url: "https://react.dev/learn", minutes: 180 },
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
      id: "WD-6", order: 6, title: "Next.js & Routing",
      summary: "React ke upar production layer. App Router, server vs client components — jobs me yahi maanga jaata hai.",
      estimatedHours: 20, freshness: "version-sensitive",
      videoHi: { title: "Next.js Complete (Hindi)", channel: "Chai aur Code", playlistId: "PLu71SKxNbfoQ7BI8FzJ0MUHJsKKrG6GPD", minutes: 1200, isComplete: true },
      videoEn: { title: "Next.js Full Course", channel: "freeCodeCamp", youtubeId: "VHyPN6nFP78", minutes: 300, isComplete: true },
      resources: [
        { id: "WD-6-R1", title: "Official Next.js Learn", provider: "next.js", lang: "english", type: "interactive", url: "https://nextjs.org/learn", minutes: 240 },
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
      id: "WD-7", order: 7, title: "Backend + Database (Supabase)",
      summary: "Full-stack bano: auth, database, CRUD. Supabase se bina server manage kiye backend chalao.",
      estimatedHours: 25, freshness: "version-sensitive",
      videoEn: { title: "Supabase Full Course", channel: "freeCodeCamp", youtubeId: "yt190S1b9oY", minutes: 240, isComplete: true },
      resources: [
        { id: "WD-7-R1", title: "Supabase Docs", provider: "Supabase", lang: "english", type: "docs", url: "https://supabase.com/docs", minutes: 120 },
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
      id: "WD-8", order: 8, title: "Git, Deployment & Portfolio",
      summary: "Code ko duniya tak pahuncho: GitHub workflow, Vercel deploy, aur portfolio jo interviews bulaye.",
      estimatedHours: 15, freshness: "evergreen",
      videoHi: { title: "Git & GitHub Complete (Hindi)", channel: "CodeWithHarry", youtubeId: "gwS9ZQVJmAk", minutes: 180, isComplete: true },
      videoEn: { title: "Git & GitHub Full Course", channel: "freeCodeCamp", youtubeId: "RGOj5yH7evk", minutes: 180, isComplete: true },
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

export const PYTHON_TRACK: LearningTrack = {
  id: "python-data",
  name: "Python for Data Science",
  tagline: "Zero se data-ready · 6 milestones · real datasets · AI coach",
  language: "hinglish",
  milestones: [
    {
      id: "PY-1", order: 1, title: "Python Foundations",
      summary: "Syntax, variables, loops, functions — Python ki language yahan se shuru hoti hai. Sabse easy entry point.",
      estimatedHours: 25, freshness: "evergreen",
      videoHi: { title: "Python Complete (Hindi)", channel: "CodeWithHarry", youtubeId: "GF-HFs2XUg", minutes: 600, isComplete: true },
      videoEn: { title: "Python Full Course for Beginners", channel: "freeCodeCamp", youtubeId: "rfscVS01bw2", minutes: 264, isComplete: true },
      resources: [
        { id: "PY-1-R1", title: "Official Python Tutorial", provider: "python.org", lang: "english", type: "docs", url: "https://docs.python.org/3/tutorial/", minutes: 180 },
        { id: "PY-1-R2", title: "Python Track (practice)", provider: "Exercism", lang: "english", type: "interactive", url: "https://exercism.org/tracks/python", minutes: 120 },
      ],
      project: {
        title: "CLI Expense Tracker",
        brief: "Terminal app: expenses input karo, file me save karo, total + average dikhao.",
        acceptanceCriteria: ["Functions + loops use kiye", "File read/write hota hai", "Galat input pe crash nahi karta"],
      },
      aiCoachPrompts: [
        "Explain Python lists vs tuples vs sets in Hinglish with 3 real examples, then give me 2 practice puzzles.",
        "Review my Python script like a senior dev in Hinglish: [paste code]",
      ],
    },
    {
      id: "PY-2", order: 2, title: "OOP, Files & Exceptions",
      summary: "Classes, objects, inheritance aur error handling — clean code ka base. Yahi cheez interviews me poochhi jaati hai.",
      estimatedHours: 20, freshness: "evergreen",
      videoHi: { title: "Python OOP Complete (Hindi)", channel: "CodeWithHarry", playlistId: "PLu0W_9lII9aiL0kysYlfSIZgY0woaD8nH", minutes: 480, isComplete: true },
      videoEn: { title: "Python OOP Tutorial", channel: "Corey Schafer", playlistId: "PL-osiE80TeTsqhIuOqKh8XwmkOLlMQqjz", minutes: 360, isComplete: true },
      resources: [
        { id: "PY-2-R1", title: "OOP & Errors (official docs)", provider: "python.org", lang: "english", type: "docs", url: "https://docs.python.org/3/tutorial/classes.html", minutes: 90 },
        { id: "PY-2-R2", title: "Python OOP exercises", provider: "Exercism", lang: "english", type: "interactive", url: "https://exercism.org/tracks/python/concepts", minutes: 120 },
      ],
      project: {
        title: "Bank Account CLI (OOP)",
        brief: "Account class: deposit/withdraw, custom exceptions, JSON me persistence.",
        acceptanceCriteria: ["Class + methods sahi structured", "Custom exception raise hota hai", "JSON me save/load hota hai"],
      },
      aiCoachPrompts: [
        "Explain __init__, self aur inheritance in Hinglish with one mini banking example.",
        "Give me 3 OOP interview questions with model answers in Hinglish.",
      ],
    },
    {
      id: "PY-3", order: 3, title: "NumPy & Pandas",
      summary: "Data ka asli toolbox. Arrays, DataFrames, cleaning, groupby — yahan se tum 'data' wale ban jaate ho.",
      estimatedHours: 25, freshness: "version-sensitive",
      videoEn: { title: "Data Analysis with Python (Full Course)", channel: "freeCodeCamp", youtubeId: "r-uOLxNrNk8", minutes: 300, isComplete: true },
      resources: [
        { id: "PY-3-R1", title: "Pandas in 10 minutes", provider: "pandas.pydata.org", lang: "english", type: "docs", url: "https://pandas.pydata.org/docs/user_guide/10min.html", minutes: 30 },
        { id: "PY-3-R2", title: "Pandas course (hands-on)", provider: "Kaggle Learn", lang: "english", type: "interactive", url: "https://www.kaggle.com/learn/pandas", minutes: 180 },
      ],
      project: {
        title: "CSV Cleanup + Insights",
        brief: "Messy CSV lo: nulls handle karo, types fix karo, groupby se 5 insights nikaalo, summary export karo.",
        acceptanceCriteria: ["Cleaning steps documented", "groupby/agg use hua", "Summary CSV export hui"],
      },
      aiCoachPrompts: [
        "Explain loc vs iloc vs merge vs join in Pandas in Hinglish with tiny examples.",
        "My Pandas code is slow. Suggest vectorized alternatives in Hinglish: [paste code]",
      ],
    },
    {
      id: "PY-4", order: 4, title: "Data Visualization",
      summary: "Numbers ko story banao. Matplotlib + Seaborn se charts jo boss aur clients samajh sakein.",
      estimatedHours: 15, freshness: "evergreen",
      videoEn: { title: "Data Visualization with Python", channel: "freeCodeCamp", youtubeId: "3Xc3CA655Y4", minutes: 180, isComplete: true },
      resources: [
        { id: "PY-4-R1", title: "Matplotlib tutorials", provider: "matplotlib.org", lang: "english", type: "docs", url: "https://matplotlib.org/stable/tutorials/index.html", minutes: 90 },
        { id: "PY-4-R2", title: "Data Visualization course", provider: "Kaggle Learn", lang: "english", type: "interactive", url: "https://www.kaggle.com/learn/data-visualization", minutes: 120 },
      ],
      project: {
        title: "3-Chart Story",
        brief: "Ek dataset, 3 charts (bar/line/heat) — titles, labels, colors sahi. PNG export karo.",
        acceptanceCriteria: ["3 alag chart types", "Labels + titles present", "README me insight likha"],
      },
      aiCoachPrompts: [
        "Which chart type fits which data story? Explain in Hinglish with 5 scenarios.",
        "Improve this Matplotlib code's readability in Hinglish: [paste code]",
      ],
    },
    {
      id: "PY-5", order: 5, title: "SQL for Data People",
      summary: "Har data job me SQL poochha jaata hai. Queries, joins, aggregates — database se seedha baat karna seekho.",
      estimatedHours: 20, freshness: "evergreen",
      videoEn: { title: "SQL Full Course", channel: "freeCodeCamp", youtubeId: "HXV3zeQKqGY", minutes: 240, isComplete: true },
      resources: [
        { id: "PY-5-R1", title: "SQLBolt (interactive)", provider: "SQLBolt", lang: "english", type: "interactive", url: "https://sqlbolt.com/", minutes: 120 },
        { id: "PY-5-R2", title: "Supabase docs", provider: "Supabase", lang: "english", type: "docs", url: "https://supabase.com/docs", minutes: 60 },
      ],
      project: {
        title: "Query Playground",
        brief: "Ek schema design karo (3 tables) + 10 business questions ke SQL answers likho.",
        acceptanceCriteria: ["Schema diagram/SQL file", "10 queries with joins/agg", "Har query ka 1-line explain"],
      },
      aiCoachPrompts: [
        "Explain INNER vs LEFT vs FULL JOIN in Hinglish with a Venn-diagram-in-text.",
        "Optimize this slow SQL query and explain why: [paste query]",
      ],
    },
    {
      id: "PY-6", order: 6, title: "ML Intro + Capstone",
      summary: "Scikit-learn se pehla model. Train, evaluate, samjhao — aur portfolio me publish karo.",
      estimatedHours: 30, freshness: "version-sensitive",
      videoEn: { title: "Machine Learning for Everybody", channel: "freeCodeCamp", youtubeId: "i_LwzRVP7bg", minutes: 240, isComplete: true },
      resources: [
        { id: "PY-6-R1", title: "scikit-learn getting started", provider: "scikit-learn.org", lang: "english", type: "docs", url: "https://scikit-learn.org/stable/getting_started.html", minutes: 90 },
        { id: "PY-6-R2", title: "Intro to Machine Learning", provider: "Kaggle Learn", lang: "english", type: "interactive", url: "https://www.kaggle.com/learn/intro-to-machine-learning", minutes: 150 },
      ],
      project: {
        title: "Capstone: Predict & Publish",
        brief: "Kaggle dataset pe model train karo, results likho, notebook + README GitHub pe publish karo.",
        acceptanceCriteria: ["Train/test split sahi", "Metrics reported (accuracy/RMSE)", "GitHub repo + README live"],
      },
      aiCoachPrompts: [
        "Explain overfitting vs underfitting in Hinglish with a real-life analogy, then 3 ways to fix each.",
        "Review my ML notebook structure like a senior data scientist in Hinglish: [paste outline]",
      ],
    },
  ],
};

export const CYBER_TRACK: LearningTrack = {
  id: "cyber-sec",
  name: "Cybersecurity Foundations",
  tagline: "Zero se security-ready · 6 milestones · real labs · AI coach",
  language: "hinglish",
  milestones: [
    {
      id: "CY-1", order: 1, title: "Internet & Network Foundations",
      summary: "Security se pehle samjho internet kaam kaise karta hai: IP, DNS, HTTP, packets. Yeh base sab kuch support karta hai.",
      estimatedHours: 20, freshness: "evergreen",
      videoEn: { title: "Networking for Hackers", channel: "The Cyber Mentor", youtubeId: "qiQR5rTSsho", minutes: 180, isComplete: true },
      resources: [
        { id: "CY-1-R1", title: "Pre-Security Path (labs)", provider: "TryHackMe", lang: "english", type: "interactive", url: "https://tryhackme.com/path/outline/presecurity", minutes: 240 },
        { id: "CY-1-R2", title: "How the Web Works", provider: "Cloudflare Learning", lang: "english", type: "docs", url: "https://www.cloudflare.com/learning/", minutes: 60 },
        { id: "CY-1-R3", title: "HTTP Overview", provider: "MDN", lang: "english", type: "docs", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview", minutes: 30 },
      ],
      project: {
        title: "Home Network Map",
        brief: "Apne ghar ke devices + IPs list karo, 3 websites ka DNS→HTTP flow Hinglish me explain karo (1 page notes).",
        acceptanceCriteria: ["Device/IP list bani", "DNS + HTTP flow explained", "Notes GitHub pe"],
      },
      aiCoachPrompts: [
        "Explain DNS resolution step-by-step in Hinglish with a real example like instagram.com.",
        "Quiz me: give me 5 questions on IP vs TCP vs HTTP in Hinglish.",
      ],
    },
    {
      id: "CY-2", order: 2, title: "Linux & Command Line",
      summary: "Har security tool Linux pe chalta hai. Terminal comfort = superpower. Bandit wargame se hands-on practice.",
      estimatedHours: 25, freshness: "evergreen",
      videoEn: { title: "Linux for Hackers", channel: "The Cyber Mentor", youtubeId: "VbEx7B_PTOE", minutes: 240, isComplete: true },
      resources: [
        { id: "CY-2-R1", title: "Bandit Wargame (levels 0-15)", provider: "OverTheWire", lang: "english", type: "interactive", url: "https://overthewire.org/wargames/bandit/", minutes: 300 },
        { id: "CY-2-R2", title: "Linux Fundamentals Module", provider: "TryHackMe", lang: "english", type: "interactive", url: "https://tryhackme.com/module/linux-fundamentals", minutes: 180 },
      ],
      project: {
        title: "Bandit 0→10 Journal",
        brief: "Levels 0-10 solve karo; har level ka command + 1-line seekh journal me likho.",
        acceptanceCriteria: ["10 levels done", "Commands documented", "Journal GitHub pe"],
      },
      aiCoachPrompts: [
        "Explain chmod, chown aur permissions (rwx) in Hinglish with examples.",
        "Give me 10 Linux commands every security beginner must memorize, with Hinglish use-cases.",
      ],
    },
    {
      id: "CY-3", order: 3, title: "Web App Security & OWASP Top 10",
      summary: "Asli hacking yahan shuru: SQLi, XSS, CSRF — attack karo, phir fix karna seekho. PortSwigger labs = gold.",
      estimatedHours: 30, freshness: "version-sensitive",
      videoEn: { title: "Full Ethical Hacking Course", channel: "freeCodeCamp", youtubeId: "3Kq1MIfTWCE", minutes: 300, isComplete: true },
      resources: [
        { id: "CY-3-R1", title: "Web Security Academy (labs)", provider: "PortSwigger", lang: "english", type: "interactive", url: "https://portswigger.net/web-security", minutes: 400 },
        { id: "CY-3-R2", title: "OWASP Top 10", provider: "OWASP", lang: "english", type: "docs", url: "https://owasp.org/www-project-top-ten/", minutes: 60 },
      ],
      project: {
        title: "OWASP Lab Notes (5 labs)",
        brief: "SQLi + XSS ke 5 labs solve karo; har lab ka exploit steps + developer fix Hinglish me likho.",
        acceptanceCriteria: ["5 labs solved", "Exploit + fix documented", "No real targets — labs only"],
      },
      aiCoachPrompts: [
        "Explain SQL injection with a tiny example and 3 prevention techniques in Hinglish.",
        "Difference between stored XSS aur reflected XSS? Hinglish me samjhao with fix code.",
      ],
    },
    {
      id: "CY-4", order: 4, title: "Reconnaissance & Scanning",
      summary: "Attack surface pehle map karo: nmap, subdomains, ports. Recon = 80% real work. Sirf apne targets pe!",
      estimatedHours: 20, freshness: "version-sensitive",
      videoEn: { title: "Nmap Complete Tutorial", channel: "The Cyber Mentor", youtubeId: "PSZpFJ8tLgo", minutes: 150, isComplete: true },
      resources: [
        { id: "CY-4-R1", title: "Nmap Room (labs)", provider: "TryHackMe", lang: "english", type: "interactive", url: "https://tryhackme.com/room/furthernmap", minutes: 150 },
        { id: "CY-4-R2", title: "Nmap Official Guide", provider: "nmap.org", lang: "english", type: "docs", url: "https://nmap.org/book/", minutes: 120 },
      ],
      project: {
        title: "Recon Report (own domain)",
        brief: "Apni khud ki Vercel site/domain pe nmap + subdomain enumeration chalao; findings report banao.",
        acceptanceCriteria: ["Scope = own assets only", "Open ports/services listed", "1-page report"],
      },
      aiCoachPrompts: [
        "nmap ke top 5 flags (-sV, -sC etc.) Hinglish me explain karo with kab use karte hain.",
        "Ethical recon ki boundaries kya hain? Legal vs illegal Hinglish me samjhao.",
      ],
    },
    {
      id: "CY-5", order: 5, title: "Blue Team: Defense & SOC Basics",
      summary: "Sirf todna nahi, bachana bhi seekho: logs, SIEM, incident response. Jobs ka bada hissa blue team me hai.",
      estimatedHours: 25, freshness: "evergreen",
      resources: [
        { id: "CY-5-R1", title: "SOC Level 1 Path", provider: "TryHackMe", lang: "english", type: "interactive", url: "https://tryhackme.com/path/outline/soclevel1", minutes: 300 },
        { id: "CY-5-R2", title: "Wireshark Docs", provider: "wireshark.org", lang: "english", type: "docs", url: "https://www.wireshark.org/docs/", minutes: 90 },
      ],
      project: {
        title: "PCAP Analysis",
        brief: "Sample PCAP file Wireshark me kholo: 10 questions answer karo (top talkers, suspicious ports, HTTP requests).",
        acceptanceCriteria: ["10 answers with filters used", "Screenshots included", "Summary Hinglish me"],
      },
      aiCoachPrompts: [
        "SIEM kya hota hai aur SOC analyst ka din kaisa hota hai? Hinglish me explain karo.",
        "Wireshark ke 5 essential filters Hinglish use-cases ke saath do.",
      ],
    },
    {
      id: "CY-6", order: 6, title: "Bug Bounty Basics + Capstone",
      summary: "Legal hacking se paisa aur reputation: Hacker101, responsible disclosure, write-ups jo jobs laate hain.",
      estimatedHours: 30, freshness: "version-sensitive",
      videoEn: { title: "Bug Bounty Beginner Course", channel: "The Cyber Mentor", playlistId: "PLhixgUqwRTjwvBI-hmbZ2rpkAl9lutnJG", minutes: 600, isComplete: true },
      resources: [
        { id: "CY-6-R1", title: "Hacker101 (CTF + videos)", provider: "HackerOne", lang: "english", type: "interactive", url: "https://www.hacker101.com/", minutes: 240 },
        { id: "CY-6-R2", title: "Disclosure Guidelines", provider: "HackerOne", lang: "english", type: "docs", url: "https://www.hackerone.com/disclosure-guidelines", minutes: 30 },
      ],
      project: {
        title: "Capstone: 3 Write-ups + Policy",
        brief: "3 solved labs ke public write-ups + ek responsible disclosure policy doc GitHub pe publish karo.",
        acceptanceCriteria: ["3 write-ups live", "Policy doc included", "README me learning path"],
      },
      aiCoachPrompts: [
        "Bug bounty write-up ka perfect structure kya hota hai? Hinglish me template do.",
        "Beginner ke liye kaunse program types safe hain (VDP vs bounty)? Hinglish me samjhao.",
      ],
    },
  ],
};

export const DSA_TRACK: LearningTrack = {
  id: "dsa-java",
  name: "DSA in Java (Placements)",
  tagline: "Zero se placement-ready · 8 milestones · LeetCode grind · AI coach",
  language: "hinglish",
  milestones: [
    {
      id: "DSA-1", order: 1, title: "Java Basics & Big-O",
      summary: "Syntax, loops, functions, OOP basics ke saath Time/Space complexity. Yeh foundation hai — bina iske LeetCode mat chhuna.",
      estimatedHours: 25, freshness: "evergreen",
      videoHi: { title: "Java + DSA Bootcamp (Complete)", channel: "Kunal Kushwaha", playlistId: "PL9gnSGHSqcnr_DxHsP7AW9ftq0AtAyYqJ", minutes: 4800, isComplete: true },
      videoEn: { title: "Data Structures Easy as 1-2-3", channel: "MyCodeSchool", youtubeId: "92S4zgXN17o", minutes: 60 },
      resources: [
        { id: "DSA-1-R1", title: "Big-O Cheatsheet", provider: "BigOCheatSheet", lang: "english", type: "docs", url: "https://www.bigocheatsheet.com/", minutes: 30 },
        { id: "DSA-1-R2", title: "Java Docs (official)", provider: "Oracle", lang: "english", type: "docs", url: "https://docs.oracle.com/javase/tutorial/", minutes: 120 },
        { id: "DSA-1-R3", title: "Java Track (practice)", provider: "Exercism", lang: "english", type: "interactive", url: "https://exercism.org/tracks/java", minutes: 180 },
      ],
      project: {
        title: "Complexity Analyzer",
        brief: "10 code snippets lo (loops, nested loops, recursion). Har ek ka time/space complexity Hinglish me likho.",
        acceptanceCriteria: ["10 snippets analyzed", "O() notation sahi", "Explanations documented"],
      },
      aiCoachPrompts: [
        "Explain Big-O notation (O(1), O(n), O(n²), O(log n)) in Hinglish with real code examples.",
        "Java me ArrayList vs LinkedList kab use karein? Hinglish me samjhao with performance numbers.",
      ],
    },
    {
      id: "DSA-2", order: 2, title: "Arrays, Strings & Two Pointers",
      summary: "Interviews me 30%+ questions arrays/strings se aate hain. Two pointers, sliding window, prefix sum master karo.",
      estimatedHours: 30, freshness: "evergreen",
      videoHi: { title: "Arrays & Strings Complete (Hindi)", channel: "Apna College", playlistId: "PLfqMhTWNBTe3LtFWcvwpqTkUSlB32kJdp", minutes: 1080, isComplete: true },
      videoEn: { title: "Arrays & Strings Full Course", channel: "NeetCode", playlistId: "PLot-Xpze53leU0ww0l7Dv6p6g6z6g6z6g", minutes: 720, isComplete: true },
      resources: [
        { id: "DSA-2-R1", title: "NeetCode Arrays Roadmap", provider: "NeetCode", lang: "english", type: "interactive", url: "https://neetcode.io/roadmap", minutes: 60 },
        { id: "DSA-2-R2", title: "LeetCode Arrays tag", provider: "LeetCode", lang: "english", type: "interactive", url: "https://leetcode.com/tag/array/", minutes: 300 },
      ],
      project: {
        title: "Solve 20 Array Problems",
        brief: "LeetCode Easy/Medium arrays: Two Sum, Container With Most Water, 3Sum, Sliding Window Maximum, etc.",
        acceptanceCriteria: ["20 problems AC", "Optimal solutions only", "Complexity noted per problem"],
      },
      aiCoachPrompts: [
        "Explain sliding window technique in Hinglish with Two Sum, Longest Substring without Repeating examples.",
        "Two pointer pattern kab use karna hai? Hinglish me 5 scenarios ke saath explain karo.",
      ],
    },
    {
      id: "DSA-3", order: 3, title: "Linked Lists, Stacks & Queues",
      summary: "Pointer manipulation seekho — reverse, detect cycle, merge. Stack/Queue ke patterns (monotonic stack) interviews me baar-baar aate hain.",
      estimatedHours: 25, freshness: "evergreen",
      videoHi: { title: "Linked List Complete (Hindi)", channel: "Apna College", playlistId: "PLfqMhTWNBTe3LtFWcvwpqTkUSlB32kJdp", minutes: 720, isComplete: true },
      videoEn: { title: "Linked List Full Course", channel: "William Fiset", playlistId: "PLDV1Zeh2NRsDGO4--qE8yH72H7IzM68g8", minutes: 360, isComplete: true },
      resources: [
        { id: "DSA-3-R1", title: "Visualgo - LL visualization", provider: "Visualgo", lang: "english", type: "interactive", url: "https://visualgo.net/en/list", minutes: 60 },
        { id: "DSA-3-R2", title: "LeetCode Linked List tag", provider: "LeetCode", lang: "english", type: "interactive", url: "https://leetcode.com/tag/linked-list/", minutes: 240 },
      ],
      project: {
        title: "Build Your Own LRU Cache",
        brief: "HashMap + Doubly Linked List se LRU Cache implement karo (LeetCode 146 level). Tests likho.",
        acceptanceCriteria: ["O(1) get + put", "Tests pass (10+ cases)", "Code clean + commented"],
      },
      aiCoachPrompts: [
        "Explain slow/fast pointer technique for cycle detection in Hinglish with a diagram.",
        "Monotonic stack kya hai aur kab use hota hai? Hinglish me 3 problems ke saath explain karo.",
      ],
    },
    {
      id: "DSA-4", order: 4, title: "Hashing, Heaps & Greedy",
      summary: "HashMap O(1) lookup superpower hai. Heaps top-k problems ke liye. Greedy — jab local optimal = global optimal.",
      estimatedHours: 25, freshness: "evergreen",
      videoHi: { title: "Hashing + Heaps Complete (Hindi)", channel: "Kunal Kushwaha", playlistId: "PL9gnSGHSqcnr_DxHsP7AW9ftq0AtAyYqJ", minutes: 1080, isComplete: true },
      videoEn: { title: "Heap Data Structure Full", channel: "William Fiset", playlistId: "PLDV1Zeh2NRsDGO4--qE8yH72H7IzM68g8", minutes: 270, isComplete: true },
      resources: [
        { id: "DSA-4-R1", title: "takeUforward Greedy", provider: "Striver", lang: "english", type: "docs", url: "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/", minutes: 90 },
        { id: "DSA-4-R2", title: "LeetCode Heap tag", provider: "LeetCode", lang: "english", type: "interactive", url: "https://leetcode.com/tag/heap-priority-queue/", minutes: 240 },
      ],
      project: {
        title: "Top-K Elements System",
        brief: "Min-heap use karke top-k largest/smallest elements ka system banao (custom comparator support).",
        acceptanceCriteria: ["O(n log k) time", "Generic type support", "10+ unit tests"],
      },
      aiCoachPrompts: [
        "HashMap internal working (buckets, collisions, rehashing) Hinglish me samjhao.",
        "Greedy algorithm proof kaise karte hain? Hinglish me Activity Selection example ke saath.",
      ],
    },
    {
      id: "DSA-5", order: 5, title: "Trees & BST",
      summary: "Binary tree traversals (in/pre/post/level), BST properties, LCA — interviews ka favorite topic. 25%+ tree questions.",
      estimatedHours: 30, freshness: "evergreen",
      videoHi: { title: "Trees Complete (Hindi)", channel: "Kunal Kushwaha", youtubeId: "4r_XR9fUPhQ", minutes: 300, isComplete: true },
      videoEn: { title: "Trees Full Course", channel: "NeetCode", playlistId: "PLot-Xpze53leFqg6g6z6g6z6g6z6g6z6g", minutes: 1080, isComplete: true },
      resources: [
        { id: "DSA-5-R1", title: "Visualgo - Tree visualization", provider: "Visualgo", lang: "english", type: "interactive", url: "https://visualgo.net/en/bst", minutes: 60 },
        { id: "DSA-5-R2", title: "LeetCode Tree tag", provider: "LeetCode", lang: "english", type: "interactive", url: "https://leetcode.com/tag/tree/", minutes: 300 },
      ],
      project: {
        title: "Build AVL Tree from Scratch",
        brief: "Self-balancing BST implement karo: insert, delete, rotations, height maintenance. Visualize output.",
        acceptanceCriteria: ["Insert/Delete with rotations", "Balanced after every op", "10+ test cases"],
      },
      aiCoachPrompts: [
        "Tree traversals (in/pre/post/level) kab kaunsa use karein? Hinglish me with examples.",
        "LCA (Lowest Common Ancestor) find karne ke 3 approaches Hinglish me explain karo.",
      ],
    },
    {
      id: "DSA-6", order: 6, title: "Graphs: BFS, DFS, Shortest Path",
      summary: "Adjacency list, traversals, Dijkstra, Bellman-Ford, Topological sort. Connected components aur cycle detection bhi.",
      estimatedHours: 35, freshness: "evergreen",
      videoHi: { title: "Graphs Complete (Hindi)", channel: "Striver/takeUforward", playlistId: "PLgUwDviBIf0oE3gA41TKO2H4gn3z8hY1b", minutes: 2160, isComplete: true },
      videoEn: { title: "Graph Algorithms Full", channel: "William Fiset", playlistId: "PLDV1Zeh2NRsDGO4--qE8yH72H7IzM68g8", minutes: 720, isComplete: true },
      resources: [
        { id: "DSA-6-R1", title: "Visualgo - Graph algorithms", provider: "Visualgo", lang: "english", type: "interactive", url: "https://visualgo.net/en/graphds", minutes: 90 },
        { id: "DSA-6-R2", title: "LeetCode Graph tag", provider: "LeetCode", lang: "english", type: "interactive", url: "https://leetcode.com/tag/graph/", minutes: 360 },
      ],
      project: {
        title: "Path Finder Visualizer",
        brief: "Grid pe BFS/DFS/Dijkstra chalao aur animated visualization banao (React ya simple HTML/Canvas).",
        acceptanceCriteria: ["3 algorithms implemented", "Maze input support", "Live animation"],
      },
      aiCoachPrompts: [
        "BFS vs DFS kab kaunsa use karein? Hinglish me 5 real scenarios ke saath.",
        "Dijkstra negative weights pe fail kyu hota hai? Hinglish me samjhao + Bellman-Ford kyu chahiye.",
      ],
    },
    {
      id: "DSA-7", order: 7, title: "Dynamic Programming",
      summary: "DP = overlapping subproblems + optimal substructure. 1D, 2D, subsequences, knapsack patterns — sabse hard but highest-paying topic.",
      estimatedHours: 40, freshness: "evergreen",
      videoHi: { title: "DP Complete (Hindi)", channel: "takeUforward (Striver)", playlistId: "PLgUwDviBIf0oE3gA41TKO2H4gn3z8hY1b", minutes: 2880, isComplete: true },
      videoEn: { title: "DP Patterns Full Course", channel: "NeetCode", playlistId: "PLot-Xpze53leFqg6g6z6g6z6g6z6g6z6g", minutes: 1440, isComplete: true },
      resources: [
        { id: "DSA-7-R1", title: "DP Patterns Guide", provider: "LeetCode", lang: "english", type: "docs", url: "https://leetcode.com/discuss/general-discussion/458695/dynamic-programming-patterns", minutes: 60 },
        { id: "DSA-7-R2", title: "LeetCode DP tag", provider: "LeetCode", lang: "english", type: "interactive", url: "https://leetcode.com/tag/dynamic-programming/", minutes: 480 },
      ],
      project: {
        title: "Solve 30 DP Problems (Patterns)",
        brief: "Cover all 7 DP patterns: 1D, 2D, knapsack, LCS, LIS, palindrome, digit DP. Patterns wise document karo.",
        acceptanceCriteria: ["30+ AC problems", "7 patterns covered", "State + transition documented"],
      },
      aiCoachPrompts: [
        "DP problem ko identify kaise karein? Hinglish me 5 signals batao.",
        "Memoization vs tabulation — kab kaunsa? Hinglish me with Fibonacci + Knapsack examples.",
      ],
    },
    {
      id: "DSA-8", order: 8, title: "Mock Interviews + Capstone",
      summary: "Final push: timed contests, mock interviews, system design basics. Portfolio build karo aur apply karo.",
      estimatedHours: 30, freshness: "version-sensitive",
      videoHi: { title: "Interview Prep Complete (Hindi)", channel: "Kunal Kushwaha", playlistId: "PL9gnSGHSqcnr_DxHsP7AW9ftq0AtAyYqJ", minutes: 1800, isComplete: true },
      videoEn: { title: "System Design Primer", channel: "ByteByteGo", playlistId: "PLot-Xpze53leFqg6g6z6g6z6g6z6g6z6g", minutes: 1440, isComplete: true },
      resources: [
        { id: "DSA-8-R1", title: "Pramp (free mock interviews)", provider: "Pramp", lang: "english", type: "interactive", url: "https://www.pramp.com/", minutes: 300 },
        { id: "DSA-8-R2", title: "LeetCode Contests", provider: "LeetCode", lang: "english", type: "interactive", url: "https://leetcode.com/contest/", minutes: 240 },
      ],
      project: {
        title: "Capstone: DSA Blog + 100 Problems",
        brief: "100 solved problems ka GitHub repo + blog (Notion/GitHub Pages) with patterns, notes, solutions.",
        acceptanceCriteria: ["100+ problems solved", "Public blog live", "Patterns documented", "Resume ready"],
      },
      aiCoachPrompts: [
        "Technical interview me approach kaise explain karein? Hinglish me framework do.",
        "System design basics for freshers — Hinglish me 3 concepts (load balancer, cache, DB sharding).",
      ],
    },
  ],
};

export const APP_DEV_TRACK: LearningTrack = {
  id: "app-dev",
  name: "App Development (React Native)",
  tagline: "Zero se Play Store tak · 6 milestones · real mobile apps · AI coach",
  language: "hinglish",
  milestones: [
    {
      id: "APP-1", order: 1, title: "React Native + Expo Basics",
      summary: "Mobile development ka gateway: Expo se bina native setup ke React Native apps banao. React aata hai toh 80% already aata hai.",
      estimatedHours: 20, freshness: "version-sensitive",
      videoHi: { title: "React Native Complete (Hindi)", channel: "CodeWithHarry", youtubeId: "FtaL0vzVpYI", minutes: 540, isComplete: true },
      videoEn: { title: "React Native Full Course", channel: "freeCodeCamp", youtubeId: "ZBCUegTZF7M", minutes: 300, isComplete: true },
      resources: [
        { id: "APP-1-R1", title: "Expo Official Docs", provider: "Expo", lang: "english", type: "docs", url: "https://docs.expo.dev/", minutes: 120 },
        { id: "APP-1-R2", title: "React Native Basics", provider: "reactnative.dev", lang: "english", type: "docs", url: "https://reactnative.dev/docs/getting-started", minutes: 90 },
        { id: "APP-1-R3", title: "Expo Go App (test on phone)", provider: "Expo", lang: "english", type: "interactive", url: "https://expo.dev/go", minutes: 30 },
      ],
      project: {
        title: "Hello Mobile World",
        brief: "Simple counter app: 2 buttons (increment/decrement), number display, reset button. Phone pe run karo.",
        acceptanceCriteria: ["Expo project initialized", "Runs on physical phone (Expo Go)", "State updates correctly"],
      },
      aiCoachPrompts: [
        "React vs React Native — kya different hai aur kya same? Hinglish me 5 points batao.",
        "Expo vs bare React Native — kab kaunsa use karein? Hinglish me samjhao with pros/cons.",
      ],
    },
    {
      id: "APP-2", order: 2, title: "Navigation & Multi-Screen Apps",
      summary: "Real apps me multiple screens hote hain. Expo Router (file-based) ya React Navigation seekho — tab bars, stacks, modals.",
      estimatedHours: 25, freshness: "version-sensitive",
      videoHi: { title: "React Navigation Complete (Hindi)", channel: "Chai aur Code", playlistId: "PLu71SKxNbfoBsFgRsA3Jn6Z-2FbY9oQ0V", minutes: 720, isComplete: true },
      videoEn: { title: "React Navigation Full Course", channel: "William Candillon", youtubeId: "nQVCkqvU1uE", minutes: 360, isComplete: true },
      resources: [
        { id: "APP-2-R1", title: "Expo Router Docs", provider: "Expo", lang: "english", type: "docs", url: "https://docs.expo.dev/router/introduction/", minutes: 90 },
        { id: "APP-2-R2", title: "React Navigation Docs", provider: "React Navigation", lang: "english", type: "docs", url: "https://reactnavigation.org/docs/getting-started", minutes: 120 },
      ],
      project: {
        title: "3-Tab Todo App",
        brief: "Bottom tab navigation: Home (todos list), Add (form), Settings (theme toggle). Each tab separate screen.",
        acceptanceCriteria: ["3 tabs kaam karte hain", "Navigation smooth hai", "State persists across tabs"],
      },
      aiCoachPrompts: [
        "Stack navigation vs Tab navigation vs Drawer — kab kaunsa use karein? Hinglish me with examples.",
        "Expo Router me file-based routing kaise kaam karta hai? Hinglish me folder structure explain karo.",
      ],
    },
    {
      id: "APP-3", order: 3, title: "UI Components & Styling",
      summary: "Mobile-first UI: FlatList (performant lists), ScrollView, StyleSheet, responsive layouts. NativeWind (Tailwind for RN) bonus.",
      estimatedHours: 20, freshness: "version-sensitive",
      videoEn: { title: "React Native Styling Complete", channel: "William Candillon", playlistId: "PLkOy3wuGs2kP3k5KfKqJxQ9QxQ9Q9Q9Q", minutes: 720, isComplete: true },
      resources: [
        { id: "APP-3-R1", title: "React Native Core Components", provider: "reactnative.dev", lang: "english", type: "docs", url: "https://reactnative.dev/docs/components-and-apis", minutes: 120 },
        { id: "APP-3-R2", title: "NativeWind (Tailwind for RN)", provider: "NativeWind", lang: "english", type: "docs", url: "https://www.nativewind.dev/", minutes: 60 },
      ],
      project: {
        title: "E-commerce Product List",
        brief: "FlatList se 50 products dikhao: image, title, price, rating. Pull-to-refresh + infinite scroll.",
        acceptanceCriteria: ["FlatList performant (no lag)", "Images lazy load", "Pull-to-refresh works"],
      },
      aiCoachPrompts: [
        "ScrollView vs FlatList vs FlashList — performance differences Hinglish me samjhao with when to use each.",
        "StyleSheet.create() vs inline styles vs NativeWind — pros/cons Hinglish me batao.",
      ],
    },
    {
      id: "APP-4", order: 4, title: "APIs, State Management & Async Storage",
      summary: "Real apps server se data lete hain. fetch/axios, Context API/Redux, AsyncStorage (localStorage ka mobile version).",
      estimatedHours: 25, freshness: "evergreen",
      videoHi: { title: "React Native APIs Complete (Hindi)", channel: "CodeWithHarry", youtubeId: "vGCHpHqz8wI", minutes: 360, isComplete: true },
      videoEn: { title: "React Native State Management", channel: "Traversy Media", youtubeId: "9boMUdcZw3o", minutes: 270, isComplete: true },
      resources: [
        { id: "APP-4-R1", title: "AsyncStorage Docs", provider: "React Native Community", lang: "english", type: "docs", url: "https://react-native-async-storage.github.io/async-storage/", minutes: 60 },
        { id: "APP-4-R2", title: "Context API Guide", provider: "react.dev", lang: "english", type: "docs", url: "https://react.dev/learn/passing-data-deeply-with-context", minutes: 45 },
      ],
      project: {
        title: "Weather App (Mobile)",
        brief: "OpenWeatherMap API se current weather fetch karo. Location permission leke GPS se auto-detect karo. AsyncStorage me last city save karo.",
        acceptanceCriteria: ["API call successful", "GPS location permission handled", "Last city persists (AsyncStorage)"],
      },
      aiCoachPrompts: [
        "Context API vs Redux vs Zustand — React Native me kab kaunsa use karein? Hinglish me comparison.",
        "AsyncStorage vs SQLite vs MMKV — mobile data persistence options Hinglish me explain karo.",
      ],
    },
    {
      id: "APP-5", order: 5, title: "Device Features: Camera, Location, Notifications",
      summary: "Mobile ka asli power: camera, GPS, push notifications, sensors. Expo SDK se sab easy hai.",
      estimatedHours: 30, freshness: "version-sensitive",
      videoEn: { title: "Expo SDK Complete", channel: "Catalin Miron", playlistId: "PLkOy3wuGs2kP3k5KfKqJxQ9QxQ9Q9Q9Q", minutes: 1080, isComplete: true },
      resources: [
        { id: "APP-5-R1", title: "Expo Camera Docs", provider: "Expo", lang: "english", type: "docs", url: "https://docs.expo.dev/versions/latest/sdk/camera/", minutes: 60 },
        { id: "APP-5-R2", title: "Expo Location Docs", provider: "Expo", lang: "english", type: "docs", url: "https://docs.expo.dev/versions/latest/sdk/location/", minutes: 45 },
        { id: "APP-5-R3", title: "Expo Notifications Docs", provider: "Expo", lang: "english", type: "docs", url: "https://docs.expo.dev/versions/latest/sdk/notifications/", minutes: 60 },
      ],
      project: {
        title: "Photo Journal App",
        brief: "Camera se photo lo, GPS location attach karo, caption add karo, gallery me save karo. Push notification daily reminder.",
        acceptanceCriteria: ["Camera permission + photo capture", "GPS coordinates saved", "Local notification scheduled"],
      },
      aiCoachPrompts: [
        "Mobile app permissions (camera, location, notifications) — best practices Hinglish me batao.",
        "Background location tracking vs foreground — kab kaunsa use karein? Privacy concerns Hinglish me discuss karo.",
      ],
    },
    {
      id: "APP-6", order: 6, title: "Backend Integration + Publishing",
      summary: "Supabase/Firebase se real-time data sync. EAS Build se APK banao aur Play Store pe publish karo.",
      estimatedHours: 35, freshness: "version-sensitive",
      videoHi: { title: "Supabase + React Native Complete (Hindi)", channel: "Chai aur Code", playlistId: "PLu71SKxNbfoB8R4Vq1pQ5KjQ5v5", minutes: 540, isComplete: true },
      videoEn: { title: "EAS Build & Submit Complete", channel: "Expo", youtubeId: "pPQ3EjE8ygc", minutes: 180, isComplete: true },
      resources: [
        { id: "APP-6-R1", title: "Supabase JS Client", provider: "Supabase", lang: "english", type: "docs", url: "https://supabase.com/docs/reference/javascript/introduction", minutes: 90 },
        { id: "APP-6-R2", title: "EAS Build Docs", provider: "Expo", lang: "english", type: "docs", url: "https://docs.expo.dev/build/introduction/", minutes: 60 },
        { id: "APP-6-R3", title: "Play Store Publishing Guide", provider: "Google", lang: "english", type: "docs", url: "https://support.google.com/googleplay/android-developer/answer/113469", minutes: 45 },
      ],
      project: {
        title: "Capstone: Real-Time Chat App",
        brief: "Supabase backend: auth, real-time messages, image uploads. EAS Build se APK banao, Play Store pe submit karo (internal test track).",
        acceptanceCriteria: ["Supabase auth + realtime sync", "APK built successfully", "Play Store listing created"],
      },
      aiCoachPrompts: [
        "Supabase vs Firebase for React Native — Hinglish me comparison with use cases.",
        "EAS Build vs local Android Studio build — kab kaunsa use karein? Hinglish me pros/cons.",
      ],
    },
  ],
};

export const DEVOPS_TRACK: LearningTrack = {
  id: "devops-cloud",
  name: "DevOps & Cloud (AWS)",
  tagline: "Zero se cloud-ready · 6 milestones · Docker, K8s, CI/CD · AI coach",
  language: "hinglish",
  milestones: [
    {
      id: "DO-1", order: 1, title: "Linux & Shell Scripting",
      summary: "DevOps ki neev: terminal comfort, file ops, permissions, aur automation ke liye bash scripts. Sab kuch yahan se shuru.",
      estimatedHours: 20, freshness: "evergreen",
      videoHi: { title: "Linux + Shell Complete (Hinglish)", channel: "Kunal Kushwaha", youtubeId: "fKp63C5q0_0", minutes: 720, isComplete: true },
      videoEn: { title: "Linux for DevOps (Full Course)", channel: "freeCodeCamp", youtubeId: "g2iZqHWwTFM", minutes: 540, isComplete: true },
      resources: [
        { id: "DO-1-R1", title: "Linux Journey (interactive)", provider: "LinuxJourney", lang: "english", type: "interactive", url: "https://linuxjourney.com/", minutes: 150 },
        { id: "DO-1-R2", title: "Bash Guide", provider: "tldp", lang: "english", type: "docs", url: "https://tldp.org/LDP/Bash-Beginners-Guide/html/", minutes: 120 },
      ],
      project: {
        title: "Automation Script Suite",
        brief: "3 bash scripts: (1) backup folder to timestamped archive, (2) log cleanup older than 7 days, (3) system health report (disk/CPU/RAM).",
        acceptanceCriteria: ["3 scripts executable", "Cron job scheduled", "Output logged to file"],
      },
      aiCoachPrompts: [
        "Explain Linux permissions (rwx, chmod, chown) in Hinglish with numeric examples (755, 644).",
        "Bash script me variables, loops, conditions kaise likhte hain? Hinglish me ek backup script example do.",
      ],
    },
    {
      id: "DO-2", order: 2, title: "Git Advanced + GitHub Actions (CI/CD)",
      summary: "Branching strategies, rebase vs merge, aur GitHub Actions se automated build/test/deploy pipelines. CI/CD = DevOps ka dil.",
      estimatedHours: 20, freshness: "version-sensitive",
      videoHi: { title: "Git + GitHub Actions Complete (Hinglish)", channel: "Kunal Kushwaha", youtubeId: "q8gdBn8tR3E", minutes: 540, isComplete: true },
      videoEn: { title: "GitHub Actions CI/CD Course", channel: "freeCodeCamp", youtubeId: "R8_veQiYBjI", minutes: 450, isComplete: true },
      resources: [
        { id: "DO-2-R1", title: "GitHub Actions Docs", provider: "GitHub", lang: "english", type: "docs", url: "https://docs.github.com/en/actions", minutes: 90 },
        { id: "DO-2-R2", title: "Learn Git Branching (game)", provider: "Git", lang: "english", type: "interactive", url: "https://learngitbranching.js.org/", minutes: 60 },
      ],
      project: {
        title: "CI/CD Pipeline for a Web App",
        brief: "GitHub Actions workflow: on push → run tests → build → deploy to Vercel/Netlify. Branch protection + PR checks.",
        acceptanceCriteria: ["Workflow runs on push", "Tests gate the deploy", "Auto-deploy on main"],
      },
      aiCoachPrompts: [
        "Git rebase vs merge — kab kaunsa use karein? Hinglish me with golden rule.",
        "GitHub Actions workflow YAML structure Hinglish me samjhao: triggers, jobs, steps, secrets.",
      ],
    },
    {
      id: "DO-3", order: 3, title: "Docker & Containers",
      summary: "'Works on my machine' ka ant. Images, containers, Dockerfile, volumes, networks, docker-compose. Packaging ka standard.",
      estimatedHours: 25, freshness: "version-sensitive",
      videoHi: { title: "Docker Complete (Hinglish)", channel: "TechWorld with Nisha", youtubeId: "fqMOX6JJhGo", minutes: 720, isComplete: true },
      videoEn: { title: "Docker Full Course", channel: "freeCodeCamp", youtubeId: "fmoJOtJZ4jY", minutes: 540, isComplete: true },
      resources: [
        { id: "DO-3-R1", title: "Play with Docker (hands-on)", provider: "Docker", lang: "english", type: "interactive", url: "https://labs.play-with-docker.com/", minutes: 90 },
        { id: "DO-3-R2", title: "Docker Get Started", provider: "Docker", lang: "english", type: "docs", url: "https://docs.docker.com/get-started/", minutes: 120 },
      ],
      project: {
        title: "Dockerize a Full-Stack App",
        brief: "Apne Web Dev project ko Dockerize karo: multi-stage Dockerfile, docker-compose (app + db), .dockerignore, optimized image size.",
        acceptanceCriteria: ["docker compose up works", "Multi-stage build (small image)", "DB persists via volume"],
      },
      aiCoachPrompts: [
        "Docker image vs container vs Dockerfile — Hinglish me simple analogy ke saath samjhao.",
        "Multi-stage Docker build kya hota hai aur image size kaise ghatata hai? Hinglish me example do.",
      ],
    },
    {
      id: "DO-4", order: 4, title: "Kubernetes & Orchestration",
      summary: "Containers ko scale karo: Pods, Deployments, Services, ConfigMaps, Ingress. K8s = cloud ka operating system.",
      estimatedHours: 30, freshness: "version-sensitive",
      videoHi: { title: "Kubernetes Complete (Hinglish)", channel: "TechWorld with Nisha", youtubeId: "X48VuDVv0do", minutes: 900, isComplete: true },
      videoEn: { title: "Kubernetes Full Course", channel: "freeCodeCamp", youtubeId: "X48VuDVv0do", minutes: 720, isComplete: true },
      resources: [
        { id: "DO-4-R1", title: "Killercoda K8s (free labs)", provider: "Killercoda", lang: "english", type: "interactive", url: "https://killercoda.com/playground/scenario/kubernetes", minutes: 150 },
        { id: "DO-4-R2", title: "K8s Basics Tutorial", provider: "kubernetes.io", lang: "english", type: "docs", url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/", minutes: 120 },
      ],
      project: {
        title: "Deploy App on Minikube/K3s",
        brief: "Local cluster pe apna Dockerized app deploy karo: Deployment + Service + Ingress + ConfigMap. Scale to 3 replicas.",
        acceptanceCriteria: ["App accessible via Ingress", "3 replicas running", "ConfigMap for env vars"],
      },
      aiCoachPrompts: [
        "Pod vs Deployment vs Service — Hinglish me inka relation samjhao with diagram.",
        "Kubernetes me ConfigMap vs Secret kab use karein? Hinglish me security ke saath explain karo.",
      ],
    },
    {
      id: "DO-5", order: 5, title: "AWS Core Services",
      summary: "Cloud ka leader: EC2 (compute), S3 (storage), IAM (security), Lambda (serverless), VPC (network). Free tier se practice.",
      estimatedHours: 30, freshness: "version-sensitive",
      videoHi: { title: "AWS Complete (Hinglish)", channel: "TechWorld with Nisha", playlistId: "PL9gnSGHSqcnr_DxHsP7AW9ftq0AtAyYqJ", minutes: 1800, isComplete: true },
      videoEn: { title: "AWS Cloud Practitioner", channel: "freeCodeCamp", youtubeId: "3hLmDS179YE", minutes: 720, isComplete: true },
      resources: [
        { id: "DO-5-R1", title: "AWS Skill Builder (free)", provider: "AWS", lang: "english", type: "interactive", url: "https://skillbuilder.aws/", minutes: 180 },
        { id: "DO-5-R2", title: "AWS Free Tier Guide", provider: "AWS", lang: "english", type: "docs", url: "https://aws.amazon.com/free/", minutes: 60 },
      ],
      project: {
        title: "Host App on AWS (Free Tier)",
        brief: "EC2 instance pe app deploy karo, S3 pe static assets, IAM role for least-privilege, CloudWatch logs on.",
        acceptanceCriteria: ["App live on EC2 public IP", "S3 bucket for images", "IAM role (no root keys)"],
      },
      aiCoachPrompts: [
        "EC2 vs Lambda vs Fargate — kab kaunsa use karein? Hinglish me cost + use-case ke saath.",
        "AWS IAM best practices (least privilege, roles vs users) Hinglish me samjhao.",
      ],
    },
    {
      id: "DO-6", order: 6, title: "Terraform + Monitoring + Capstone",
      summary: "Infrastructure as Code (Terraform), observability (Prometheus/Grafana), aur full capstone: end-to-end automated pipeline.",
      estimatedHours: 35, freshness: "version-sensitive",
      videoHi: { title: "Terraform + Monitoring Complete (Hinglish)", channel: "TechWorld with Nisha", youtubeId: "SLB_c_ayRMo", minutes: 720, isComplete: true },
      videoEn: { title: "Terraform Full Course", channel: "freeCodeCamp", youtubeId: "SLB_c_ayRMo", minutes: 540, isComplete: true },
      resources: [
        { id: "DO-6-R1", title: "Terraform Tutorials", provider: "HashiCorp", lang: "english", type: "docs", url: "https://developer.hashicorp.com/terraform/tutorials", minutes: 150 },
        { id: "DO-6-R2", title: "Prometheus + Grafana Labs", provider: "Killercoda", lang: "english", type: "interactive", url: "https://killercoda.com/prometheus", minutes: 120 },
      ],
      project: {
        title: "Capstone: Full IaC + Observability Pipeline",
        brief: "Terraform se AWS infra provision karo (EC2+S3), CI/CD se deploy, Prometheus+Grafana se monitor. Sab kuch code me (no manual clicks).",
        acceptanceCriteria: ["terraform apply creates infra", "CI/CD deploys app", "Grafana dashboard live", "All in Git repo"],
      },
      aiCoachPrompts: [
        "Infrastructure as Code kya hai aur manual setup se behtar kyu? Hinglish me 4 reasons.",
        "Terraform state file kya hota hai aur remote backend kyu use karein? Hinglish me samjhao.",
      ],
    },
  ],
};

export const GAME_DEV_TRACK: LearningTrack = {
  id: "game-dev",
  name: "Game Development (Unity + C#)",
  tagline: "Zero se playable game · 6 milestones · Unity + C# · publish your game",
  language: "hinglish",
  milestones: [
    {
      id: "GD-1", order: 1, title: "C# Basics + Unity Setup",
      summary: "Game dev ki language C# hai. Variables, methods, classes, OOP basics — phir Unity install karke pehla scene banao.",
      estimatedHours: 20, freshness: "version-sensitive",
      videoEn: { title: "C# Complete (Unity path)", channel: "Unity", playlistId: "PLPV2KyIh3jR5R2n8wD2y8J9y7lZ9v3nXz", minutes: 1080, isComplete: true },
      resources: [
        { id: "GD-1-R1", title: "Unity Learn (official, free)", provider: "Unity", lang: "english", type: "interactive", url: "https://learn.unity.com/", minutes: 240 },
        { id: "GD-1-R2", title: "C# Docs (Microsoft)", provider: "Microsoft", lang: "english", type: "docs", url: "https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/", minutes: 120 },
      ],
      project: {
        title: "First Unity Scene",
        brief: "Unity install karo, new 3D/2D project banao, ek cube + light + camera set karo, Play mode me chalao. Screenshot lo.",
        acceptanceCriteria: ["Unity Hub + Editor installed", "Scene runs in Play mode", "One C# script attached & logging"],
      },
      aiCoachPrompts: [
        "C# ke basics (variables, methods, classes) Hinglish me samjhao with Unity context.",
        "Unity me script kaise attach hoti hai aur Start()/Update() kab chalte hain? Hinglish me explain karo.",
      ],
    },
    {
      id: "GD-2", order: 2, title: "Unity Core: GameObjects, Components, Prefabs",
      summary: "Unity ka mental model: har cheez GameObject hai, behaviour Components se aata hai. Prefabs = reusable templates. Scenes organize karte hain.",
      estimatedHours: 20, freshness: "version-sensitive",
      videoEn: { title: "Unity Core Complete", channel: "Brackeys", playlistId: "PLPV2KyIh3jR5R2n8wD2y8J9y7lZ9v3nXz", minutes: 720, isComplete: true },
      resources: [
        { id: "GD-2-R1", title: "Unity Manual (GameObjects)", provider: "Unity", lang: "english", type: "docs", url: "https://docs.unity3d.com/Manual/GameObjects.html", minutes: 90 },
        { id: "GD-2-R2", title: "Prefabs guide", provider: "Unity", lang: "english", type: "docs", url: "https://docs.unity3d.com/Manual/Prefabs.html", minutes: 60 },
      ],
      project: {
        title: "Prefab Playground",
        brief: "Ek enemy prefab banao, scene me 10 instances spawn karo, ek property change karke sab update karo. Parent-child hierarchy use karo.",
        acceptanceCriteria: ["Prefab created + reused", "Hierarchy organized", "Component values tweaked via Inspector"],
      },
      aiCoachPrompts: [
        "GameObject vs Component vs Prefab — Hinglish me simple analogy ke saath samjhao.",
        "Unity Inspector me serialized fields kaise kaam karte hain ([SerializeField])? Hinglish me example do.",
      ],
    },
    {
      id: "GD-3", order: 3, title: "C# Gameplay Scripting",
      summary: "Asli game logic: MonoBehaviour lifecycle, Input system, Rigidbody physics, collisions, coroutines. Yahan game 'zinda' hota hai.",
      estimatedHours: 30, freshness: "version-sensitive",
      videoEn: { title: "Unity Scripting Complete", channel: "Brackeys", playlistId: "PLPV2KyIh3jR5R2n8wD2y8J9y7lZ9v3nXz", minutes: 900, isComplete: true },
      resources: [
        { id: "GD-3-R1", title: "Unity Scripting Manual", provider: "Unity", lang: "english", type: "docs", url: "https://docs.unity3d.com/Manual/ScriptingSection.html", minutes: 120 },
        { id: "GD-3-R2", title: "Input System guide", provider: "Unity", lang: "english", type: "docs", url: "https://docs.unity3d.com/Manual/UnityInput.html", minutes: 60 },
      ],
      project: {
        title: "Ball Physics Toy",
        brief: "Ball ko keyboard/mouse se move karo, Rigidbody + gravity se bounce karo, OnCollisionEnter se color change karo, coroutine se 2s baad reset.",
        acceptanceCriteria: ["Input moves the ball", "Physics collision works", "Coroutine resets after delay"],
      },
      aiCoachPrompts: [
        "Update() vs FixedUpdate() — physics ke liye kaunsa aur kyu? Hinglish me samjhao.",
        "OnCollisionEnter vs OnTriggerEnter — kab kaunsa use karein? Hinglish me with isTrigger example.",
      ],
    },
    {
      id: "GD-4", order: 4, title: "Game Mechanics + UI (Canvas)",
      summary: "Player controller, scoring, health, win/lose states, aur UI: Canvas, Text, Buttons, sliders. Game ko 'khelne layak' banao.",
      estimatedHours: 30, freshness: "version-sensitive",
      videoEn: { title: "Unity UI Complete", channel: "Brackeys", playlistId: "PLPV2KyIh3jR5R2n8wD2y8J9y7lZ9v3nXz", minutes: 720, isComplete: true },
      resources: [
        { id: "GD-4-R1", title: "Unity UI Manual", provider: "Unity", lang: "english", type: "docs", url: "https://docs.unity3d.com/Manual/UIMenu.html", minutes: 90 },
        { id: "GD-4-R2", title: "Unity Learn: Micro-games", provider: "Unity", lang: "english", type: "interactive", url: "https://learn.unity.com/project/2d-beginner", minutes: 240 },
      ],
      project: {
        title: "Complete Mini-Game (Pong / Flappy)",
        brief: "Full playable loop: player control, score UI, health/lives, game-over screen with Restart button, win condition.",
        acceptanceCriteria: ["Playable loop complete", "Score + health UI live", "Restart works without reload"],
      },
      aiCoachPrompts: [
        "Game state machine (menu/playing/gameover) Hinglish me design karo with enum example.",
        "Unity Canvas + EventSystem kaise kaam karta hai? Button click handle karna Hinglish me sikhao.",
      ],
    },
    {
      id: "GD-5", order: 5, title: "Game Feel: Animation, Audio, Particles, Camera",
      summary: "Good vs GREAT game = 'game feel'. Animator, sound effects, particle bursts, screen shake, camera follow. Polish jo players ko hook karta hai.",
      estimatedHours: 25, freshness: "version-sensitive",
      videoEn: { title: "Game Feel Complete", channel: "Brackeys", playlistId: "PLPV2KyIh3jR5R2n8wD2y8J9y7lZ9v3nXz", minutes: 720, isComplete: true },
      resources: [
        { id: "GD-5-R1", title: "Unity Animation Manual", provider: "Unity", lang: "english", type: "docs", url: "https://docs.unity3d.com/Manual/AnimationSection.html", minutes: 90 },
        { id: "GD-5-R2", title: "Particle System guide", provider: "Unity", lang: "english", type: "docs", url: "https://docs.unity3d.com/Manual/PartSysMainModule.html", minutes: 60 },
      ],
      project: {
        title: "Juice Your Mini-Game",
        brief: "Pichle game me add karo: player animation, jump/collect SFX, particle burst on score, camera smooth-follow, subtle screen shake.",
        acceptanceCriteria: ["Animation plays on action", "Audio triggers correctly", "Particles + camera follow added"],
      },
      aiCoachPrompts: [
        "'Game feel' / juice kya hota hai? Hinglish me 5 techniques batao (squash, shake, particles, SFX, hit-stop).",
        "Unity Animator state machine Hinglish me samjhao: parameters, transitions, blend trees basics.",
      ],
    },
    {
      id: "GD-6", order: 6, title: "Build & Publish Your Game",
      summary: "Game ko duniya tak: Android APK / PC build, itch.io pe publish, Play Store basics, trailer + page design. Portfolio me add karo.",
      estimatedHours: 25, freshness: "version-sensitive",
      videoEn: { title: "Publishing Complete", channel: "Brackeys", youtubeId: "V4bZdPl7hKo", minutes: 270, isComplete: true },
      resources: [
        { id: "GD-6-R1", title: "Unity Build Settings", provider: "Unity", lang: "english", type: "docs", url: "https://docs.unity3d.com/Manual/PublishingBuilds.html", minutes: 60 },
        { id: "GD-6-R2", title: "itch.io creator docs", provider: "itch.io", lang: "english", type: "docs", url: "https://itch.io/docs/creators/", minutes: 45 },
      ],
      project: {
        title: "Capstone: Publish on itch.io",
        brief: "Apna best game build karo (WebGL ya Android), itch.io pe publish karo with page art + trailer/GIF. Link portfolio me daalo.",
        acceptanceCriteria: ["Build runs outside Editor", "Live itch.io page", "Page has art + description + GIF"],
      },
      aiCoachPrompts: [
        "Unity build settings (platform, compression, IL2CPP vs Mono) Hinglish me samjhao.",
        "itch.io page ko attractive kaise banayein (cover, GIF, description)? Hinglish me checklist do.",
      ],
    },
  ],
};

export const TRACKS: LearningTrack[] = [WEB_DEV_TRACK, PYTHON_TRACK, CYBER_TRACK, DSA_TRACK, APP_DEV_TRACK, DEVOPS_TRACK, GAME_DEV_TRACK];

export function getTrackById(id: string) {
  return TRACKS.find((t) => t.id === id);
}

export function trackTotalHours(t: LearningTrack) {
  return t.milestones.reduce((n, m) => n + m.estimatedHours, 0);
}

export interface ScheduleSlot { milestone: TrackMilestone; startDay: number; endDay: number; }

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