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
  youtubeId: string;
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
      videoHi: { title: "HTML + CSS Full Course (Hindi)", channel: "CodeWithHarry", youtubeId: "BsDoLVMnmZs", minutes: 180 },
      videoEn: { title: "HTML & CSS Full Course for Beginners", channel: "SuperSimpleDev", youtubeId: "G3e-cpL7ofc", minutes: 220 },
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
      videoHi: { title: "Tailwind CSS in Hinglish", channel: "Chai aur Code", youtubeId: "9rcRb3wYbWk", minutes: 120 },
      videoEn: { title: "Learn Tailwind CSS in 15 Minutes", channel: "Web Dev Simplified", youtubeId: "lCxcTsOHrjo", minutes: 15 },
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
      videoHi: { title: "JavaScript Playlist (Hindi)", channel: "CodeWithHarry", youtubeId: "PLu0W_9lII9kV5fRIr8IjJsB9Pz6p1526C", minutes: 300 },
      videoEn: { title: "JavaScript Full Course", channel: "freeCodeCamp", youtubeId: "PkZNo7MFNFg", minutes: 200 },
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
      videoHi: { title: "Namaste JavaScript", channel: "Akshay Saini", youtubeId: "PLlasXeu85E9cQ32gLCvAvr9vNaUccPVNP", minutes: 240 },
      videoEn: { title: "Async/Await Crash Course", channel: "Web Dev Simplified", youtubeId: "V_Kr9OSfDeU", minutes: 20 },
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
      videoHi: { title: "Chai aur React", channel: "Chai aur Code", youtubeId: "PLu71SKxNbfoDqgPchmvIsL4hTnJIrtige", minutes: 300 },
      videoEn: { title: "React Course for Beginners", channel: "freeCodeCamp", youtubeId: "bMknfKXIFA8", minutes: 180 },
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
      videoHi: { title: "Chai aur Next.js", channel: "Chai aur Code", youtubeId: "PLu71SKxNbfoQ7BI8FzJ0MUHJsKKrG6GPD", minutes: 200 },
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
      videoEn: { title: "Supabase Crash Course", channel: "Traversy Media", youtubeId: "ZVsuKXcRwDo", minutes: 60 },
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
      videoHi: { title: "Git & GitHub in Hindi", channel: "CodeWithHarry", youtubeId: "gwS9ZQVJmAk", minutes: 90 },
      videoEn: { title: "Git & GitHub Crash Course", channel: "Traversy Media", youtubeId: "SWYqp7iY_Tc", minutes: 40 },
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
      videoHi: { title: "Python in 1 Video (Hindi)", channel: "CodeWithHarry", youtubeId: "GF-HFs2XUg", minutes: 240 },
      videoEn: { title: "Python Full Course for Beginners", channel: "freeCodeCamp", youtubeId: "rfscVS01bw2", minutes: 264 },
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
      videoEn: { title: "Data Analysis with Python (Full Course)", channel: "freeCodeCamp", youtubeId: "r-uOLxNrNk8", minutes: 300 },
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
      videoEn: { title: "Supabase Crash Course", channel: "Traversy Media", youtubeId: "ZVsuKXcRwDo", minutes: 60 },
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
      videoEn: { title: "Machine Learning for Everybody", channel: "freeCodeCamp", youtubeId: "i_LwzRVP7bg", minutes: 240 },
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
      videoEn: { title: "Full Ethical Hacking Course", channel: "freeCodeCamp", youtubeId: "3Kq1MIfTWCE", minutes: 300 },
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

export const TRACKS: LearningTrack[] = [WEB_DEV_TRACK, PYTHON_TRACK, CYBER_TRACK];

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