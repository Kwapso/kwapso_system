// BUILD-5 §G2 (16 Sep 2026) — THE MANUAL "BRING IT UP TO DATE" DOOR MUST
// NEVER TIME OUT.
//
// `POST /api/content/knowledge/sync` (the manual sync door — a person's own
// "bring it up to date" press, and what a backfill script loops over) calls
// `sweepKinds` over EVERY kind, and against a base deep in a backlog (BUILD-5
// §C's rebuild) a single press never answered at all: three real attempts
// each timed out after 180 SECONDS of no response. Unlike G1's read path,
// this call is not best-effort background work — its whole job is to report
// real progress to whoever pressed it, so it cannot simply be raced against a
// clock and abandoned; the fix is a real, honest time budget INSIDE the
// sweep's own loop, one kind at a time, so a slow backlog stops the loop
// between kinds rather than mid-request with nothing to show.
//
// `now` is injected (defaults to Date.now) so this suite can construct a
// deterministic "the clock ran out after two kinds" scenario without any
// real delay or fake timers — every kind's own read/write work is mocked to
// be instant (empty rows), which is exactly what lets the test isolate the
// BUDGET logic from the sweep engine's own correctness (covered elsewhere).

import { beforeEach, describe, expect, it, vi } from "vitest"

const { d1Query, d1ExecScript } = vi.hoisted(() => ({
  d1Query: vi.fn(async (..._args: unknown[]): Promise<unknown[]> => []),
  d1ExecScript: vi.fn(async (..._args: unknown[]): Promise<unknown[]> => []),
}))
vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  return { ...actual, d1Query, d1ExecScript }
})

import { sweepKinds, type IngestKind } from "../src/lib/knowledge-ingest"
import type { MemberGuard } from "@shared/workers/gating"
import type { D1Rest } from "@shared/workers/d1-rest"
import type { Env } from "../src/env"

const guard: MemberGuard = { userId: "u", teamId: "t", roleId: "r", databaseId: "db" }
const cfg = {} as D1Rest
const env = { DB: { prepare: () => ({ bind: () => ({ run: async () => ({}), all: async () => ({ results: [] }) }) }) } } as unknown as Env

/** Five fake kinds, each an instant, empty read — no real sweep behaviour to
 * mock, only the loop's own pacing to observe. */
const KINDS: IngestKind[] = Array.from({ length: 5 }, (_, i) => ({
  kind: `kind${i}`,
  table: `table${i}`,
  label: `kind ${i}`,
  textVersion: 1,
  read: async () => [],
}))

describe("sweepKinds — the manual press never times out", () => {
  beforeEach(() => {
    d1Query.mockClear()
    d1ExecScript.mockClear()
  })

  it("with no budget, sweeps every kind exactly as before (the cron's own shape, unchanged)", async () => {
    const results = await sweepKinds(env, cfg, guard, KINDS, 25)
    expect(results.map((r) => r.kind)).toEqual(expect.arrayContaining(KINDS.map((k) => k.kind)))
    expect(results).toHaveLength(5)
  })

  it("stops between kinds once the budget is spent, and reports the rest as not caught up", async () => {
    // A fake clock that advances by 100ms on every call — the loop checks it
    // once per kind, so this simulates "each kind costs 100ms of the budget"
    // without any real delay.
    let t = 0
    const now = () => (t += 100)

    const results = await sweepKinds(env, cfg, guard, KINDS, 25, { budgetMs: 250, now })

    // Every kind still gets a row in the response — "say how far it got"
    // means the caller can see which ones ran and which ones did not, not
    // just a shorter list.
    expect(results).toHaveLength(5)
    // At least one kind ran (the budget check happens BEFORE each kind, so
    // the very first one always gets a chance) and at least one was skipped
    // (250ms budget, 100ms per kind check → stops after 2-3).
    const skipped = results.filter((r) => !r.caughtUp && r.read === 0 && r.indexed === 0)
    expect(skipped.length).toBeGreaterThan(0)
    expect(skipped.length).toBeLessThan(5)
  })

  it("never even starts a kind once the budget was already spent by the time it's checked", async () => {
    // A fixed clock: the deadline is computed as now()+0 on the first call,
    // and every check afterwards reads the SAME instant — so it is always
    // exactly at the deadline, which must read as "spent", not "still fine".
    const now = () => 999_999
    const results = await sweepKinds(env, cfg, guard, KINDS, 25, { budgetMs: 0, now })
    // Every kind reports "not this press" — a caller pressing again starts
    // from the SAME rotation (sweepKinds itself does not persist how far it
    // got; the per-kind cursors it already writes are what make the NEXT
    // press pick up real progress instead of repeating this one's no-op).
    expect(results.every((r) => !r.caughtUp && r.indexed === 0)).toBe(true)
  })

  it("with a generous budget, behaves exactly as the unbounded call — nothing skipped", async () => {
    const results = await sweepKinds(env, cfg, guard, KINDS, 25, { budgetMs: 60_000 })
    expect(results.every((r) => r.caughtUp)).toBe(true)
  })
})

// BUILD-5 §G2 FOLLOW-UP (16 Sep 2026) — MEASURED LIVE ON STAGING: the
// between-kinds budget above answered honestly, but one press still took
// 87.8 SECONDS, because the ONE kind it reached spent the whole press inside
// its own row batch (25 rows, real embeds, heavy concurrent load) — a budget
// that cannot see inside a kind's own batch is not a bound on the request at
// all. The fix threads the SAME deadline one level deeper, into sweepKind's
// own row loop, checked between ROWS the same way sweepKinds checks it
// between KINDS.
describe("sweepKinds — the deadline reaches inside a single kind's own row batch", () => {
  beforeEach(() => {
    d1Query.mockClear()
    d1ExecScript.mockClear()
  })

  /** ONE kind, several rows — the shape a real backlog takes: `meeting` alone
   * held 25 rows the day this was measured. Each row is a trivial, valid
   * IngestRow; the mocked d1Query returns no upserted row for any of them, so
   * no real chunk/embed work happens — this suite is isolated to the BUDGET's
   * own pacing, exactly as the between-kinds suite above is. */
  const heavyKind: IngestKind = {
    kind: "heavy",
    table: "heavy_table",
    label: "a kind with a real backlog",
    textVersion: 1,
    read: async () =>
      Array.from({ length: 5 }, (_, i) => ({
        originRowId: `row${i}`,
        sortAt: `2026-09-16T00:00:0${i}.000Z`,
        title: `row ${i}`,
        body: `body ${i}`,
        accountId: null,
        sourceUrl: null,
        ownerUserId: null,
      })),
  }

  it("stops between rows once the budget is spent, mid-kind, and reports caughtUp:false", async () => {
    // Advances by 100ms per call. sweepKinds calls it once for its own
    // between-kinds check before this kind starts, then sweepKind calls it
    // once per row.
    let t = 0
    const now = () => (t += 100)

    const [result] = await sweepKinds(env, cfg, guard, [heavyKind], 25, { budgetMs: 250, now })

    expect(result.kind).toBe("heavy")
    // Some rows were reached (the budget does not fire on the very first
    // check) and NOT all five — the live case this reproduces.
    expect(result.read).toBe(5) // `read` reports what was FETCHED, honestly
    expect(result.caughtUp).toBe(false) // — but not all of it was PROCESSED
  })

  it("with a generous budget, processes every row and reports caughtUp honestly", async () => {
    const [result] = await sweepKinds(env, cfg, guard, [heavyKind], 25, { budgetMs: 60_000 })
    expect(result.read).toBe(5)
    // 5 read < 25 limit, and nothing cut it short — genuinely caught up.
    expect(result.caughtUp).toBe(true)
  })

  it("the cursor written only ever names a row that was actually finished", async () => {
    let t = 0
    const now = () => (t += 100)
    await sweepKinds(env, cfg, guard, [heavyKind], 25, { budgetMs: 250, now })

    // recordRun's own INSERT is the last d1ExecScript call — its cursor
    // argument must name the row that was actually finished (row0, worked
    // out below from the same fake clock the loop itself reads), never the
    // batch's last row (row4), which the budget never let the loop reach.
    const write = d1ExecScript.mock.calls.at(-1)?.[2] as string
    expect(write).toContain("row0")
    expect(write).not.toContain("row4")
  })
})

// BUILD-5 §H (18 Sep 2026) — MEASURED LIVE ON STAGING, the real Kwapso team:
// three consecutive presses each took 26-27 SECONDS against the 10s budget,
// and three of thirteen kinds never even started. The between-kinds check
// above is honest but cannot make the OTHER ten kinds' own reads any
// cheaper — and sweepKind paid its OWN `SELECT cursor` round trip per kind,
// duplicating state sweepKinds had already read one query earlier, for
// ordering. Two leaner fixes, both scoped so no other caller's shape moves:
// (1) thread the cursor sweepKinds already read into sweepKind, so it never
// re-queries it; (2) a kind the table ALREADY says is caught up (`cursor IS
// NULL`), confirmed RECENTLY, is skipped entirely on the bounded (manual
// press) path — it reports the same honest `caughtUp: true` without paying
// for a read that would almost certainly find nothing new.
describe("sweepKinds — the read cost itself, not just the stop", () => {
  beforeEach(() => {
    d1Query.mockClear()
    d1ExecScript.mockClear()
  })

  /** listIngestState's own SELECT, mocked to answer with real per-kind state —
   * every other test in this file leaves d1Query at its default `[]`, which
   * is what made sweepKind's now-removed duplicate `SELECT cursor` invisible:
   * an empty state row and a state read from listIngestState both look like
   * "never run" without a suite that gives each kind its own history. */
  function mockState(rows: { kind: string; cursor: string | null; last_run_at: string | null }[]) {
    d1Query.mockImplementation(async (..._args: unknown[]) => {
      const sql = _args[2] as string
      return sql.includes("FROM knowledge_ingest")
        ? rows.map((r) => ({ ...r, last_ok_at: r.last_run_at, last_error: null, runs: 1, sources_indexed: 0 }))
        : []
    })
  }

  it("never re-queries a kind's cursor once sweepKinds has already read it", async () => {
    mockState([{ kind: "kind0", cursor: "v1|2026-09-18T00:00:00.000Z|id1", last_run_at: null }])
    const only: IngestKind = { ...KINDS[0], read: vi.fn(async () => []) }
    await sweepKinds(env, cfg, guard, [only], 25)
    // Exactly one d1Query call — listIngestState's own SELECT. Before this
    // fix, sweepKind's duplicate `SELECT cursor FROM knowledge_ingest` made
    // this two, one per kind swept.
    const stateReads = d1Query.mock.calls.filter((c) => (c[2] as string).includes("FROM knowledge_ingest"))
    expect(stateReads).toHaveLength(1)
  })

  it("skips a kind's own read entirely when its last run was recent and caught up", async () => {
    const recentlyCaughtUp = new Date(Date.now() - 30_000).toISOString() // 30s ago
    mockState([{ kind: "kind0", cursor: null, last_run_at: recentlyCaughtUp }])
    const readSpy = vi.fn(async () => [])
    const only: IngestKind = { ...KINDS[0], read: readSpy }

    const [result] = await sweepKinds(env, cfg, guard, [only], 25, { budgetMs: 10_000 })

    expect(readSpy).not.toHaveBeenCalled()
    expect(result).toEqual({ kind: "kind0", read: 0, indexed: 0, caughtUp: true })
  })

  it("never skips a `rollup` kind, even recently caught up — its cursor:null is 'always re-walk', not 'nothing left'", async () => {
    const recentlyCaughtUp = new Date(Date.now() - 30_000).toISOString()
    mockState([{ kind: "kind0", cursor: null, last_run_at: recentlyCaughtUp }])
    const readSpy = vi.fn(async () => [])
    const only: IngestKind = { ...KINDS[0], rollup: true, read: readSpy }

    await sweepKinds(env, cfg, guard, [only], 25, { budgetMs: 10_000 })

    expect(readSpy).toHaveBeenCalled()
  })

  it("never skips a `windowed` kind, even recently caught up — same reasoning as rollup", async () => {
    const recentlyCaughtUp = new Date(Date.now() - 30_000).toISOString()
    mockState([{ kind: "kind0", cursor: null, last_run_at: recentlyCaughtUp }])
    const readSpy = vi.fn(async () => [])
    const only: IngestKind = { ...KINDS[0], windowed: true, read: readSpy }

    await sweepKinds(env, cfg, guard, [only], 25, { budgetMs: 10_000 })

    expect(readSpy).toHaveBeenCalled()
  })

  it("does NOT skip a kind whose last caught-up run is stale", async () => {
    const staleRun = new Date(Date.now() - 10 * 60_000).toISOString() // 10 minutes ago
    mockState([{ kind: "kind0", cursor: null, last_run_at: staleRun }])
    const readSpy = vi.fn(async () => [])
    const only: IngestKind = { ...KINDS[0], read: readSpy }

    await sweepKinds(env, cfg, guard, [only], 25, { budgetMs: 10_000 })

    expect(readSpy).toHaveBeenCalled()
  })

  it("does NOT skip a kind that is not actually caught up (cursor not null)", async () => {
    const recent = new Date(Date.now() - 5_000).toISOString()
    mockState([{ kind: "kind0", cursor: "v1|2026-09-18T00:00:00.000Z|id1", last_run_at: recent }])
    const readSpy = vi.fn(async () => [])
    const only: IngestKind = { ...KINDS[0], read: readSpy }

    await sweepKinds(env, cfg, guard, [only], 25, { budgetMs: 10_000 })

    expect(readSpy).toHaveBeenCalled()
  })

  it("the skip never applies to the unbounded call (no budgetMs) — the cron always re-confirms", async () => {
    const recentlyCaughtUp = new Date(Date.now() - 30_000).toISOString()
    mockState([{ kind: "kind0", cursor: null, last_run_at: recentlyCaughtUp }])
    const readSpy = vi.fn(async () => [])
    const only: IngestKind = { ...KINDS[0], read: readSpy }

    await sweepKinds(env, cfg, guard, [only], 25) // no opts at all — the cron's own shape

    expect(readSpy).toHaveBeenCalled()
  })
})
