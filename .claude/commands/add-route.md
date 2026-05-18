Add a new API route to the server package for: $ARGUMENTS

Follow the existing patterns in this repo:

1. Create a new route module at `packages/server/src/routes/<feature>.ts` exporting a Hono app (see `routes/echo.ts` for the pattern).
2. Use `zValidator` from `@hono/zod-validator` for body/query/params validation. Define the schema inline above the handler.
3. Use `c.json()` for responses, `c.req.param()` for path params, `c.req.query()` for query params. Return errors as `c.json({ error: "message" }, 400)`.
4. Mount the new module in `packages/server/src/index.ts` by chaining `.route("/<feature>", <feature>Routes)` on the `apiRoutes` export — this keeps the RPC type updated automatically.
5. Add tests in `packages/server/src/__tests__/routes.test.ts` using `app.request()` — no live server needed.
6. If the route needs database access, import from `@repo/database` and `@repo/database/schema`. Use the Drizzle query builder only (`db.select()`, `db.insert()`, etc.), never `db.execute()`.
7. If the route needs shared types or constants, import from `@repo/shared`.

Run `bun test` after implementation to verify.

Ask me for the route details (method, path, request/response shape) before writing code.
