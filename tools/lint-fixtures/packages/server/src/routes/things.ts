export { app } from "@repo/app"; // expect: repo/workspace-imports
export { default as express } from "express"; // expect: eslint/no-restricted-imports
export type { Database } from "@repo/database";

declare const db: { execute(query: string): number };
declare const statement: { execute(): number };
declare const routes: {
  get(path: string, ...handlers: unknown[]): typeof routes;
  post(path: string, ...handlers: unknown[]): typeof routes;
  patch(path: string, ...handlers: unknown[]): typeof routes;
};
declare function zValidator(target: string, schema: unknown): unknown;
declare function handler(): unknown;

export const rows = db.execute("select 1"); // expect: repo/no-db-execute
export const prepared = statement.execute();

export const port = process.env["PORT"]; // expect: eslint/no-restricted-properties
export const host = Bun.env["HOST"]; // expect: eslint/no-restricted-properties

export const things = routes
  .get("/", handler)
  .post("/", zValidator("json", {}), handler)
  .post("/raw", handler) // expect: repo/require-route-validation
  .patch("/:id", handler); // expect: repo/require-route-validation

type Shape = { kind: "circle"; radius: number } | { kind: "square" };

export function area(shape: Shape): number {
  // expect-next-line: typescript/switch-exhaustiveness-check
  switch (shape.kind) {
    case "circle":
      return shape.radius;
  }
  return 0;
}

declare const raw: unknown;
export const cast = raw as Shape; // expect: typescript/consistent-type-assertions
export const literal = ["a", "b"] as const;

console.log("debug"); // expect: eslint/no-console
console.error("fatal");
