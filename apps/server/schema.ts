import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const dailies = sqliteTable("dailies", {
  id: integer().primaryKey({ autoIncrement: true }),
  playerHint: text().notNull(),
  day: integer().notNull(),
  words: text().notNull(),
  createdAt: integer({ mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const reports = sqliteTable("reports", {
  id: integer().primaryKey({ autoIncrement: true }),
  playerHint: text().notNull(),
  word: text().notNull(),
  context: text(),
  createdAt: integer({ mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
