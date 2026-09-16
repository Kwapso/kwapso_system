# MCP quality audit tooling

Scripts behind the "is our MCP good" audit (2026-09-15) — the two-step
reveal, traceability, and whether a fresh model can use the catalogue with no
other context. Kept so the measurement is repeatable, not a one-off.

## Part A — static audit

```bash
node --experimental-transform-types --experimental-loader ./scripts/mcp-audit/ts-resolve-hooks.mjs \
  scripts/mcp-audit/extract-catalog.mjs        # -> catalog-dump.json (every MCP tool, off the real source)
node scripts/mcp-audit/score-catalog.mjs       # -> scored-table.json / .csv (per-tool heuristic scores)
```

Both outputs are gitignored (they're a snapshot of the catalogue at the
moment they ran, and go stale as soon as a tool changes) — regenerate them
rather than trusting an old copy.

## Part B — measurement against live staging

1. Mint a token for the Kwapso team's real admin, staging only:
   ```bash
   TEST_LOGIN_KEY=... node scripts/mcp-audit/mint-token.mjs
   ```
   Writes the secret to an out-of-repo path (`$TMPDIR/kwapso-mcp-audit-token.secret`
   by default; override with `MCP_AUDIT_TOKEN_PATH`) — never printed.
2. Call any read tool or `describe_tool` through the harness (refuses writes
   and `agent_chat`/`agent_confirm` server-side, not just by instruction):
   ```bash
   ./scripts/mcp-audit/mcp-call.sh whoami '{}'
   ./scripts/mcp-audit/mcp-call.sh query_records '{"module":"sprints","countOnly":true}'
   ```
   This is the one door a measurement subagent should be given — point it at
   `live-tools-list.json` (regenerate with the `tools/list` RPC — see
   `mint-token.mjs`'s sibling calls for the shape) plus the `initialize`
   instructions and a question, and let it call `mcp-call.sh` on its own.
3. `questions.json` — the ten questions used for the 2026-09-15 measurement,
   each with the answer verified against live staging data at the time
   (dates, refs and counts in it will drift as the team's data does; treat
   it as a worked example rather than a fixture to keep passing forever).
4. When done:
   ```bash
   node scripts/mcp-audit/revoke-token.mjs
   ```
