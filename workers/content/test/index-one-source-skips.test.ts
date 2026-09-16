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
  /** every call `indexOneSource`'s catch made to the one error seam
   * (BUILD-5 §D). */
  recorded: [] as { source: string; place: string; message: string; teamId?: string; userId?: string }[],
}))

vi.mock("../src/lib/knowledge-vectors", () => ({
  upsertVectors: async () => 0,
  clearVectors: async () => {},
  hasVectorStore: () => false,
  searchVectors: async () => [],
}))

// BUILD-5 §D (16 Sep 2026) — THE ONE ERROR SEAM, forced and observed. `env` in
// this suite is `{}` (indexOneSource's own contract is never to touch it
// beyond passing it through to `indexSource`), so the real `recordWorkerError`
// would throw on `env.DB.prepare` the moment it ran — this mock is what lets
// the suite prove the seam is CALLED without also having to stand up a core
// database double just to watch one function get invoked.
vi.mock("@shared/workers/error-log", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/error-log")>()
  return {
    ...actual,
    recordWorkerError: async (
      _db: unknown,
      source: string,
      place: string,
      e: unknown,
      _requestId?: string,
      who?: { teamId?: string; userId?: string }
    ) => {
      holder.recorded.push({
        source,
        place,
        message: e instanceof Error ? e.message : String(e),
        teamId: who?.teamId,
        userId: who?.userId,
      })
    },
  }
})

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

const { indexOneSource, isVectorizeRateLimited } = await import("../src/lib/knowledge")

const env = {} as never
const cfg = {} as never
const guard = { databaseId: "db", teamId: "t", userId: "u" } as never

beforeEach(() => {
  holder.fails.clear()
  holder.seen.length = 0
  holder.writes.length = 0
  holder.dbDown = null
  holder.recorded.length = 0
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
    expect(holder.recorded).toEqual([])
  })

  // BUILD-5 §D (16 Sep 2026) — FORCED FAILURE, WATCHED THROUGH THE SEAM. The
  // row's own `index_error` column was already covered above; this is the
  // other half, that the SAME failure also reaches `recordWorkerError` —
  // which is what makes it show up in the 90-day store and, through
  // `unhealthySourceSample`, the morning digest's own line naming it. A
  // failure recorded on the row alone but never through the seam is exactly
  // the gap this lane closed: a column nobody was watching.
  it("sends a forced failure through the one error seam, naming the source", async () => {
    holder.fails.set("awkward", new Error("Vectorize refused that upsert"))
    await indexOneSource(env, cfg, guard, "awkward")
    expect(holder.recorded).toHaveLength(1)
    const [row] = holder.recorded
    expect(row.source).toBe("content")
    expect(row.place).toContain("awkward")
    expect(row.message).toBe("Vectorize refused that upsert")
    expect(row.teamId).toBe("t")
    expect(row.userId).toBe("u")
  })

  it("still records through the seam when Vectorize itself was rate-limited — the row is real either way", async () => {
    holder.fails.set("busy", new Error("VECTOR_UPSERT_ERROR (code = 40041): Too Many Requests"))
    await indexOneSource(env, cfg, guard, "busy")
    expect(holder.recorded).toHaveLength(1)
    expect(holder.recorded[0].place).toContain("busy")
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

  // MIGRATION 0082 — "TOO MANY REQUESTS" MUST NOT SPEND THE GIVE-UP BUDGET.
  // Measured on staging: 38 sources, one Vectorize rate-limit burst during
  // the mass rebuild, none of them a document the model actually refused.
  // The cap exists to stop paying for text that will never embed; a burst
  // is a fact about Cloudflare at that instant, and counting it toward the
  // same budget means five unlucky seconds can permanently give up on a
  // source that was never asked a question it couldn't answer.
  it("does NOT bump embed_attempts when Vectorize itself was rate-limited", async () => {
    holder.fails.set("busy", new Error("VECTOR_UPSERT_ERROR (code = 40041): Too Many Requests"))
    await indexOneSource(env, cfg, guard, "busy")
    const repair = holder.writes.find((w) => w.sql.includes("index_error"))
    expect(repair, "the failure must still be recorded on the row").toBeDefined()
    expect(repair?.sql).toContain("content_hash = NULL")
    // The error is still written and the hash is still blanked (so the next
    // sweep re-reads it) — only the ATTEMPT COUNTER is spared.
    expect(repair?.sql).not.toContain("embed_attempts + 1")
    expect(repair?.sql).toContain("embed_attempts")
  })

  it("still bumps embed_attempts for a failure that is NOT a rate limit", async () => {
    holder.fails.set("awkward", new Error("Vectorize refused that upsert"))
    await indexOneSource(env, cfg, guard, "awkward")
    const repair = holder.writes.find((w) => w.sql.includes("index_error"))
    expect(repair?.sql).toContain("embed_attempts = embed_attempts + 1")
  })

  describe("isVectorizeRateLimited — narrow on purpose", () => {
    it("recognises both error shapes actually seen on staging", () => {
      expect(isVectorizeRateLimited(new Error("VECTOR_UPSERT_ERROR (code = 40041): Too Many Requests"))).toBe(true)
      expect(isVectorizeRateLimited(new Error("VECTOR_DELETE_ERROR (code = 40041): Too Many Requests"))).toBe(true)
    })

    it("does not recognise an unrelated Vectorize failure, even a rate-limit-shaped one for a different code", () => {
      // 40007/40006 are real Vectorize codes too (too many ids/vectors in one
      // payload, `knowledge-vectors.ts`'s own DELETE_BATCH/UPSERT_BATCH
      // comments) — a real defect in THIS app's own batching, never a
      // reason to spare the give-up counter.
      expect(isVectorizeRateLimited(new Error("VECTOR_DELETE_ERROR (code = 40007): too many ids in payload"))).toBe(
        false
      )
      expect(isVectorizeRateLimited(new Error("some other Vectorize failure"))).toBe(false)
      expect(isVectorizeRateLimited(new Error("model unavailable"))).toBe(false)
    })

    it("reads a non-Error throw the same way indexOneSource's own catch does", () => {
      expect(isVectorizeRateLimited("Too Many Requests")).toBe(true)
      expect(isVectorizeRateLimited("boom")).toBe(false)
    })
  })
})
