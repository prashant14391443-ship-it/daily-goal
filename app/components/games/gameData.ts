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