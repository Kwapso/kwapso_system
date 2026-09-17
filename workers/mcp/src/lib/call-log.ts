// EVERY MCP CALL LEAVES ONE ROW (db/core 0031) — token id, tool name, ok or
// refused, when. Not "every write": writes already carry origin "mcp" on the
// team's own activity row (R1), and this table exists precisely for the half
// that row never sees — a READ. `whoami`, `list_help_tickets`, `ask_knowledge`
// mutate nothing, so the only trail a leaked token's read left before this was
// `error_logs`, and only on the calls that FAILED.
//
// CALLER-PRIVATE, the same reviewed class `mcp_tokens` itself is (routes/
// tokens.ts, CLAUDE.md's R1 row: "mcp's caller-private token rows are the
// reviewed exceptions"). No `publishChange`, no live listener: nobody but the
// token's owner ever reads this, on demand, from Settings → Access tokens.
//
// GROWS WITH EVERY CALL (R14's `GROWING_COLLECTIONS`, shared/rules/registry.ts
// `mcpCallLog`) — a busy integration can make thousands of calls a day, so the
// read door pages by KEY, never a hard cap, and the count is the one bounded
// seam (R16) rather than an unbounded `COUNT(*)`.

import { decodeCursor, keysetAfter, PAGE_SIZE, toPage, type Page } from "@shared/workers/paging"
import { boundedInner, isCapped, reportedTotal } from "@shared/workers/count"
import { likeLiteral } from "@shared/workers/d1-rest"
import { ulid } from "@shared/workers/id"
import type { Env } from "../env"

export type McpCallRow = {
  id: string
  toolName: string
  ok: boolean
  traceId: string
  createdAt: string
}

/** One row per call. Best-effort by contract, like `logActivity`: a logging
 * hiccup must never fail the tool call it is describing, so this is written
 * to run through `afterResponse` (routes/mcp.ts) and swallows its own
 * failure — the caller already has their answer by the time this runs. */
export async function insertCall(
  env: Env,
  tokenId: string,
  userId: string,
  toolName: string,
  ok: boolean,
  traceId: string
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO mcp_call_log (id, token_id, user_id, tool_name, ok, trace_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(ulid(), tokenId, userId, toolName, ok ? 1 : 0, traceId, new Date().toISOString())
      .run()
  } catch (e) {
    console.error("mcp call log write failed:", e)
  }
}

type CallLogDbRow = { id: string; tool_name: string; ok: number; trace_id: string; created_at: string }

const toCall = (r: CallLogDbRow): McpCallRow => ({
  id: r.id,
  toolName: r.tool_name,
  ok: r.ok === 1,
  traceId: r.trace_id,
  createdAt: r.created_at,
})

/** "This token, newest first" — the one question the read door ever asks, so
 * there is one fixed order and `sig` is always "" (the same convention a
 * cursor minted before ordering existed already decodes as). `q` narrows by
 * TOOL NAME (the toolbar's own search box) — the SAME question the count
 * below answers, so a searched badge and a searched page agree. */
export async function listCalls(
  env: Env,
  tokenId: string,
  userId: string,
  cursor: string | null,
  q?: string
): Promise<Page<McpCallRow>> {
  const pos = decodeCursor(cursor, "")
  const after = keysetAfter(pos, "created_at", "desc", "id")
  const where = ["token_id = ?", "user_id = ?", ...(after.sql ? [after.sql] : [])]
  const params: (string | number)[] = [tokenId, userId, ...after.params]
  if (q) {
    where.push("tool_name LIKE ? ESCAPE '\\'")
    params.push(`%${likeLiteral(q)}%`)
  }
  const rows = await env.DB.prepare(
    `SELECT id, tool_name, ok, trace_id, created_at FROM mcp_call_log
      WHERE ${where.join(" AND ")}
      ORDER BY created_at DESC, id DESC LIMIT ?`
  )
    .bind(...params, PAGE_SIZE + 1)
    .all<CallLogDbRow>()
  const mapped = (rows.results ?? []).map(toCall)
  return toPage(mapped, PAGE_SIZE, (c) => [c.createdAt, c.id], "")
}

/** R16: the exact server COUNT(*) for the badge, bounded to TOTAL_COUNT_CAP —
 * never `rows.length`, and never an unbounded scan over a table this call log
 * exists precisely because it will keep growing. Takes the SAME `q` the list
 * above does, so a searched badge counts the searched question and not the
 * whole collection underneath it. */
export async function countCalls(
  env: Env,
  tokenId: string,
  userId: string,
  q?: string
): Promise<{ total: number; totalCapped: boolean }> {
  const where = ["token_id = ?", "user_id = ?"]
  const params: string[] = [tokenId, userId]
  if (q) {
    where.push("tool_name LIKE ? ESCAPE '\\'")
    params.push(`%${likeLiteral(q)}%`)
  }
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM ${boundedInner(`SELECT 1 FROM mcp_call_log WHERE ${where.join(" AND ")}`)}`
  )
    .bind(...params)
    .first<{ n: number }>()
  const total = reportedTotal(row?.n ?? 0)
  return { total, totalCapped: isCapped(total) }
}
