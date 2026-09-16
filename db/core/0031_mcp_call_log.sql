-- 0031 — every MCP call leaves one row. Not "every write" (writes already carry
-- origin 'mcp' on the activity row, team-side, R1) — every CALL, reads included,
-- because a read tool is exactly where a leaked token's blast radius shows up
-- first and the activity table never hears from a read at all.
--
-- ONE ROW: which token, which tool, whether the door said yes, when. Nothing
-- about WHAT changed — that would duplicate the activity row a write already
-- gets, which is precisely what CLAUDE.md's R1 exception asks this table not to
-- do. `trace_id` is the link instead: the same id `routes/mcp.ts` already mints
-- per request (`requestId`) and forwards to the door as `traceId` — the same
-- value a failed call's own `error_logs.request_id` carries, so a token's call
-- log and the door's own failure trail join on one column without this table
-- ever storing a second copy of what the door recorded.
--
-- CALLER-PRIVATE, like mcp_tokens itself (0013's own note, and CLAUDE.md's R1
-- row: "mcp's caller-private token rows are the reviewed exceptions"). Nobody
-- but the token's owner ever reads this, on demand, from Settings → Access
-- tokens — so it is written straight to the core DB with no publishChange and
-- read back with no live listener, the same reviewed class as the token row it
-- is about.
--
-- user_id RIDES THE ROW rather than being joined from mcp_tokens on every read:
-- the read door has to prove the caller owns the token before it hands back a
-- single row, and a token can be revoked (and later, in principle, reassigned)
-- without changing who was allowed to look at what it already did.
--
-- GROWS WITH EVERY CALL, so it is a GROWING_COLLECTIONS entry (R14): the read
-- door pages by key, never by a hard cap. And it is swept by the SAME nightly
-- retention job core's other spent rows already ride (shared/workers/retention.ts),
-- past MCP_CALL_LOG_RETENTION_DAYS (90 — the task's own number, and the same
-- window a token itself lives for).

CREATE TABLE mcp_call_log (
  id TEXT PRIMARY KEY,
  token_id TEXT NOT NULL REFERENCES mcp_tokens (id),
  user_id TEXT NOT NULL REFERENCES users (id),
  tool_name TEXT NOT NULL,
  ok INTEGER NOT NULL,       -- 1 = the door answered ok; 0 = refused (an error, a refusal, a timeout)
  trace_id TEXT NOT NULL,    -- joins to error_logs.request_id for a failed call's own detail
  created_at TEXT NOT NULL
);

-- "THIS TOKEN, NEWEST FIRST" — the one question the read door ever asks, so the
-- index is the query, not a general-purpose one. `id` rides second, as the
-- keyset tiebreak `shared/workers/paging.ts`'s `keysetAfter` needs for two rows
-- sharing a timestamp.
CREATE INDEX idx_mcp_call_log_token ON mcp_call_log (token_id, created_at, id);

-- The retention sweep's own predicate ("created_at < cutoff") — a second index
-- scanning by token AND filtering old rows would give the sweep the same
-- privilege as the settings screen's own read, at the cost of the same B-tree
-- twice; a plain scan on created_at is what the sweep's bounded DELETE needs.
CREATE INDEX idx_mcp_call_log_created ON mcp_call_log (created_at);
