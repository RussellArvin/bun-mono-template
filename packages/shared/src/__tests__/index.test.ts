import { test, expect, describe } from "bun:test";
import { greet, slugify, truncate } from "../index";

describe("greet", () => {
  test("returns greeting with name", () => {
    expect(greet("World")).toBe("Hello, World!");
  });

  test("handles empty string", () => {
    expect(greet("")).toBe("Hello, !");
  });
});

describe("slugify", () => {
  test("converts text to slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  test("handles special characters", () => {
    expect(slugify("Hello, World! @2024")).toBe("hello-world-2024");
  });

  test("handles multiple spaces and dashes", () => {
    expect(slugify("  hello   world  ")).toBe("hello-world");
  });

  test("handles already slugified text", () => {
    expect(slugify("hello-world")).toBe("hello-world");
  });
});

describe("truncate", () => {
  test("returns original text if shorter than max", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  test("truncates and adds ellipsis", () => {
    expect(truncate("hello world", 5)).toBe("hello...");
  });

  test("returns original text if equal to max", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});
