import type { Story, Question } from "./stories";

const NAMES = ["Maya", "Rohan", "Priya", "Ankit", "Arjun", "Ravi", "Simran", "Kabir", "Ananya", "Diya", "Aarav", "Meera"];
const PLACES = ["the park", "the market", "the river", "the school gate", "the bus stop", "the temple", "the beach", "the garden", "the railway station", "the village fair"];
const TIMES = ["sunny morning", "rainy afternoon", "cold evening", "bright afternoon", "quiet morning", "warm evening"];
const ANIMALS = ["puppy", "kitten", "calf", "sparrow", "rabbit", "lamb"];
const ADJ = ["tiny", "brown", "white", "little", "fluffy", "black"];
const EMO = ["hungry", "scared", "tired", "thirsty"];
const FOOD = ["milk", "bread", "rice", "biscuits", "fruit"];
const PETS = ["Brownie", "Snowy", "Chiku", "Mithu", "Rocky", "Lucky"];
const FRIENDS = ["Arjun", "Meera", "Kabir", "Tara", "Ishaan", "Zoya"];
const TRANSPORT = ["bus", "train", "bicycle", "boat", "car"];
const FESTIVALS = ["Diwali", "Holi", "Raksha Bandhan", "Eid", "Onam", "Pongal"];
const DISHES = ["ladoos", "samosas", "kheer", "jalebi", "pakoras"];
const SUBJECTS = ["Mathematics", "Science", "English", "History", "Computer"];
const SPORTS = ["cricket", "football", "kabaddi", "badminton"];
const DESTS = ["the mountains", "the beach", "the city museum", "a hill station", "the village fair", "a wildlife park"];
const ITEMS = ["toy", "keychain", "painting", "bracelet", "model car", "storybook"];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function options(correct: string, pool: string[]): string[] {
  const others = pool.filter((p) => p !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
  return [correct, ...others].sort(() => Math.random() - 0.5);
}
const gid = () => "gen-" + Math.random().toString(36).slice(2, 9);

function lostFound(): Story {
  const name = pick(NAMES), place = pick(PLACES), time = pick(TIMES), animal = pick(ANIMALS), adj = pick(ADJ), emo = pick(EMO), food = pick(FOOD), pet = pick(PETS);
  const s = [
    `One ${time}, ${name} was walking near ${place}.`,
    `${name} saw a ${adj} ${animal} sitting all alone.`,
    `The ${animal} looked ${emo} and weak.`,
    `${name} gave it some ${food} and fresh water.`,
    `${name} took the ${animal} home and named it ${pet}.`,
    `Now ${name} and ${pet} are best friends.`,
  ];
  const q: Question[] = [
    { type: "mcq", question: `Where did ${name} see the ${animal}?`, options: options(place, PLACES), answer: place, explanation: `The story says ${name} was walking near ${place}.` },
    { type: "word", question: `What did ${name} give the ${animal}? (one word)`, answer: food, explanation: `${name} gave it some ${food} and fresh water.` },
    { type: "sentence", question: `What did ${name} do after helping the ${animal}? (full sentence)`, answer: s[4], explanation: `${name} took the ${animal} home and named it ${pet}.` },
    { type: "speak", question: "What happened at the end?", answer: s[5], explanation: `The story ends with ${name} and ${pet} becoming best friends.` },
  ];
  return { id: gid(), title: `The ${cap(animal)} Friend`, emoji: "🐾", difficulty: "Easy", sentences: s, questions: q };
}

function festival(): Story {
  const name = pick(NAMES), fest = pick(FESTIVALS), dish = pick(DISHES), friend = pick(FRIENDS);
  const s = [
    `${fest} is ${name}'s favorite festival.`,
    `This year, ${name} cleaned the house with the whole family.`,
    `${name}'s mother made delicious ${dish}.`,
    `In the evening, ${name} and ${friend} decorated the house.`,
    `They shared ${dish} with all the neighbors.`,
    `It was a day full of joy and light.`,
  ];
  const q: Question[] = [
    { type: "mcq", question: `Whose favorite festival is ${fest}?`, options: options(name, NAMES), answer: name, explanation: `The story says ${fest} is ${name}'s favorite festival.` },
    { type: "word", question: `What dish did the mother make? (one word)`, answer: dish, explanation: `${name}'s mother made delicious ${dish}.` },
    { type: "sentence", question: `What did ${name} and ${friend} do in the evening? (full sentence)`, answer: s[3], explanation: `In the evening they decorated the house.` },
    { type: "speak", question: "What did they share with neighbors?", answer: s[4], explanation: `They shared ${dish} with all the neighbors.` },
  ];
  return { id: gid(), title: `${fest} Celebrations`, emoji: "🪔", difficulty: "Easy", sentences: s, questions: q };
}

function schoolDay(): Story {
  const name = pick(NAMES), subject = pick(SUBJECTS), friend = pick(FRIENDS), sport = pick(SPORTS);
  const s = [
    `${name} loves going to school.`,
    `Every day, ${name}'s favorite subject is ${subject}.`,
    `During the break, ${name} plays ${sport} with ${friend}.`,
    `Today the teacher praised ${name} for a neat ${subject} homework.`,
    `${friend} and ${name} helped clean the classroom too.`,
    `School days are full of learning and fun.`,
  ];
  const q: Question[] = [
    { type: "mcq", question: `What is ${name}'s favorite subject?`, options: options(subject, SUBJECTS), answer: subject, explanation: `The story says the favorite subject is ${subject}.` },
    { type: "word", question: `Which game does ${name} play? (one word)`, answer: sport, explanation: `${name} plays ${sport} with ${friend}.` },
    { type: "sentence", question: `Who does ${name} play with during break? (full sentence)`, answer: s[2], explanation: `During the break, ${name} plays ${sport} with ${friend}.` },
    { type: "speak", question: "Why did the teacher praise the student?", answer: s[3], explanation: `The teacher praised ${name} for a neat ${subject} homework.` },
  ];
  return { id: gid(), title: `${name}'s School Day`, emoji: "🎒", difficulty: "Medium", sentences: s, questions: q };
}

function trip(): Story {
  const name = pick(NAMES), dest = pick(DESTS), transport = pick(TRANSPORT), friend = pick(FRIENDS), item = pick(ITEMS);
  const s = [
    `Last holiday, ${name} went on a trip to ${dest}.`,
    `${name} traveled by ${transport} with the family.`,
    `At ${dest}, ${name} bought a small ${item}.`,
    `${name} and ${friend} took many photos together.`,
    `They tasted local food and loved it.`,
    `The trip to ${dest} was unforgettable.`,
  ];
  const q: Question[] = [
    { type: "mcq", question: `How did ${name} travel?`, options: options(transport, TRANSPORT), answer: transport, explanation: `${name} traveled by ${transport}.` },
    { type: "word", question: `What did ${name} buy? (one word)`, answer: item, explanation: `${name} bought a small ${item}.` },
    { type: "sentence", question: `Who took many photos? (full sentence)`, answer: s[3], explanation: `${name} and ${friend} took many photos together.` },
    { type: "speak", question: "Where was the trip?", answer: `The trip was to ${dest}.`, explanation: `The story is about a trip to ${dest}.` },
  ];
  return { id: gid(), title: `Trip to ${cap(dest)}`, emoji: "🧳", difficulty: "Medium", sentences: s, questions: q };
}

const TEMPLATES = [lostFound, festival, schoolDay, trip];
export function generateStory(): Story {
  return pick(TEMPLATES)();
}