import type { Story, Question } from "./stories";

// Your real-life character pools by era
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

// ── Lost & Found (Class 5 cast) ──
function lostFound(): Story {
  const n = pick(CLASS5), t = pick(CLASS5_TEACHERS), an = pick(ANIMALS), aj = pick(ADJ), pe = pick(PETS), f = pick(FOOD);
  const s = [`One morning, ${n} was walking to school.`, `${n} saw a ${aj} ${an} sitting alone near the school gate.`, `The ${an} looked ${pick(EMO)} and weak.`, `${n} gave it some ${f} and water.`, `${t} saw this and smiled proudly.`, `${n} took the ${an} home and named it ${pe}.`, `Now ${n} and ${pe} are best friends.`];
  return { id: gid(), title: `${n} and the ${cap(an)}`, emoji: "🐾", difficulty: "Easy", sentences: s, questions: [
    { type: "mcq", question: `Who found the ${an}?`, options: opts(n, CLASS5), answer: n, explanation: `${n} found it.` },
    { type: "word", question: `What name did ${n} give it?`, answer: pe, explanation: `Named it ${pe}.` },
    { type: "sentence", question: `What did ${t} do?`, answer: `${t} saw this and smiled proudly.`, explanation: `Smiled proudly.` },
    { type: "speak", question: "What happened at the end?", answer: s[6], explanation: `Best friends.` },
  ]};
}

// ── Festival (Class 5 cast) ──
function festival(): Story {
  const n = pick(CLASS5), fe = pick(FESTIVALS), d = pick(DISHES), fr = pick(CLASS5.filter(x => x !== n));
  const s = [`${fe} is ${n}'s favorite festival.`, `This year, ${n} cleaned the house with the family.`, `${n}'s mother made delicious ${d}.`, `In the evening, ${n} and ${fr} decorated the house.`, `They shared ${d} with all the neighbors.`, `It was a day full of joy and light.`];
  return { id: gid(), title: `${fe} Celebrations`, emoji: "🪔", difficulty: "Easy", sentences: s, questions: [
    { type: "mcq", question: `Whose favorite festival?`, options: opts(n, CLASS5), answer: n, explanation: `${n}'s favorite.` },
    { type: "word", question: `What dish was made?`, answer: d, explanation: `Delicious ${d}.` },
    { type: "sentence", question: `What did ${n} and ${fr} do?`, answer: s[3], explanation: `Decorated the house.` },
    { type: "speak", question: "What did they share?", answer: s[4], explanation: `Shared ${d}.` },
  ]};
}

// ── Cricket match (BTech cast) ──
function cricket(): Story {
  const cap = pick(BTECH_BOYS), bowl = pick(BTECH_BOYS.filter(x => x !== cap)), bat = pick(BTECH_BOYS.filter(x => x !== cap && x !== bowl)), sir = pick(BTEACH_TEACHERS), opp = pick(OPPONENTS);
  const s = [`The inter-college cricket final was here.`, `${cap} was captain of the team.`, `${bowl} bowled the first over and took two wickets.`, `They needed 12 runs from the last over against ${opp}.`, `${bat} hit a six and a four to win the match.`, `${sir} cheered from the pavilion.`, `They lifted the trophy and celebrated.`];
  return { id: gid(), title: `The Cricket Final`, emoji: "🏏", difficulty: "Medium", sentences: s, questions: [
    { type: "mcq", question: `Who was captain?`, options: opts(cap, BTECH_BOYS), answer: cap, explanation: `${cap} was captain.` },
    { type: "word", question: `Who bowled the first over?`, answer: bowl, explanation: `${bowl} bowled.` },
    { type: "sentence", question: `What did ${bat} hit?`, answer: `A six and a four.`, explanation: `Six and four.` },
    { type: "speak", question: "What did they do after winning?", answer: s[6], explanation: `Lifted trophy.` },
  ]};
}

// ── Kabaddi (BTech cast) ──
function kabaddi(): Story {
  const raid = pick(BTECH_BOYS), catchr = pick(BTECH_BOYS.filter(x => x !== raid)), opp = pick(OPPONENTS);
  const s = [`The district kabaddi final was on.`, `${raid} was the star raider.`, `The score was tied at 30 each.`, `${raid} touched three defenders in one raid.`, `${catchr} caught an opponent near the line.`, `They won against ${opp} by two points.`, `The whole village celebrated.`];
  return { id: gid(), title: `Kabaddi Championship`, emoji: "🤼", difficulty: "Medium", sentences: s, questions: [
    { type: "mcq", question: `Who was the star raider?`, options: opts(raid, BTECH_BOYS), answer: raid, explanation: `${raid} was raider.` },
    { type: "word", question: `How many defenders touched?`, answer: "3", explanation: `Three defenders.` },
    { type: "sentence", question: `How many points did they win by?`, answer: `Two points.`, explanation: `Won by two.` },
    { type: "speak", question: "How did the village react?", answer: s[6], explanation: `Village celebrated.` },
  ]};
}

// ── Adventure trek (BTech cast) ──
function adventure(): Story {
  const n1 = pick(BTECH_BOYS), n2 = pick(BTECH_BOYS.filter(x => x !== n1));
  const s = [`${n1} and five friends planned a mountain trek.`, `On day two they lost the trail.`, `Rain began to fall heavily.`, `${n2} spotted a cave and they ran inside.`, `They shared their last biscuits and waited.`, `By morning the rain stopped and the sun rose.`, `They reached the peak with the most beautiful view.`];
  return { id: gid(), title: `The Mountain Trek`, emoji: "🏔️", difficulty: "Hard", sentences: s, questions: [
    { type: "mcq", question: `Who planned the trek?`, options: opts(n1, BTECH_BOYS), answer: n1, explanation: `${n1} planned it.` },
    { type: "word", question: `Who spotted the cave?`, answer: n2, explanation: `${n2} spotted it.` },
    { type: "sentence", question: `What did they share?`, answer: `They shared their last biscuits.`, explanation: `Last biscuits.` },
    { type: "speak", question: "What happened by morning?", answer: `The rain stopped and the sun rose.`, explanation: `Rain stopped.` },
  ]};
}

// ── Horror night (BTech cast) ──
function horror(): Story {
  const n = pick(BTECH_BOYS), fr = pick(BTECH_BOYS.filter(x => x !== n));
  const s = [`It was past midnight in the hostel.`, `${n} heard footsteps in the empty corridor.`, `He called ${fr} from the next room.`, `They walked together with a torch.`, `An old door creaked open by itself.`, `Inside was just a dusty mirror.`, `They laughed nervously and ran back.`];
  return { id: gid(), title: `The Old Hostel`, emoji: "👻", difficulty: "Hard", sentences: s, questions: [
    { type: "mcq", question: `Who heard footsteps?`, options: opts(n, BTECH_BOYS), answer: n, explanation: `${n} heard them.` },
    { type: "word", question: `Who did he call?`, answer: fr, explanation: `Called ${fr}.` },
    { type: "sentence", question: `What was inside the room?`, answer: `Inside was just a dusty mirror.`, explanation: `Dusty mirror.` },
    { type: "speak", question: "What did they do at the end?", answer: s[6], explanation: `Laughed and ran back.` },
  ]};
}

// ── College trip (BTech cast) ──
function collegeTrip(): Story {
  const n = pick(BTECH_BOYS), g = pick(BTECH_GIRLS), dest = pick(DESTS);
  const s = [`The college organized a trip to ${dest}.`, `${n} sat next to ${g} on the bus.`, `They sang songs the whole way.`, `At the destination, a guide told them stories.`, `${g} took the best group photo.`, `On the way back everyone was tired but happy.`, `It was a trip no one would forget.`];
  return { id: gid(), title: `Trip to ${cap(dest)}`, emoji: "🚌", difficulty: "Medium", sentences: s, questions: [
    { type: "mcq", question: `Where did they go?`, options: opts(dest, DESTS), answer: dest, explanation: `Trip to ${dest}.` },
    { type: "word", question: `Who took the photo?`, answer: g, explanation: `${g} took the photo.` },
    { type: "sentence", question: `What did they do on the bus?`, answer: `They sang songs the whole way.`, explanation: `Sang songs.` },
    { type: "speak", question: "How did everyone feel?", answer: `Tired but happy.`, explanation: `Tired but happy.` },
  ]};
}

// ── Movie-style love letter (BTech cast) ──
function movieStyle(): Story {
  const n = pick(BTECH_BOYS), g = pick(BTECH_GIRLS), fr = pick(BTECH_GIRLS.filter(x => x !== g));
  const s = [`${n} wrote a love letter to ${g}.`, `He slipped it inside her book.`, `But ${fr} picked up the wrong book.`, `She read it thinking it was for her.`, `${n} ran to explain the mix-up.`, `${g} found out and laughed loudly.`, `They all became better friends.`];
  return { id: gid(), title: `The Love Letter`, emoji: "💌", difficulty: "Medium", sentences: s, questions: [
    { type: "mcq", question: `Who wrote the letter?`, options: opts(n, BTECH_BOYS), answer: n, explanation: `${n} wrote it.` },
    { type: "word", question: `Who read it by mistake?`, answer: fr, explanation: `${fr} read it.` },
    { type: "sentence", question: `How did ${g} react?`, answer: `${g} found out and laughed loudly.`, explanation: `Laughed loudly.` },
    { type: "speak", question: "What happened at the end?", answer: s[6], explanation: `Better friends.` },
  ]};
}

const TEMPLATES = [lostFound, festival, cricket, kabaddi, adventure, horror, collegeTrip, movieStyle];
export function generateStory(): Story { return pick(TEMPLATES)(); }