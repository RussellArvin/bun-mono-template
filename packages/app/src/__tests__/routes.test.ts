import { test, expect, describe } from "bun:test";
import { app } from "../index";

async function request(path: string): Promise<Response> {
  return app.request(path);
}

describe("GET /", () => {
  test("returns app name", async () => {
    const res = await request("/");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ name: "bun-mono-template" });
  });
});

describe("GET /health", () => {
  test("returns ok status", async () => {
    const res = await request("/health");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ status: "ok" });
  });
});

describe("GET /greet/:name", () => {
  test("greets by name", async () => {
    const res = await request("/greet/Alice");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ message: "Hello, Alice!" });
  });
});

describe("GET /slugify", () => {
  test("slugifies text", async () => {
    const res = await request("/slugify?text=Hello%20World");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ slug: "hello-world" });
  });

  test("returns 400 without text param", async () => {
    const res = await request("/slugify");
    expect(res.status).toBe(400);
  });
});

describe("GET /truncate", () => {
  test("truncates text", async () => {
    const res = await request("/truncate?text=hello%20world&max=5");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ result: "hello..." });
  });

  test("returns 400 without params", async () => {
    const res = await request("/truncate");
    expect(res.status).toBe(400);
  });

  test("returns 400 with invalid max", async () => {
    const res = await request("/truncate?text=hello&max=abc");
    expect(res.status).toBe(400);
  });
});
