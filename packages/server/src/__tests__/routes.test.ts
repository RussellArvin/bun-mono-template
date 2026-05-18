import { test, expect, describe } from "bun:test";
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

  test("rejects empty body", async () => {
    const res = await app.request("/api/echo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "" }),
    });
    expect(res.status).toBe(400);
  });
});
