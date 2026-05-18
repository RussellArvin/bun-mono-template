import { test, expect } from "@playwright/test";

test("home page loads and echo round-trips through the API", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "bun-mono-template" }),
  ).toBeVisible();

  await page.getByPlaceholder("Type a message").fill("playwright");
  await page.getByRole("button", { name: "Echo" }).click();

  await expect(page.getByText("playwright (10 chars)")).toBeVisible();
});
