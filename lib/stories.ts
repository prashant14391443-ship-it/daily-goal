export type Question = {
  type: "mcq" | "word" | "sentence" | "speak";
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  shadow?: string; // sentence to speak aloud
};
export type Story = {
  id: string; title: string; emoji: string;
  difficulty: "Easy" | "Medium" | "Hard";
  sentences: string[]; questions: Question[];
};

export const STORIES: Story[] = [
  // ── Original 5 ──
  { id: "puppy", title: "The Lost Puppy", emoji: "🐶", difficulty: "Easy",
    sentences: ["One sunny morning, Maya was walking to school.", "She heard a small crying sound near the park.", "A tiny brown puppy was sitting alone under a tree.", "The puppy looked hungry and scared.", "Maya gave it some water from her bottle.", "She took the puppy home and named it Brownie.", "Now Brownie and Maya are best friends."],
    questions: [
      { type: "mcq", question: "In the story, 'tiny' means:", options: ["very small", "very loud", "very fast", "very angry"], answer: "very small", explanation: "'Tiny' = very small. Use it for things much smaller than normal: a tiny ant, a tiny baby." },
      { type: "word", question: "Maya ___ the puppy home. (pick the correct past form of 'take')", answer: "took", explanation: "'Take' is present. 'Took' is past. The story is in past time, so use 'took'." },
      { type: "sentence", question: "Fix the mistake: 'Maya give it water yesterday.'", answer: "Maya gave it water yesterday.", explanation: "'Yesterday' = past time. 'Give' (present) → 'gave' (past). Always match verb to time!" },
      { type: "speak", question: "Say it naturally, like a friend:", answer: "Now Brownie and Maya are best friends.", shadow: "Now Brownie and Maya are best friends.", explanation: "Stress 'best' — it carries the feeling. Try again with more warmth!" },
    ]},
  { id: "school", title: "A Day at School", emoji: "🏫", difficulty: "Easy",
    sentences: ["Rohan wakes up at 6 AM every morning.", "He brushes his teeth and eats breakfast with his family.", "His father drops him to school at 7:30 AM.", "First period is always Mathematics.", "At 12 PM, all students have lunch together.", "After lunch, they play cricket for 30 minutes.", "School ends at 3 PM and Rohan goes home by bus."],
    questions: [
      { type: "mcq", question: "In 'drops him to school', 'drops' means:", options: ["takes by vehicle", "throws down", "leaves behind", "pushes away"], answer: "takes by vehicle", explanation: "'Drop someone to [place]' = drive them there. Very common in Indian English!" },
      { type: "word", question: "Rohan ___ up at 6 AM every day. (correct verb form)", answer: "wakes", explanation: "'Every day' = habit = simple present. 'Rohan' (he) → 'wakes' (add -s for he/she/it)." },
      { type: "sentence", question: "Fix the mistake: 'Rohan brush his teeth every morning.'", answer: "Rohan brushes his teeth every morning.", explanation: "Third person singular (he/she/it) in present tense: verb gets -s/-es. brush → brushes." },
      { type: "speak", question: "Say this smoothly, in one breath:", answer: "After lunch, they play cricket for thirty minutes.", shadow: "After lunch, they play cricket for thirty minutes.", explanation: "Link 'after lunch' together, no pause. Sounds like 'aff-ter-lunch'. Try it!" },
    ]},
  { id: "birthday", title: "The Birthday Party", emoji: "🎂", difficulty: "Medium",
    sentences: ["Last Saturday was Priya's birthday.", "She invited 15 friends to her house.", "The party started at 5 PM in her garden.", "Her mother baked a chocolate cake with candles.", "We played musical chairs and danced to songs.", "Priya's favorite gift was a storybook from her grandmother.", "Everyone went home by 8 PM, tired but happy."],
    questions: [
      { type: "mcq", question: "In 'tired but happy', 'but' shows:", options: ["two opposite feelings", "two same feelings", "a cause", "a time"], answer: "two opposite feelings", explanation: "'But' joins contrasting ideas. 'Tired' (negative) but 'happy' (positive) — both are true!" },
      { type: "word", question: "Her mother ___ a chocolate cake. (past form of 'bake')", answer: "baked", explanation: "'Bake' is a regular verb. Add '-d' for past: bake → baked. (Not 'bakeded'!)" },
      { type: "sentence", question: "Fix: 'Priya invite 15 friends to her party.'", answer: "Priya invited 15 friends to her party.", explanation: "'Last Saturday' = past time. 'Invite' → 'invited'. Regular verb, just add '-d'." },
      { type: "speak", question: "Say warmly, like you remember a happy day:", answer: "Everyone went home tired but happy.", shadow: "Everyone went home tired but happy.", explanation: "Slow down on 'tired but happy' — it's the feeling of the story." },
    ]},
  { id: "goa", title: "Travel to Goa", emoji: "🏖️", difficulty: "Medium",
    sentences: ["Last winter, my family went to Goa.", "We traveled by train for 12 hours from Mumbai.", "We stayed in a small hotel near the beach.", "On the first day, we swam in the sea.", "The next day, we visited a famous church and old fort.", "We ate delicious seafood at a local restaurant.", "The trip lasted 5 days."],
    questions: [
      { type: "mcq", question: "In 'the trip lasted 5 days', 'lasted' means:", options: ["continued for", "finished before", "started after", "cancelled"], answer: "continued for", explanation: "'Last' as a verb = continue for a time. The movie lasted 2 hours. The meeting lasted forever!" },
      { type: "word", question: "On the first day, we ___ in the sea. (past of 'swim')", answer: "swam", explanation: "'Swim' is irregular: swim → swam → swum. 'Swam' is the simple past form." },
      { type: "sentence", question: "Fix: 'We go to Goa last winter.'", answer: "We went to Goa last winter.", explanation: "'Last winter' = past time. 'Go' → 'went' (irregular past). Never say 'goed'!" },
      { type: "speak", question: "Say like you're telling a friend:", answer: "We ate delicious seafood at a local restaurant.", shadow: "We ate delicious seafood at a local restaurant.", explanation: "Stress 'delicious' — it's the feeling word. Stretch it a little: de-li-cious." },
    ]},
  { id: "exam", title: "Preparing for Exams", emoji: "📚", difficulty: "Hard",
    sentences: ["Ankit has final exams starting next Monday.", "He made a study schedule two weeks ago.", "Every morning, he studies Mathematics for two hours.", "After lunch, he practices English grammar.", "In the evening, he revises Science notes with his friend.", "Ankit sleeps 8 hours every night.", "He believes good preparation leads to good results."],
    questions: [
      { type: "mcq", question: "In 'leads to good results', 'leads to' means:", options: ["causes / results in", "walks towards", "follows after", "runs away from"], answer: "causes / results in", explanation: "'Lead to' = cause. Hard work leads to success. Rain leads to floods. Very useful phrasal verb!" },
      { type: "word", question: "He ___ English grammar every day. (correct verb form)", answer: "practices", explanation: "'Every day' = habit = present tense. 'He' (third person) → add -s: practice → practices." },
      { type: "sentence", question: "Fix: 'Ankit study Maths for two hours every morning.'", answer: "Ankit studies Maths for two hours every morning.", explanation: "'Ankit' = he (third person singular). Present tense: study → studies (change y to i, add -es)." },
      { type: "speak", question: "Say confidently, like advice:", answer: "Good preparation leads to good results.", shadow: "Good preparation leads to good results.", explanation: "Link 'leads to' → sounds like 'leeds-tuh'. Try it as one phrase." },
    ]},

  // ── Class 5 (Shanti Niketan) ──
  { id: "c5first", title: "Class 5 — First Day", emoji: "🎒", difficulty: "Easy",
    sentences: ["Sujeet was nervous on his first day at Shanti Niketan Senior Secondary School.", "He walked into Class 5 and saw many new faces.", "Surbhi smiled at him and said hello.", "Sneha showed him where to sit.", "Rita Mam entered and welcomed everyone warmly.", "She said mistakes are part of learning.", "By lunch, Sujeet felt like he belonged."],
    questions: [
      { type: "mcq", question: "In 'Sujeet was nervous', 'nervous' means:", options: ["worried and uneasy", "angry and loud", "sleepy and tired", "excited and happy"], answer: "worried and uneasy", explanation: "'Nervous' = worried about something new or difficult. First day = nervous. Exam = nervous." },
      { type: "word", question: "Surbhi ___ at him and said hello. (past of 'smile')", answer: "smiled", explanation: "'Smile' is regular: smile → smiled. Just add '-d'. Easy!" },
      { type: "sentence", question: "Fix: 'Sneha show him where to sit.'", answer: "Sneha showed him where to sit.", explanation: "'Show' is irregular: show → showed → shown. Past simple = 'showed'." },
      { type: "speak", question: "Say it with relief and happiness:", answer: "By lunch, Sujeet felt like he belonged.", shadow: "By lunch, Sujeet felt like he belonged.", explanation: "Emphasize 'belonged' — it's the happy ending. Feel it as you say it!" },
    ]},
  { id: "c5lunch", title: "Class 5 — The Lost Tiffin", emoji: "🍱", difficulty: "Easy",
    sentences: ["During break, Prince realized his tiffin was missing.", "He looked under his desk but found nothing.", "Alishan and Sohail came to help him search.", "They checked the corridor and the playground.", "Finally, Sohail spotted it near the water tap.", "Someone had left it there by mistake.", "Prince shared his parathas with both friends."],
    questions: [
      { type: "mcq", question: "In 'spotted it near the water tap', 'spotted' means:", options: ["saw / noticed", "bought", "broke", "lost"], answer: "saw / noticed", explanation: "'Spot' as a verb = see something, especially after looking. 'I spotted a bird!' = I saw one." },
      { type: "word", question: "Alishan and Sohail ___ to help him. (past of 'come')", answer: "came", explanation: "'Come' is irregular: come → came → come. Past = 'came'." },
      { type: "sentence", question: "Fix: 'Prince share his parathas with both friends.'", answer: "Prince shared his parathas with both friends.", explanation: "'Share' → 'shared' (regular past). Just add '-d'." },
      { type: "speak", question: "Say gratefully, like a thankful friend:", answer: "Prince shared his parathas with both friends.", shadow: "Prince shared his parathas with both friends.", explanation: "Warm tone on 'shared' — it's the kind action. Smile while you say it!" },
    ]},
  { id: "c5dance", title: "Class 5 — Annual Day", emoji: "💃", difficulty: "Medium",
    sentences: ["It was Annual Day and Class 5 had a dance performance.", "Nisha was the group leader and taught everyone the steps.", "On stage, Sneha forgot her steps and froze.", "Surbhi whispered the next move from beside her.", "Sneha smiled and continued dancing confidently.", "The audience clapped loudly when they finished.", "Pratima Mam gave them a standing ovation."],
    questions: [
      { type: "mcq", question: "In 'gave them a standing ovation', it means:", options: ["audience stood up and clapped", "audience sat silently", "audience left the hall", "audience booed"], answer: "audience stood up and clapped", explanation: "'Standing ovation' = standing up + long clapping = highest praise. Used for great performances." },
      { type: "word", question: "Sneha ___ her steps and froze. (past of 'forget')", answer: "forgot", explanation: "'Forget' is irregular: forget → forgot → forgotten. Past = 'forgot'." },
      { type: "sentence", question: "Fix: 'Surbhi whisper the next move.'", answer: "Surbhi whispered the next move.", explanation: "'Whisper' → 'whispered' (regular past, add '-ed')." },
      { type: "speak", question: "Say proudly, like you're announcing:", answer: "Pratima Mam gave them a standing ovation.", shadow: "Pratima Mam gave them a standing ovation.", explanation: "Stress 'standing ovation' — it's the special phrase. Say it with awe!" },
    ]},
  { id: "c5test", title: "Class 5 — The Big Test", emoji: "📝", difficulty: "Medium",
    sentences: ["Abjal Sir announced a surprise math test.", "Sujeet panicked because he had not revised.", "He looked around and saw everyone writing calmly.", "Principal Sir walked in and said breathe first, think later.", "Sujeet took a deep breath and started solving.", "He finished just before the bell rang.", "He learned that calm minds solve hard problems."],
    questions: [
      { type: "mcq", question: "In 'calm minds solve hard problems', 'calm' means:", options: ["peaceful and steady", "angry and loud", "sleepy and slow", "confused and lost"], answer: "peaceful and steady", explanation: "'Calm' = not worried, peaceful. Calm sea = no waves. Calm mind = clear thinking." },
      { type: "word", question: "Sujeet ___ a deep breath. (past of 'take')", answer: "took", explanation: "'Take' is irregular: take → took → taken. Past = 'took'." },
      { type: "sentence", question: "Fix: 'Sujeet panic because he had not revised.'", answer: "Sujeet panicked because he had not revised.", explanation: "'Panic' ends in -c. Past form: panic → panicked (add -k- before -ed to keep the hard 'k' sound)." },
      { type: "speak", question: "Say slowly and wisely, like a lesson:", answer: "Calm minds solve hard problems.", shadow: "Calm minds solve hard problems.", explanation: "Pause slightly after 'minds' — makes it sound like real wisdom." },
    ]},
  { id: "c5rinku", title: "Class 5 — Rinku Mam's Story Time", emoji: "📖", difficulty: "Easy",
    sentences: ["Rinku Mam told the class a story every Friday.", "This week, Simpi was chosen to read aloud.", "She read slowly and clearly.", "Sahil asked a funny question and everyone laughed.", "Rinku Mam smiled and explained the moral.", "The whole class clapped for Simpi.", "Everyone looked forward to next Friday."],
    questions: [
      { type: "mcq", question: "In 'looked forward to next Friday', it means:", options: ["excitedly waited for", "worried about", "forgot about", "missed"], answer: "excitedly waited for", explanation: "'Look forward to' = feel excited about something coming. 'I look forward to the weekend!' — very common!" },
      { type: "word", question: "Simpi ___ slowly and clearly. (past of 'read' — spelled same)", answer: "read", explanation: "Tricky one! 'Read' is spelled the same in past but pronounced 'red' (like the color)." },
      { type: "sentence", question: "Fix: 'Simpi read slow and clear.'", answer: "Simpi read slowly and clearly.", explanation: "'Slow' and 'clear' are adjectives. After a verb, use adverbs: slow → slowly, clear → clearly." },
      { type: "speak", question: "Say happily, like you're excited:", answer: "Everyone looked forward to next Friday.", shadow: "Everyone looked forward to next Friday.", explanation: "Stress 'forward' — it shows the excitement. 'LOOKED forward'!" },
    ]},

  // ── Class 7 ──
  { id: "c7project", title: "Class 7 — Science Project", emoji: "🌋", difficulty: "Medium",
    sentences: ["Swati and Sujeet were partners for the science fair.", "They decided to build a working volcano model.", "For three days they collected bottles, paint, and baking soda.", "On demo day, their volcano erupted perfectly.", "Abjal Sir was impressed and gave them first place.", "Swati high-fived Sujeet and they celebrated.", "They learned that teamwork beats talent alone."],
    questions: [
      { type: "mcq", question: "In 'teamwork beats talent alone', 'beats' means:", options: ["wins against", "hits physically", "runs faster than", "copies from"], answer: "wins against", explanation: "'Beat' = win against. 'Our team beat theirs.' 'Hard work beats talent.' Very common!" },
      { type: "word", question: "Their volcano ___ perfectly. (past of 'erupt')", answer: "erupted", explanation: "'Erupt' is regular: erupt → erupted. Just add '-ed'." },
      { type: "sentence", question: "Fix: 'They decide to build a volcano model.'", answer: "They decided to build a volcano model.", explanation: "'Decide' → 'decided' (regular past). Add '-d'." },
      { type: "speak", question: "Say it like a motto you believe in:", answer: "Teamwork beats talent alone.", shadow: "Teamwork beats talent alone.", explanation: "Slow and confident. This is a life lesson — say it like one!" },
    ]},
  { id: "c7cricket", title: "Class 7 — The Cricket Match", emoji: "🏏", difficulty: "Medium",
    sentences: ["Class 7 challenged Class 8 to a cricket match.", "Swati was chosen captain by her classmates.", "Prince bowled the first over and took two wickets.", "At the end, Class 7 needed 10 runs from the last over.", "Sohail hit a six and a four to win the match.", "The whole class lifted him on their shoulders.", "It was the best day of Class 7."],
    questions: [
      { type: "mcq", question: "In 'challenged Class 8', 'challenged' means:", options: ["invited to compete", "helped them", "ignored them", "defeated them"], answer: "invited to compete", explanation: "'Challenge' = invite someone to compete. 'I challenge you to a race!' — friendly competition." },
      { type: "word", question: "Prince ___ the first over. (past of 'bowl')", answer: "bowled", explanation: "'Bowl' is regular: bowl → bowled. Add '-ed'." },
      { type: "sentence", question: "Fix: 'Sohail hits a six to win the match.' (make it past tense)", answer: "Sohail hit a six to win the match.", explanation: "'Hit' is irregular and stays the same in past: hit → hit → hit. No change!" },
      { type: "speak", question: "Say excitedly, like you're cheering:", answer: "Sohail hit a six and a four to win the match!", shadow: "Sohail hit a six and a four to win the match!", explanation: "Emphasize 'six and a four' — those are the winning shots!" },
    ]},
  { id: "c7library", title: "Class 7 — The Library Mystery", emoji: "📚", difficulty: "Medium",
    sentences: ["Swati found a dusty old book in the library corner.", "It had no title and a locked metal clasp.", "She showed it to Alishan during lunch break.", "Together they carefully pried the clasp open.", "Inside was a handwritten note from a student in 1975.", "It thanked the librarian for changing their life.", "Swati and Alishan left the note inside for the next finder."],
    questions: [
      { type: "mcq", question: "In 'pried the clasp open', 'pried' means:", options: ["forced open carefully", "broke into pieces", "threw away", "painted over"], answer: "forced open carefully", explanation: "'Pry' = open something closed, with force. Past = 'pried'. 'Pry open a box.'" },
      { type: "word", question: "She ___ it to Alishan. (past of 'show')", answer: "showed", explanation: "'Show' is irregular: show → showed → shown. Past = 'showed'." },
      { type: "sentence", question: "Fix: 'Inside were a handwritten note.'", answer: "Inside was a handwritten note.", explanation: "'A note' = singular → use 'was'. 'Notes' = plural → use 'were'. Match number!" },
      { type: "speak", question: "Say mysteriously, like you're telling a secret:", answer: "Inside was a handwritten note from a student in 1975.", shadow: "Inside was a handwritten note from a student in nineteen seventy-five.", explanation: "Slow down on 'handwritten' and '1975' — they make it mysterious." },
    ]},

  // ── Class 10 ──
  { id: "c10boards", title: "Class 10 — Board Exams", emoji: "📖", difficulty: "Hard",
    sentences: ["Board exams were just two months away.", "Sujeet, Swati, Sneha, and Vidhi formed a study group.", "Every evening they met at Sujeet's house.", "Sneha was best at Science, Swati at English, Sujeet at Math, Vidhi at Hindi.", "They taught each other their weak subjects.", "On result day, all four scored above 90 percent.", "They hugged and promised to stay friends forever."],
    questions: [
      { type: "mcq", question: "In 'formed a study group', 'formed' means:", options: ["created / started", "joined", "left", "forgot"], answer: "created / started", explanation: "'Form' = create or start something new. 'Form a team.' 'Form a plan.' Very useful verb!" },
      { type: "word", question: "Every evening they ___ at Sujeet's house. (past of 'meet')", answer: "met", explanation: "'Meet' is irregular: meet → met → met. Past = 'met'." },
      { type: "sentence", question: "Fix: 'They teach each other their weak subjects.'", answer: "They taught each other their weak subjects.", explanation: "'Teach' is irregular: teach → taught → taught. Past = 'taught' (not 'teached')." },
      { type: "speak", question: "Say warmly, like a promise:", answer: "They hugged and promised to stay friends forever.", shadow: "They hugged and promised to stay friends forever.", explanation: "Slow on 'forever' — it's the emotional word. Feel it." },
    ]},
  { id: "c10farewell", title: "Class 10 — Farewell Day", emoji: "🎓", difficulty: "Medium",
    sentences: ["It was the last day of school forever.", "Class 9 had decorated the hall with streamers and balloons.", "Sneha gave a speech and made everyone cry.", "Surbhi sang a farewell song while Nisha danced.", "Principal Sir gave each student a handwritten card.", "The friends took a hundred photos together.", "They walked out of the school gates as seniors one last time."],
    questions: [
      { type: "mcq", question: "In 'made everyone cry', 'made' here means:", options: ["caused / resulted in", "built", "gave", "showed"], answer: "caused / resulted in", explanation: "'Make someone + verb' = cause them to. 'The movie made me cry.' 'The joke made me laugh.'" },
      { type: "word", question: "Surbhi ___ a farewell song. (past of 'sing')", answer: "sang", explanation: "'Sing' is irregular: sing → sang → sung. Past = 'sang'." },
      { type: "sentence", question: "Fix: 'Class 9 decorate the hall with balloons.'", answer: "Class 9 decorated the hall with balloons.", explanation: "'Decorate' → 'decorated' (regular past). Add '-d'." },
      { type: "speak", question: "Say with bittersweet feeling (happy + sad):", answer: "They walked out as seniors one last time.", shadow: "They walked out as seniors one last time.", explanation: "Slow on 'one last time' — it carries the emotion of farewell." },
    ]},
  { id: "c10trip", title: "Class 10 — School Trip", emoji: "🚌", difficulty: "Easy",
    sentences: ["The school organized a trip to the Taj Mahal.", "Swati sat next to Sneha on the bus.", "They sang songs and played antakshari the whole way.", "At the monument, the guide told them its love story.", "Sneha took the best group photo at the fountain.", "On the way back, everyone was tired but happy.", "It was a trip no one would ever forget."],
    questions: [
      { type: "mcq", question: "In 'organized a trip', 'organized' means:", options: ["planned and arranged", "cancelled", "forgot", "joined"], answer: "planned and arranged", explanation: "'Organize' = plan and arrange. 'Organize a party.' 'Organize your study table.' Very common!" },
      { type: "word", question: "Swati ___ next to Sneha. (past of 'sit')", answer: "sat", explanation: "'Sit' is irregular: sit → sat → sat. Past = 'sat'." },
      { type: "sentence", question: "Fix: 'They sing songs the whole way.'", answer: "They sang songs the whole way.", explanation: "'Sing' → 'sang' (irregular past)." },
      { type: "speak", question: "Say happily, remembering a great day:", answer: "It was a trip no one would ever forget.", shadow: "It was a trip no one would ever forget.", explanation: "Stress 'never' and 'forget' — they carry the emotion." },
    ]},

  // ── College (BTech) ──
  { id: "bt1", title: "BTech — First Day of College", emoji: "🎓", difficulty: "Medium",
    sentences: ["Sujeet walked into Ganga Institute of Technology and Management with a heavy bag.", "In the hostel, he met Rajan, Amit, and Baibhav.", "Rohit from the next room offered him tea.", "Vikash and Sarovar showed him around the campus.", "That evening, Rahul, Jay, and Vishal joined them at the canteen.", "Sonu, Suraj, Piyush, and Dipak shared stories of seniors.", "Sujeet smiled — he had found a new family."],
    questions: [
      { type: "mcq", question: "In 'offered him tea', 'offered' means:", options: ["asked politely if he wanted", "forced him to take", "stole from him", "refused him"], answer: "asked politely if he wanted", explanation: "'Offer' = present something politely. 'Can I offer you tea?' Very kind and common." },
      { type: "word", question: "He ___ Rajan, Amit, and Baibhav. (past of 'meet')", answer: "met", explanation: "'Meet' → 'met' (irregular past)." },
      { type: "sentence", question: "Fix: 'Rohit offer him tea.'", answer: "Rohit offered him tea.", explanation: "'Offer' → 'offered' (regular past, add '-ed')." },
      { type: "speak", question: "Say warmly, like you found belonging:", answer: "Sujeet smiled — he had found a new family.", shadow: "Sujeet smiled — he had found a new family.", explanation: "Pause at the dash. 'New family' = the heart of the sentence." },
    ]},
  { id: "bt2", title: "BTech — The Hackathon", emoji: "💻", difficulty: "Hard",
    sentences: ["The college announced a 24-hour hackathon.", "Amit, Baibhav, and Rajan formed a team.", "Piyush and Dipak formed a rival team from the next branch.", "Parmod Sir was their mentor and guided them.", "They built an app to help farmers sell crops directly.", "At 3 AM they were exhausted but kept coding.", "Rahul Sir brought them coffee at midnight.", "They won first prize and celebrated with pizza."],
    questions: [
      { type: "mcq", question: "In 'were exhausted but kept coding', 'exhausted' means:", options: ["extremely tired", "very excited", "very angry", "very bored"], answer: "extremely tired", explanation: "'Exhausted' = extremely tired. Stronger than 'tired'. 'After the marathon, I was exhausted.'" },
      { type: "word", question: "They ___ an app to help farmers. (past of 'build')", answer: "built", explanation: "'Build' is irregular: build → built → built. Past = 'built'." },
      { type: "sentence", question: "Fix: 'They keep coding at 3 AM.'", answer: "They kept coding at 3 AM.", explanation: "'Keep' is irregular: keep → kept → kept. Past = 'kept'." },
      { type: "speak", question: "Say with determination:", answer: "They were exhausted but kept coding.", shadow: "They were exhausted but kept coding.", explanation: "Emphasize 'but' — it shows they didn't give up. That's the spirit!" },
    ]},
  { id: "bt3", title: "BTech — Farewell Party", emoji: "🎉", difficulty: "Medium",
    sentences: ["It was farewell night for the final-year seniors.", "Ankita Mam gave an emotional speech that made everyone cry.", "Gunja and Khushi performed a beautiful duet.", "Harshita, Nandani, and Vidhi hosted the whole event.", "Nisha Mam presented certificates to every student.", "Sumit and Anish danced with their friends till midnight.", "It was a night none of them would ever forget."],
    questions: [
      { type: "mcq", question: "In 'performed a duet', 'duet' means:", options: ["performance by two people", "performance by ten", "a solo song", "a dance group"], answer: "performance by two people", explanation: "'Duet' = 'duo' = two. Two singers = duet. Two instruments = duet. 'Du-' always means two!" },
      { type: "word", question: "They ___ the whole event. (past of 'host')", answer: "hosted", explanation: "'Host' → 'hosted' (regular past, add '-ed')." },
      { type: "sentence", question: "Fix: 'Sumit and Anish dance till midnight.'", answer: "Sumit and Anish danced till midnight.", explanation: "'Dance' → 'danced' (regular past)." },
      { type: "speak", question: "Say nostalgically, like you'll miss it:", answer: "It was a night none of them would ever forget.", shadow: "It was a night none of them would ever forget.", explanation: "Slow on 'none' and 'ever' — they carry the feeling of forever memories." },
    ]},
  { id: "bt4", title: "BTech — Cricket Final", emoji: "🏏", difficulty: "Hard",
    sentences: ["The inter-college cricket final was here.", "Sujeet's college needed 15 runs from the last over.", "Rajan was bowling to the opposition's best batsman.", "Rahul Sir watched nervously from the pavilion.", "On the final ball, Sujeet hit a massive six.", "The whole team ran onto the field to celebrate.", "They lifted the trophy and took a team photo."],
    questions: [
      { type: "mcq", question: "In 'watched nervously', 'nervously' means:", options: ["with worry and tension", "with happiness", "with anger", "with sleepiness"], answer: "with worry and tension", explanation: "'Nervous' = worried. 'Nervously' = in a worried way. Add '-ly' to adjective to make adverb!" },
      { type: "word", question: "Sujeet ___ a massive six. (past of 'hit')", answer: "hit", explanation: "'Hit' is irregular: hit → hit → hit. Stays the same in past tense!" },
      { type: "sentence", question: "Fix: 'The team run onto the field to celebrate.'", answer: "The team ran onto the field to celebrate.", explanation: "'Run' is irregular: run → ran → run. Past = 'ran'." },
      { type: "speak", question: "Say with pure excitement:", answer: "On the final ball, Sujeet hit a massive six!", shadow: "On the final ball, Sujeet hit a massive six!", explanation: "Emphasize 'massive' — it's the big moment!" },
    ]},

  // ── Genres ──
  { id: "horror1", title: "The Old Hostel", emoji: "👻", difficulty: "Hard",
    sentences: ["It was past midnight in the old hostel wing.", "Sujeet heard footsteps in the empty corridor.", "He called Amit and Baibhav from the next room.", "Together they walked with a torch to investigate.", "An old door creaked open by itself.", "Inside was just a dusty mirror reflecting them back.", "They laughed nervously and ran back to their room."],
    questions: [
      { type: "mcq", question: "In 'creaked open by itself', 'creaked' means:", options: ["made a long squeaking sound", "broke loudly", "opened quickly", "closed silently"], answer: "made a long squeaking sound", explanation: "'Creak' = old door/chair sound. 'The old chair creaked.' Spooky sound!" },
      { type: "word", question: "He ___ footsteps in the corridor. (past of 'hear')", answer: "heard", explanation: "'Hear' is irregular: hear → heard → heard. Past = 'heard'." },
      { type: "sentence", question: "Fix: 'They laugh nervously and run back.'", answer: "They laughed nervously and ran back.", explanation: "Two irregulars: laugh → laughed, run → ran. Both in past!" },
      { type: "speak", question: "Say in a spooky whisper:", answer: "An old door creaked open by itself.", shadow: "An old door creaked open by itself.", explanation: "Stretch 'creaked' and whisper 'by itself' — that's the scary part!" },
    ]},
  { id: "adv1", title: "The Mountain Trek", emoji: "🏔️", difficulty: "Hard",
    sentences: ["Baibhav and five friends planned a trek to the mountains.", "On the second day they lost the trail.", "Rain began to fall and they had no shelter.", "Rajan spotted a cave and they ran inside.", "They shared their last biscuits and waited.", "By morning the rain stopped and the sun rose golden.", "They reached the peak and saw the most beautiful view of their lives."],
    questions: [
      { type: "mcq", question: "In 'they had no shelter', 'shelter' means:", options: ["protection from weather", "food to eat", "friends nearby", "money to spend"], answer: "protection from weather", explanation: "'Shelter' = place that protects from rain/wind/cold. A house is shelter. A cave is shelter." },
      { type: "word", question: "They ___ the trail. (past of 'lose')", answer: "lost", explanation: "'Lose' is irregular: lose → lost → lost. Past = 'lost'." },
      { type: "sentence", question: "Fix: 'They share their last biscuits and wait.'", answer: "They shared their last biscuits and waited.", explanation: "'Share' → 'shared', 'wait' → 'waited'. Both regular pasts." },
      { type: "speak", question: "Say with wonder, like you just saw something beautiful:", answer: "They saw the most beautiful view of their lives.", shadow: "They saw the most beautiful view of their lives.", explanation: "Slow on 'most beautiful' — it's the reward for the whole trek!" },
    ]},
  { id: "kabb1", title: "The Kabaddi Championship", emoji: "🤼", difficulty: "Hard",
    sentences: ["The district kabaddi championship was finally here.", "Baibhav was the star raider of Rajan's team.", "In the final, they were tied at 30 points each.", "Baibhav raided and touched three defenders in one go.", "Rajan caught an opponent near the line and saved the point.", "The final whistle blew and they had won by two points.", "The whole village celebrated their victory."],
    questions: [
      { type: "mcq", question: "In 'celebrated their victory', 'victory' means:", options: ["winning / success", "losing / failure", "starting a game", "practicing"], answer: "winning / success", explanation: "'Victory' = winning. 'Defeat' = losing. Two opposites to remember!" },
      { type: "word", question: "They were ___ at 30 points each. (past participle of 'tie')", answer: "tied", explanation: "'Tie' → 'tied' (regular). 'Were tied' = passive voice = score was equal." },
      { type: "sentence", question: "Fix: 'The final whistle blow and they win.'", answer: "The final whistle blew and they won.", explanation: "'Blow' → 'blew' (irregular), 'win' → 'won' (irregular). Two irregular pasts!" },
      { type: "speak", question: "Say triumphantly, like a winner:", answer: "The whole village celebrated their victory!", shadow: "The whole village celebrated their victory!", explanation: "Stress 'victory' — that's the proud moment!" },
    ]},
  { id: "movie1", title: "The Love Letter", emoji: "💌", difficulty: "Medium",
    sentences: ["Rajan had been in love with Nandani since first year.", "He finally wrote her a letter and slipped it in her book.", "But Gunja picked up the wrong book by mistake.", "She read it thinking it was for her and smiled.", "Rajan panicked and ran to explain the mix-up.", "Nandani found out and laughed loudly.", "They all became better friends than before."],
    questions: [
      { type: "mcq", question: "In 'the mix-up', 'mix-up' means:", options: ["confusion / mistake", "party", "friendship", "letter"], answer: "confusion / mistake", explanation: "'Mix-up' = a confused mistake. 'Sorry for the mix-up!' — very natural apology!" },
      { type: "word", question: "He ___ her a letter. (past of 'write')", answer: "wrote", explanation: "'Write' is irregular: write → wrote → written. Past = 'wrote'." },
      { type: "sentence", question: "Fix: 'Gunja pick up the wrong book.'", answer: "Gunja picked up the wrong book.", explanation: "'Pick' → 'picked' (regular past)." },
      { type: "speak", question: "Say laughing, like you find it funny now:", answer: "Nandani found out and laughed loudly.", shadow: "Nandani found out and laughed loudly.", explanation: "Let yourself smile while saying 'laughed loudly' — it's a happy ending!" },
    ]},
  { id: "horror2", title: "The Night Shift", emoji: "🌙", difficulty: "Hard",
    sentences: ["Amit stayed back in the library to finish his project.", "At 11 PM the lights flickered and went off.", "He heard pages turning on their own.", "A cold breeze blew through the closed windows.", "His phone showed a message from an unknown number.", "It said: 'Close the book and go home now.'", "Amit packed up and ran all the way back to the hostel."],
    questions: [
      { type: "mcq", question: "In 'the lights flickered', 'flickered' means:", options: ["flashed on and off quickly", "stayed on steadily", "made a loud noise", "turned very bright"], answer: "flashed on and off quickly", explanation: "'Flicker' = unsteady light. 'The candle flickered in the wind.' Classic spooky detail!" },
      { type: "word", question: "A cold breeze ___ through the windows. (past of 'blow')", answer: "blew", explanation: "'Blow' is irregular: blow → blew → blown. Past = 'blew'." },
      { type: "sentence", question: "Fix: 'Amit pack up and run back.'", answer: "Amit packed up and ran back.", explanation: "'Pack' → 'packed' (regular), 'run' → 'ran' (irregular). Two past tenses!" },
      { type: "speak", question: "Say breathlessly, like you just escaped:", answer: "Amit packed up and ran all the way back to the hostel.", shadow: "Amit packed up and ran all the way back to the hostel.", explanation: "Say 'all the way' fast — it shows how scared he was!" },
    ]},
];