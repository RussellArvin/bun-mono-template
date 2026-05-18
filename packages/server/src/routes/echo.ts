import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppEnv } from "../lib/context";

// Example route group. Demonstrates the pattern: a route module exports a Hono
// app that the root mounts under a base path. Use `zValidator` to validate the
// body/query/params at the boundary so handlers receive typed input.

const echoBody = z.object({
  message: z.string().min(1).max(280),
});

export const echoRoutes = new Hono<AppEnv>().post(
  "/",
  zValidator("json", echoBody),
  (c) => {
    const { message } = c.req.valid("json");
    return c.json({ echo: message, length: message.length });
  },
);
