# bun-mono-template

A Bun workspace monorepo template with a Hono API, React + Vite frontend, Drizzle ORM, type-safe RPC, and Playwright e2e tests. Optimized for AI-assisted development with Claude Code.

## Quick Start

```bash
bun install
bun run dev          # server on :3000, app on :5173 (parallel)
```

Open http://localhost:5173. The example page round-trips an echo request through the API to confirm RPC is wired up.

## Structure

```
packages/
  server/     @repo/server    — Hono API (port 3000)
  app/        @repo/app       — React + Vite SPA (port 5173 in dev)
  database/   @repo/database  — Drizzle ORM + PostgreSQL
  shared/     @repo/shared    — shared types and utilities
  e2e/        @repo/e2e       — Playwright end-to-end tests
```

The frontend imports the server's `ApiRoutes` type for a type-safe Hono RPC client — change a route signature on the server and the app gets a type error.

```ts
import { hc } from "hono/client";
import type { ApiRoutes } from "@repo/server";

const client = hc<ApiRoutes>(API_BASE);
await client.api.echo.$post({ json: { message: "hi" } });
```

## Scripts

| Command                        | Description                                      |
| ------------------------------ | ------------------------------------------------ |
| `bun run dev`                  | Start server + app in parallel                   |
| `bun test`                     | Run server unit/integration tests                |
| `bun run test:e2e`             | Run Playwright e2e (auto-starts server + app)    |
| `bun run typecheck`            | Type-check all packages (incl. browser tsconfig) |
| `bun run lint` / `lint:fix`    | ESLint                                           |
| `bun run format`               | Prettier                                         |
| `bun run drizzle:generate`     | Generate migration from schema changes           |
| `bun run drizzle:migrate`      | Apply pending migrations                         |
| `bun run drizzle:migrate:test` | Apply migrations to the test database            |
| `bun run drizzle:push`         | Push schema directly (dev only)                  |
| `bun run drizzle:studio`       | Open Drizzle Studio                              |

## Local Setup

1. Start Postgres locally (Docker, Postgres.app, etc.) and create a database.
2. Create `.env` at the repo root:
   ```
   DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
   ```
   Bun auto-loads it — no `dotenv` needed.
3. (Optional, for tests) Create a separate test database and run `bun run drizzle:migrate:test`.
4. `bun install && bun run dev`.

## Testing

- **Unit/integration** — `bun:test`, lives in `packages/server/src/__tests__/`. Hono routes are tested with `app.request()`, no live server. Test env is preloaded by `bunfig.toml`.
- **End-to-end** — Playwright in `packages/e2e/`. First time: `bun run --filter '@repo/e2e' install:browsers`. Then `bun run test:e2e`.

## Tooling

| Tool            | Purpose                                                    |
| --------------- | ---------------------------------------------------------- |
| **Bun**         | Runtime, package manager, test runner, bundler             |
| **TypeScript**  | Strict mode with extra safety flags                        |
| **Hono**        | API framework with end-to-end type-safe RPC                |
| **Drizzle**     | Type-safe SQL via `drizzle-orm/bun-sql`                    |
| **React 19**    | UI                                                         |
| **Vite**        | Dev server + production bundle for the SPA                 |
| **Tailwind v4** | Styling, with shadcn/ui primitives                         |
| **Zod**         | Env validation + request body validation                   |
| **Playwright**  | End-to-end testing                                         |
| **ESLint**      | Strict type-checked rules, `db.execute()` banned in server |
| **Prettier**    | Formatting                                                 |
| **Husky**       | Pre-commit (typecheck + lint + format) + commit-msg checks |

## Commit Convention

```
type: description
```

Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `revert`

## Claude Code

Project commands shipped in `.claude/commands/`:

- **`/project:add-table <name>`** — scaffold a Drizzle table
- **`/project:add-route <description>`** — scaffold a Hono route in the server with tests
- **`/project:add-package <name>`** — scaffold a new workspace package

## Renaming the Scope

Packages use `@repo` as the default scope. To rename:

```bash
sed -i '' 's/@repo/@myapp/g' package.json packages/*/package.json
bun install
```

## Adding a New Package

```bash
# Via Claude Code:
/project:add-package my-package

# Or manually — see CLAUDE.md "Adding a New Package".
```

## Database Setup

Add tables in `packages/database/src/schema/` (one file per table), then:

```bash
bun run drizzle:generate
bun run drizzle:migrate
```

See `packages/database/CLAUDE.md` for the schema convention.
