// Test helper: emits the client's daily puzzles so the backend equality test
// (backend/internal/game/generate_equality_test.go) can diff them against the
// Go generator. Imports the real client generator so there is no second copy
// of the algorithm to drift.
//
// Usage: node equality-runner.mjs <words.txt path> <dayCount>
// Prints one puzzle per line for days 1..dayCount.
//
// Requires Node with TypeScript type stripping (Node >= 22.6 with
// --experimental-strip-types, on by default since 23.6) to import the .ts file.

import { readFileSync } from "node:fs";
import { generateDailyPuzzle } from "../src/lib/generatePuzzle.ts";

const [, , wordsPath, dayCountArg] = process.argv;
if (!wordsPath || !dayCountArg) {
  throw new Error("usage: equality-runner.mjs <words.txt path> <dayCount>");
}

const dayCount = Number(dayCountArg);
// Mirror WordsContext.tsx: the puzzle word set is words.txt split on newlines.
const words = new Set(readFileSync(wordsPath, "utf8").trim().split("\n"));

const lines = [];
for (let day = 1; day <= dayCount; day++) {
  lines.push(generateDailyPuzzle(day, words));
}
process.stdout.write(lines.join("\n"));
