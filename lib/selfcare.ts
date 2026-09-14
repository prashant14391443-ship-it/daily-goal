export type Category = "sleep" | "move" | "eat" | "mind" | "body" | "connect";
export type Audience = "all" | "men" | "women";

export type SelfCareTemplate = {
  emoji: string;
  name: string;
  anchor: string;
  target: number;
  category: Category;
  audience: Audience;
  time: string;
  why: string;
  ancient: string;
};

export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "sleep", label: "Sleep", emoji: "🛌" },
  { id: "move", label: "Move", emoji: "🏃" },
  { id: "eat", label: "Eat", emoji: "🍽️" },
  { id: "mind", label: "Mind", emoji: "🧠" },
  { id: "body", label: "Body", emoji: "🧴" },
  { id: "connect", label: "Connect", emoji: "🤝" },
];

export const SELF_CARE_TEMPLATES: SelfCareTemplate[] = [
  // ── EVERYONE ──
  { emoji: "🌅", name: "10-min morning sunlight", anchor: "I wake up", target: 10, category: "sleep", audience: "all", time: "07:00", why: "Morning light sets your body clock → deeper sleep tonight, better mood all day.", ancient: "Ayurveda begins the day in Brahma-muhurta, greeting the rising sun (Surya)." },
  { emoji: "💧", name: "2 glasses of water first", anchor: "I wake up", target: 2, category: "eat", audience: "all", time: "07:00", why: "After 7–8 hours without water, mild dehydration already drops focus and energy.", ancient: "Ayurveda: warm water at dawn kindles the digestive fire (agni)." },
  { emoji: "🚶", name: "20-min walk", anchor: "I eat lunch", target: 20, category: "move", audience: "all", time: "13:00", why: "Post-meal walking blunts blood-sugar spikes and clears mental fog.", ancient: "Hippocrates: “Walking is man’s best medicine.”" },
  { emoji: "🧘", name: "4-7-8 breathing, 2 min", anchor: "I finish work/school", target: 2, category: "mind", audience: "all", time: "17:00", why: "Long exhales switch on the parasympathetic nervous system — stress drops in minutes.", ancient: "Yoga pranayama: control the breath, control the mind." },
  { emoji: "📵", name: "Screens off 60 min before bed", anchor: "I get into bed", target: 2, category: "sleep", audience: "all", time: "21:30", why: "Blue light + dopamine loops delay melatonin by up to 90 minutes.", ancient: "TCM: the 11 pm–3 am window is for repair — be asleep inside it." },
  { emoji: "🪥", name: "Tongue scrape + brush 2×", anchor: "I wake up", target: 3, category: "body", audience: "all", time: "07:00", why: "Oral bacteria link to heart disease; scraping cuts plaque and morning breath.", ancient: "Ayurvedic dinacharya: jihwa nirlekhan (tongue scraping) every dawn." },
  { emoji: "🧴", name: "Sunscreen / moisturizer 1 min", anchor: "I wake up", target: 1, category: "body", audience: "all", time: "07:30", why: "Daily UV is the #1 driver of premature skin aging and skin cancer.", ancient: "Roman baths: daily skin care was respect for the body, not vanity." },
  { emoji: "📓", name: "3-line journal", anchor: "I get into bed", target: 3, category: "mind", audience: "all", time: "22:00", why: "Expressive writing reduces rumination and improves sleep quality (RCT-proven).", ancient: "Seneca: “I review my whole day” — the Stoic evening audit." },
  { emoji: "🤝", name: "Message 1 person kindly", anchor: "I eat dinner", target: 2, category: "connect", audience: "all", time: "19:30", why: "Micro-connections are the strongest predictor of lifelong happiness (Harvard, 85-yr study).", ancient: "Sangha & Ubuntu: we are kept whole by community." },
  { emoji: "🛌", name: "Fixed lights-out time", anchor: "I get into bed", target: 2, category: "sleep", audience: "all", time: "22:30", why: "Consistent sleep timing beats duration for next-day energy and mood.", ancient: "Dinacharya: fixed sleep/wake is the root of all discipline." },

  // ── FOR HIM ──
  { emoji: "🏋️", name: "Strength 20 min", anchor: "I finish work/school", target: 20, category: "move", audience: "men", time: "18:00", why: "Muscle is the longevity organ: strength training cuts all-cause mortality ~15%.", ancient: "Greek gymnasion: daily training made the citizen — sound mind, sound body." },
  { emoji: "🗣️", name: "Name 1 feeling out loud", anchor: "I eat dinner", target: 1, category: "mind", audience: "men", time: "20:00", why: "Affect labeling measurably calms the amygdala — naming feelings defuses them.", ancient: "Socratic circles: men talking plainly kept each other sane." },
  { emoji: "🪑", name: "Posture reset 1 min", anchor: "I finish work/school", target: 1, category: "body", audience: "men", time: "17:00", why: "Breaking sitting every hour cuts neck/back pain and glucose spikes.", ancient: "Spartan discipline: the body stays ready, never rusted." },
  { emoji: "🧼", name: "Weekly groom check, 5 min", anchor: "I eat breakfast", target: 5, category: "body", audience: "men", time: "09:00", why: "Hygiene basics prevent skin infections and quietly build self-respect.", ancient: "Roman barbers & baths: grooming was a civic ritual, not a chore." },
  { emoji: "🍳", name: "Protein-first breakfast", anchor: "I eat breakfast", target: 5, category: "eat", audience: "men", time: "08:00", why: "Protein at breakfast stabilizes appetite and protects muscle all day.", ancient: "Ancient Indian wrestlers: strength is built at the morning meal." },

  // ── FOR HER ──
  { emoji: "🩸", name: "Iron plate + lemon (palak/gud/dates)", anchor: "I eat lunch", target: 5, category: "eat", audience: "women", time: "13:00", why: "~30% of women 15–49 are anemic (WHO); vitamin C triples iron absorption.", ancient: "Ayurveda: rakta dhatu (blood tissue) is built with dark greens & jaggery." },
  { emoji: "🦴", name: "Weight-bearing 20 min", anchor: "I finish work/school", target: 20, category: "move", audience: "women", time: "18:00", why: "Women lose bone faster after 30 — loading now prevents fractures later.", ancient: "The Heraean games: Greek women trained and raced, strength celebrated." },
  { emoji: "☀️", name: "Sun + walk for Vitamin D", anchor: "I wake up", target: 15, category: "move", audience: "women", time: "08:00", why: "Vitamin-D deficiency is epidemic in South Asian women; sun + movement fixes two gaps at once.", ancient: "Surya Namaskar: saluting the sun as daily practice." },
  { emoji: "🧴", name: "PM skin ritual 3 min", anchor: "I get into bed", target: 3, category: "body", audience: "women", time: "21:30", why: "Nightly cleanse + moisturize repairs the skin barrier during sleep.", ancient: "Egyptian & Roman evening oils: self-respect ritualized." },
  { emoji: "🚫", name: "One gentle “no” this week", anchor: "I eat dinner", target: 1, category: "mind", audience: "women", time: "20:00", why: "Boundary-setting cuts burnout; women carry a disproportionate unpaid-care load.", ancient: "Metta begins with kindness to yourself — you can’t pour from an empty cup." },
  { emoji: "🛢️", name: "Warm wind-down 10 min", anchor: "I get into bed", target: 10, category: "sleep", audience: "women", time: "21:00", why: "The luteal phase raises core temp & sleep need; warm wind-down eases PMS.", ancient: "Ritucharya: honor the body’s seasons instead of fighting them." },
  { emoji: "🧘", name: "Yoga / deep stretch 10 min", anchor: "I wake up", target: 10, category: "mind", audience: "women", time: "07:30", why: "10 min of yoga lowers cortisol and smooths cycle-related mood swings.", ancient: "Yoga was designed for householders, not just monks." },
];