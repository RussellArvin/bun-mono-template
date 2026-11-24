import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema",
  out: "./drizzle",
  dbCredentials: {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    url: process.env["DATABASE_URL"]!,
  },
});
