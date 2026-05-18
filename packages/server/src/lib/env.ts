import { z } from "zod";

const envSchema = z.object({
  // URL of the web frontend, used for CORS in dev (Vite on :5173).
  // In prod the SPA is served from the same origin as the API.
  WEB_URL: z.url({ protocol: /^https?$/ }).default("http://localhost:5173"),
  PORT: z.coerce.number().int().positive().default(3000),
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
