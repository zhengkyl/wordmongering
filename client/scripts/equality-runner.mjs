// Test helper: emits the client's daily puzzles so the backend equality test
// (backend/internal/game/generate_equality_test.go) can diff them against the
// Go generator. Imports the real client generator so there is no second copy
// of the algorithm to drift.
//
// Usage: node equality-runner.mjs <dayCount>
// Prints one puzzle per line for days 1..dayCount.
//
// Requires Node with TypeScript type stripping (Node >= 22.6 with
// --experimental-strip-types, on by default since 23.6) to import the .ts file.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { generateDailyPuzzle, parseDeadSet } from "../src/lib/generatePuzzle.ts";

const publicDir = fileURLToPath(new URL("../public/", import.meta.url));
const read = (name) => parseDeadSet(readFileSync(publicDir + name, "utf8"));
const dead = {
  two: read("dead2.txt"),
  three: read("dead3.txt"),
};

const dayCount = Number(process.argv[2]);
if (!Number.isInteger(dayCount) || dayCount < 1) {
  throw new Error("usage: equality-runner.mjs <dayCount>");
}

const lines = [];
for (let day = 1; day <= dayCount; day++) {
  lines.push(generateDailyPuzzle(day, dead));
}
process.stdout.write(lines.join("\n"));
