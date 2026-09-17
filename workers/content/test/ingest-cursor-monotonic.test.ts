// A CURSOR MOVES FORWARD, NEVER BACK.
//
// BUILD-5 §G2 follow-up (16 Sep 2026) — `recordRun`'s cursor write used to be
// `cursor = excluded.cursor` unconditionally: whichever of two overlapping
// ticks on the SAME kind (the cron, a manual press, `catchUp`'s own 5-rows-
// per-kind slice) wrote LAST won, regardless of which one actually got
// further. A short tick that read fewer rows than a concurrent longer one,
// but finished second, would rewrite the kind's cursor back to an EARLIER
// row — and the next tick would re-walk ground already covered.
//
// Real SQLite, not a mocked spy: a mock that "understood" the statement would
// agree with a broken CASE just as happily as a correct one. What is on
// trial is what SQL actually does when two writes land out of order.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import { DatabaseSync as RealDatabaseSync } from "node:sqlite"
import { TEAM_MIGRATIONS } from "../../tenancy/src/team-schema/migrations"
import { recordRun, sweepKinds, type IngestKind } from "../src/lib/knowledge-ingest"
import { fakeVectorize } from "./fake-vectorize"

const cfg = {} as never
const guard = { databaseId: "db", teamId: "t", userId: "u" } as never
const db = () => holder.db as DatabaseSync

function cursorFor(kind: string): string | null {
  return (db().prepare("SELECT cursor FROM knowledge_ingest WHERE kind = ?").get(kind) as { cursor: string | null })
    .cursor
}

beforeEach(() => {
  holder.db = new RealDatabaseSync(":memory:")
  for (const m of TEAM_MIGRATIONS) holder.db.exec(m.sql)
})

describe("recordRun's cursor write is monotonic", () => {
  it("a later tick that finishes first, then an earlier tick that finishes second: the earlier one does not win", async () => {
    const EARLY = "v1|2026-01-01T00:00:00.000Z|row-early"
    const LATE = "v1|2026-06-01T00:00:00.000Z|row-late"

    // The longer-running tick (reads further, e.g. the cron) writes LATE first.
    await recordRun(cfg, guard, "ticket", { cursor: LATE, indexed: 3, error: null })
    expect(cursorFor("ticket")).toBe(LATE)

    // A second, shorter tick (e.g. a budgeted press that only reached a few
    // rows before its own deadline) had read its OWN cursor before the first
    // one committed, and now writes back the earlier position it reached.
    await recordRun(cfg, guard, "ticket", { cursor: EARLY, indexed: 1, error: null })

    // MUTATION PROOF: on today's unconditional `cursor = excluded.cursor`,
    // this assertion fails — EARLY overwrites LATE.
    expect(cursorFor("ticket")).toBe(LATE)
  })

  it("a genuinely later cursor still advances normally", async () => {
    const FIRST = "v1|2026-01-01T00:00:00.000Z|row-1"
    const SECOND = "v1|2026-01-02T00:00:00.000Z|row-2"
    await recordRun(cfg, guard, "ticket", { cursor: FIRST, indexed: 1, error: null })
    await recordRun(cfg, guard, "ticket", { cursor: SECOND, indexed: 1, error: null })
    expect(cursorFor("ticket")).toBe(SECOND)
  })

  it("NULL (caughtUp/reset) still writes through — this guard never blocks the terminal signal", async () => {
    const SOME = "v1|2026-01-01T00:00:00.000Z|row-1"
    await recordRun(cfg, guard, "dropdown", { cursor: SOME, indexed: 1, error: null })
    await recordRun(cfg, guard, "dropdown", { cursor: null, indexed: 0, error: null })
    expect(cursorFor("dropdown")).toBeNull()
  })

  it("an errored tick never touches the cursor at all, same as before", async () => {
    const SOME = "v1|2026-01-01T00:00:00.000Z|row-1"
    await recordRun(cfg, guard, "ticket", { cursor: SOME, indexed: 1, error: null })
    await recordRun(cfg, guard, "ticket", { cursor: "v1|2026-12-01T00:00:00.000Z|row-x", indexed: 0, error: "boom" })
    expect(cursorFor("ticket")).toBe(SOME)
  })

  it("runs increments and sources_indexed accumulates regardless of which cursor value wins", async () => {
    await recordRun(cfg, guard, "ticket", { cursor: "v1|2026-06-01T00:00:00.000Z|row-late", indexed: 3, error: null })
    await recordRun(cfg, guard, "ticket", { cursor: "v1|2026-01-01T00:00:00.000Z|row-early", indexed: 1, error: null })
    const row = db().prepare("SELECT runs, sources_indexed FROM knowledge_ingest WHERE kind = ?").get("ticket") as {
      runs: number
      sources_indexed: number
    }
    expect(row.runs).toBe(2)
    expect(row.sources_indexed).toBe(4)
  })
})

// THE INTEGRATION SHAPE, NOT JUST THE UNIT — planner's own correction, the
// same night: `rotatedKindOrder` (BUILD-5 §G2's first attempt at this same
// backlog, reverted) passed every one of its own unit tests and was still a
// complete no-op, because none of them routed its output through the real
// caller that discards it. `recordRun`'s guard above is proven directly and
// correctly, but "correctly" only for calls shaped exactly the way these
// tests shape them — this test drives the SAME two-ticks-out-of-order
// scenario through the real `sweepKinds` → `sweepKind` → `recordRun` path,
// so what's on trial is the wiring, not just the SQL.
describe("the monotonic guard survives being driven through the real sweep engine", () => {
  it("a longer tick (more rows, reads further) followed by a shorter one (fewer rows, reads less far): the shorter tick does not rewind the cursor", async () => {
    let call = 0
    const row = (id: string, sortAt: string, text: string) => ({
      originRowId: id,
      sortAt,
      title: text,
      body: text,
      accountId: null,
      sourceUrl: null,
      ownerUserId: null,
    })
    const kind: IngestKind = {
      kind: "faux",
      table: "faux_table",
      label: "a fake kind for this test only",
      textVersion: 1,
      read: async () => {
        call++
        // TICK 1 — the longer one: two rows, ending well ahead in time.
        if (call === 1) return [row("row-a", "2026-01-01T00:00:00.000Z", "a"), row("row-b", "2026-06-01T00:00:00.000Z", "b")]
        // TICK 2 — the shorter one: one row, well BEHIND where tick 1 ended.
        // Simulates a tick that read its own (older) cursor before tick 1
        // committed, and so has no idea tick 1 got further.
        return [row("row-c", "2026-02-01T00:00:00.000Z", "c")]
      },
    }
    const env = {
      AI: { run: async () => ({ data: [[1, 0, 0]] }) },
      KNOWLEDGE_INDEX: fakeVectorize().binding,
      DB: { prepare: () => ({ bind: () => ({ run: async () => ({}), all: async () => ({ results: [] }) }) }) },
    } as never

    await sweepKinds(env, cfg, guard, [kind], 25) // tick 1
    const afterFirst = cursorFor("faux")
    expect(afterFirst).toContain("row-b") // ended on the LATER row

    await sweepKinds(env, cfg, guard, [kind], 25) // tick 2, the shorter one
    const afterSecond = cursorFor("faux")

    // MUTATION PROOF: on the unconditional `cursor = excluded.cursor` this
    // repo had before BUILD-5 §G2's follow-up, tick 2 overwrites tick 1's
    // cursor with row-c's earlier position — this assertion catches that.
    expect(afterSecond).toBe(afterFirst)
    expect(afterSecond).toContain("row-b")
  })
})
