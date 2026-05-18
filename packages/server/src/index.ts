import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import type { AppEnv } from "./lib/context";
import { env } from "./lib/env";
import { echoRoutes } from "./routes/echo";

// In prod the SPA build is served from the same origin as the API.
const APP_DIST = "../app/dist";

const app = new Hono<AppEnv>();

app.use(
  "/api/*",
  cors({
    origin: env.WEB_URL,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    maxAge: 600,
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

// Typed API surface — exported below as ApiRoutes for the RPC client.
// Chain `.route(...)` calls so Hono can infer the full route tree.
export const apiRoutes = app.basePath("/api").route("/echo", echoRoutes);

export type ApiRoutes = typeof apiRoutes;

// Static SPA — serve built assets and fall back to index.html for client-side
// routes. Only active in prod; in dev the SPA is served by Vite on :5173.
app.use("/assets/*", serveStatic({ root: APP_DIST }));
app.get("*", serveStatic({ path: `${APP_DIST}/index.html` }));

export { app };

export default {
  port: env.PORT,
  fetch: app.fetch,
};
