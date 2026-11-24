#!/bin/sh
# Fails when the committed migrations in packages/database/drizzle are out of
# sync with the Drizzle schema. Run via `bun run drizzle:check` (CI does).
set -eu
cd "$(dirname "$0")/.."

DIR=packages/database/drizzle

# drizzle-kit generate/check only read the schema and migration files; they
# never connect, so a placeholder URL is enough when none is set.
export DATABASE_URL="${DATABASE_URL:-postgresql://user:pass@localhost:5432/app}"

had_dir=false
[ -d "$DIR" ] && had_dir=true

bun run --filter '@repo/database' drizzle:generate

# Fresh template: no tables, so nothing is committed and generate produced no
# SQL. That is in sync — don't leave drizzle-kit's empty journal behind.
if [ -z "$(git ls-files -- "$DIR")" ] &&
  [ -z "$(find "$DIR" -name '*.sql' 2>/dev/null)" ]; then
  [ "$had_dir" = true ] || rm -rf "$DIR"
  echo "No tables yet — nothing to check."
  exit 0
fi

bun run --filter '@repo/database' drizzle:check

drift=$(git status --porcelain -- "$DIR")
if [ -n "$drift" ]; then
  echo ""
  echo "ERROR: migrations are out of sync with the schema:"
  echo "$drift"
  echo ""
  echo "Run 'bun run drizzle:generate' and commit $DIR."
  exit 1
fi
echo "Migrations match the schema."
