// CATCHUP RECORDS A LANE FAILURE CENTRALLY, NOT JUST ON ITS OWN ROW.
//
// Locks the fix for the gap error_log_review found (2026-09-10): of the three
// callers into the sweep engine — the 15-minute cron, the "sync now" button,
// and catchUp() — catchUp used to discard every kind's error, keeping only
// the summed indexed count (`results.reduce((n, r) => n + r.indexed, 0)`).
// catchUp is the one that runs in front of a live question, so a lane failing
// there left nothing anywhere but its own `knowledge_ingest` row: not
// error_logs, not the caller, not even the console — the purest form of a
// failure that could happen and leave no trace.

import { beforeEach, describe, expect, it, vi } from "vitest"

// vi.mock factories are hoisted above every import — including a plain
// top-level `const` — so the fakes they close over must be hoisted too.
// Explicit param/return types, not inferred from the throwing body below: a
// mock typed from what it does on ITS first call (throw => `never`) rejects a
// later `mockImplementation` that returns a real value, and an untyped no-arg
// mock reports `.mock.calls[0]` as an empty tuple.
const { recordWorkerError, d1Query } = vi.hoisted(() => ({
  recordWorkerError: vi.fn(
    async (
      _db: unknown,
      _source: string,
      _place: string,
      _e: unknown,
      _requestId?: string,
      _who?: { teamId?: string; userId?: string }
    ): Promise<void> => {}
  ),
  // Every kind's sweep opens with exactly this read (knowledge-ingest.ts's
  // sweepKind, its very first statement) — throwing here fails every kind at
  // once, the same shape a real credential or connectivity failure takes,
  // without needing a live D1 REST transport.
  d1Query: vi.fn(async (..._args: unknown[]): Promise<unknown[]> => {
    throw new Error("D1_ERROR: the door did not answer")
  }),
}))

vi.mock("@shared/workers/error-log", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/error-log")>()
  return { ...actual, recordWorkerError }
})

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  return {
    ...actual,
    d1Query,
    // recordRun (the per-kind row this fix does NOT replace) writes through
    // this — a no-op success so the sweep's own failure record still lands
    // without a live database.
    d1ExecScript: vi.fn(async () => ({})),
  }
})

import { catchUp } from "../src/lib/knowledge-ingest"
import type { Env } from "../src/env"
import type { MemberGuard } from "@shared/workers/gating"
import type { D1Rest } from "@shared/workers/d1-rest"

const guard: MemberGuard = { userId: "user_1", teamId: "team_1", roleId: "role_1", databaseId: "db_1" }
const cfg = {} as D1Rest
// A stand-in for the GLOBAL core binding — some kinds (e.g. "person") read it
// directly, alongside the per-team door `d1Query` fakes above. Answers every
// shape a D1 statement is chained into with an empty, successful result.
const fakeStatement = {
  bind: () => fakeStatement,
  run: async () => ({ meta: { changes: 0 } }),
  all: async () => ({ results: [] }),
  first: async () => null,
}
const env = { DB: { prepare: () => fakeStatement } } as unknown as Env

describe("catchUp records a lane failure centrally", () => {
  beforeEach(() => {
    recordWorkerError.mockClear()
    d1Query.mockReset()
    d1Query.mockImplementation(async () => {
      throw new Error("D1_ERROR: the door did not answer")
    })
  })

  it("calls recordWorkerError, once, naming the team, when every kind's sweep throws", async () => {
    const indexed = await catchUp(env, cfg, guard)

    // A question is still answerable — the whole point of "best-effort, always".
    expect(indexed).toBe(0)

    expect(recordWorkerError).toHaveBeenCalledTimes(1)
    const [db, source, place, err, requestId, who] = recordWorkerError.mock.calls[0]
    expect(db).toBe(env.DB)
    expect(source).toBe("content")
    expect(place).toBe(`knowledge/catchup (${guard.teamId})`)
    expect(requestId).toBeUndefined()
    expect(who).toEqual({ teamId: guard.teamId, userId: guard.userId })
    expect((err as Error).message).toMatch(/the door did not answer/)
  })

  it("never calls recordWorkerError when nothing fails", async () => {
    d1Query.mockImplementation(async () => [])
    const indexed = await catchUp(env, cfg, guard)
    expect(indexed).toBe(0)
    expect(recordWorkerError).not.toHaveBeenCalled()
  })

  it("batches every failed kind into ONE row, not one per kind", async () => {
    await catchUp(env, cfg, guard)
    expect(recordWorkerError).toHaveBeenCalledTimes(1)
    const [, , , err] = recordWorkerError.mock.calls[0]
    // More than one kind's name shows up in the one message — proof this is a
    // batch, not a per-kind write (the embed-gave-up precedent this follows).
    const message = (err as Error).message
    expect(message.split("; ").length).toBeGreaterThan(1)
  })
})
