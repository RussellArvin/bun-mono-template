// Hono context types. Add per-request state to `Variables` (e.g. `user`,
// `session`) when you wire up auth, and reference `AppEnv` when constructing
// the Hono app so middleware and handlers stay type-safe.

export type Variables = Record<string, never>;

export interface AppEnv {
  Variables: Variables;
}
