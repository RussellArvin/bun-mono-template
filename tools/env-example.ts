// Generates `.env.example` from the server's Zod env schema, so the list of
// variables can never drift from what the server actually validates.
//
//   bun run env:example           write .env.example
//   bun tools/env-example.ts --check   fail if .env.example is out of date
import { envSchema } from "../packages/server/src/lib/env";

const TARGET = new URL("../.env.example", import.meta.url);

function formatDefault(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function render(): string {
  const lines = [
    "# Generated from packages/server/src/lib/env.ts by `bun run env:example`.",
    "# Do not edit by hand. Copy to `.env` and adjust; Bun loads `.env` itself.",
    "",
    "# Postgres connection string. Read directly by packages/database, which",
    "# throws on import when it is missing.",
    "DATABASE_URL=postgresql://user:pass@localhost:5432/app",
  ];

  for (const [name, field] of Object.entries(envSchema.shape)) {
    // Parsing `undefined` succeeds only when the variable has a default or is
    // optional; otherwise it is required and must be filled in.
    const parsed = field.safeParse(undefined);
    lines.push("");
    if (field.description !== undefined) lines.push(`# ${field.description}`);
    if (parsed.success) {
      lines.push(`# Optional. Default shown.`);
      lines.push(`# ${name}=${formatDefault(parsed.data)}`);
    } else {
      lines.push(`# Required.`);
      lines.push(`${name}=`);
    }
  }

  return `${lines.join("\n")}\n`;
}

const expected = render();

if (process.argv.includes("--check")) {
  const file = Bun.file(TARGET);
  const actual = (await file.exists()) ? await file.text() : "";
  if (actual !== expected) {
    console.error(
      ".env.example is out of date with packages/server/src/lib/env.ts.\nRun `bun run env:example` and commit the result.",
    );
    process.exit(1);
  }
} else {
  await Bun.write(TARGET, expected);
}
