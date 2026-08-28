export const WORDS = [
  "apple","banana","orange","mango","tiger","lion","elephant","monkey","river","mountain","forest","ocean","island","morning","evening","night","today","tomorrow","yesterday","friend","family","mother","father","teacher","student","school","college","notebook","pencil","paper","book","story","poem","song","music","dance","game","sport","cricket","football","chess","phone","computer","screen","internet","email","message","photo","video","camera","clock","watch","table","chair","door","window","kitchen","garden","house","home","street","city","village","country","world","planet","star","moon","sun","sky","cloud","rain","wind","fire","water","food","milk","bread","rice","sugar","salt","tea","coffee","juice","potato","tomato","onion","carrot","happy","angry","tired","sleepy","hungry","thirsty","cold","hot","warm","cool","big","small","tall","short","fast","slow","early","late","easy","hard","good","bad","new","old","young","clean","dirty","rich","poor","strong","weak","brave","kind","smart","clever","honest","gentle","quiet","loud","busy","free","ready","begin","start","finish","end","open","close","jump","run","walk","swim","fly","drive","cook","eat","drink","sleep","learn","study","read","write","speak","listen","think","remember","forget","question","answer","problem","solution","idea","plan","goal","dream","hope","wish","love","smile","laugh","talk","travel","ticket","station","bus","train","plane","boat","car","bike","road","bridge","market","shop","money","price","cheap",
];

export const SYNONYMS: [string, string][] = [
  ["happy","glad"],["big","large"],["small","tiny"],["fast","quick"],["smart","clever"],
  ["brave","courageous"],["calm","peaceful"],["angry","furious"],["tired","exhausted"],["easy","simple"],
  ["hard","difficult"],["beautiful","pretty"],["rich","wealthy"],["start","begin"],["finish","complete"],
  ["help","assist"],["big","huge"],["small","little"],["fast","rapid"],["smart","intelligent"],
  ["happy","joyful"],["sad","unhappy"],["cold","chilly"],["good","great"],["clean","tidy"],
  ["dirty","messy"],["quiet","silent"],["loud","noisy"],["strong","powerful"],["weak","feeble"],
  ["kind","gentle"],["honest","truthful"],["polite","courteous"],["old","ancient"],["new","fresh"],
  ["fast","swift"],["tired","sleepy"],["idea","plan"],["goal","dream"],["speak","talk"],
];

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function randomWord(exclude?: string): string {
  let w = WORDS[Math.floor(Math.random() * WORDS.length)];
  while (w === exclude) w = WORDS[Math.floor(Math.random() * WORDS.length)];
  return w;
}