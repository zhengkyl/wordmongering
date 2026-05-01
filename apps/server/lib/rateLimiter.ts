import type { MiddlewareHandler } from "hono";

const LIMIT = 100;
const WINDOW_MS = 60 * 1000;

export function rateLimiter(): MiddlewareHandler {
  const reqsByIp = new Map<string, number>();

  setInterval(() => {
    reqsByIp.clear();
  }, WINDOW_MS);

  return async (c, next) => {
    const key = c.req.header("X-Real-IP");
    if (!key) {
      return c.text("Missing IP", 400);
    }
    const reqs = reqsByIp.get(key) ?? 0;
    if (reqs >= LIMIT) {
      return c.text("Too Many Requests", 429);
    }
    reqsByIp.set(key, reqs + 1);
    return next();
  };
}
