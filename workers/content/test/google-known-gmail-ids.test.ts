// A KNOWN GMAIL ID COSTS ONE D1 ROW, NEVER A GOOGLE CALL — the read
// `gmailSearch`'s header skip is built on (documents/COSTS.md §3, 2026-09-10).
//
// PROVED BY RUNNING, not by reading: `d1Query` is replaced and every statement
// this function sends is read back, the same discipline google-source-revive's
// header describes and for the same reason — a source scan would happily accept
// the right table name inside a comment.

import { describe, expect, it, vi } from "vitest"

const sent: { sql: string; params: unknown[] }[] = []
/** What the mocked SELECT answers with — one row shape, `origin_row_id` only,
 * which is the only column `knownGmailIds` reads. */
let rows: { origin_row_id: string }[] = []
let throwOnQuery = false

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const real = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  return {
    ...real,
    d1Query: vi.fn(async (_cfg: unknown, _db: unknown, sql: string, params?: unknown[]) => {
      sent.push({ sql, params: params ?? [] })
      if (throwOnQuery) throw new Error("d1 unavailable")
      return rows
    }),
  }
})

import { knownGmailIds } from "../src/lib/knowledge-google"

const guard = { userId: "U_STAFF_1", teamId: "T1", roleId: "R1", databaseId: "DB1" }

describe("knownGmailIds — what the header skip is allowed to trust", () => {
  it("asks knowledge_sources for THIS person's gmail rows only, capped", async () => {
    rows = []
    await knownGmailIds({} as never, guard)

    expect(sent).toHaveLength(1)
    const { sql, params } = sent[0]
    // THE TABLE AND THE KIND — a Drive or Calendar row must never count as
    // "known gmail", they are a different origin_table entirely.
    expect(sql).toContain("FROM knowledge_sources")
    expect(sql).toContain("origin_table = 'google_gmail'")
    // R14: a stated cap, not an unbounded read.
    expect(sql).toMatch(/LIMIT \d+/)
    // THE PERSON, not the team — two colleagues' gmail must never share a
    // "known" set, exactly as they never share a shelf (see the module header).
    // The bound value is LIKE-escaped (likeLiteral backslash-escapes `_`), so
    // the check reverses that rather than assert on the raw userId.
    expect(
      params.some((p) => typeof p === "string" && p.replaceAll("\\", "").startsWith(guard.userId))
    ).toBe(true)
  })

  it("strips the userId prefix, so the caller gets Gmail's own ids back", async () => {
    rows = [
      { origin_row_id: `${guard.userId}:MSG_A` },
      { origin_row_id: `${guard.userId}:MSG_B` },
    ]
    const known = await knownGmailIds({} as never, guard)
    expect(known).toEqual(new Set(["MSG_A", "MSG_B"]))
  })

  it("never returns another person's row, even if one leaked past the query", async () => {
    // Defence in depth: the WHERE clause is what should stop this, but the
    // function's own filter is the last line and is worth its own assertion —
    // a row whose prefix does not match this guard's userId must not surface
    // as "known" and silently suppress a header read that was never this
    // person's to skip.
    rows = [{ origin_row_id: `${guard.userId}:MSG_A` }, { origin_row_id: "U_OTHER:MSG_X" }]
    const known = await knownGmailIds({} as never, guard)
    expect(known).toEqual(new Set(["MSG_A"]))
  })

  it("fails SAFE: a broken read is an empty set, never a thrown error", async () => {
    // The whole point of the fail-safe direction: an empty set costs the sweep
    // the OPTIMISATION, never the correctness — every id just gets its header
    // read again, exactly as it always did before this function existed.
    throwOnQuery = true
    await expect(knownGmailIds({} as never, guard)).resolves.toEqual(new Set())
    throwOnQuery = false
  })
})
