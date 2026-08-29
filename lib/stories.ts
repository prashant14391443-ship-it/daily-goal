export type Question = {
  type: "mcq" | "word" | "sentence" | "speak";
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
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
      { type: "mcq", question: "Where did Maya find the puppy?", options: ["Near school", "Under a tree in the park", "In her garden", "At the bus stop"], answer: "Under a tree in the park", explanation: "The puppy was under a tree near the park." },
      { type: "word", question: "What name did Maya give the puppy?", answer: "Brownie", explanation: "Maya named it Brownie." },
      { type: "sentence", question: "Why did Maya give it water?", answer: "The puppy looked hungry and scared.", explanation: "It looked hungry and scared." },
      { type: "speak", question: "What happened at the end?", answer: "Now Brownie and Maya are best friends.", explanation: "They became best friends." },
    ]},
  { id: "school", title: "A Day at School", emoji: "🏫", difficulty: "Easy",
    sentences: ["Rohan wakes up at 6 AM every morning.", "He brushes his teeth and eats breakfast with his family.", "His father drops him to school at 7:30 AM.", "First period is always Mathematics.", "At 12 PM, all students have lunch together.", "After lunch, they play cricket for 30 minutes.", "School ends at 3 PM and Rohan goes home by bus."],
    questions: [
      { type: "mcq", question: "What time does Rohan wake up?", options: ["5 AM", "6 AM", "7 AM", "7:30 AM"], answer: "6 AM", explanation: "Rohan wakes at 6 AM." },
      { type: "word", question: "What is Rohan's first subject?", answer: "Mathematics", explanation: "First period is Mathematics." },
      { type: "sentence", question: "What do students do after lunch?", answer: "After lunch, they play cricket for 30 minutes.", explanation: "They play cricket after lunch." },
      { type: "speak", question: "How does Rohan go home?", answer: "Rohan goes home by bus.", explanation: "He goes by bus." },
    ]},
  { id: "birthday", title: "The Birthday Party", emoji: "🎂", difficulty: "Medium",
    sentences: ["Last Saturday was Priya's birthday.", "She invited 15 friends to her house.", "The party started at 5 PM in her garden.", "Her mother baked a chocolate cake with candles.", "We played musical chairs and danced to songs.", "Priya's favorite gift was a storybook from her grandmother.", "Everyone went home by 8 PM, tired but happy."],
    questions: [
      { type: "mcq", question: "How many friends did Priya invite?", options: ["10", "12", "15", "20"], answer: "15", explanation: "She invited 15 friends." },
      { type: "word", question: "What flavor was the cake?", answer: "chocolate", explanation: "A chocolate cake." },
      { type: "sentence", question: "What was her favorite gift?", answer: "Her favorite gift was a storybook from her grandmother.", explanation: "Storybook from grandmother." },
      { type: "speak", question: "When did everyone go home?", answer: "Everyone went home by 8 PM, tired but happy.", explanation: "By 8 PM." },
    ]},
  { id: "goa", title: "Travel to Goa", emoji: "🏖️", difficulty: "Medium",
    sentences: ["Last winter, my family went to Goa.", "We traveled by train for 12 hours from Mumbai.", "We stayed in a small hotel near the beach.", "On the first day, we swam in the sea.", "The next day, we visited a famous church and old fort.", "We ate delicious seafood at a local restaurant.", "The trip lasted 5 days."],
    questions: [
      { type: "mcq", question: "How did they travel?", options: ["By bus", "By train", "By car", "By plane"], answer: "By train", explanation: "They traveled by train." },
      { type: "word", question: "How many days was the trip?", answer: "5", explanation: "Trip lasted 5 days." },
      { type: "sentence", question: "What did they do on the first day?", answer: "On the first day, we swam in the sea.", explanation: "Swam in the sea." },
      { type: "speak", question: "What did they visit on day 2?", answer: "A famous church and old fort.", explanation: "Church and fort on day 2." },
    ]},
  { id: "exam", title: "Preparing for Exams", emoji: "📚", difficulty: "Hard",
    sentences: ["Ankit has final exams starting next Monday.", "He made a study schedule two weeks ago.", "Every morning, he studies Mathematics for two hours.", "After lunch, he practices English grammar.", "In the evening, he revises Science notes with his friend.", "Ankit sleeps 8 hours every night.", "He believes good preparation leads to good results."],
    questions: [
      { type: "mcq", question: "When do exams start?", options: ["Next Monday", "This Friday", "Next week", "Tomorrow"], answer: "Next Monday", explanation: "Exams start next Monday." },
      { type: "word", question: "How many hours does Ankit sleep?", answer: "8", explanation: "Ankit sleeps 8 hours." },
      { type: "sentence", question: "What does Ankit do after lunch?", answer: "After lunch, he practices English grammar.", explanation: "Practices English grammar." },
      { type: "speak", question: "What does Ankit believe?", answer: "Good preparation leads to good results.", explanation: "Preparation leads to results." },
    ]},

  // ── Class 5 (Shanti Niketan Senior Secondary School) ──
  { id: "c5first", title: "Class 5 — First Day", emoji: "🎒", difficulty: "Easy",
    sentences: ["Sujeet was nervous on his first day at Shanti Niketan Senior Secondary School.", "He walked into Class 5 and saw many new faces.", "Surbhi smiled at him and said hello.", "Sneha showed him where to sit.", "Rita Mam entered and welcomed everyone warmly.", "She said mistakes are part of learning.", "By lunch, Sujeet felt like he belonged."],
    questions: [
      { type: "mcq", question: "Which school did Sujeet join?", options: ["Shanti Niketan Senior Secondary School", "Ganga Institute", "City Public School", "Green Valley"], answer: "Shanti Niketan Senior Secondary School", explanation: "He joined Shanti Niketan." },
      { type: "word", question: "Who welcomed Sujeet first?", answer: "Surbhi", explanation: "Surbhi smiled and said hello." },
      { type: "sentence", question: "What did Rita Mam say?", answer: "She said mistakes are part of learning.", explanation: "Mistakes are part of learning." },
      { type: "speak", question: "How did Sujeet feel by lunch?", answer: "By lunch, Sujeet felt like he belonged.", explanation: "He felt he belonged." },
    ]},
  { id: "c5lunch", title: "Class 5 — The Lost Tiffin", emoji: "🍱", difficulty: "Easy",
    sentences: ["During break, Prince realized his tiffin was missing.", "He looked under his desk but found nothing.", "Alishan and Sohail came to help him search.", "They checked the corridor and the playground.", "Finally, Sohail spotted it near the water tap.", "Someone had left it there by mistake.", "Prince shared his parathas with both friends."],
    questions: [
      { type: "mcq", question: "Who lost the tiffin?", options: ["Sohail", "Alishan", "Prince", "Sujeet"], answer: "Prince", explanation: "Prince's tiffin was missing." },
      { type: "word", question: "Where was the tiffin found?", answer: "water tap", explanation: "Found near the water tap." },
      { type: "sentence", question: "What did Prince do after finding it?", answer: "Prince shared his parathas with both friends.", explanation: "Shared with Alishan and Sohail." },
      { type: "speak", question: "Who helped Prince search?", answer: "Alishan and Sohail came to help him search.", explanation: "Alishan and Sohail helped." },
    ]},
  { id: "c5dance", title: "Class 5 — Annual Day", emoji: "💃", difficulty: "Medium",
    sentences: ["It was Annual Day and Class 5 had a dance performance.", "Nisha was the group leader and taught everyone the steps.", "On stage, Sneha forgot her steps and froze.", "Surbhi whispered the next move from beside her.", "Sneha smiled and continued dancing confidently.", "The audience clapped loudly when they finished.", "Pratima Mam gave them a standing ovation."],
    questions: [
      { type: "mcq", question: "Who forgot her steps?", options: ["Nisha", "Surbhi", "Sneha", "Sujeet"], answer: "Sneha", explanation: "Sneha forgot and froze." },
      { type: "word", question: "Who was the group leader?", answer: "Nisha", explanation: "Nisha was the leader." },
      { type: "sentence", question: "How did Surbhi help Sneha?", answer: "Surbhi whispered the next move from beside her.", explanation: "Whispered the next move." },
      { type: "speak", question: "What did Pratima Mam do?", answer: "Pratima Mam gave them a standing ovation.", explanation: "Standing ovation." },
    ]},
  { id: "c5test", title: "Class 5 — The Big Test", emoji: "📝", difficulty: "Medium",
    sentences: ["Abjal Sir announced a surprise math test.", "Sujeet panicked because he had not revised.", "He looked around and saw everyone writing calmly.", "Principal Sir walked in and said breathe first, think later.", "Sujeet took a deep breath and started solving.", "He finished just before the bell rang.", "He learned that calm minds solve hard problems."],
    questions: [
      { type: "mcq", question: "Who gave the surprise test?", options: ["Rita Mam", "Abjal Sir", "Principal Sir", "Sujeet"], answer: "Abjal Sir", explanation: "Abjal Sir gave the test." },
      { type: "word", question: "What subject was the test?", answer: "math", explanation: "It was a math test." },
      { type: "sentence", question: "What did Principal Sir say?", answer: "Breathe first, think later.", explanation: "Breathe first, think later." },
      { type: "speak", question: "What did Sujeet learn?", answer: "Calm minds solve hard problems.", explanation: "Calm minds solve hard problems." },
    ]},
  { id: "c5rinku", title: "Class 5 — Rinku Mam's Story Time", emoji: "📖", difficulty: "Easy",
    sentences: ["Rinku Mam told the class a story every Friday.", "This week, Simpi was chosen to read aloud.", "She read slowly and clearly.", "Sahil asked a funny question and everyone laughed.", "Rinku Mam smiled and explained the moral.", "The whole class clapped for Simpi.", "Everyone looked forward to next Friday."],
    questions: [
      { type: "mcq", question: "Who read the story aloud?", options: ["Simpi", "Sahil", "Sujeet", "Swati"], answer: "Simpi", explanation: "Simpi was chosen to read." },
      { type: "word", question: "Which teacher tells the story?", answer: "Rinku", explanation: "Rinku Mam tells the story." },
      { type: "sentence", question: "What did Sahil do?", answer: "Sahil asked a funny question and everyone laughed.", explanation: "Asked a funny question." },
      { type: "speak", question: "What did the class do for Simpi?", answer: "The whole class clapped for Simpi.", explanation: "Clapped for Simpi." },
    ]},

  // ── Class 7 ──
  { id: "c7project", title: "Class 7 — Science Project", emoji: "🌋", difficulty: "Medium",
    sentences: ["Swati and Sujeet were partners for the science fair.", "They decided to build a working volcano model.", "For three days they collected bottles, paint, and baking soda.", "On demo day, their volcano erupted perfectly.", "Abjal Sir was impressed and gave them first place.", "Swati high-fived Sujeet and they celebrated.", "They learned that teamwork beats talent alone."],
    questions: [
      { type: "mcq", question: "What did they build?", options: ["A robot", "A volcano", "A rocket", "A solar car"], answer: "A volcano", explanation: "Volcano model." },
      { type: "word", question: "Who was Sujeet's partner?", answer: "Swati", explanation: "Swati was the partner." },
      { type: "sentence", question: "What did they learn?", answer: "Teamwork beats talent alone.", explanation: "Teamwork beats talent." },
      { type: "speak", question: "What place did they get?", answer: "First place.", explanation: "Abjal Sir gave first place." },
    ]},
  { id: "c7cricket", title: "Class 7 — The Cricket Match", emoji: "🏏", difficulty: "Medium",
    sentences: ["Class 7 challenged Class 8 to a cricket match.", "Swati was chosen captain by her classmates.", "Prince bowled the first over and took two wickets.", "At the end, Class 7 needed 10 runs from the last over.", "Sohail hit a six and a four to win the match.", "The whole class lifted him on their shoulders.", "It was the best day of Class 7."],
    questions: [
      { type: "mcq", question: "Who was captain?", options: ["Swati", "Sujeet", "Prince", "Alishan"], answer: "Swati", explanation: "Swati was captain." },
      { type: "word", question: "How many wickets did Prince take?", answer: "2", explanation: "Two wickets." },
      { type: "sentence", question: "What did Sohail hit in the last over?", answer: "Sohail hit a six and a four.", explanation: "A six and a four." },
      { type: "speak", question: "What did the class do after winning?", answer: "The whole class lifted him on their shoulders.", explanation: "Lifted on shoulders." },
    ]},
  { id: "c7library", title: "Class 7 — The Library Mystery", emoji: "📚", difficulty: "Medium",
    sentences: ["Swati found a dusty old book in the library corner.", "It had no title and a locked metal clasp.", "She showed it to Alishan during lunch break.", "Together they carefully pried the clasp open.", "Inside was a handwritten note from a student in 1975.", "It thanked the librarian for changing their life.", "Swati and Alishan left the note inside for the next finder."],
    questions: [
      { type: "mcq", question: "Where did Swati find the book?", options: ["Her bag", "The library", "Playground", "Classroom"], answer: "The library", explanation: "In the library corner." },
      { type: "word", question: "What year was the note from?", answer: "1975", explanation: "The note was from 1975." },
      { type: "sentence", question: "What did the note say?", answer: "It thanked the librarian for changing their life.", explanation: "Thanking the librarian." },
      { type: "speak", question: "What did they do with the note?", answer: "They left the note inside for the next finder.", explanation: "Left it for the next finder." },
    ]},

  // ── Class 10 ──
  { id: "c10boards", title: "Class 10 — Board Exams", emoji: "📖", difficulty: "Hard",
    sentences: ["Board exams were just two months away.", "Sujeet, Swati, Sneha, and Vidhi formed a study group.", "Every evening they met at Sujeet's house.", "Sneha was best at Science, Swati at English, Sujeet at Math, Vidhi at Hindi.", "They taught each other their weak subjects.", "On result day, all four scored above 90 percent.", "They hugged and promised to stay friends forever."],
    questions: [
      { type: "mcq", question: "Who was best at Science?", options: ["Sujeet", "Swati", "Sneha", "Vidhi"], answer: "Sneha", explanation: "Sneha was best at Science." },
      { type: "word", question: "What score did they all get above?", answer: "90", explanation: "All scored above 90 percent." },
      { type: "sentence", question: "How did they prepare?", answer: "They taught each other their weak subjects.", explanation: "Taught each other." },
      { type: "speak", question: "What did they promise?", answer: "They promised to stay friends forever.", explanation: "Stay friends forever." },
    ]},
  { id: "c10farewell", title: "Class 10 — Farewell Day", emoji: "🎓", difficulty: "Medium",
    sentences: ["It was the last day of school forever.", "Class 9 had decorated the hall with streamers and balloons.", "Sneha gave a speech and made everyone cry.", "Surbhi sang a farewell song while Nisha danced.", "Principal Sir gave each student a handwritten card.", "The friends took a hundred photos together.", "They walked out of the school gates as seniors one last time."],
    questions: [
      { type: "mcq", question: "Who gave the speech?", options: ["Sneha", "Surbhi", "Nisha", "Principal Sir"], answer: "Sneha", explanation: "Sneha gave the speech." },
      { type: "word", question: "What did Principal Sir give?", answer: "card", explanation: "Handwritten card." },
      { type: "sentence", question: "What did Surbhi and Nisha do?", answer: "Surbhi sang a farewell song while Nisha danced.", explanation: "Surbhi sang, Nisha danced." },
      { type: "speak", question: "How did they leave school?", answer: "They walked out as seniors one last time.", explanation: "As seniors one last time." },
    ]},
  { id: "c10trip", title: "Class 10 — School Trip", emoji: "🚌", difficulty: "Easy",
    sentences: ["The school organized a trip to the Taj Mahal.", "Swati sat next to Sneha on the bus.", "They sang songs and played antakshari the whole way.", "At the monument, the guide told them its love story.", "Sneha took the best group photo at the fountain.", "On the way back, everyone was tired but happy.", "It was a trip no one would ever forget."],
    questions: [
      { type: "mcq", question: "Where did they go?", options: ["Red Fort", "Taj Mahal", "Gateway of India", "Qutub Minar"], answer: "Taj Mahal", explanation: "Trip to the Taj Mahal." },
      { type: "word", question: "Who took the best photo?", answer: "Sneha", explanation: "Sneha took the best photo." },
      { type: "sentence", question: "What did they play on the bus?", answer: "They sang songs and played antakshari.", explanation: "Songs and antakshari." },
      { type: "speak", question: "How did everyone feel on the way back?", answer: "Everyone was tired but happy.", explanation: "Tired but happy." },
    ]},

  // ── College (Ganga Institute of Technology and Management) ──
  { id: "bt1", title: "BTech — First Day of College", emoji: "🎓", difficulty: "Medium",
    sentences: ["Sujeet walked into Ganga Institute of Technology and Management with a heavy bag.", "In the hostel, he met Rajan, Amit, and Baibhav.", "Rohit from the next room offered him tea.", "Vikash and Sarovar showed him around the campus.", "That evening, Rahul, Jay, and Vishal joined them at the canteen.", "Sonu, Suraj, Piyush, and Dipak shared stories of seniors.", "Sujeet smiled — he had found a new family."],
    questions: [
      { type: "mcq", question: "Which college did Sujeet join?", options: ["Ganga Institute of Technology and Management", "Shanti Niketan", "City College", "Green Valley"], answer: "Ganga Institute of Technology and Management", explanation: "He joined Ganga Institute." },
      { type: "word", question: "Who offered Sujeet tea?", answer: "Rohit", explanation: "Rohit offered tea." },
      { type: "sentence", question: "Who joined them at the canteen?", answer: "Rahul, Jay, and Vishal joined them at the canteen.", explanation: "Rahul, Jay, Vishal joined." },
      { type: "speak", question: "How did Sujeet feel at the end?", answer: "Sujeet smiled — he had found a new family.", explanation: "Found a new family." },
    ]},
  { id: "bt2", title: "BTech — The Hackathon", emoji: "💻", difficulty: "Hard",
    sentences: ["The college announced a 24-hour hackathon.", "Amit, Baibhav, and Rajan formed a team.", "Piyush and Dipak formed a rival team from the next branch.", "Parmod Sir was their mentor and guided them.", "They built an app to help farmers sell crops directly.", "At 3 AM they were exhausted but kept coding.", "Rahul Sir brought them coffee at midnight.", "They won first prize and celebrated with pizza."],
    questions: [
      { type: "mcq", question: "Who was their mentor?", options: ["Rahul Sir", "Parmod Sir", "Amit", "Rajan"], answer: "Parmod Sir", explanation: "Parmod Sir was mentor." },
      { type: "word", question: "What did the app help?", answer: "farmers", explanation: "Helped farmers." },
      { type: "sentence", question: "Who brought them coffee?", answer: "Rahul Sir brought them coffee at midnight.", explanation: "Rahul Sir brought coffee." },
      { type: "speak", question: "How did they celebrate?", answer: "They celebrated with pizza.", explanation: "Celebrated with pizza." },
    ]},
  { id: "bt3", title: "BTech — Farewell Party", emoji: "🎉", difficulty: "Medium",
    sentences: ["It was farewell night for the final-year seniors.", "Ankita Mam gave an emotional speech that made everyone cry.", "Gunja and Khushi performed a beautiful duet.", "Harshita, Nandani, and Vidhi hosted the whole event.", "Nisha Mam presented certificates to every student.", "Sumit and Anish danced with their friends till midnight.", "It was a night none of them would ever forget."],
    questions: [
      { type: "mcq", question: "Who gave the emotional speech?", options: ["Nisha Mam", "Ankita Mam", "Akansha Mam", "Gunja"], answer: "Ankita Mam", explanation: "Ankita Mam gave the speech." },
      { type: "word", question: "Who performed a duet?", answer: "Gunja", explanation: "Gunja and Khushi." },
      { type: "sentence", question: "Who hosted the event?", answer: "Harshita, Nandani, and Vidhi hosted the whole event.", explanation: "Harshita, Nandani, Vidhi." },
      { type: "speak", question: "Who danced till midnight?", answer: "Sumit and Anish danced with their friends till midnight.", explanation: "Sumit and Anish danced till midnight." },
    ]},
  { id: "bt4", title: "BTech — Cricket Final", emoji: "🏏", difficulty: "Hard",
    sentences: ["The inter-college cricket final was here.", "Sujeet's college needed 15 runs from the last over.", "Rajan was bowling to the opposition's best batsman.", "Rahul Sir watched nervously from the pavilion.", "On the final ball, Sujeet hit a massive six.", "The whole team ran onto the field to celebrate.", "They lifted the trophy and took a team photo."],
    questions: [
      { type: "mcq", question: "How many runs were needed?", options: ["10", "12", "15", "20"], answer: "15", explanation: "Needed 15 runs." },
      { type: "word", question: "Who bowled the last over?", answer: "Rajan", explanation: "Rajan was bowling." },
      { type: "sentence", question: "What did Sujeet hit on the final ball?", answer: "Sujeet hit a massive six.", explanation: "A massive six." },
      { type: "speak", question: "What did the team do after winning?", answer: "They lifted the trophy and took a team photo.", explanation: "Lifted trophy, took photo." },
    ]},

  // ── Genres ──
  { id: "horror1", title: "The Old Hostel", emoji: "👻", difficulty: "Hard",
    sentences: ["It was past midnight in the old hostel wing.", "Sujeet heard footsteps in the empty corridor.", "He called Amit and Baibhav from the next room.", "Together they walked with a torch to investigate.", "An old door creaked open by itself.", "Inside was just a dusty mirror reflecting them back.", "They laughed nervously and ran back to their room."],
    questions: [
      { type: "mcq", question: "What time was it?", options: ["10 PM", "Midnight", "Past midnight", "Dawn"], answer: "Past midnight", explanation: "Past midnight." },
      { type: "word", question: "Who did Sujeet call?", answer: "Amit", explanation: "Called Amit and Baibhav." },
      { type: "sentence", question: "What was inside the room?", answer: "Inside was just a dusty mirror reflecting them back.", explanation: "Dusty mirror." },
      { type: "speak", question: "What did they do at the end?", answer: "They laughed nervously and ran back to their room.", explanation: "Laughed and ran back." },
    ]},
  { id: "adv1", title: "The Mountain Trek", emoji: "🏔️", difficulty: "Hard",
    sentences: ["Baibhav and five friends planned a trek to the mountains.", "On the second day they lost the trail.", "Rain began to fall and they had no shelter.", "Rajan spotted a cave and they ran inside.", "They shared their last biscuits and waited.", "By morning the rain stopped and the sun rose golden.", "They reached the peak and saw the most beautiful view of their lives."],
    questions: [
      { type: "mcq", question: "Who planned the trek?", options: ["Sujeet", "Baibhav", "Amit", "Rajan"], answer: "Baibhav", explanation: "Baibhav planned it." },
      { type: "word", question: "Who spotted the cave?", answer: "Rajan", explanation: "Rajan spotted the cave." },
      { type: "sentence", question: "What did they share?", answer: "They shared their last biscuits.", explanation: "Shared last biscuits." },
      { type: "speak", question: "What did they see at the peak?", answer: "The most beautiful view of their lives.", explanation: "Most beautiful view." },
    ]},
  { id: "kabb1", title: "The Kabaddi Championship", emoji: "🤼", difficulty: "Hard",
    sentences: ["The district kabaddi championship was finally here.", "Baibhav was the star raider of Rajan's team.", "In the final, they were tied at 30 points each.", "Baibhav raided and touched three defenders in one go.", "Rajan caught an opponent near the line and saved the point.", "The final whistle blew and they had won by two points.", "The whole village celebrated their victory."],
    questions: [
      { type: "mcq", question: "Who was the star raider?", options: ["Sujeet", "Baibhav", "Amit", "Rajan"], answer: "Baibhav", explanation: "Baibhav was star raider." },
      { type: "word", question: "How many points did they win by?", answer: "2", explanation: "Won by two points." },
      { type: "sentence", question: "How many defenders did Baibhav touch?", answer: "Baibhav touched three defenders in one go.", explanation: "Three defenders." },
      { type: "speak", question: "How did the village react?", answer: "The whole village celebrated their victory.", explanation: "Village celebrated." },
    ]},
  { id: "movie1", title: "The Love Letter", emoji: "💌", difficulty: "Medium",
    sentences: ["Rajan had been in love with Nandani since first year.", "He finally wrote her a letter and slipped it in her book.", "But Gunja picked up the wrong book by mistake.", "She read it thinking it was for her and smiled.", "Rajan panicked and ran to explain the mix-up.", "Nandani found out and laughed loudly.", "They all became better friends than before."],
    questions: [
      { type: "mcq", question: "Who was the letter for?", options: ["Gunja", "Khushi", "Nandani", "Harshita"], answer: "Nandani", explanation: "Letter was for Nandani." },
      { type: "word", question: "Who picked up the wrong book?", answer: "Gunja", explanation: "Gunja picked up the wrong book." },
      { type: "sentence", question: "How did Nandani react?", answer: "Nandani found out and laughed loudly.", explanation: "Laughed loudly." },
      { type: "speak", question: "What happened at the end?", answer: "They all became better friends than before.", explanation: "Better friends than before." },
    ]},
  { id: "horror2", title: "The Night Shift", emoji: "🌙", difficulty: "Hard",
    sentences: ["Amit stayed back in the library to finish his project.", "At 11 PM the lights flickered and went off.", "He heard pages turning on their own.", "A cold breeze blew through the closed windows.", "His phone showed a message from an unknown number.", "It said: 'Close the book and go home now.'", "Amit packed up and ran all the way back to the hostel."],
    questions: [
      { type: "mcq", question: "What time did lights go off?", options: ["9 PM", "10 PM", "11 PM", "Midnight"], answer: "11 PM", explanation: "11 PM." },
      { type: "word", question: "What blew through windows?", answer: "breeze", explanation: "Cold breeze." },
      { type: "sentence", question: "What did the message say?", answer: "Close the book and go home now.", explanation: "Close the book and go home." },
      { type: "speak", question: "What did Amit do?", answer: "Amit packed up and ran all the way back to the hostel.", explanation: "Ran back to hostel." },
    ]},
];