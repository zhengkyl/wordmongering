import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./schema.ts",
  out: "./migrations",
  dbCredentials: { url: "../../data/data.db" },
  casing: "snake_case",
});
