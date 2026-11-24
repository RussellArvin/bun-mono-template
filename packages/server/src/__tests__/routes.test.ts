import { test, expect, describe } from "bun:test";
import { ECHO_MAX_LENGTH } from "@repo/shared";
import { app } from "../index";

describe("GET /health", () => {
  test("returns ok status", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ status: "ok" });
  });
});

describe("POST /api/echo", () => {
  test("echoes the message", async () => {
    const res = await app.request("/api/echo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ echo: "hello", length: 5 });
  });

  test("accepts a message at the shared length limit, rejects one over", async () => {
    const post = (message: string) =>
      app.request("/api/echo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

    const atLimit = await post("a".repeat(ECHO_MAX_LENGTH));
    expect(atLimit.status).toBe(200);

    const overLimit = await post("a".repeat(ECHO_MAX_LENGTH + 1));
    expect(overLimit.status).toBe(400);
  });

  test("rejects empty body", async () => {
    const res = await app.request("/api/echo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "" }),
    });
    expect(res.status).toBe(400);
  });
});
