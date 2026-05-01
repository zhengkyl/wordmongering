import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "../..");
mkdirSync(join(root, "data"), { recursive: true });
const client = new Database(join(root, "data/data.db"));

export const db = drizzle({ client, casing: "snake_case" });

migrate(db, { migrationsFolder: join(import.meta.dirname, "migrations") });
