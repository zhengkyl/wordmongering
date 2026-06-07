// prettier-ignore
const LETTER_POOL = Object.entries({
  E: 12, T: 10, A: 9, O: 8, I: 7, N: 7,
  S: 7, H: 6, R: 6, D: 4, L: 5, C: 3,
  U: 3, M: 3, W: 3, F: 3, G: 2, Y: 2,
  P: 2, B: 1, V: 1, K: 1, J: 1, Q: 1,
  X: 1, Z: 1,
}).flatMap(([ch, n]) => Array<string>(n).fill(ch));

const PUZZLE_LENGTH = 30;
const MIN_WORD_LENGTH = 3;

function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDailyPuzzle(day: number, words: Set<string>): string {
  for (let attempt = 0; attempt < 10000; attempt++) {
    const rand = mulberry32(day * 1000003 + attempt);
    let puzzle = "";
    let stuck = false;

    for (let i = 0; i < PUZZLE_LENGTH; i++) {
      const validPool = LETTER_POOL.filter((c) => {
        const maxLen = Math.min(i + 1, PUZZLE_LENGTH);
        for (let len = MIN_WORD_LENGTH; len <= maxLen; len++) {
          if (words.has(puzzle.slice(i - len + 1) + c)) return false;
        }
        return true;
      });

      if (validPool.length === 0) {
        stuck = true;
        break;
      }

      puzzle += validPool[Math.floor(rand() * validPool.length)];
    }

    if (!stuck) return puzzle;
  }

  throw new Error(`Could not generate puzzle for day ${day}`);
}
