import { PACKS_A, VWord } from "@/app/vocab/dataA";
import { PACKS_B } from "@/app/vocab/dataB";
import { PACKS_C } from "@/app/vocab/dataC";
import { PACKS_D } from "@/app/vocab/dataD";
import { PACKS_A as S_A, SItem } from "@/app/sentences/dataA";
import { PACKS_B as S_B } from "@/app/sentences/dataB";
import { PACKS_C as S_C } from "@/app/sentences/dataC";
import { PACKS_D as S_D } from "@/app/sentences/dataD";

export type { VWord } from "@/app/vocab/dataA";
export type { SItem } from "@/app/sentences/dataA";

export function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

let WORDS: VWord[] | null = null;
export function allWords(): VWord[] {
  if (!WORDS) WORDS = [...PACKS_A, ...PACKS_B, ...PACKS_C, ...PACKS_D].flatMap((p) => p.words);
  return WORDS;
}

let SENTS: SItem[] | null = null;
export function allSentences(): SItem[] {
  if (!SENTS) SENTS = [...S_A, ...S_B, ...S_C, ...S_D].flatMap((p) => p.items);
  return SENTS;
}

export function pickWords(n: number): VWord[] {
  return shuffle(allWords()).slice(0, n);
}

export function pickSentences(n: number): SItem[] {
  return shuffle(allSentences()).slice(0, n);
}

export function getBest(key: string): number {
  try {
    return Number(localStorage.getItem(key) || 0);
  } catch {
    return 0;
  }
}

export function saveBest(key: string, val: number, higherBetter: boolean) {
  try {
    const b = getBest(key);
    if (!b || (higherBetter ? val > b : val < b)) localStorage.setItem(key, String(val));
  } catch {}
}
// 🏆 CHALLENGE LEVELS — bigger + harder every level
export function chalConfig(level: number) {
  const L = Math.min(Math.max(level, 1), 5);
  const cfg = [
    { quiz: 5, match: 4, scram: 1, say: 1, lenMin: 4, lenMax: 6, pass: 70 },
    { quiz: 6, match: 5, scram: 1, say: 1, lenMin: 5, lenMax: 7, pass: 70 },
    { quiz: 7, match: 5, scram: 2, say: 1, lenMin: 5, lenMax: 8, pass: 75 },
    { quiz: 8, match: 6, scram: 2, say: 2, lenMin: 6, lenMax: 9, pass: 75 },
    { quiz: 10, match: 6, scram: 3, say: 2, lenMin: 7, lenMax: 10, pass: 80 },
  ][L - 1];
  return { ...cfg, hard: level >= 3 };
}

export function levelInfo(stars: number) {
  const th = [0, 3, 7, 12, 18];
  while (th[th.length - 1] <= stars + 6) th.push(th[th.length - 1] + 6);
  let level = 1;
  for (let i = 0; i < th.length; i++) if (stars >= th[i]) level = i + 1;
  return { level, prev: th[level - 1], next: th[level] || th[level - 1] + 6 };
}

export function samePackWords(w: VWord): VWord[] {
  const packs = [...PACKS_A, ...PACKS_B, ...PACKS_C, ...PACKS_D];
  const p = packs.find((pk) => pk.words.some((x) => x.word === w.word));
  return p ? p.words : allWords();
}