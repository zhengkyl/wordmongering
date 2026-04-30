import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { sValidator } from "@hono/standard-validator";
import Database from "better-sqlite3";
import { eq, min, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { Hono } from "hono";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import * as v from "valibot";
import { dailies } from "./schema.ts";

const root = join(import.meta.dirname, "../..");

mkdirSync(join(root, "data"), { recursive: true });

const client = new Database(join(root, "data/data.db"));
const db = drizzle({ client, casing: "snake_case" });

migrate(db, { migrationsFolder: join(import.meta.dirname, "migrations") });

const app = new Hono();

app.get("/api/dailies/:day/results", (c) => {
  const day = Number(c.req.param("day"));
  const rows = db
    .select({ score: sql<number>`json_array_length(words)` })
    .from(dailies)
    .where(eq(dailies.day, day))
    .all();

  const allPlays: Record<number, number> = {};
  for (const { score } of rows) {
    allPlays[score] = (allPlays[score] ?? 0) + 1;
  }

  const firstPlaySubquery = db
    .select({ id: min(dailies.id).as("first_play_id") })
    .from(dailies)
    .where(eq(dailies.day, day))
    .groupBy(dailies.playerHint)
    .as("fp");

  const firstPlayRows = db
    .select({ score: sql<number>`json_array_length(${dailies.words})` })
    .from(dailies)
    .innerJoin(firstPlaySubquery, eq(dailies.id, firstPlaySubquery.id))
    .all();

  const firstPlays: Record<number, number> = {};
  for (const { score } of firstPlayRows) {
    firstPlays[score] = (firstPlays[score] ?? 0) + 1;
  }

  return c.json({ allPlays, firstPlays });
});

const DailySchema = v.strictObject({
  playerHint: v.pipe(v.string(), v.minLength(10), v.maxLength(64)),
  words: v.pipe(
    v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(30))),
    v.minLength(1),
    v.maxLength(50),
  ),
});

// Earliest Midnight April 27, 2026 UTC+14
const WM_EPOCH = Date.UTC(2026, 3, 26, 10);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

app.post("/api/dailies/:day/results", sValidator("json", DailySchema), (c) => {
  const day = Number(c.req.param("day"));
  const maxDays = Math.ceil((Date.now() - WM_EPOCH) / MS_PER_DAY);
  if (day < 1 || day > maxDays) return c.text("Invalid day", 400);

  const { playerHint, words } = c.req.valid("json");
  db.insert(dailies)
    .values({
      playerHint,
      day,
      words: JSON.stringify(words),
    })
    .run();
  return c.body(null, 201);
});

app.use("/*", serveStatic({ root: join(root, "apps/client/dist") }));
app.get("/*", serveStatic({ path: join(root, "apps/client/dist/index.html") }));

serve({ fetch: app.fetch, port: 3000 }, () => {
  console.log("Server running at http://localhost:3000");
});
