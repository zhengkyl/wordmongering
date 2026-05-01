import { sValidator } from "@hono/standard-validator";
import { eq, min, sql } from "drizzle-orm";
import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as v from "valibot";
import { db } from "../db.ts";
import { BloomFilter } from "../lib/bloomFilter.ts";
import { isValidGame } from "../lib/game.ts";
import { puzzles, results } from "../schema.ts";

export const dailies = new Hono();

// Earliest Midnight April 27, 2026 UTC+14
const WM_GLOBAL_EPOCH = Date.UTC(2026, 3, 26, 10);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const root = join(import.meta.dirname, "../..");

const dictPath =
  process.env.NODE_ENV === "production"
    ? join(root, "apps/client/dist/dictionary.txt")
    : join(root, "apps/client/public/dictionary.txt");

const dictionary = new BloomFilter();
for (const word of readFileSync(dictPath, "utf8").split("\n")) {
  if (word) dictionary.add(word + process.env.BLOOM_FILTER_PEPPER);
}

function isValidDay(day: number) {
  const maxDays = Math.ceil((Date.now() - WM_GLOBAL_EPOCH) / MS_PER_DAY);
  return day <= maxDays;
}

const DayParamSchema = v.object({
  day: v.pipe(
    v.string(),
    v.transform(Number),
    v.integer(),
    v.minValue(1),
    v.check(isValidDay, "Invalid day"),
  ),
});

const puzzleCache = new Map<number, string>();
function getPuzzle(day: number) {
  const cached = puzzleCache.get(day);
  if (cached) return cached;

  const row = db.select().from(puzzles).where(eq(puzzles.day, day)).get();
  if (!row) return null;

  puzzleCache.set(day, row.puzzle);
  return row.puzzle;
}

dailies.get("/:day/puzzle", sValidator("param", DayParamSchema), (c) => {
  const { day } = c.req.valid("param");
  const puzzle = getPuzzle(day);
  if (!puzzle) return c.text("Not found", 404);
  return c.json({ puzzle });
});

const ResultSchema = v.strictObject({
  playerHint: v.pipe(v.string(), v.minLength(10), v.maxLength(64)),
  words: v.pipe(
    v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(32))),
    v.minLength(1),
    v.maxLength(50),
  ),
});

dailies.post(
  "/:day/results",
  sValidator("param", DayParamSchema),
  sValidator("json", ResultSchema),
  (c) => {
    const { day } = c.req.valid("param");
    const { playerHint, words } = c.req.valid("json");

    const puzzle = getPuzzle(day);
    if (!puzzle) return c.text("Missing puzzle", 500);

    if (words.some((word) => !dictionary.has(word + process.env.BLOOM_FILTER_PEPPER))) {
      return c.text("Invalid words", 400);
    }

    if (!isValidGame(puzzle, words)) {
      return c.text("Invalid words", 400);
    }

    db.insert(results)
      .values({
        playerHint,
        day,
        words: JSON.stringify(words),
      })
      .run();
    return c.body(null, 201);
  },
);

dailies.get("/:day/results", sValidator("param", DayParamSchema), (c) => {
  const { day } = c.req.valid("param");
  const rows = db
    .select({ score: sql<number>`json_array_length(words)` })
    .from(results)
    .where(eq(results.day, day))
    .all();

  const allPlays: Record<number, number> = {};
  for (const { score } of rows) {
    allPlays[score] = (allPlays[score] ?? 0) + 1;
  }

  const firstPlaySubquery = db
    .select({ id: min(results.id).as("first_play_id") })
    .from(results)
    .where(eq(results.day, day))
    .groupBy(results.playerHint)
    .as("fp");

  const firstPlayRows = db
    .select({ score: sql<number>`json_array_length(${results.words})` })
    .from(results)
    .innerJoin(firstPlaySubquery, eq(results.id, firstPlaySubquery.id))
    .all();

  const firstPlays: Record<number, number> = {};
  for (const { score } of firstPlayRows) {
    firstPlays[score] = (firstPlays[score] ?? 0) + 1;
  }

  return c.json({ allPlays, firstPlays });
});
