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
