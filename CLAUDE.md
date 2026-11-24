Bun workspace monorepo. All tooling runs from the root.

## Architecture

- Bun workspaces with `packages/*`
- Packages:
  - `@repo/server` — Hono API (port 3000), env validation, typed RPC export
  - `@repo/app` — React + Vite SPA (port 5173 in dev, built and served by `server` in prod)
  - `@repo/database` — Drizzle ORM + PostgreSQL (`bun-sql`)
  - `@repo/shared` — shared types/constants
  - `@repo/e2e` — Playwright end-to-end tests
- Cross-package imports via `workspace:*`: `import { x } from "@repo/shared"`
- The app imports the server's `ApiRoutes` type for a type-safe Hono RPC client (`packages/app/src/lib/api.ts`)
- Source packages export raw `.ts` — no build step except `@repo/app` (Vite build)
- Dev tooling at root: TypeScript 7, oxlint (type-aware via `oxlint-tsgolint`), Prettier, Husky
- Lint config is `.oxlintrc.json`; repo-specific rules live in the local JS plugin `tools/oxlint-plugin-repo.mjs`

## Commands

- `bun install` — install all workspace dependencies
- `bun run dev` — start all packages in dev mode (parallel)
- `bun test` — run all unit/integration tests (server + shared; e2e is excluded in `bunfig.toml`)
- `bun run test:e2e` — run Playwright e2e tests (auto-starts server + app)
- `bun run check` — everything the pre-commit hook runs: typecheck + lint + format check
- `bun run fix` — auto-fix everything fixable: oxlint autofixes, then Prettier
- `bun run typecheck` — TypeScript 7 `tsc --noEmit` across server/db/shared + `app` (with DOM types)
- `bun run lint` — oxlint only (no fixes)
- `bun run format` — Prettier write only
- `bun run drizzle:generate` — generate migration from schema changes
- `bun run drizzle:migrate` — apply pending migrations
- `bun run drizzle:migrate:test` — apply migrations to the test database
- `bun run drizzle:push` — push schema directly (dev only)
- `bun run drizzle:studio` — open Drizzle Studio GUI

## Do NOT Use

- `npm`, `yarn`, `pnpm`, `node`, `ts-node`, `npx` — use `bun`
- `eslint`, `typescript-eslint` — use `oxlint`
- `express` — use `hono`
- `dotenv` — Bun auto-loads `.env`
- `pg`, `postgres.js` — use `drizzle-orm/bun-sql`
- `jest`, `vitest` — use `bun:test`
- `ws` — `WebSocket` is built-in
- `better-sqlite3` — use `bun:sqlite`

## Commit Convention

Format: `type: description` (lowercase)

Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `revert`

Enforced by husky commit-msg hook — commits are rejected if they don't match.

## Pre-commit Checks

Runs automatically: `bun run check` (typecheck, oxlint, Prettier check)

Fix before committing: `bun run fix`, then `bun run check`

## Adding a New Package

1. Create `packages/<name>/package.json`:
   ```json
   {
     "name": "@repo/<name>",
     "version": "0.0.0",
     "private": true,
     "type": "module",
     "exports": {
       ".": "./src/index.ts",
       "./*": "./src/*.ts"
     }
   }
   ```
2. Create `packages/<name>/tsconfig.json`:
   ```json
   {
     "extends": "../../tsconfig.base.json",
     "include": ["src/**/*.ts"]
   }
   ```
3. Add source in `src/`, tests in `src/__tests__/`
4. Other packages depend on it via `"@repo/<name>": "workspace:*"` in their package.json
5. Run `bun install` to link

## Adding API Routes (server package)

Route modules live in `packages/server/src/routes/<feature>.ts` and export a
Hono app. Mount them in `packages/server/src/index.ts` by chaining `.route(...)`
on `apiRoutes` so the RPC client picks up the types automatically.

```ts
// packages/server/src/routes/things.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppEnv } from "../lib/context";

const createBody = z.object({ name: z.string().min(1) });

export const thingsRoutes = new Hono<AppEnv>()
  .get("/", (c) => c.json({ items: [] }))
  .post("/", zValidator("json", createBody), (c) => {
    const { name } = c.req.valid("json");
    return c.json({ name }, 201);
  });
```

```ts
// packages/server/src/index.ts
export const apiRoutes = app
  .basePath("/api")
  .route("/echo", echoRoutes)
  .route("/things", thingsRoutes); // ← add here
```

Return errors with status: `c.json({ error: "message" }, 400)`.

For DB access, import from `@repo/database` and `@repo/database/schema` and use
the Drizzle query builder only (`db.select()`, `db.insert()`, etc.) — never
`db.execute()` (oxlint will reject it).

## Adding Frontend Pages (app package)

The app uses Vite + React. The RPC client at `packages/app/src/lib/api.ts` is
fully typed from the server's `ApiRoutes` export — you get autocomplete on
`api.things.$get()`, body shape, response type, everything.

## Environment Variables

Server-side env vars are validated at startup in `packages/server/src/lib/env.ts`
with Zod. Add new vars to the schema there; invalid/missing values exit the
process with a readable error rather than failing at first use.

Frontend env vars must be prefixed `VITE_` and accessed via `import.meta.env`.

`DATABASE_URL` is the exception: `packages/database/src/index.ts` reads it
directly and throws on import if it is missing, so anything importing
`@repo/database` (including tests) needs it set.

## Testing

- Unit/integration: `bun:test`, files in `packages/<pkg>/src/__tests__/<name>.test.ts`
- Env for tests is preloaded by `bunfig.toml` from `packages/server/src/__tests__/setup.ts`
- Run all: `bun test`. Server only: `bun run test`
- E2E: Playwright in `packages/e2e/tests/`. Run with `bun run test:e2e`.
  Playwright auto-starts the server (:3000) and the Vite dev server (:5173).

```ts
import { test, expect, describe } from "bun:test";
import { app } from "../index";

describe("GET /health", () => {
  test("returns ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });
});
```

Hono routes are tested with `app.request()` — no live server needed.

## TypeScript Strictness

These non-obvious strict flags are enabled:

- `noUncheckedIndexedAccess` — array/object index access returns `T | undefined`
- `exactOptionalPropertyTypes` — can't assign `undefined` to optional props, omit the key instead
- `verbatimModuleSyntax` — use `import type` for type-only imports
- `noUnusedLocals` / `noUnusedParameters` — no unused variables or params (prefix with `_` to opt out)

## Gotchas

- TypeScript 7 does not auto-include `@types/*`. Global types come from
  `"types": ["bun"]` in `tsconfig.base.json` — add new ones there (the app
  overrides it with `["vite/client", "node"]` in its own tsconfig).
- `packages/app` is type-checked separately (`tsc -p packages/app`, DOM libs);
  the root `tsconfig.json` excludes it. `bun run typecheck` runs both.
- Not linted: `packages/e2e/`, `packages/app/src/components/ui/` (vendored
  shadcn), `tools/`. `packages/e2e` is not type-checked either.
- Suppress a lint rule with `// oxlint-disable-next-line typescript/<rule>`
  plus a reason, not `eslint-disable`.
- New repo-specific lint rules: add to `tools/oxlint-plugin-repo.mjs`, then
  enable as `repo/<rule>` in `.oxlintrc.json` (`db.execute()` ban is the example).

## Formatting

Semicolons, double quotes, 2-space indent, trailing commas, 80 char width.
