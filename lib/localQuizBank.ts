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
  "PY-1": [
    { q: "Python me comment kis symbol se likhte hain?", options: ["//", "#", "/*", "<!--"], correct: 1, explain: "# single-line comment hai; // aur /* C/JS style hain." },
    { q: "len([1, 2, 3]) ka output?", options: ["2", "3", "4", "Error"], correct: 1, explain: "len() list ke items count karta hai = 3." },
    { q: "Kaunsa type immutable hai?", options: ["list", "dict", "tuple", "set"], correct: 2, explain: "Tuple banne ke baad change nahi hota." },
    { q: "f-string ka sahi syntax?", options: ["f'{name}'", "'f{name}'", "{name}.f()", "format[f]"], correct: 0, explain: "f'...' ke andar {var} direct interpolate hota hai." },
  ],
  "PY-2": [
    { q: "Class ka constructor kaunsa method hai?", options: ["__start__", "__init__", "construct()", "new()"], correct: 1, explain: "__init__ object ban-te hi call hota hai." },
    { q: "'self' kya hota hai?", options: ["Global variable", "Current object ka reference", "Parent class", "Module name"], correct: 1, explain: "self = jis object pe method call hua." },
    { q: "Custom exception banane ke liye?", options: ["class MyErr(Exception)", "def MyErr()", "raise class", "error MyErr"], correct: 0, explain: "Exception class ko inherit karo." },
    { q: "finally block kab chalta hai?", options: ["Sirf error pe", "Sirf success pe", "Hamesha", "Kabhi nahi"], correct: 2, explain: "finally try/except ke baad hamesha execute hota hai." },
  ],
  "PY-3": [
    { q: "Pandas me row+column label se select karne ka?", options: ["iloc", "loc", "select", "pick"], correct: 1, explain: "loc = labels, iloc = positions." },
    { q: "df.head(5) kya karta hai?", options: ["Last 5 rows", "First 5 rows", "Random 5", "Delete 5"], correct: 1, explain: "head() top rows dikhata hai." },
    { q: "Missing values drop karne ka method?", options: ["dropna()", "remove()", "clean()", "delnull()"], correct: 0, explain: "dropna() NaN rows/cols hatata hai." },
    { q: "Group-wise average ke liye?", options: ["df.group().mean()", "df.groupby('col').mean()", "df.avg('col')", "df.mean(by='col')"], correct: 1, explain: "groupby + agg function standard pattern hai." },
  ],
  "PY-4": [
    { q: "Matplotlib me chart dikhane ka command?", options: ["plt.show()", "plt.render()", "show(chart)", "plt.drawnow()"], correct: 0, explain: "plt.show() figure render karta hai." },
    { q: "Categorical comparison ke liye best chart?", options: ["Line", "Bar", "Pie only", "Scatter"], correct: 1, explain: "Bar chart categories compare karta hai clearly." },
    { q: "Do numeric variables ka relation dekhne ke liye?", options: ["Scatter", "Bar", "Pie", "Histogram"], correct: 0, explain: "Scatter correlation dikhata hai." },
    { q: "Seaborn kis ke upar bana hai?", options: ["NumPy only", "Matplotlib", "Pandas only", "Plotly"], correct: 1, explain: "Seaborn = Matplotlib ka high-level wrapper." },
  ],
  "PY-5": [
    { q: "Sirf matching rows ke liye join?", options: ["LEFT JOIN", "INNER JOIN", "FULL JOIN", "CROSS JOIN"], correct: 1, explain: "INNER = dono tables me match." },
    { q: "Rows count karne ka aggregate?", options: ["SUM()", "COUNT()", "TOTAL()", "NUM()"], correct: 1, explain: "COUNT(*) rows ginta hai." },
    { q: "WHERE aur HAVING me farq?", options: ["Same hai", "HAVING groups pe, WHERE rows pe", "WHERE groups pe", "HAVING sirf dates pe"], correct: 1, explain: "HAVING aggregate conditions ke liye." },
    { q: "Unique values ke liye keyword?", options: ["UNIQUE", "DISTINCT", "ONLY", "SOLE"], correct: 1, explain: "SELECT DISTINCT col duplicates hatata hai." },
  ],
  "PY-6": [
    { q: "Train/test split kyu karte hain?", options: ["Speed ke liye", "Unseen data pe evaluate karne ke liye", "Memory bachane", "Plot ke liye"], correct: 1, explain: "Test set = unseen data proxy." },
    { q: "Overfitting ka sign?", options: ["Train acc low, test acc high", "Train acc high, test acc low", "Dono low", "Dono same"], correct: 1, explain: "Model train data rat-ta hai, generalize nahi." },
    { q: "Classification metric kaunsa?", options: ["RMSE", "Accuracy", "R²", "MAE"], correct: 1, explain: "Accuracy classification ke liye; baaki regression metrics." },
    { q: "scikit-learn me model train karne ka method?", options: ["fit()", "train()", "learn()", "run()"], correct: 0, explain: "model.fit(X, y) standard API hai." },
  ],
  "CY-1": [
    { q: "DNS ka kaam kya hai?", options: ["IP → MAC", "Domain → IP", "HTTP → HTTPS", "Port → IP"], correct: 1, explain: "DNS domain names ko IP addresses me resolve karta hai." },
    { q: "HTTPS ka 'S' kisliye?", options: ["Speed", "TLS encryption", "SEO", "Session"], correct: 1, explain: "TLS/SSL encryption traffic secure karta hai." },
    { q: "Default HTTP port?", options: ["443", "80", "22", "8080"], correct: 1, explain: "80 = HTTP, 443 = HTTPS, 22 = SSH." },
    { q: "IP address kaunsa layer deta hai?", options: ["Application", "Network", "Physical", "Session"], correct: 1, explain: "Network layer addressing handle karti hai." },
  ],
  "CY-2": [
    { q: "File ke permissions dekhne ka command?", options: ["ls -l", "cat -p", "chmod view", "perm"], correct: 0, explain: "ls -l long listing me rwx permissions dikhata hai." },
    { q: "Root user ka UID?", options: ["1", "0", "1000", "999"], correct: 1, explain: "root ka UID 0 hota hai." },
    { q: "File dhundne ka powerful tool?", options: ["search", "find", "locateonly", "grep -f"], correct: 1, explain: "find path-based search karta hai." },
    { q: "Text pattern search karne ka command?", options: ["grep", "seek", "match", "scan"], correct: 0, explain: "grep regex se lines match karta hai." },
  ],
  "CY-3": [
    { q: "' OR 1=1 -- kis attack me dikhta hai?", options: ["XSS", "SQLi", "CSRF", "DDoS"], correct: 1, explain: "Yeh classic SQL injection payload hai." },
    { q: "Stored XSS kahan save hota hai?", options: ["Browser me", "Server/DB me", "Proxy me", "DNS me"], correct: 1, explain: "Stored XSS server pe persist hota hai — sabse dangerous." },
    { q: "CSRF token kisliye?", options: ["Encryption", "Request authenticity", "Speed", "Caching"], correct: 1, explain: "CSRF token forged requests rokta hai." },
    { q: "SQLi se bachne ka best tareeka?", options: ["Input length limit", "Parameterized queries", "CSS filter", "HTTP only"], correct: 1, explain: "Parameterized/prepared queries injection khatam karti hain." },
  ],
  "CY-4": [
    { q: "nmap -sV kya karta hai?", options: ["OS scan", "Service/version detect", "Stealth only", "UDP only"], correct: 1, explain: "-sV service versions detect karta hai." },
    { q: "Subdomain enumeration ka tool?", options: ["subfinder", "ping", "traceroute", "whois only"], correct: 0, explain: "subfinder/assetfinder subdomains enumerate karte hain." },
    { q: "Recon ka pehla rule?", options: ["Turant attack", "Scope + permission verify", "Social media pe post", "Tools buy"], correct: 1, explain: "Bina scope/permission recon bhi illegal ho sakta hai." },
    { q: "robots.txt kisliye useful hai?", options: ["Passwords", "Hidden paths hint", "Encryption keys", "DNS records"], correct: 1, explain: "robots.txt aksar internal paths reveal karta hai." },
  ],
  "CY-5": [
    { q: "SIEM ka main kaam?", options: ["Firewall banana", "Logs collect + correlate", "Backups", "DNS serve"], correct: 1, explain: "SIEM logs aggregate karke alerts/correlation deta hai." },
    { q: "Wireshark me sirf HTTP dekhne ka filter?", options: ["http", "tcp==80", "show http", "filter.http()"], correct: 0, explain: "Display filter 'http' HTTP traffic dikhata hai." },
    { q: "Incident response ka pehla step?", options: ["Erase logs", "Identification/detection", "Reinstall OS", "Notify media"], correct: 1, explain: "Pehle detect/identify, phir contain/eradicate/recover." },
    { q: "Blue team ka role?", options: ["Attack karna", "Defend + monitor", "Bug sell", "Pentest only"], correct: 1, explain: "Blue team defense, monitoring, response karta hai." },
  ],
  "CY-6": [
    { q: "Bug report me sabse zaroori cheez?", options: ["Lambi story", "Clear reproduction steps", "Screenshots only", "Tool list"], correct: 1, explain: "Repro steps ke bina report reject hoti hai." },
    { q: "VDP vs Bug Bounty farq?", options: ["Same hai", "VDP = points/hall of fame, bounty = cash", "VDP cash deta hai", "Bounty free hota hai"], correct: 1, explain: "VDP recognition deta hai, bounty program cash." },
    { q: "Responsible disclosure ka matlab?", options: ["Turant tweet", "Vendor ko time dena fix ke liye", "Exploit sell karna", "Silent rehna"], correct: 1, explain: "Vendor ko fix window dena ethical disclosure hai." },
    { q: "Write-up publish karne se pehle?", options: ["Hamesha turant", "Program policy check karo", "Kabhi nahi", "Sirf friends ko"], correct: 1, explain: "Kuch programs disclosure timeline/policy rakhte hain." },
  ],
};