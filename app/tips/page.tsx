"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Lightbulb, Flame, Volume2, Check, RefreshCw, History, Mic, Brain, BookOpen, PenLine, Users, Coffee, Heart, Target } from "lucide-react";

type Tip = { cat: string; emoji: string; tip: string; why: string; try?: string };

const TIPS: Tip[] = [
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

const categoryIcons: Record<string, any> = {
  Speaking: Mic,
  Pronunciation: Mic,
  Vocabulary: BookOpen,
  Writing: PenLine,
  Interview: Users,
  Study: Brain,
  Habits: Coffee,
  Confidence: Heart,
};

const categoryColors: Record<string, string> = {
  Speaking: "from-blue-500 to-cyan-600",
  Pronunciation: "from-purple-500 to-pink-600",
  Vocabulary: "from-green-500 to-emerald-600",
  Writing: "from-amber-500 to-orange-600",
  Interview: "from-slate-600 to-gray-700",
  Study: "from-indigo-500 to-violet-600",
  Habits: "from-teal-500 to-cyan-600",
  Confidence: "from-rose-500 to-red-600",
};

function localISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dayNum(d: Date) {
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
}

export default function TipsPage() {
  const [offset, setOffset] = useState(0);
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<{ day: string; tip: Tip; done: boolean; today: boolean }[]>([]);

  const base = dayNum(new Date());
  const tip = TIPS[(base + offset) % TIPS.length];
  const CategoryIcon = categoryIcons[tip.cat] || Lightbulb;

  useEffect(() => {
    const today = localISO(new Date());
    const yest = localISO(new Date(Date.now() - 86400000));
    setDone(localStorage.getItem("dg-tip-done-" + today) === "1");
    const st = JSON.parse(localStorage.getItem("dg-tip-streak") || "null");
    if (st && (st.date === today || st.date === yest)) setStreak(st.count);
    const hist = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      hist.push({
        day: d.toLocaleDateString(undefined, { weekday: "short" }),
        tip: TIPS[dayNum(d) % TIPS.length],
        done: localStorage.getItem("dg-tip-done-" + localISO(d)) === "1",
        today: i === 0,
      });
    }
    setHistory(hist);
  }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  };

  const didIt = () => {
    if (done) return;
    const today = localISO(new Date());
    const yest = localISO(new Date(Date.now() - 86400000));
    const st = JSON.parse(localStorage.getItem("dg-tip-streak") || "null");
    const count = st && st.date === yest ? st.count + 1 : 1;
    localStorage.setItem("dg-tip-streak", JSON.stringify({ date: today, count }));
    localStorage.setItem("dg-tip-done-" + today, "1");
    setStreak(count);
    setDone(true);
    setHistory((h) => h.map((x) => (x.today ? { ...x, done: true } : x)));
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Lightbulb size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Daily Tips</h1>
            <p className="text-xs text-slate-400">One tip a day = 365 upgrades a year</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-1.5">
            <Flame size={14} className="text-orange-400" />
            <span className="text-xs font-semibold text-orange-300">{streak} day streak</span>
          </div>
          <Link href="/speaking" className="text-sm text-slate-400 hover:text-slate-300">
            ← Back
          </Link>
        </div>
      </div>

      {/* Today's Tip Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 mb-6 max-w-2xl mx-auto">
        {/* Category Badge */}
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${categoryColors[tip.cat] || "from-slate-600 to-slate-700"} flex items-center justify-center`}>
            <CategoryIcon size={16} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-400">
              {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" }).toUpperCase()}
            </p>
            <p className="text-xs font-semibold text-slate-300">{tip.cat.toUpperCase()}</p>
          </div>
        </div>

        {/* Main Tip */}
        <div className="mb-6">
          <p className="text-xl font-semibold leading-relaxed mb-4">"{tip.tip}"</p>
          
          {/* Why Section */}
          <div className="bg-slate-900/50 rounded-xl p-4 mb-4 border border-slate-700/50">
            <div className="flex items-start gap-2">
              <Lightbulb size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-1">Why it works</p>
                <p className="text-sm text-slate-300 leading-relaxed">{tip.why}</p>
              </div>
            </div>
          </div>

          {/* Try Now Section */}
          {tip.try && (
            <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/20">
              <div className="flex items-start gap-2">
                <Target size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-emerald-400 mb-1">Try now</p>
                  <p className="text-sm text-emerald-100 leading-relaxed">{tip.try}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => speak(tip.tip + " " + tip.why)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium transition-colors"
          >
            <Volume2 size={16} />
            Hear
          </button>
          <button
            onClick={didIt}
            disabled={done}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              done
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-400 text-white"
            }`}
          >
            <Check size={16} />
            {done ? "Done today!" : "Did it!"}
          </button>
        </div>

        {/* Another Tip Button */}
        <button
          onClick={() => setOffset((offset + 1) % 3)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
        >
          <RefreshCw size={14} />
          Show another tip
        </button>
      </div>

      {/* This Week History */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <History size={16} className="text-slate-400" />
          <p className="text-sm font-semibold text-slate-400">This week</p>
        </div>
        <div className="grid gap-2">
          {history.map((h, i) => {
            const HistIcon = categoryIcons[h.tip.cat] || Lightbulb;
            return (
              <div
                key={i}
                className={`rounded-xl p-3 border ${
                  h.today
                    ? "bg-slate-800/50 border-emerald-500/30"
                    : "bg-slate-900/30 border-slate-700/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500 w-12">{h.day}</span>
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${categoryColors[h.tip.cat] || "from-slate-600 to-slate-700"} flex items-center justify-center flex-shrink-0`}>
                    <HistIcon size={14} className="text-white" />
                  </div>
                  <p className="flex-1 text-xs text-slate-300 truncate">{h.tip.tip}</p>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    h.done ? "bg-emerald-500/20" : "bg-slate-700/30"
                  }`}>
                    <Check size={14} className={h.done ? "text-emerald-400" : "text-slate-600"} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}