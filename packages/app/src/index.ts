import { Hono } from "hono";
import { APP_NAME, greet, slugify, truncate } from "@repo/shared";

const app = new Hono();

app.get("/", (c) => c.json({ name: APP_NAME }));

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/greet/:name", (c) => {
  const name = c.req.param("name");
  return c.json({ message: greet(name) });
});

app.get("/slugify", (c) => {
  const text = c.req.query("text");
  if (!text) return c.json({ error: "text query param required" }, 400);
  return c.json({ slug: slugify(text) });
});

app.get("/truncate", (c) => {
  const text = c.req.query("text");
  const max = c.req.query("max");
  if (!text || !max)
    return c.json({ error: "text and max query params required" }, 400);
  const maxLength = parseInt(max, 10);
  if (isNaN(maxLength)) return c.json({ error: "max must be a number" }, 400);
  return c.json({ result: truncate(text, maxLength) });
});

export { app };

export default {
  port: 3000,
  fetch: app.fetch,
};
