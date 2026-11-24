#!/bin/sh
# PostToolUse hook: lint the file Claude just edited and feed any oxlint
# errors straight back (exit 2 sends stderr to the model).
FILE=$(jq -r '.tool_input.file_path // empty')
[ -n "$FILE" ] || exit 0

case "$FILE" in
  *packages/database/src/schema*)
    echo "Schema file changed — remember to run: bun run drizzle:generate"
    ;;
esac

case "$FILE" in
  *.ts | *.tsx | *.mts | *.cts | *.js | *.jsx | *.mjs | *.cjs) ;;
  *) exit 0 ;;
esac
[ -f "$FILE" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
if ! OUTPUT=$(bunx oxlint --no-error-on-unmatched-pattern "$FILE" 2>&1); then
  echo "$OUTPUT" >&2
  exit 2
fi
