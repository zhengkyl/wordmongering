import { ALPHABET } from "./constants";

export const RULES = {
  handSize: 16,
  targetScore: 100,
  playsLimit: 10,
  rowLen: 8,
  maxRows: 2,
  rounds: 10,
};

export function scoreWord(letters: (keyof typeof ALPHABET)[]): number {
  return letters.reduce((sum, letter) => ALPHABET[letter].points + sum, 0);
}

export function validateWord(word: string, dictionary: Set<string>): boolean {
  return dictionary.has(word);
}

export function findBestPlays(handLetters: string[], dictionary: Set<string>): string[] {
  const start = performance.now();
  const handFreq: Record<string, number> = {};
  for (const l of handLetters) handFreq[l] = (handFreq[l] ?? 0) + 1;

  const results: string[] = [];
  for (const word of dictionary) {
    const used: Record<string, number> = {};
    let ok = true;
    for (const ch of word) {
      used[ch] = (used[ch] ?? 0) + 1;
      if (used[ch] > (handFreq[ch] ?? 0)) {
        ok = false;
        break;
      }
    }
    if (ok) results.push(word);
  }

  if (results.length === 0) {
    return [];
  }

  results.sort((a, b) => b.length - a.length);
  const longestLength = results[0].length;
  const end = results.findIndex((w) => w.length < longestLength);
  const longestWords = results.slice(0, end);
  console.log(`longest plays in ${performance.now() - start}ms`, longestWords);

  return longestWords;
}
