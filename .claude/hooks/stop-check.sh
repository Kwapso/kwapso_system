#!/usr/bin/env bash
# Stop gate: run the tests/laws relevant to what changed this session, not
# the full `npm run check` on every stop (that belongs to the ship gate).
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0

BASE="${STOP_HOOK_BASE:-main}"
changed=$( { git diff --name-only "$BASE"...HEAD 2>/dev/null; git status --porcelain 2>/dev/null | awk '{print $2}'; } | sort -u)

if [ -z "$changed" ]; then
  exit 0
fi

fail=0

# Cheap, whole-repo, ~15ms — safe to run whenever any source file changed.
if echo "$changed" | grep -qE '\.(ts|tsx|js|jsx|mjs|cjs)$'; then
  npm run lint || fail=1
fi

workspaces=""
echo "$changed" | grep -q '^web/'                    && workspaces="$workspaces kwapso-web"
echo "$changed" | grep -q '^web-portal/'              && workspaces="$workspaces kwapso-portal-web"
echo "$changed" | grep -q '^workers/auth/'            && workspaces="$workspaces kwapso-auth"
echo "$changed" | grep -q '^workers/tenancy/'         && workspaces="$workspaces kwapso-tenancy"
echo "$changed" | grep -q '^workers/content/'         && workspaces="$workspaces kwapso-content"
echo "$changed" | grep -q '^workers/data-ops/'        && workspaces="$workspaces kwapso-data-ops"
echo "$changed" | grep -q '^workers/mcp/'             && workspaces="$workspaces kwapso-mcp"
echo "$changed" | grep -q '^workers/realtime/'        && workspaces="$workspaces kwapso-realtime"
echo "$changed" | grep -q '^workers/gateway/'         && workspaces="$workspaces kwapso-gateway"
echo "$changed" | grep -q '^workers/portal-gateway/'  && workspaces="$workspaces kwapso-portal-gateway"

# shared/ is imported everywhere; a change there needs the full test run
# rather than a guess at which workspaces are affected.
if echo "$changed" | grep -q '^shared/'; then
  npm test || fail=1
else
  for w in $workspaces; do
    npm run test --workspace="$w" || fail=1
  done
fi

# Law/registry changes: re-check the generated rules index stays in sync.
if echo "$changed" | grep -qE '^(shared/rules/registry\.ts|RULES\.md|scripts/rules-index\.mjs)$'; then
  node --experimental-transform-types scripts/rules-index.mjs --check || fail=1
fi

if [ "$fail" -ne 0 ]; then
  echo "Stop gate failed — see output above. Reproduce locally with the same commands." >&2
  exit 2
fi
exit 0
