export type { ApiRoutes } from "@repo/server";
export { app } from "@repo/server"; // expect: repo/workspace-imports
export { db } from "@repo/database"; // expect: repo/workspace-imports
export { APP_NAME } from "@repo/shared";

declare function Button(props: { children: string }): never;

export function Page() {
  return (
    <div>
      <Button>ok</Button>
      {/* expect-next-line: repo/no-raw-elements */}
      <button type="button">raw</button>
      {/* expect-next-line: repo/no-raw-elements */}
      <input aria-label="raw" />
    </div>
  );
}
