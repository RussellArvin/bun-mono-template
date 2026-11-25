// Fails when a doc mentions `bun run <script>` and the root package.json has
// no such script, so the command lists in the docs cannot go stale.
import { Glob } from "bun";
import rootPackage from "../package.json";

const ROOT = new URL("../", import.meta.url).pathname;

const DOC_GLOBS = [
  "*.md",
  "packages/*/*.md",
  ".claude/commands/*.md",
  ".github/*.md",
];

// `bun run dev`, `bun run drizzle:generate`. Flags such as `bun run --filter`
// start with "-" and are skipped.
const COMMAND = /\bbun run ([a-z][a-z0-9:_-]*)/g;

const scripts = new Set(Object.keys(rootPackage.scripts));
const problems: string[] = [];

for (const pattern of DOC_GLOBS) {
  for await (const path of new Glob(pattern).scan({ cwd: ROOT, dot: true })) {
    const lines = (await Bun.file(`${ROOT}${path}`).text()).split("\n");
    for (const [index, line] of lines.entries()) {
      for (const match of line.matchAll(COMMAND)) {
        const script = match[1];
        if (script === undefined || scripts.has(script)) continue;
        problems.push(
          `${path}:${String(index + 1)}: \`bun run ${script}\` is not a script in the root package.json`,
        );
      }
    }
  }
}

if (problems.length > 0) {
  console.error(
    `${problems.join("\n")}\n\nAdd the script to package.json or fix the doc.`,
  );
  process.exit(1);
}
