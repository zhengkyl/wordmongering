import no2 from "./dead/no2.txt?raw";
import no3 from "./dead/no3.txt?raw";
import one2 from "./dead/one2.txt?raw";
import one3 from "./dead/one3.txt?raw";

// prettier-ignore
const LETTER_POOL = Object.entries({
  E: 12, T: 10, A: 9, O: 8, I: 7, N: 7,
  S: 7, H: 6, R: 6, D: 4, L: 5, C: 3,
  U: 3, M: 3, W: 3, F: 3, G: 2, Y: 2,
  P: 2, B: 1, V: 1, K: 1, J: 1, Q: 1,
  X: 1, Z: 1,
}).flatMap(([ch, n]) => Array<string>(n).fill(ch));

const PUZZLE_LENGTH = 30;

// Dead 2- and 3-letter sequences (keyed by sorted letters). Copies of
// backend/internal/game/*.txt, kept identical by the backend equality test.
const DEAD = {
  no2: parseSet(no2),
  one2: parseSet(one2),
  no3: parseSet(no3),
  one3: parseSet(one3),
};

function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// No dead 2- or 3-letter sequence will appear, so the puzzle is always playable.
// Must produce the same output as GenerateDailyPuzzle() in backend/internal/game/generate.go.
export function generateDailyPuzzle(day: number): string {
  for (let attempt = 0; attempt < 10000; attempt++) {
    const rand = mulberry32(day * 1000003 + attempt);
    let puzzle = "";
    let stuck = false;

    for (let i = 0; i < PUZZLE_LENGTH; i++) {
      const validPool = LETTER_POOL.filter((c) => validNext(puzzle, c));

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

// validNext reports whether appending c keeps the trailing 2- and 3-letter
// sequences out of the dead sets.
function validNext(puzzle: string, c: string): boolean {
  const n = puzzle.length;
  if (n >= 1) {
    const k = sortedKey(puzzle[n - 1] + c);
    if (DEAD.no2.has(k) || DEAD.one2.has(k)) return false;
  }
  if (n >= 2) {
    const k = sortedKey(puzzle[n - 2] + puzzle[n - 1] + c);
    if (DEAD.no3.has(k) || DEAD.one3.has(k)) return false;
  }
  return true;
}

function sortedKey(s: string): string {
  return [...s].sort().join("");
}

function parseSet(data: string): Set<string> {
  return new Set(data.trim().split("\n").filter(Boolean));
}
