import type { Story, Question } from "./stories";

const CLASS5 = ["Sujeet", "Surbhi", "Sneha", "Nisha", "Alishan", "Sohail", "Prince", "Simpi", "Sahil", "Swati"];
const CLASS5_TEACHERS = ["Rita Mam", "Abjal Sir", "Principal Sir", "Rinku Mam", "Pratima Mam"];
const CLASS7 = ["Swati", "Sujeet", "Prince", "Sohail", "Sneha", "Alishan"];
const CLASS10 = ["Sujeet", "Swati", "Sneha", "Surbhi", "Prince", "Alishan", "Sohail"];
const BTECH_BOYS = ["Sujeet", "Amit", "Baibhav", "Rajan", "Rohit", "Vikash", "Sarovar", "Sagar", "Satyam", "Rahul", "Jai", "Vishal", "Sonu", "Suraj", "Sumit", "Anish"];
const BTECH_GIRLS = ["Gunja", "Khushi", "Harshita", "Nandani"];
const BTEACH_TEACHERS = ["Parmod Sir", "Akansha Mam", "Ankita Mam", "Rahul Sir", "Nisha Mam"];
const PLACES = ["the park", "the market", "the river", "the school gate", "the beach", "the garden", "the village fair"];
const TIMES = ["sunny morning", "rainy afternoon", "cold evening", "bright afternoon"];
const ANIMALS = ["puppy", "kitten", "calf", "sparrow", "rabbit"];
const ADJ = ["tiny", "brown", "white", "little", "fluffy"];
const EMO = ["hungry", "scared", "tired", "thirsty"];
const FOOD = ["milk", "bread", "rice", "biscuits", "fruit"];
const PETS = ["Brownie", "Snowy", "Chiku", "Mithu", "Rocky", "Lucky"];
const FESTIVALS = ["Diwali", "Holi", "Raksha Bandhan", "Eid", "Onam"];
const DISHES = ["ladoos", "samosas", "kheer", "jalebi", "pakoras"];
const DESTS = ["the mountains", "the beach", "the city museum", "a hill station"];
const ITEMS = ["toy", "keychain", "painting", "bracelet", "model car"];
const OPPONENTS = ["the rival college", "the neighboring school", "the senior team", "the district champions"];

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const gid = () => "gen-" + Math.random().toString(36).slice(2, 9);
function opts(correct: string, pool: string[]): string[] {
  const others = pool.filter((p) => p !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
  return [correct, ...others].sort(() => Math.random() - 0.5);
}

// ── SKILL-FOCUSED QUESTION BUILDERS ──
// Each one teaches something real: vocab, tense, error correction, or pronunciation.

function vocabMCQ(sentences: string[]): Question {
  // Pick a useful vocab word from a random sentence and ask its meaning
  const vocabBank: { word: string; correct: string; wrong: string[]; explain: string }[] = [
    { word: "nervous", correct: "worried and uneasy", wrong: ["angry and loud", "sleepy and tired", "excited and happy"], explain: "'Nervous' = worried about something new. First day = nervous!" },
    { word: "exhausted", correct: "extremely tired", wrong: ["very excited", "very angry", "very bored"], explain: "'Exhausted' = stronger than 'tired'. After marathon = exhausted!" },
    { word: "tiny", correct: "very small", wrong: ["very loud", "very fast", "very slow"], explain: "'Tiny' = very small. Tiny ant, tiny baby." },
    { word: "shelter", correct: "protection from weather", wrong: ["food to eat", "friends nearby", "money to spend"], explain: "'Shelter' = place that protects from rain/wind." },
    { word: "victory", correct: "winning / success", wrong: ["losing / failure", "starting a game", "practicing"], explain: "'Victory' = winning. 'Defeat' = losing." },
    { word: "calm", correct: "peaceful and steady", wrong: ["angry and loud", "sleepy and slow", "confused"], explain: "'Calm' = peaceful. Calm sea = no waves. Calm mind = clear thinking." },
    { word: "delicious", correct: "tasting very good", wrong: ["looking scary", "smelling bad", "feeling cold"], explain: "'Delicious' = tasty. Delicious food, delicious cake." },
    { word: "celebrated", correct: "enjoyed a special event", wrong: ["slept late", "cried loudly", "fought angrily"], explain: "'Celebrate' = enjoy something special with joy." },
  ];
  // Pick vocab whose word actually appears in the story
  const usable = vocabBank.filter((v) => sentences.some((s) => s.toLowerCase().includes(v.word)));
  const v = usable.length ? pick(usable) : vocabBank[0];
  return {
    type: "mcq",
    question: `In the story, '${v.word}' means:`,
    options: opts(v.correct, [v.correct, ...v.wrong]),
    answer: v.correct,
    explanation: v.explain,
  };
}

function grammarWord(sentences: string[]): Question {
  // Pick a verb-in-past from a sentence and make a fill-in-the-blank
  const verbBank: { base: string; past: string; explain: string }[] = [
    { base: "take", past: "took", explain: "'Take' is irregular: take → took → taken." },
    { base: "give", past: "gave", explain: "'Give' is irregular: give → gave → given." },
    { base: "run", past: "ran", explain: "'Run' is irregular: run → ran → run." },
    { base: "see", past: "saw", explain: "'See' is irregular: see → saw → seen." },
    { base: "hear", past: "heard", explain: "'Hear' is irregular: hear → heard → heard." },
    { base: "meet", past: "met", explain: "'Meet' is irregular: meet → met → met." },
    { base: "find", past: "found", explain: "'Find' is irregular: find → found → found." },
    { base: "write", past: "wrote", explain: "'Write' is irregular: write → wrote → written." },
    { base: "sing", past: "sang", explain: "'Sing' is irregular: sing → sang → sung." },
    { base: "eat", past: "ate", explain: "'Eat' is irregular: eat → ate → eaten." },
    { base: "swim", past: "swam", explain: "'Swim' is irregular: swim → swam → swum." },
    { base: "go", past: "went", explain: "'Go' is irregular: go → went → gone." },
  ];
  // Find a verb actually used in the story
  const usable = verbBank.filter((v) => sentences.some((s) => new RegExp(`\\b${v.past}\\b`, "i").test(s)));
  const v = usable.length ? pick(usable) : verbBank[0];
  const wrongOptions = [v.base, v.base + "s", v.base + "ing"];
  return {
    type: "word",
    question: `Pick the correct past form of '${v.base}': "He ___ it yesterday."`,
    answer: v.past,
    explanation: v.explain,
  };
}

function errorSentence(sentences: string[]): Question {
  // Pick a past-tense sentence and make a wrong version, ask user to fix
  const patterns: { wrong: string; right: string; explain: string }[] = [
    { wrong: "He go to school yesterday.", right: "He went to school yesterday.", explain: "'Go' → 'went' (irregular past). 'Yesterday' = past time." },
    { wrong: "She eat rice last night.", right: "She ate rice last night.", explain: "'Eat' → 'ate' (irregular past)." },
    { wrong: "They play cricket on Sunday.", right: "They played cricket on Sunday.", explain: "If talking about past Sunday: 'play' → 'played'." },
    { wrong: "He don't like coffee.", right: "He doesn't like coffee.", explain: "Third person singular (he/she/it): 'don't' → 'doesn't'." },
    { wrong: "She run fast every day.", right: "She runs fast every day.", explain: "Third person singular present: add -s. 'run' → 'runs'." },
    { wrong: "I seen that movie.", right: "I saw that movie.", explain: "'See' = saw (past simple). 'Seen' needs 'have/has': 'I have seen'." },
    { wrong: "He write a letter yesterday.", right: "He wrote a letter yesterday.", explain: "'Write' → 'wrote' (irregular past)." },
    { wrong: "They was happy.", right: "They were happy.", explain: "'They' is plural → 'were'. 'He/She/It' → 'was'." },
  ];
  const p = pick(patterns);
  return {
    type: "sentence",
    question: `Fix the mistake: "${p.wrong}"`,
    answer: p.right,
    explanation: p.explain,
  };
}

function speakSentence(sentences: string[]): Question {
  // Pick a short, expressive sentence from the story for shadowing
  const short = sentences.filter((s) => s.length >= 20 && s.length <= 80);
  const choice = short.length ? pick(short) : sentences[sentences.length - 1];
  return {
    type: "speak",
    question: "Say it naturally, like a friend would:",
    answer: choice,
    shadow: choice,
    explanation: "Focus on flow, not perfection. Link the words together naturally!"
  };
}

function buildSkillQuestions(sentences: string[]): Question[] {
  return [vocabMCQ(sentences), grammarWord(sentences), errorSentence(sentences), speakSentence(sentences)];
}

// ── STORY TEMPLATES (same stories, skill-focused questions) ──

function lostFound(): Story {
  const n = pick(CLASS5), t = pick(CLASS5_TEACHERS), an = pick(ANIMALS), aj = pick(ADJ), pe = pick(PETS), f = pick(FOOD);
  const s = [`One morning, ${n} was walking to school.`, `${n} saw a ${aj} ${an} sitting alone near the school gate.`, `The ${an} looked ${pick(EMO)} and weak.`, `${n} gave it some ${f} and water.`, `${t} saw this and smiled proudly.`, `${n} took the ${an} home and named it ${pe}.`, `Now ${n} and ${pe} are best friends.`];
  return { id: gid(), title: `${n} and the ${cap(an)}`, emoji: "🐾", difficulty: "Easy", sentences: s, questions: buildSkillQuestions(s) };
}

function festival(): Story {
  const n = pick(CLASS5), fe = pick(FESTIVALS), d = pick(DISHES), fr = pick(CLASS5.filter(x => x !== n));
  const s = [`${fe} is ${n}'s favorite festival.`, `This year, ${n} cleaned the house with the family.`, `${n}'s mother made delicious ${d}.`, `In the evening, ${n} and ${fr} decorated the house.`, `They shared ${d} with all the neighbors.`, `It was a day full of joy and light.`];
  return { id: gid(), title: `${fe} Celebrations`, emoji: "🪔", difficulty: "Easy", sentences: s, questions: buildSkillQuestions(s) };
}

function cricket(): Story {
  const captain = pick(BTECH_BOYS), bowl = pick(BTECH_BOYS.filter(x => x !== captain)), bat = pick(BTECH_BOYS.filter(x => x !== captain && x !== bowl)), sir = pick(BTEACH_TEACHERS), opp = pick(OPPONENTS);
  const s = [`The inter-college cricket final was here.`, `${cap} was captain of the team.`, `${bowl} bowled the first over and took two wickets.`, `They needed 12 runs from the last over against ${opp}.`, `${bat} hit a six and a four to win the match.`, `${sir} cheered from the pavilion.`, `They lifted the trophy and celebrated.`];
  return { id: gid(), title: `The Cricket Final`, emoji: "🏏", difficulty: "Medium", sentences: s, questions: buildSkillQuestions(s) };
}

function kabaddi(): Story {
  const raid = pick(BTECH_BOYS), catchr = pick(BTECH_BOYS.filter(x => x !== raid)), opp = pick(OPPONENTS);
  const s = [`The district kabaddi final was on.`, `${raid} was the star raider.`, `The score was tied at 30 each.`, `${raid} touched three defenders in one raid.`, `${catchr} caught an opponent near the line.`, `They won against ${opp} by two points.`, `The whole village celebrated.`];
  return { id: gid(), title: `Kabaddi Championship`, emoji: "🤼", difficulty: "Medium", sentences: s, questions: buildSkillQuestions(s) };
}

function adventure(): Story {
  const n1 = pick(BTECH_BOYS), n2 = pick(BTECH_BOYS.filter(x => x !== n1));
  const s = [`${n1} and five friends planned a mountain trek.`, `On day two they lost the trail.`, `Rain began to fall heavily.`, `${n2} spotted a cave and they ran inside.`, `They shared their last biscuits and waited.`, `By morning the rain stopped and the sun rose.`, `They reached the peak with the most beautiful view.`];
  return { id: gid(), title: `The Mountain Trek`, emoji: "🏔️", difficulty: "Hard", sentences: s, questions: buildSkillQuestions(s) };
}

function horror(): Story {
  const n = pick(BTECH_BOYS), fr = pick(BTECH_BOYS.filter(x => x !== n));
  const s = [`It was past midnight in the hostel.`, `${n} heard footsteps in the empty corridor.`, `He called ${fr} from the next room.`, `They walked together with a torch.`, `An old door creaked open by itself.`, `Inside was just a dusty mirror.`, `They laughed nervously and ran back.`];
  return { id: gid(), title: `The Old Hostel`, emoji: "👻", difficulty: "Hard", sentences: s, questions: buildSkillQuestions(s) };
}

function collegeTrip(): Story {
  const n = pick(BTECH_BOYS), g = pick(BTECH_GIRLS), dest = pick(DESTS);
  const s = [`The college organized a trip to ${dest}.`, `${n} sat next to ${g} on the bus.`, `They sang songs the whole way.`, `At the destination, a guide told them stories.`, `${g} took the best group photo.`, `On the way back everyone was tired but happy.`, `It was a trip no one would forget.`];
  return { id: gid(), title: `Trip to ${cap(dest)}`, emoji: "🚌", difficulty: "Medium", sentences: s, questions: buildSkillQuestions(s) };
}

function movieStyle(): Story {
  const n = pick(BTECH_BOYS), g = pick(BTECH_GIRLS), fr = pick(BTECH_GIRLS.filter(x => x !== g));
  const s = [`${n} wrote a love letter to ${g}.`, `He slipped it inside her book.`, `But ${fr} picked up the wrong book.`, `She read it thinking it was for her.`, `${n} ran to explain the mix-up.`, `${g} found out and laughed loudly.`, `They all became better friends.`];
  return { id: gid(), title: `The Love Letter`, emoji: "💌", difficulty: "Medium", sentences: s, questions: buildSkillQuestions(s) };
}

const TEMPLATES = [lostFound, festival, cricket, kabaddi, adventure, horror, collegeTrip, movieStyle];
export function generateStory(): Story { return pick(TEMPLATES)(); }