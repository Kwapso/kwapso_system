// THE REVISIT PASS — what a forward-only cursor cannot do on its own.
//
// `knowledge-ingest.ts`'s `sweepKind` sets `last = {at, id}` immediately after
// a row's upsert, before the retired/deactivated/hash-skip/cap branches run —
// success or failure. So a row whose indexing throws is never read again by
// the ordinary tick, at ANY `embed_attempts` value, unless its own text
// changes. Measured on staging, 11 Sep 2026: 38 sources from one Vectorize
// rate-limit burst during the mass rebuild, permanently stuck this way.
//
// THE TEST THAT MATTERS is not "the revisit pass runs" — it is that a source
// orphaned by a REAL mid-sweep throw, via the REAL sweep engine, is picked up
// again by a LATER, SEPARATE pass. Calls `sweepAll` directly rather than the
// `POST /sync` door on purpose: that door now runs the revisit pass in the
// SAME request as the ordinary sweep (a person pressing the button gets the
// honest, immediately-healed answer), which would make "an ordinary tick"
// and "a later revisit" impossible to tell apart from outside it. Found by
// building this test the first way and getting a fully healthy source out of
// what was supposed to be a broken one — the revisit pass really was that
// fast, and the test needed to separate the two calls to prove anything
// about either one alone.

import type { DatabaseSync } from "node:sqlite"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import { fakeVectorize } from "./fake-vectorize"
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"
import { sweepAll } from "../src/lib/knowledge-ingest"
import { revisitUnhealthySources, unhealthySourceCount } from "../src/lib/knowledge"
import type { MemberGuard } from "@shared/workers/gating"

const guard: MemberGuard = { userId: IDS.staffUser, teamId: IDS.team, roleId: IDS.adminRole, databaseId: "db" }
const cfg = {} as never

const db = () => holder.db as DatabaseSync

/** A vector index that throws Vectorize's own rate-limit shape for the first
 * TWO writes, then behaves normally for ever after — exactly as Cloudflare
 * recovers once a burst passes. TWO, not one: `upsertVectors`
 * (knowledge-vectors.ts) already wraps every call in `twice()`, an immediate
 * retry with no backoff, which is exactly enough to absorb a single isolated
 * blip on its own. A real sustained burst survives that retry; a one-off
 * failure never reaches `indexOneSource`'s catch at all — the first version
 * of this test injected only one failure and got a fully healthy source out
 * of it, silently, via the retry nobody was thinking about. */
function burstyVectorize() {
  const real = fakeVectorize()
  let remaining = 2
  return {
    binding: {
      ...real.binding,
      async upsert(rows: Parameters<typeof real.binding.upsert>[0]) {
        if (remaining > 0) {
          remaining--
          throw new Error("VECTOR_UPSERT_ERROR (code = 40041): Too Many Requests")
        }
        return real.binding.upsert(rows)
      },
    },
  }
}

function env(userId: string, vectorIndex: ReturnType<typeof burstyVectorize>) {
  const base = makeEnv(() => db(), userId) as unknown as Record<string, unknown>
  return {
    ...base,
    INTERNAL_KEY: "k",
    KNOWLEDGE_INDEX: vectorIndex.binding,
    KNOWLEDGE_MIN_SCORE: "0.35",
    AI: { run: async (_m: string, i: { text: string[] }) => ({ data: i.text.map(() => [1, 0, 0]) }) },
    REALTIME: { fetch: async () => new Response("{}") },
  } as never
}

const ticketSource = ():
  | { id: string; index_error: string | null; embed_attempts: number; chunk_count: number; indexed_chunks: number }
  | undefined =>
  db()
    .prepare(
      "SELECT id, index_error, embed_attempts, chunk_count, indexed_chunks FROM knowledge_sources WHERE origin_table = 'help' AND origin_row_id = ?"
    )
    .get(IDS.victimTicket) as never

beforeEach(() => {
  holder.db = buildSpineDb()
})

describe("a source orphaned by a mid-sweep throw is picked up again on a later, separate pass", () => {
  it("the ordinary sweep files the error and moves the cursor past it; a SECOND ordinary sweep never revisits it; only the revisit pass does", async () => {
    const vectorIndex = burstyVectorize()

    // TICK 1 — the burst, via the real sweep engine. It reads the fixture's
    // own help ticket, chunks it, and the Vectorize calls throw (both of
    // `twice()`'s own attempts). The row is left with an error, and
    // `sweepKind`'s cursor has already moved past it in this same call.
    await sweepAll(env(IDS.staffUser, vectorIndex), cfg, guard)
    const afterBurst = ticketSource()
    expect(afterBurst, "the ticket must have become a knowledge source").toBeTruthy()
    expect(afterBurst!.index_error, "the burst must be recorded on the row").toContain("Too Many Requests")

    // THE RATE-LIMIT MUST NOT HAVE COUNTED toward the give-up budget — a 429
    // is a fact about Cloudflare at that instant, not about this ticket.
    expect(afterBurst!.embed_attempts, "a rate-limited attempt must not spend the give-up budget").toBe(0)

    // TICK 2 — the regression, proved directly. An ORDINARY sweep, run
    // again on its own, Vectorize now healthy (the burst already spent both
    // its injected failures): the forward-only cursor has already passed
    // this row, so nothing about it may change. This is the bug
    // `revisitUnhealthySources` exists to fix — asserted here BEFORE it
    // ever runs, so the fix is proved against a real orphan, not assumed.
    await sweepAll(env(IDS.staffUser, vectorIndex), cfg, guard)
    const stillOrphaned = ticketSource()
    expect(stillOrphaned!.index_error, "a second ordinary sweep must not revisit an orphaned row").toContain(
      "Too Many Requests"
    )
    expect(stillOrphaned!.indexed_chunks, "still unrepaired by the ordinary sweep").toBeLessThan(
      stillOrphaned!.chunk_count || 1
    )

    // THE REVISIT PASS finds it — a separate call, exactly as it would run
    // on the next cron tick or the next press of "bring it up to date".
    // Vectorize is fully healthy now, so this succeeds and clears the error.
    const revisit = await revisitUnhealthySources(env(IDS.staffUser, vectorIndex), cfg, guard)
    expect(revisit.revisited, "the orphan must be a candidate for revisit").toBeGreaterThan(0)
    expect(revisit.recovered, "the orphan must actually succeed once retried").toBeGreaterThan(0)

    const recovered = ticketSource()
    expect(recovered!.index_error, "a successful revisit clears the error").toBeNull()
    expect(recovered!.indexed_chunks).toBe(recovered!.chunk_count)
    expect(await unhealthySourceCount(cfg, guard), "nothing genuinely broken should remain").toBe(0)
  })

  it("MUTATION-PROVED: without a revisit pass, the orphan survives any number of ordinary sweeps", async () => {
    const vectorIndex = burstyVectorize()
    await sweepAll(env(IDS.staffUser, vectorIndex), cfg, guard) // the burst
    for (let i = 0; i < 5; i++) await sweepAll(env(IDS.staffUser, vectorIndex), cfg, guard) // ordinary sweeps only
    const stillBroken = ticketSource()
    expect(stillBroken!.index_error, "five more ordinary ticks must not have touched it").toContain(
      "Too Many Requests"
    )
  })

  it("a stale error on an already-fully-embedded row is cleared with no Vectorize call at all", async () => {
    // THE OTHER 34 — a row that FINISHED (chunks and vectors both complete)
    // but still carries an error string from an earlier attempt on the same
    // execution (see `UNHEALTHY_INDEX_SQL`'s own header for why that shape
    // is possible). Constructed directly rather than through a second burst
    // scenario, since the fact under test is narrow: `revisitUnhealthySources`
    // must not spend a Vectorize call clearing a row that has nothing left
    // to write.
    holder.db = buildSpineDb()
    const vectorIndex = burstyVectorize()
    await sweepAll(env(IDS.staffUser, vectorIndex), cfg, guard)
    const before = ticketSource()!
    // Hand-set: fully embedded already, exactly as a row that failed AFTER
    // its own chunk work landed would look (`clearIndex`'s DELETE-before-
    // chunk-count-write ordering is the real mechanism; this pins the
    // resulting SHAPE without re-deriving the whole failure sequence).
    db()
      .prepare("UPDATE knowledge_sources SET index_error = 'stale', indexed_chunks = chunk_count WHERE id = ?")
      .run(before.id)
    let calls = 0
    const countingIndex = { binding: { ...vectorIndex.binding, upsert: async (r: never) => { calls++; return vectorIndex.binding.upsert(r) } } }
    const revisit = await revisitUnhealthySources(env(IDS.staffUser, countingIndex as never), cfg, guard)
    expect(revisit.cleared, "the fully-embedded row must be cleared").toBeGreaterThan(0)
    expect(calls, "clearing a stale error on a complete row must cost no Vectorize call").toBe(0)
    expect(ticketSource()!.index_error).toBeNull()
  })
})
