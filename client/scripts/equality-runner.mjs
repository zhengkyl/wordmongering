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
// raw-loader.mjs is registered first so the generator's `?raw` text imports
// resolve under Node.

import { register } from "node:module";

register("./raw-loader.mjs", import.meta.url);

const { generateDailyPuzzle } = await import("../src/lib/generatePuzzle.ts");

const dayCount = Number(process.argv[2]);
if (!Number.isInteger(dayCount) || dayCount < 1) {
  throw new Error("usage: equality-runner.mjs <dayCount>");
}

const lines = [];
for (let day = 1; day <= dayCount; day++) {
  lines.push(generateDailyPuzzle(day));
}
process.stdout.write(lines.join("\n"));
