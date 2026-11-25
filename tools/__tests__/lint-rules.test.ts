// Runs the real oxlint over `tools/lint-fixtures` and compares what it reports
// with the `// expect:` comments in those files. See the README there.
import { expect, test } from "bun:test";
import { Glob } from "bun";

const FIXTURES = new URL("../lint-fixtures/", import.meta.url).pathname;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Reads one diagnostic from oxlint's JSON report as "<file>:<line> <rule>".
function toFinding(diagnostic: unknown): string {
  if (!isRecord(diagnostic)) throw new Error("Unexpected oxlint diagnostic");
  const { code, filename, labels } = diagnostic;
  if (typeof code !== "string" || typeof filename !== "string") {
    throw new Error("oxlint diagnostic has no code or filename");
  }
  const label: unknown = Array.isArray(labels) ? labels[0] : undefined;
  const span = isRecord(label) ? label["span"] : undefined;
  const line = isRecord(span) ? span["line"] : undefined;
  if (typeof line !== "number") {
    throw new Error(`oxlint diagnostic for ${filename} has no line`);
  }
  return `${filename}:${String(line)} ${ruleId(code)}`;
}

// "repo(no-db-execute)" -> "repo/no-db-execute"
function ruleId(code: string): string {
  return code.replace(/^(.+)\((.+)\)$/, "$1/$2");
}

async function expectedFindings(): Promise<string[]> {
  const findings: string[] = [];
  const files = new Glob("packages/**/*.{ts,tsx}").scan({ cwd: FIXTURES });
  for await (const file of files) {
    const lines = (await Bun.file(`${FIXTURES}${file}`).text()).split("\n");
    for (const [index, line] of lines.entries()) {
      const match = /expect(-next-line)?: ([a-z/, -]+)/.exec(line);
      if (!match?.[2]) continue;
      // Line numbers are 1-based; `expect-next-line` points one further down.
      const target = index + (match[1] === undefined ? 1 : 2);
      for (const rule of match[2].split(",")) {
        findings.push(`${file}:${String(target)} ${rule.trim()}`);
      }
    }
  }
  return findings.toSorted();
}

async function reportedFindings(): Promise<string[]> {
  const child = Bun.spawn(
    [
      "bunx",
      "oxlint",
      "--config",
      "oxlintrc.fixtures.json",
      "--format",
      "json",
      ".",
    ],
    {
      cwd: FIXTURES,
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const output = await new Response(child.stdout).text();
  await child.exited;
  const report: unknown = JSON.parse(output);
  if (!isRecord(report) || !Array.isArray(report["diagnostics"])) {
    throw new Error(`Unexpected oxlint output: ${output.slice(0, 200)}`);
  }
  return report["diagnostics"].map(toFinding).toSorted();
}

test("lint rules report exactly the lines the fixtures expect", async () => {
  const expected = await expectedFindings();
  // Only rules named by a fixture are compared, so unrelated rules that an
  // oxlint upgrade adds do not break this test.
  const tested = new Set(expected.map((finding) => finding.split(" ")[1]));
  const reported = (await reportedFindings()).filter((finding) =>
    tested.has(finding.split(" ")[1]),
  );

  expect(expected.length).toBeGreaterThan(0);
  expect(reported).toEqual(expected);
}, 30_000);
