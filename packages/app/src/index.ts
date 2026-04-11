import { Hono } from "hono";
import { APP_NAME, greet } from "@repo/shared";

const app = new Hono();

app.get("/", (c) => c.json({ name: APP_NAME }));

app.get("/greet/:name", (c) => {
  const name = c.req.param("name");
  return c.json({ message: greet(name) });
});

export default {
  port: 3000,
  fetch: app.fetch,
};
