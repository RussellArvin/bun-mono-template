import { z } from "zod";

// `.describe()` text becomes the comment in `.env.example`
// (regenerate with `bun run env:example`).
export const envSchema = z.object({
  WEB_URL: z
    .url({ protocol: /^https?$/ })
    .default("http://localhost:5173")
    .describe(
      "URL of the web frontend, used for CORS in dev (Vite on :5173). In prod the SPA is served from the same origin as the API.",
    ),
  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(3000)
    .describe("Port the API server listens on."),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const issues = result.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  console.error(`Invalid environment variables:\n${issues}`);
  process.exit(1);
}

export const env = result.data;
