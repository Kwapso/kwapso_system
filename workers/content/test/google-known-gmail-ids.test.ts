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

import { gmailKnownIdsApply, knownGmailIds } from "../src/lib/knowledge-google"

const guard = { userId: "U_STAFF_1", teamId: "T1", roleId: "R1", databaseId: "DB1" }

// THE HOLE A NULL CHECK ALONE LEFT OPEN, caught in review before this ever
// reached a real mailbox: `moment()` has exactly two shapes — a real ISO date,
// or "" for a row with no readable date, which is deliberately FILED rather
// than dropped (moment()'s own comment). Nothing stops a slice from being
// filled entirely by date-less rows, which stores the cursor as a non-null
// OBJECT holding an empty `at`. `cursor !== null` alone reads that as "a real
// position" and would let the skip apply — and against an empty cursor,
// afterCursor's OWN equality branch can keep a placeholder (sortAt === "" too),
// which sorts first, crowds out real new mail, and never lets `at` leave "" —
// the transient state moment()'s comment promises becomes permanent. This
// suite exists so that regression is a red assertion, not a slow leak.
describe("gmailKnownIdsApply — the gate the skip is not allowed to clear on trust", () => {
  it("refuses when the cursor is null — a first connection or a deliberate re-share", () => {
    expect(gmailKnownIdsApply("gmail", null)).toBe(false)
  })

  it("refuses when the cursor is a non-null object with an empty `at` — the hole itself", () => {
    expect(gmailKnownIdsApply("gmail", { at: "", id: "MSG_X" })).toBe(false)
  })

  it("applies once the cursor holds a real, dated position", () => {
    expect(gmailKnownIdsApply("gmail", { at: "2026-09-10T00:00:00.000Z", id: "MSG_X" })).toBe(true)
  })

  it("never applies to any service but gmail — the other three have no placeholder to skip to", () => {
    const dated = { at: "2026-09-10T00:00:00.000Z", id: "X" }
    expect(gmailKnownIdsApply("drive", dated)).toBe(false)
    expect(gmailKnownIdsApply("calendar", dated)).toBe(false)
    expect(gmailKnownIdsApply("chat", dated)).toBe(false)
  })
})

describe("knownGmailIds — what the header skip is allowed to trust", () => {
  it("asks THIS person's own SIGHTINGS of gmail rows only, capped", async () => {
    // THE SHAPE CHANGED (kb_B1's identity gate): origin_row_id no longer
    // carries the reader, so "known to me" is no longer a string prefix on
    // knowledge_sources — it is a JOIN to knowledge_sightings, scoped by
    // seen_by_user_id. Same guarantee (two colleagues' gmail never share a
    // "known" set), a different SQL shape to prove it with.
    rows = []
    await knownGmailIds({} as never, guard)

    expect(sent).toHaveLength(1)
    const { sql, params } = sent[0]
    // THE TABLE AND THE KIND — a Drive or Calendar row must never count as
    // "known gmail", they are a different origin_table entirely.
    expect(sql).toContain("FROM knowledge_sources")
    expect(sql).toContain("origin_table = 'google_gmail'")
    // THE JOIN THAT REPLACED THE PREFIX MATCH.
    expect(sql).toContain("knowledge_sightings")
    expect(sql).toContain("seen_by_user_id")
    expect(sql).toContain("gone_at IS NULL")
    // R14: a stated cap, not an unbounded read.
    expect(sql).toMatch(/LIMIT \d+/)
    // THE PERSON, not the team — bound plainly now, since there is no prefix
    // string left to escape: the JOIN's own equality is the fence.
    expect(params).toContain(guard.userId)
  })

  it("hands the caller Gmail's own ids back, unmodified — there is no prefix left to strip", async () => {
    rows = [{ origin_row_id: "MSG_A" }, { origin_row_id: "MSG_B" }]
    const known = await knownGmailIds({} as never, guard)
    expect(known).toEqual(new Set(["MSG_A", "MSG_B"]))
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
