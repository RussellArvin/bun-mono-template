Bun workspace monorepo. All tooling runs from the root.

This repo is a **template**: people clone it and start building immediately.
Keep it ready from the first clone — packages stay pre-wired, every check
(`bun run check`, `bun test`, `bun run drizzle:check`) passes on a fresh clone
with no database, and new tooling must not need manual setup or committed
generated files to go green. The one generated file in the repo is
`.env.example`, kept because people copy it; `bun run env:example` rewrites it.

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
- `bun test` — run all unit/integration tests (e2e is excluded in `bunfig.toml`)
- `bun run test:e2e` — run Playwright e2e tests (auto-starts server + app)
- `bun run check` — typecheck + lint + knip + workspace, docs and env checks + format check (the pre-commit hook runs this, then `bun test`)
- `bun run fix` — auto-fix everything fixable: oxlint autofixes, then Prettier
- `bun run typecheck` — TypeScript 7 `tsc --noEmit` across server/db/shared + `app` (with DOM types)
- `bun run lint` — oxlint only (no fixes)
- `bun run knip` — unused files, exports and dependencies (config: `knip.jsonc`)
- `bun run check:workspace` — sherif: consistent dependency versions and `package.json` hygiene across packages
- `bun run check:docs` — every `bun run <script>` named in a doc must exist in the root `package.json`
- `bun run check:env` — `.env.example` must match the server env schema
- `bun run env:example` — regenerate `.env.example` from `packages/server/src/lib/env.ts`
- `bun run format` — Prettier write only
- `bun run drizzle:generate` — generate migration from schema changes
- `bun run drizzle:migrate` — apply pending migrations
- `bun run drizzle:migrate:test` — apply migrations to the test database
- `bun run drizzle:check` — fail if committed migrations are out of sync with the schema (runs in CI)
- `bun run drizzle:push` — push schema directly (dev only)
- `bun run drizzle:studio` — open Drizzle Studio GUI

## Do NOT Use

- `npm`, `yarn`, `pnpm`, `node`, `ts-node`, `npx` — use `bun`
- `eslint`, `typescript-eslint` — use `oxlint`

Banned packages (`express`, `dotenv`, `jest` and so on) are not listed here.
The single source is `no-restricted-imports` in `.oxlintrc.json`: importing one
is a lint error whose message names the replacement. To ban another package,
add it there with a message that says what to use instead.

## Commit Convention

Format: `type: description` — the description must start lowercase

Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `revert`

Enforced by husky commit-msg hook — commits are rejected if they don't match.

## Pre-commit Checks

Runs automatically: `bun run check` (typecheck, oxlint, knip, workspace, docs
and env checks, Prettier check), then
`bun test`

Fix before committing: `bun run fix`, then `bun run check`

Pull requests start from `.github/pull_request_template.md` (why, what changed,
how it was verified).

CI (`.github/workflows/ci.yml`) runs `bun run check` and `bun run drizzle:check`
on every pull request and push to `main`, so `--no-verify` does not get past
them. `bun test` is commented out in CI for now. A second job runs `actionlint`
on the workflow files. The Bun version for CI comes from `packageManager` in the
root `package.json` — change it there. Dependabot (`.github/dependabot.yml`)
opens weekly update PRs.

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

Every `.post()`, `.put()` and `.patch()` route must pass `zValidator(...)` before
its handler (`repo/require-route-validation`).

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
process with a readable error rather than failing at first use. Give each one a
`.describe()` — it becomes the comment in `.env.example` — then run
`bun run env:example`.

Frontend env vars must be prefixed `VITE_`, declared in
`packages/app/src/vite-env.d.ts`, and accessed via `import.meta.env`.

`DATABASE_URL` is the exception: `packages/database/src/index.ts` reads it
directly and throws on import if it is missing, so anything importing
`@repo/database` (including tests) needs it set.

## Testing

- Unit/integration: `bun:test`, files in `packages/<pkg>/src/__tests__/<name>.test.ts`
- Env for tests is preloaded by `bunfig.toml` from `packages/server/src/__tests__/setup.ts`
- Run all: `bun test`. Server only: `bun run test`
- This is a template, so tests are examples of the pattern, not coverage: keep
  them few, and make each one fail when the behaviour it names breaks. Replace
  a weak test rather than adding another.
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
- `noImplicitReturns` — every code path in a function must return
- `erasableSyntaxOnly` — no `enum`, constructor parameter properties or
  code-bearing `namespace`; use union types and plain field assignments

Lint adds three more type-safety rules:

- No `as` casts (`as const` and `satisfies` are fine). Narrow with a type
  guard, parse with Zod, or declare the type at the source — for a new `VITE_*`
  variable, add it to `ImportMetaEnv` in `packages/app/src/vite-env.d.ts`.
- A `switch` over a union must handle every member, so adding a variant is a
  lint error until each switch is updated.
- No `console.log` — only `console.error` and `console.warn` are allowed.

## Gotchas

- TypeScript 7 does not auto-include `@types/*`. Global types come from
  `"types": ["bun"]` in `tsconfig.base.json` — add new ones there (the app
  overrides it with `["vite/client", "node"]` in its own tsconfig).
- `packages/app` is type-checked separately (`tsc -p packages/app`, DOM libs);
  the root `tsconfig.json` excludes it. `bun run typecheck` runs both.
- Not linted: `packages/app/src/components/ui/` (vendored shadcn). Everything
  else is, including `packages/e2e` (also type-checked) and `tools/`.
- Lint rules: the oxlint `correctness` category is on for every enabled plugin,
  so `.oxlintrc.json` lists only the extra rules, options and overrides.
- Unused `oxlint-disable` comments are errors, and warnings fail the run.
- `knip` flagging something intentional? Add it to `knip.jsonc` with a comment
  saying why rather than deleting the check. The one standing exception is
  `@repo/database` in `packages/server` — remove it once a route queries the DB.
- `tools/oxlint-plugin-repo.mjs` is typed via `@oxlint/plugins` (`defineRule`)
  and is type-checked and linted like everything else.
- `bun run drizzle:check` passes with no tables and no `drizzle/` folder; once a
  table exists, the generated `packages/database/drizzle` must be committed.
- After editing a file, Claude Code's PostToolUse hook
  (`.claude/hooks/lint-edited.sh`) runs oxlint on it and reports errors.
- Suppress a lint rule with `// oxlint-disable-next-line typescript/<rule>`
  plus a reason, not `eslint-disable`.
- New repo-specific lint rules: add to `tools/oxlint-plugin-repo.mjs`, then
  enable as `repo/<rule>` in `.oxlintrc.json` (`db.execute()` ban is the example).
- `repo/no-db-execute` matches by receiver name (`db`, `tx`, `trx`, `database`),
  so name Drizzle handles accordingly.
- Package boundaries are linted by `repo/workspace-imports` (configured per
  package in `.oxlintrc.json` overrides):
  - `app` may import `@repo/server` only with a top-level `import type`
    (`import { type X }` still emits a runtime import) and never `@repo/database`
  - `shared` imports no other workspace package; `database` only `shared`
  - a new package needs its own override entry to get boundaries
- In `packages/server`, `process.env` / `Bun.env` are lint errors outside
  `src/lib/env.ts` and tests — import `env` from `lib/env` instead (the error
  message says so).
- Lint messages for repo conventions must name the fix: the file, export or
  package to use instead, not just what is wrong.
- React hooks, `jsx-a11y` and import-cycle rules are on; custom components that
  render native elements are mapped under `settings.jsx-a11y.components`.
- `@shadcn/lint` (design-system rules for Tailwind and shadcn components) is
  registered under `jsPlugins` in `.oxlintrc.json`, but none of its rules is
  enabled yet. Turn rules on as `shadcn/<rule>` there; it finds the components
  and theme through `packages/app/components.json`.

## Formatting

Semicolons, double quotes, 2-space indent, trailing commas, 80 char width.
