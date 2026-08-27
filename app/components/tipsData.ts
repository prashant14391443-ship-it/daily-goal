import { Mic, BookOpen, PenLine, Users, Brain, Coffee, Heart } from "lucide-react";

export type Tip = { cat: string; emoji: string; tip: string; why: string; try?: string };

export const TIPS: Tip[] = [
  // 🗣️ SPEAKING
  { cat: "Speaking", emoji: "🗣️", tip: "Speak 20% slower than you feel you should.", why: "Speed hides mistakes; slowness shows control.", try: "Count 1-2-3 between sentences." },
  { cat: "Speaking", emoji: "🗣️", tip: "Think in English, don't translate from Hindi.", why: "Translation adds delay and wrong word order.", try: "Name 10 objects around you in English now." },
  { cat: "Speaking", emoji: "🗣️", tip: "Record yourself speaking for 1 minute daily.", why: "Hearing your own voice fixes mistakes fastest.", try: "Say: 'Today I learned…'" },
  { cat: "Speaking", emoji: "🗣️", tip: "Shadow a speaker: repeat exactly what you hear.", why: "Copying rhythm builds natural flow.", try: "Repeat any movie line 3 times." },
  { cat: "Speaking", emoji: "🗣️", tip: "Answer in full sentences, not one word.", why: "Full sentences train real conversation.", try: "Q: 'Tea?' A: 'Yes, I'd love some tea.'" },
  { cat: "Speaking", emoji: "🗣️", tip: "Speak English for the first 5 minutes of a call.", why: "Small daily targets beat big rare efforts.", try: "Start with: 'Hey! How was your day?'" },
  { cat: "Speaking", emoji: "🗣️", tip: "Pause instead of saying 'umm'.", why: "A pause sounds smart; 'umm' sounds unsure.", try: "Pause 1 second before your next sentence." },
  { cat: "Speaking", emoji: "🗣️", tip: "Talk to yourself in English while doing chores.", why: "Private practice = zero fear, maximum reps.", try: "Describe what you're cooking, out loud." },
  // 🎤 PRONUNCIATION
  { cat: "Pronunciation", emoji: "🎤", tip: "TH sound: tongue between your teeth.", why: "'Think' needs tongue out — 'tink' is a different word!", try: "Say 'three things' 5 times slowly." },
  { cat: "Pronunciation", emoji: "🎤", tip: "V vs W: V = teeth on lip; W = round lips.", why: "'Very' and 'wary' are different words.", try: "Say: 'very wet weather'." },
  { cat: "Pronunciation", emoji: "🎤", tip: "S vs SH: S = smile; SH = push lips forward.", why: "'Sea' and 'she' must sound different.", try: "Say: 'she sells sea shells'." },
  { cat: "Pronunciation", emoji: "🎤", tip: "Stress the important word in a sentence.", why: "English is musical; stress carries meaning.", try: "Say 'I want TEA, not coffee' with feeling." },
  { cat: "Pronunciation", emoji: "🎤", tip: "Word stress changes meaning: RE-cord vs re-CORD.", why: "Noun = 1st syllable; verb = 2nd.", try: "Say: 'I'll RECORD the REcord.'" },
  { cat: "Pronunciation", emoji: "🎤", tip: "End statements with a falling tone.", why: "Rising tone makes statements sound like questions.", try: "Say 'It's a nice day.' firmly." },
  { cat: "Pronunciation", emoji: "🎤", tip: "Keep the English R soft — don't roll it.", why: "Hard rolling changes your accent.", try: "Say 'really, very, sorry' gently." },
  { cat: "Pronunciation", emoji: "🎤", tip: "Practice ED endings: walked = t, wanted = id.", why: "Wrong endings confuse listeners.", try: "Say: 'I walked, I played, I wanted.'" },
  // 📚 VOCABULARY
  { cat: "Vocabulary", emoji: "📚", tip: "Learn phrases, not single words.", why: "Your brain remembers stories, not lists.", try: "Learn 'catch up', not just 'catch'." },
  { cat: "Vocabulary", emoji: "📚", tip: "Use a new word 3 times the same day.", why: "3 uses = memory lock.", try: "Use today's word in 3 messages." },
  { cat: "Vocabulary", emoji: "📚", tip: "Keep a word notebook — 5 words a day.", why: "Writing by hand boosts memory 2x.", try: "Add today's 5 vocab words now." },
  { cat: "Vocabulary", emoji: "📚", tip: "Learn the synonym AND the opposite.", why: "Two hooks = double the memory.", try: "hot → warm (syn) / cold (opp)." },
  { cat: "Vocabulary", emoji: "📚", tip: "Stick English labels on things at home.", why: "Seeing 'fridge' daily = free learning.", try: "Label mirror, door, fridge today." },
  { cat: "Vocabulary", emoji: "📚", tip: "Replace 'very + weak word' with a strong word.", why: "Very tired → exhausted = instant upgrade.", try: "Say 'exhausted' instead of 'very tired'." },
  { cat: "Vocabulary", emoji: "📚", tip: "Review yesterday's words before new ones.", why: "Old first, new second = no forgetting.", try: "Open My Words and review now." },
  // ✍️ WRITING
  { cat: "Writing", emoji: "✍️", tip: "Keep sentences under 20 words.", why: "Short = clear; long = confusing.", try: "Split your longest sentence today." },
  { cat: "Writing", emoji: "✍️", tip: "One idea per sentence.", why: "Mixing ideas loses the reader.", try: "Write 3 short sentences about your day." },
  { cat: "Writing", emoji: "✍️", tip: "Read your message out loud before sending.", why: "Your ear catches what your eye misses.", try: "Do it for your next WhatsApp message." },
  { cat: "Writing", emoji: "✍️", tip: "Start emails with the point, not the story.", why: "Readers want the point in line 1.", try: "Line 1: 'I am writing to ask…'" },
  { cat: "Writing", emoji: "✍️", tip: "Use active voice: 'I did it', not 'It was done by me'.", why: "Active = shorter and stronger.", try: "Rewrite one passive sentence today." },
  { cat: "Writing", emoji: "✍️", tip: "Capitalize names and 'I'. Always.", why: "Small errors kill credibility.", try: "Check your last 3 messages." },
  { cat: "Writing", emoji: "✍️", tip: "End with one clear next step.", why: "No next step = no reply.", try: "End with: 'Please confirm by Friday.'" },
  // 👔 INTERVIEW
  { cat: "Interview", emoji: "👔", tip: "Answer with STAR: Situation, Task, Action, Result.", why: "Structure = confident, complete answers.", try: "Prepare one STAR story tonight." },
  { cat: "Interview", emoji: "👔", tip: "'Tell me about yourself' = present, past, future.", why: "A formula beats rambling.", try: "I am… I have done… I want to…" },
  { cat: "Interview", emoji: "👔", tip: "Say 'I recently graduated', never 'I am fresher'.", why: "Natural English impresses instantly.", try: "Say it out loud 3 times." },
  { cat: "Interview", emoji: "👔", tip: "Ask 2 questions at the end.", why: "Questions show interest and confidence.", try: "'What does success look like here?'" },
  { cat: "Interview", emoji: "👔", tip: "Replace 'I don't know' with 'I'll find out'.", why: "Attitude beats knowledge in interviews.", try: "Say it out loud 3 times." },
  { cat: "Interview", emoji: "👔", tip: "Practice answers out loud, not in your head.", why: "Mouth memory is real memory.", try: "Answer 'Why should we hire you?' aloud." },
  { cat: "Interview", emoji: "👔", tip: "Use numbers: 'improved sales by 20%' beats 'a lot'.", why: "Numbers are believable.", try: "Add one number to your story." },
  { cat: "Interview", emoji: "👔", tip: "First 10 seconds decide: smile + eye contact + slow.", why: "Interviewers judge energy first.", try: "Practice your hello with a smile." },
  // 🧠 STUDY
  { cat: "Study", emoji: "🧠", tip: "Study the hardest subject first.", why: "Willpower is highest at the start.", try: "Do the tough one before lunch." },
  { cat: "Study", emoji: "🧠", tip: "Use Pomodoro: 25 min focus, 5 min break.", why: "Breaks keep your brain fresh for hours.", try: "Start one round in Focus Timer now." },
  { cat: "Study", emoji: "🧠", tip: "Teach what you learned to someone.", why: "Teaching = 90% retention.", try: "Explain today's topic to a friend or mirror." },
  { cat: "Study", emoji: "🧠", tip: "Test yourself before you feel ready.", why: "Testing builds memory stronger than re-reading.", try: "Do today's AI quiz." },
  { cat: "Study", emoji: "🧠", tip: "Review notes 10 minutes before sleeping.", why: "Sleep locks in the last thing you studied.", try: "Skim one page tonight." },
  { cat: "Study", emoji: "🧠", tip: "Phone in another room while studying.", why: "Just seeing a phone cuts focus by 20%.", try: "Try it for one session today." },
  { cat: "Study", emoji: "🧠", tip: "Write summaries from memory, then check.", why: "Recall beats recognition.", try: "Close the book, write 5 points." },
  { cat: "Study", emoji: "🧠", tip: "Same time, same place, every day.", why: "Routine removes the decision to start.", try: "Pick your study slot now." },
  // 😴 HABITS
  { cat: "Habits", emoji: "😴", tip: "Sleep 7-8 hours — memory is built during sleep.", why: "No sleep = no learning.", try: "Set a sleep alarm tonight." },
  { cat: "Habits", emoji: "😴", tip: "Drink water first thing in the morning.", why: "A hydrated brain focuses better.", try: "One glass before chai!" },
  { cat: "Habits", emoji: "😴", tip: "2-minute rule: if it takes 2 min, do it now.", why: "Small tasks pile up into stress.", try: "Clear 3 tiny tasks now." },
  { cat: "Habits", emoji: "😴", tip: "Walk 10 minutes after each meal.", why: "Walking aids digestion and thinking.", try: "One walk after lunch today." },
  { cat: "Habits", emoji: "😴", tip: "Plan tomorrow tonight (3 items only).", why: "A clear plan = fast morning start.", try: "Write 3 tasks before bed." },
  { cat: "Habits", emoji: "😴", tip: "Get 10 minutes of sunlight daily.", why: "Light sets your body clock.", try: "Step outside after waking." },
  { cat: "Habits", emoji: "😴", tip: "No phone for the first 30 minutes of the day.", why: "Start proactive, not reactive.", try: "Try it tomorrow morning." },
  // 💬 CONFIDENCE
  { cat: "Confidence", emoji: "💬", tip: "Slow = confident. Fast = nervous.", why: "Speed signals fear; slowness signals control.", try: "Speak one sentence slowly on purpose." },
  { cat: "Confidence", emoji: "💬", tip: "Mistake = data, not failure.", why: "Every ❌ today is a ✅ in the exam.", try: "Say 'Good mistake!' when you slip." },
  { cat: "Confidence", emoji: "💬", tip: "Eye contact 60-70% of the time.", why: "Too little = shy; too much = stare.", try: "Practice with a shopkeeper today." },
  { cat: "Confidence", emoji: "💬", tip: "Stand tall, shoulders back, chin up.", why: "Posture changes how you feel in 2 minutes.", try: "Do it before your next call." },
  { cat: "Confidence", emoji: "💬", tip: "Start conversations with a question.", why: "Questions take the pressure off you.", try: "'How was your day?' — that's it." },
  { cat: "Confidence", emoji: "💬", tip: "Celebrate small wins out loud.", why: "Celebration wires the habit loop.", try: "Say 'Done!' after each task today." },
  { cat: "Confidence", emoji: "💬", tip: "Compare yourself only to yesterday's you.", why: "Others' highlight reels kill motivation.", try: "Write one thing you improved this week." },
];

export const categoryIcons: Record<string, any> = {
  Speaking: Mic,
  Pronunciation: Mic,
  Vocabulary: BookOpen,
  Writing: PenLine,
  Interview: Users,
  Study: Brain,
  Habits: Coffee,
  Confidence: Heart,
};

export const categoryColors: Record<string, string> = {
  Speaking: "from-blue-500 to-cyan-600",
  Pronunciation: "from-purple-500 to-pink-600",
  Vocabulary: "from-green-500 to-emerald-600",
  Writing: "from-amber-500 to-orange-600",
  Interview: "from-slate-600 to-gray-700",
  Study: "from-indigo-500 to-violet-600",
  Habits: "from-teal-500 to-cyan-600",
  Confidence: "from-rose-500 to-red-600",
};

export function localISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function dayNum(d: Date) {
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
}