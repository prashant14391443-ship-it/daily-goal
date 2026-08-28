export type Question = {
  type: "mcq" | "word" | "sentence" | "speak";
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
};

export type Story = {
  id: string;
  title: string;
  emoji: string;
  difficulty: "Easy" | "Medium" | "Hard";
  sentences: string[];
  questions: Question[];
};

export const STORIES: Story[] = [
  {
    id: "puppy",
    title: "The Lost Puppy",
    emoji: "🐶",
    difficulty: "Easy",
    sentences: [
      "One sunny morning, Maya was walking to school.",
      "She heard a small crying sound near the park.",
      "A tiny brown puppy was sitting alone under a tree.",
      "The puppy looked hungry and scared.",
      "Maya gave it some water from her bottle.",
      "She took the puppy home and named it Brownie.",
      "Now Brownie and Maya are best friends.",
    ],
    questions: [
      {
        type: "mcq",
        question: "Where did Maya find the puppy?",
        options: ["Near her school", "Under a tree in the park", "In her garden", "At the bus stop"],
        answer: "Under a tree in the park",
        explanation: "The story says the puppy was 'sitting alone under a tree' near the park.",
      },
      {
        type: "word",
        question: "What name did Maya give the puppy? (one word)",
        answer: "Brownie",
        explanation: "Maya named the puppy Brownie.",
      },
      {
        type: "sentence",
        question: "Why did Maya give the puppy water? (full sentence)",
        answer: "The puppy looked hungry and scared.",
        explanation: "The story says 'The puppy looked hungry and scared', so Maya gave it water.",
      },
      {
        type: "speak",
        question: "What happened at the end of the story?",
        answer: "Now Brownie and Maya are best friends.",
        explanation: "The story ends by saying they became best friends.",
      },
    ],
  },
  {
    id: "school",
    title: "A Day at School",
    emoji: "🏫",
    difficulty: "Easy",
    sentences: [
      "Rohan wakes up at 6 AM every morning.",
      "He brushes his teeth and eats breakfast with his family.",
      "His father drops him to school at 7:30 AM.",
      "First period is always Mathematics.",
      "At 12 PM, all students have lunch together.",
      "After lunch, they play cricket for 30 minutes.",
      "School ends at 3 PM and Rohan goes home by bus.",
      "He does homework and sleeps by 9 PM.",
    ],
    questions: [
      {
        type: "mcq",
        question: "What time does Rohan wake up?",
        options: ["5 AM", "6 AM", "7 AM", "7:30 AM"],
        answer: "6 AM",
        explanation: "The story says 'Rohan wakes up at 6 AM every morning.'",
      },
      {
        type: "word",
        question: "What is Rohan's first subject? (one word)",
        answer: "Mathematics",
        explanation: "The story says 'First period is always Mathematics.'",
      },
      {
        type: "sentence",
        question: "What do students do after lunch? (full sentence)",
        answer: "After lunch, they play cricket for 30 minutes.",
        explanation: "The story mentions they play cricket for 30 minutes after lunch.",
      },
      {
        type: "speak",
        question: "How does Rohan go home from school?",
        answer: "Rohan goes home by bus.",
        explanation: "The story says 'Rohan goes home by bus.'",
      },
    ],
  },
  {
    id: "birthday",
    title: "The Birthday Party",
    emoji: "🎂",
    difficulty: "Medium",
    sentences: [
      "Last Saturday was my friend Priya's birthday.",
      "She invited 15 friends to her house.",
      "The party started at 5 PM in her garden.",
      "Her mother baked a chocolate cake with candles.",
      "We played musical chairs and danced to Bollywood songs.",
      "Priya opened her gifts after cutting the cake.",
      "Her favorite gift was a storybook from her grandmother.",
      "Everyone went home by 8 PM, tired but happy.",
    ],
    questions: [
      {
        type: "mcq",
        question: "How many friends did Priya invite?",
        options: ["10", "12", "15", "20"],
        answer: "15",
        explanation: "The story says 'She invited 15 friends to her house.'",
      },
      {
        type: "word",
        question: "What flavor was the cake? (one word)",
        answer: "Chocolate",
        explanation: "Her mother baked a chocolate cake.",
      },
      {
        type: "sentence",
        question: "What was Priya's favorite gift and who gave it? (full sentence)",
        answer: "Her favorite gift was a storybook from her grandmother.",
        explanation: "The story says her favorite gift was a storybook from her grandmother.",
      },
      {
        type: "speak",
        question: "When did everyone go home?",
        answer: "Everyone went home by 8 PM, tired but happy.",
        explanation: "The story ends by saying everyone went home by 8 PM.",
      },
    ],
  },
  {
    id: "goa",
    title: "Travel to Goa",
    emoji: "🏖️",
    difficulty: "Medium",
    sentences: [
      "Last winter, my family went to Goa for a vacation.",
      "We traveled by train for 12 hours from Mumbai.",
      "We stayed in a small hotel near the beach.",
      "On the first day, we swam in the sea and built sandcastles.",
      "The next day, we visited a famous church and old fort.",
      "My father bought fresh coconut water from a beach vendor.",
      "We ate delicious seafood at a local restaurant.",
      "The trip lasted 5 days and we took many photos.",
    ],
    questions: [
      {
        type: "mcq",
        question: "How did they travel to Goa?",
        options: ["By bus", "By train", "By car", "By plane"],
        answer: "By train",
        explanation: "The story says 'We traveled by train for 12 hours from Mumbai.'",
      },
      {
        type: "word",
        question: "How long was the trip? (number + word)",
        answer: "5 days",
        explanation: "The story says 'The trip lasted 5 days.'",
      },
      {
        type: "sentence",
        question: "What did they do on the first day? (full sentence)",
        answer: "On the first day, we swam in the sea and built sandcastles.",
        explanation: "The story mentions swimming in the sea and building sandcastles on day 1.",
      },
      {
        type: "speak",
        question: "What did they visit on the second day?",
        answer: "On the second day, we visited a famous church and old fort.",
        explanation: "The story says they visited a famous church and old fort on day 2.",
      },
    ],
  },
  {
    id: "exam",
    title: "Preparing for Exams",
    emoji: "📚",
    difficulty: "Hard",
    sentences: [
      "Ankit has his final exams starting next Monday.",
      "He made a study schedule two weeks ago.",
      "Every morning, he studies Mathematics for two hours.",
      "After lunch, he practices English grammar exercises.",
      "In the evening, he revises Science notes with his friend.",
      "His mother helps him by asking questions from the textbook.",
      "Ankit sleeps 8 hours every night to stay fresh.",
      "He believes good preparation leads to good results.",
    ],
    questions: [
      {
        type: "mcq",
        question: "When do Ankit's exams start?",
        options: ["Next Monday", "This Friday", "Next week", "Tomorrow"],
        answer: "Next Monday",
        explanation: "The story says 'Ankit has his final exams starting next Monday.'",
      },
      {
        type: "word",
        question: "How many hours does Ankit sleep? (number)",
        answer: "8",
        explanation: "The story says 'Ankit sleeps 8 hours every night.'",
      },
      {
        type: "sentence",
        question: "What does Ankit do after lunch? (full sentence)",
        answer: "After lunch, he practices English grammar exercises.",
        explanation: "The story mentions he practices English grammar exercises after lunch.",
      },
      {
        type: "speak",
        question: "What does Ankit believe about preparation?",
        answer: "He believes good preparation leads to good results.",
        explanation: "The story ends with Ankit's belief that good preparation leads to good results.",
      },
    ],
  },
];