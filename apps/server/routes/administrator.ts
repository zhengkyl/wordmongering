import { sValidator } from "@hono/standard-validator";
import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import * as v from "valibot";
import { db } from "../db.ts";
import { puzzles } from "../schema.ts";

export const administrator = new Hono();

const ADMINISTRATOR_PASSWORD = process.env.ADMINISTRATOR_PASSWORD;
const adminSessions = new Set<string>();

const COOKIE_NAME = "administrator_token";
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "Strict" as const,
  path: "/api/administrator",
  secure: process.env.NODE_ENV === "production",
};

const LoginSchema = v.strictObject({
  password: v.string(),
});

administrator.post("/login", sValidator("json", LoginSchema), (c) => {
  if (!ADMINISTRATOR_PASSWORD) return c.text("Admin access not configured", 503);
  const { password } = c.req.valid("json");
  const passwordBuf = createHash("sha256").update(password).digest();
  const expectedBuf = createHash("sha256").update(ADMINISTRATOR_PASSWORD).digest();
  if (!timingSafeEqual(passwordBuf, expectedBuf)) {
    return c.text("Unauthorized", 401);
  }
  const token = randomBytes(32).toString("hex");
  adminSessions.add(token);
  setCookie(c, COOKIE_NAME, token, COOKIE_OPTS);
  return c.body(null, 204);
});

administrator.use("/*", async (c, next) => {
  if (!ADMINISTRATOR_PASSWORD) return c.text("Admin access not configured", 503);
  const token = getCookie(c, COOKIE_NAME) ?? "";
  if (!adminSessions.has(token)) return c.text("Unauthorized", 401);
  return next();
});

administrator.post("/logout", (c) => {
  const token = getCookie(c, COOKIE_NAME) ?? "";
  adminSessions.delete(token);
  deleteCookie(c, COOKIE_NAME, COOKIE_OPTS);
  return c.body(null, 204);
});

administrator.get("/puzzles", (c) => {
  const rows = db.select().from(puzzles).orderBy(asc(puzzles.day)).all();
  return c.json(rows);
});

const PuzzleBodySchema = v.strictObject({
  puzzle: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
});

administrator.post("/puzzles", sValidator("json", PuzzleBodySchema), (c) => {
  const { puzzle } = c.req.valid("json");
  const row = db.insert(puzzles).values({ puzzle }).returning().get();
  return c.json(row, 201);
});

administrator.put("/puzzles/:day", sValidator("json", PuzzleBodySchema), (c) => {
  const day = Number(c.req.param("day"));
  const { puzzle } = c.req.valid("json");
  const row = db.update(puzzles).set({ puzzle }).where(eq(puzzles.day, day)).returning().get();
  if (!row) return c.text("Not found", 404);
  return c.json(row);
});

administrator.delete("/puzzles/:day", (c) => {
  const day = Number(c.req.param("day"));
  db.delete(puzzles).where(eq(puzzles.day, day)).run();
  return c.body(null, 204);
});
