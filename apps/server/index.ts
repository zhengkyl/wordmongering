import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { join } from "node:path";
import { rateLimiter } from "./lib/rateLimiter.ts";
import { administrator } from "./routes/administrator.ts";
import { dailies } from "./routes/dailies.ts";

const app = new Hono();

if (process.env.NODE_ENV === "production") {
  app.use("/api/*", rateLimiter());
}

app.route("/api/administrator", administrator);
app.route("/api/dailies", dailies);

const root = join(import.meta.dirname, "../..");
// NOTE TO SELF:
// nginx serving directly is faster but
// would require cloudflare specific logic in this repo
app.use("/*", serveStatic({ root: join(root, "apps/client/dist") }));
// Fallback for non-matched paths
app.get("/*", serveStatic({ path: join(root, "apps/client/dist/index.html") }));

serve({ fetch: app.fetch, port: 3000 }, () => {
  console.log("Server running at http://localhost:3000");
});
