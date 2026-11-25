# Lint fixtures

Files here are deliberately wrong. `tools/__tests__/lint-rules.test.ts` runs
the real `oxlint` over this folder and checks that every line marked
`// expect: <rule>` reports exactly that rule, and that no other line does.

The folder mirrors the repo layout (`packages/server/src/routes/...`) and its
`oxlintrc.fixtures.json` extends the root config, so the per-package overrides apply to
these files exactly as they do to real code. That makes this a test of the
config wiring as well as of the custom rules in `tools/oxlint-plugin-repo.mjs`.

To cover a new rule, add a line that breaks it with an `// expect:` comment,
plus a nearby line that must stay clean.
