<!-- Title: type: description (lowercase), e.g. "feat: add user sessions" -->

## Why

<!-- The problem or goal. Link an issue if there is one: Closes #123 -->

## What changed

<!-- The behaviour that is different now, not a list of files. -->

## How it was verified

<!-- What you ran or did, and what you saw. "CI passes" is not enough. -->

- [ ] `bun run check` and `bun test` pass
- [ ] Schema changed → migration generated and committed (`bun run drizzle:generate`)
- [ ] Tested by hand in the running app, if this touches UI or an API route

## Risks and trade-offs

<!-- Anything a reviewer should look at hard, or an alternative you rejected. Delete if none. -->
