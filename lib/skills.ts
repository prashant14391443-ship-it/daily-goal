export type Category = "sleep" | "move" | "eat" | "mind" | "body" | "connect";
export type Audience = "all" | "men" | "women";

export type Day = {
  num: number;
  title: string;
  technique: string;
  why: string;
  action: string;
  min: number;
};

export type Skill = {
  id: string;
  emoji: string;
  name: string;
  tagline: string;
  days: Day[];
};

export const SKILLS: Skill[] = [
  {
    id: "own-your-24",
    emoji: "⏰",
    name: "Own Your 24",
    tagline: "Time management that actually works — 7 days, 7 mental models",
    days: [
      { num: 1, title: "Outcome + Time Audit", technique: "Outcome-first", why: "You can't manage time you can't see. Pick ONE outcome for this week, then log yesterday in 3 buckets: sleep / scroll / work.", action: "Write this week's outcome + 3-bucket log of yesterday", min: 15 },
      { num: 2, title: "The 80/20 Cut", technique: "Pareto Principle", why: "20% of activities cause 80% of results. Most people never find their 20%.", action: "Circle your 2 highest-leverage tasks; delete or postpone 2 low-value ones", min: 10 },
      { num: 3, title: "Time-Block", technique: "Time-blocking", why: "A task without a calendar slot is a wish. Blocks protect focus.", action: "Put 3 real blocks in your calendar for your top 2 tasks + 1 buffer block", min: 10 },
      { num: 4, title: "Frog + 2-min Rule", technique: "Eat the Frog + 2-min Rule", why: "Starting is the enemy, not doing. Hardest task first kills procrastination.", action: "Do your hardest task first (10 min). Anything under 2 min — do it instantly", min: 15 },
      { num: 5, title: "Eisenhower Matrix", technique: "Eisenhower", why: "Urgent ≠ important. Most people live in the Urgent box forever.", action: "Sort today's list into 4 boxes; delete one thing forever", min: 10 },
      { num: 6, title: "Reverse-Engineer", technique: "Reverse-engineering", why: "Start at the deadline, walk backwards. Milestones appear, panic disappears.", action: "Pick next month's goal; write milestones backwards to today", min: 15 },
      { num: 7, title: "Weekly Review", technique: "Weekly Review System", why: "A weekly 10-min review is the highest-leverage time habit in existence.", action: "Review wins / wastes / top 2 targets; convert one action into a Habit Log habit", min: 15 },
    ],
  },
  {
    id: "voice-presence",
    emoji: "🎤",
    name: "Voice & Presence",
    tagline: "Public speaking + daily confidence — 7 days, 7 techniques",
    days: [
      { num: 1, title: "Pick 1 Scenario + Baseline", technique: "Outcome-first", why: "Vague goals fail. Pick one upcoming talk scenario and record a 60-sec baseline.", action: "Pick your scenario + record a 60-sec baseline voice memo", min: 10 },
      { num: 2, title: "Rule of 3 Structure", technique: "Rule of 3", why: "The brain chunks in 3s. Any topic, any audience — 3 points wins.", action: "Outline your talk in exactly 3 points, each with 1 story or example", min: 15 },
      { num: 3, title: "Filler-word Hunt", technique: "80/20 of fillers", why: "Ums and likes are 20% of words that kill 80% of presence.", action: "Record 2 min; count fillers; re-record cutting them in half", min: 15 },
      { num: 4, title: "Exposure Ladder Step 1", technique: "Exposure ladder", why: "Fear shrinks in small steps, not leaps.", action: "Talk to 1 new person today; ask a genuine question", min: 5 },
      { num: 5, title: "Eye Contact + Pause", technique: "Presence pause", why: "Pauses feel long to you but powerful to the audience.", action: "Deliver your 3-point talk to a mirror; pause 2 sec between points", min: 10 },
      { num: 6, title: "Record & Review", technique: "Deliberate practice", why: "You improve what you measure. Recording is your coach.", action: "Record final 2-min version; note 3 wins + 1 fix", min: 15 },
      { num: 7, title: "Deliver & Systemize", technique: "Spaced repetition", why: "Skills decay without repetition. Plan the next talk.", action: "Deliver to a real audience (even 1 person); set next talk date", min: 20 },
    ],
  },
  {
    id: "face-the-world",
    emoji: "🧴",
    name: "Face the World",
    tagline: "Skin + grooming that builds daily self-respect — 7 days",
    days: [
      { num: 1, title: "Skin-type Check + Goal", technique: "Self-audit", why: "No routine works without knowing your skin type (oily/dry/combination/normal).", action: "Identify your skin type; pick 1 goal (clear / glow / less acne)", min: 10 },
      { num: 2, title: "The Sunscreen Rule", technique: "Non-negotiable #1", why: "Daily SPF 30+ is the #1 anti-aging and anti-cancer habit on Earth.", action: "Pick an SPF 30+ sunscreen; apply tomorrow morning", min: 5 },
      { num: 3, title: "Cleanse Basics", technique: "Less is more", why: "Over-cleansing destroys your skin barrier. Twice a day is the sweet spot.", action: "Wash face morning + night, gentle cleanser, no scrubbing", min: 5 },
      { num: 4, title: "Moisturize + Hydrate", technique: "Barrier repair", why: "Moisturizer locks water in; 2L water/day keeps skin plump.", action: "Moisturize after cleansing; drink 2L water today", min: 5 },
      { num: 5, title: "Weekly Grooming Audit", technique: "Weekly audit", why: "Small details compound: nails, hair, beard, brows.", action: "Trim nails, shape beard/brows, book haircut if due", min: 15 },
      { num: 6, title: "Night Ritual", technique: "PM reset", why: "Skin repairs at night. Cleanse + moisturize = morning glow.", action: "Full PM ritual tonight: cleanse → moisturize", min: 5 },
      { num: 7, title: "Stack into a Habit", technique: "Habit stacking", why: "Attach the ritual to something you already do (after brushing teeth).", action: "Lock AM + PM ritual as daily habits in Habit Log", min: 10 },
    ],
  },
  {
    id: "one-thing",
    emoji: "🧠",
    name: "One Thing",
    tagline: "Deep focus in a distracted world — 7 days, 7 focus tools",
    days: [
      { num: 1, title: "Outcome + Focus Audit", technique: "Outcome-first", why: "Most focus problems are actually unclear-outcome problems.", action: "Write one outcome for today; log every distraction for 2 hours", min: 10 },
      { num: 2, title: "Pomodoro 25/5", technique: "Pomodoro", why: "25 min focus + 5 min break trains starting and stopping on cue.", action: "Do 2 Pomodoros on your #1 task; phone out of sight", min: 60 },
      { num: 3, title: "Phone Friction", technique: "Friction design", why: "Every extra step between you and the phone cuts scroll time.", action: "Phone in another room while working; grayscale on", min: 5 },
      { num: 4, title: "Environment Design", technique: "Environment > willpower", why: "Your desk decides your focus more than your brain does.", action: "Clear desk; 1 task visible; water + lamp only", min: 10 },
      { num: 5, title: "Attention Residue", technique: "Single-tasking", why: "Task-switching leaves residue — 20+ min of quality lost per switch.", action: "One task per Pomodoro; no tabs, no messages", min: 60 },
      { num: 6, title: "Deep Work Block", technique: "Deep work", why: "90 uninterrupted minutes is where real work gets done.", action: "Schedule + defend a 90-min deep work block like a meeting", min: 90 },
      { num: 7, title: "Review + Systemize", technique: "Weekly review", why: "What gets measured grows. Lock in your focus stack.", action: "Review distractions vs wins; convert deep-work block into a habit", min: 15 },
    ],
  },
  {
    id: "money-basics",
    emoji: "💰",
    name: "Money Basics",
    tagline: "Pay yourself first — 7 days to money clarity",
    days: [
      { num: 1, title: "Money Audit", technique: "Awareness first", why: "You can't manage money you don't track.", action: "Log yesterday's spending in 3 buckets: needs / wants / waste", min: 10 },
      { num: 2, title: "Pay Yourself First", technique: "Pay yourself first", why: "Save after spending = nothing left. Save first = always something.", action: "Fix a % (even 10%) to move to savings the day money arrives", min: 5 },
      { num: 3, title: "72-Hour Rule", technique: "72-hour rule", why: "Impulse urges cool in 72 hours; wants reveal themselves.", action: "Put every 'want' purchase on a 72-hour waitlist from today", min: 5 },
      { num: 4, title: "Needs vs Wants Cut", technique: "80/20 of spending", why: "~20% of purchases cause 80% of money stress.", action: "Find your top 2 money leaks; cap them for this week", min: 10 },
      { num: 5, title: "Emergency Seed", technique: "Emergency fund", why: "One surprise expense shouldn't become a debt spiral.", action: "Start/open an emergency fund with any amount today", min: 10 },
      { num: 6, title: "Reverse-Engineer a Goal", technique: "Reverse-engineering", why: "A savings goal without a monthly number is a wish.", action: "Pick one 6-month goal; compute the monthly + weekly number", min: 10 },
      { num: 7, title: "Weekly Money Review", technique: "Weekly review", why: "10 min/week puts you ahead of the 90% who never track.", action: "Review the week's spending; move your %; set next week's cap", min: 10 },
    ],
  },
  {
    id: "sleep-mastery",
    emoji: "😴",
    name: "Sleep Mastery",
    tagline: "Fix your nights, fix your life — 7 days",
    days: [
      { num: 1, title: "Sleep Audit", technique: "Awareness first", why: "Most people misjudge their sleep by over an hour.", action: "Write last night's bed time, wake time, phone-in-bed minutes", min: 5 },
      { num: 2, title: "Fixed Wake Time", technique: "Circadian anchor", why: "Wake time anchors the body clock more than bedtime does.", action: "Pick ONE wake time for 7 days; set the alarm now", min: 5 },
      { num: 3, title: "Morning Light", technique: "Light anchoring", why: "10 min morning sunlight = deeper sleep tonight.", action: "Get 10 min outdoor light within 1 hour of waking", min: 10 },
      { num: 4, title: "Caffeine Curfew", technique: "Half-life math", why: "4 pm coffee is still 25% active at 10 pm.", action: "Set your caffeine curfew (e.g. 2 pm) and honor it today", min: 5 },
      { num: 5, title: "Screens-Off Wind-Down", technique: "Friction design", why: "Blue light + dopamine delay melatonin up to 90 min.", action: "Phone out of arm's reach tonight; 30-min wind-down", min: 5 },
      { num: 6, title: "Bedroom = Cave", technique: "Environment design", why: "Cool, dark, quiet = measurable deep-sleep boost.", action: "Fix one bedroom factor tonight: dark / cool / quiet", min: 10 },
      { num: 7, title: "Review + Lock Ritual", technique: "Weekly review", why: "A repeatable wind-down ritual beats willpower.", action: "Write your 3-step wind-down ritual; convert to a Habit Log habit", min: 10 },
    ],
  },
  {
    id: "conversation-charisma",
    emoji: "🗣️",
    name: "Conversation & Charisma",
    tagline: "Be the person people remember — 7 days",
    days: [
      { num: 1, title: "Baseline + Goal", technique: "Outcome-first", why: "Vague 'be social' fails; one scenario wins.", action: "Pick one recurring social scene (class/office/family) as your lab", min: 5 },
      { num: 2, title: "3-Question Habit", technique: "Curiosity loop", why: "People love the person who asks about them.", action: "Ask 3 genuine follow-up questions in one conversation today", min: 10 },
      { num: 3, title: "Listen to Understand", technique: "Active listening", why: "Feeling heard is rare; the giver is remembered.", action: "Paraphrase their point before adding yours, in one convo", min: 10 },
      { num: 4, title: "Names + Details", technique: "Spaced repetition", why: "A person's name is their sweetest sound.", action: "Use their name twice; note 1 detail about them after talking", min: 5 },
      { num: 5, title: "Story Shape (Rule of 3)", technique: "Rule of 3", why: "Setup–tension–payoff sticks; rambles don't.", action: "Tell one story today in 3 beats, under 60 seconds", min: 10 },
      { num: 6, title: "Body Language Basics", technique: "Presence", why: "Open posture + eye contact reads as warmth and confidence.", action: "One convo: uncross arms, eye contact, phone face-down", min: 10 },
      { num: 7, title: "Review + One Brave Hello", technique: "Exposure ladder", why: "Charisma is reps, not talent.", action: "Start one conversation with a stranger; review your 3 wins", min: 15 },
    ],
  },
  {
    id: "cook-5-meals",
    emoji: "🍳",
    name: "Cook 5 Real Meals",
    tagline: "Feed yourself like you matter — 7 days",
    days: [
      { num: 1, title: "Kitchen Audit", technique: "Awareness first", why: "You cook what your shelves allow.", action: "List what's in your kitchen; pick your 5 target meals", min: 10 },
      { num: 2, title: "Meal 1: 10-min Eggs/Paneer", technique: "2-min start", why: "One mastered dish kills the 'I can't cook' story.", action: "Cook meal #1 today (eggs/paneer + salt + heat)", min: 20 },
      { num: 3, title: "Meal 2: One-Pot Dal/Rice/Pasta", technique: "One-pot rule", why: "Fewer pots = higher chance you actually cook.", action: "Cook meal #2; note one thing to improve", min: 25 },
      { num: 4, title: "Meal 3: Veg + Roti/Stir-fry", technique: "80/20 of flavor", why: "Onion-tomato-spice base = 80% of Indian home flavor.", action: "Cook meal #3 using one base masala", min: 25 },
      { num: 5, title: "Batch + Store", technique: "Batch cooking", why: "Cook once, eat twice — the weekday saver.", action: "Double one meal today; store half for tomorrow", min: 25 },
      { num: 6, title: "Meal 4 + Smart List", technique: "Reverse-engineering", why: "Shop from the menu, not from mood.", action: "Write a 5-meal list; buy only what's on it", min: 20 },
      { num: 7, title: "Meal 5 + Mini Cookbook", technique: "Systemize", why: "Written recipes = future-you cooks on autopilot.", action: "Cook meal #5; write your 5 recipes in 3 lines each; make 'cook 3×/week' a habit", min: 30 },
    ],
  },
];