export type Skill = {
  id: string;
  emoji: string;
  name: string;
  tagline: string;
  days: Day[];
};

export type Day = {
  num: number;
  title: string;
  technique: string;
  why: string;
  action: string;
  min: number;
};

export const SKILLS: Skill[] = [
  {
    id: "own-your-24",
    emoji: "⏰",
    name: "Own Your 24",
    tagline: "Time management that actually works — 7 days, 7 mental models",
    days: [
      { num: 1, title: "Outcome + Time Audit", technique: "Outcome-first", why: "You can't manage time you can't see. Pick ONE outcome for this week, then log yesterday in 3 buckets: sleep / scroll / work.", action: "Write this week's outcome + 3 bucket log", min: 15 },
      { num: 2, title: "The 80/20 Cut", technique: "Pareto Principle", why: "20% of activities cause 80% of results. Most people never find their 20%.", action: "Circle your 2 highest-leverage tasks; delete or postpone 2 low-value ones", min: 10 },
      { num: 3, title: "Time-Block", technique: "Time-blocking", why: "A task without a calendar slot is a wish. Blocks protect focus.", action: "Put 3 real blocks in your calendar for your top 2 tasks + 1 buffer block", min: 10 },
      { num: 4, title: "Frog + 2-min Rule", technique: "Eat the Frog + 2-min Rule", why: "Starting is the enemy, not doing. Hardest task first kills procrastination.", action: "Do hardest task first (10 min). Anything under 2 min — do it instantly", min: 15 },
      { num: 5, title: "Eisenhower Matrix", technique: "Eisenhower", why: "Urgent ≠ important. Most people spend their life in the Urgent box.", action: "Sort today's list into 4 boxes; delete one thing forever", min: 10 },
      { num: 6, title: "Reverse-Engineer", technique: "Reverse-engineering", why: "Start at the deadline, walk backwards. Milestones appear, panic disappears.", action: "Pick next month's goal; write milestones backwards to today", min: 15 },
      { num: 7, title: "Weekly Review", technique: "Weekly Review System", why: "A weekly 10-min review is the highest-leverage time habit in existence.", action: "Review: wins / wastes / top 2 targets for next week. Convert one action into a Habit Log habit", min: 15 },
    ],
  },
  {
    id: "voice-presence",
    emoji: "🎤",
    name: "Voice & Presence",
    tagline: "Public speaking + daily confidence — 7 days, 7 techniques",
    days: [
      { num: 1, title: "Pick 1 Scenario + Baseline", technique: "Outcome-first", why: "Pick one upcoming talk scenario (meeting, pitch, toast). Record a 60-sec baseline.", action: "Pick scenario + record 60-sec baseline voice memo", min: 10 },
      { num: 2, title: "Rule of 3 Structure", technique: "Rule of 3", why: "The human brain chunks in 3s. Any topic, any audience — 3 points wins.", action: "Outline your talk in exactly 3 points, each with 1 story or example", min: 15 },
      { num: 3, title: "Filler-word Hunt", technique: "80/20 of fillers", why: "Ums, likes, and 'you knows' are 20% of words that destroy 80% of presence.", action: "Record a 2-min talk; count fillers; re-record cutting them in half", min: 15 },
      { num: 4, title: "Exposure Ladder Step 1", technique: "Exposure ladder", why: "Fear shrinks when you climb it in small steps, not leap.", action: "Talk to 1 new person today; ask a genuine question", min: 5 },
      { num: 5, title: "Eye Contact + Pause", technique: "Presence pause", why: "Pauses feel long to you but powerful to the audience.", action: "Deliver your 3-point talk to a mirror; pause 2 sec between points", min: 10 },
      { num: 6, title: "Record & Review", technique: "Deliberate practice", why: "You improve what you measure. Recording is your coach.", action: "Record final 2-min version; watch/listen; write 3 wins + 1 fix", min: 15 },
      { num: 7, title: "Deliver & Systemize", technique: "Spaced repetition", why: "Skills decay without repetition. Plan your next talk.", action: "Deliver your talk to a real audience (even 1 person). Plan next talk date", min: 20 },
    ],
  },
  {
    id: "face-the-world",
    emoji: "🧴",
    name: "Face the World",
    tagline: "Skin + grooming that builds daily self-respect — 7 days",
    days: [
      { num: 1, title: "Skin-type Check + Outcome", technique: "Self-audit", why: "You can't build a routine without knowing your skin type (oily/dry/combination/normal).", action: "Identify your skin type; pick 1 goal (clear skin / glow / reduce acne)", min: 10 },
      { num: 2, title: "The Sunscreen Rule", technique: "Non-negotiable #1", why: "Daily SPF 30+ is the #1 anti-aging and anti-cancer habit on Earth.", action: "Buy or pick an SPF 30+ sunscreen; apply tomorrow morning", min: 5 },
      { num: 3, title: "Cleanse Basics", technique: "Less is more", why: "Over-cleansing destroys your skin barrier. Twice a day is the sweet spot.", action: "Wash face morning + night with a gentle cleanser; no scrubbing", min: 5 },
      { num: 4, title: "Moisturize + Hydrate", technique: "Barrier repair", why: "Moisturizer locks in water; 2L water/day keeps skin plump.", action: "Apply moisturizer after cleansing; drink 2L water today", min: 5 },
      { num: 5, title: "Weekly Grooming Audit", technique: "Weekly audit", why: "Small details compound: nails, hair, beard, eyebrows.", action: "Trim nails, shape beard/eyebrows, book haircut if due", min: 15 },
      { num: 6, title: "Night Ritual", technique: "PM reset", why: "Skin repairs at night. Cleanse + moisturize before bed = morning glow.", action: "Do full PM ritual tonight: cleanse → moisturize → SPF off", min: 5 },
      { num: 7, title: "Stack into a Habit", technique: "Habit stacking", why: "Attach the ritual to something you already do (after brushing teeth).", action: "Lock in AM + PM ritual as daily habits in Habit Log", min: 10 },
    ],
  },
  {
    id: "one-thing",
    emoji: "🧠",
    name: "One Thing",
    tagline: "Deep focus in a distracted world — 7 days, 7 focus tools",
    days: [
      { num: 1, title: "Outcome + Focus Audit", technique: "Outcome-first", why: "Most focus problems are actually unclear-outcome problems.", action: "Write one outcome for today; log every distraction for 2 hours", min: 10 },
      { num: 2, title: "Pomodoro 25/5", technique: "Pomodoro", why: "25 min focus + 5 min break trains the brain to start and stop on cue.", action: "Do 2 Pomodoros today on your #1 task; no phone in sight", min: 60 },
      { num: 3, title: "Phone Friction", technique: "Friction design", why: "Every extra step between you and the phone reduces scroll time.", action: "Move phone to another room while working; turn on grayscale", min: 5 },
      { num: 4, title: "Environment Design", technique: "Environment > willpower", why: "Your desk decides your focus more than your brain does.", action: "Clear desk; 1 task visible; water + lamp only", min: 10 },
      { num: 5, title: "Attention Residue", technique: "Single-tasking", why: "Switching tasks leaves residue — you lose 20+ min of quality.", action: "One task per Pomodoro; no tabs, no messages", min: 60 },
      { num: 6, title: "Deep Work Block", technique: "Deep work", why: "90 uninterrupted minutes is where real work gets done.", action: "Schedule a 90-min deep work block; defend it like a meeting", min: 90 },
      { num: 7, title: "Review + Systemize", technique: "Weekly review", why: "What gets measured, grows. Lock in your focus stack.", action: "Review: distractions killed vs wins; convert deep-work block into a habit", min: 15 },
    ],
  },
];