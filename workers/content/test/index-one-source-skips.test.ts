// ONE SOURCE'S FAILURE IS ONE SOURCE'S — and this one is not about Google.
//
// THE OWNER, 9 Sep 2026, on the Gmail fix: "doesn't this mean that any data
// source that fails to sync… Have you made sure this 'if sync fails, then skip
// and continue' rule works for ALL sources, including the manual ones that I
// upload through the app interface itself?"
//
// It did not. The Gmail fix was about READING FROM GOOGLE, so it reached four
// lanes. `indexSource` is the step EVERY source goes through — a ticket, a
// story, a meeting, a process, and every file a person uploads by hand — and it
// was awaited at three points in the sweep's per-row loop and four in the doors
// with no catch anywhere. So anything it threw for ONE document (a Vectorize
// upsert refused, a D1 write that would not take that row, a sub-request budget
// reached on an awkward file) escaped the loop, escaped `sweepKind`, and was
// recorded by `sweepKinds` as the failure of the WHOLE KIND. Every source after
// it in that tick was never reached and the pass was discarded.
//
// It stayed invisible because `embed()` catches its OWN model failures, so the
// common case was handled and the loop LOOKED protected. It was protected
// against exactly one thing.
//
// THE LINE THIS SUITE REALLY DRAWS is the one between "this document is
// awkward" and "the database is gone". The repair write inside the catch is
// deliberately NOT wrapped: when D1 itself is unreachable the recording cannot
// happen either, that throw propagates, and the lane fails loudly — which is
// right, and needs no list of error codes to get right.

import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({
  /** sourceId → what `indexSource` throws for it, when it throws at all. */
  fails: new Map<string, Error>(),
  /** every id `indexSource` was called with, in order. */
  seen: [] as string[],
  /** every UPDATE the repair path wrote, as [sql, params]. */
  writes: [] as { sql: string; params: unknown[] }[],
  /** when set, every d1Query throws it — the database-is-gone case. */
  dbDown: null as Error | null,
}))

vi.mock("../src/lib/knowledge-vectors", () => ({
  upsertVectors: async () => 0,
  clearVectors: async () => {},
  hasVectorStore: () => false,
  searchVectors: async () => [],
}))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  return {
    ...actual,
    d1Query: async (_cfg: unknown, _db: string, sql: string, params: unknown[] = []) => {
      if (holder.dbDown) throw holder.dbDown
      // THE INJECTION POINT, and deliberately the REAL `indexSource` around it.
      // Its first act is to read the row; making that read throw for one id is
      // exactly what a refused write or an exhausted sub-request budget looks
      // like from this function's point of view, and it exercises the actual
      // code path rather than a stand-in for it.
      const id = String(params[params.length - 1] ?? "")
      const fail = /^SELECT id, kind/.test(sql.trim()) ? holder.fails.get(id) : undefined
      if (fail) {
        holder.seen.push(id)
        throw fail
      }
      holder.writes.push({ sql, params })
      // No row: `indexSource` returns early, which is the clean path here.
      return []
    },
    d1ExecScript: async () => {
      if (holder.dbDown) throw holder.dbDown
      return []
    },
  }
})

const { indexOneSource } = await import("../src/lib/knowledge")

const env = {} as never
const cfg = {} as never
const guard = { databaseId: "db", teamId: "t", userId: "u" } as never

beforeEach(() => {
  holder.fails.clear()
  holder.seen.length = 0
  holder.writes.length = 0
  holder.dbDown = null
})

describe("indexOneSource — one document's failure is one document's", () => {
  it("does not throw when a single source cannot be indexed", async () => {
    holder.fails.set("awkward", new Error("Vectorize refused that upsert"))
    // The regression, in one line. This THREW, and the throw took the whole
    // kind's tick with it — every source after it in the same pass.
    await expect(indexOneSource(env, cfg, guard, "awkward")).resolves.toBe(false)
  })

  it("says on the ROW what went wrong, so the failure is not merely swallowed", async () => {
    holder.fails.set("awkward", new Error("Vectorize refused that upsert"))
    await indexOneSource(env, cfg, guard, "awkward")

    const repair = holder.writes.find((w) => w.sql.includes("index_error"))
    expect(repair, "the failure must be recorded on the source itself").toBeDefined()
    expect(repair?.params[0]).toContain("Vectorize refused that upsert")
    expect(repair?.params[1]).toBe("awkward")
    // Blanked so the next sweep RE-READS it rather than skipping it as
    // unchanged, and counted so `EMBED_ATTEMPT_CAP` can eventually give up on a
    // source that fails every single time.
    expect(repair?.sql).toContain("content_hash = NULL")
    expect(repair?.sql).toContain("embed_attempts = embed_attempts + 1")
  })

  it("reports success for a source that indexed, so the tick's count stays true", async () => {
    await expect(indexOneSource(env, cfg, guard, "fine")).resolves.toBe(true)
    expect(holder.writes.some((w) => w.sql.includes("index_error"))).toBe(false)
  })

  it("STILL fails loudly when the database itself is gone", async () => {
    // The line that matters. If this were swallowed too, a team database that
    // had fallen over would present as a sweep quietly indexing nothing, with a
    // clean timestamp to say so — which is the failure the Google fix's own
    // comments spend a paragraph warning about, one layer down.
    holder.fails.set("awkward", new Error("boom"))
    holder.dbDown = new Error("D1 unreachable")
    await expect(indexOneSource(env, cfg, guard, "awkward")).rejects.toThrow("D1 unreachable")
  })
})
