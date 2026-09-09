// THE TRANSIENT FAILURE IN A success:false COSTUME.
//
// Cloudflare's D1 REST door sometimes fails ITS OWN way: HTTP 200, success:false,
// error code 7500 "internal error; reference = …". The one data door (d1-rest.ts)
// had a retry loop for 5xx and network blips — and classified 7500 as "our
// request is wrong, fail loudly", so the retry never fired for exactly the
// failure it exists for. On 2026-08-17 the staging error store held 36 of these
// across nine different read doors, every one a single-shot blip that a retry
// would have absorbed.
//
// These tests pin the CLASSIFICATION, which is the part that regressed silently:
// what retries (7500, 5xx), what fails immediately (a real request error), and
// what names itself (a rejected key). Through a stubbed global fetch — the seam
// is the fetch loop, not the network.

import { afterEach, describe, expect, it, vi } from "vitest"

import { d1Query } from "@shared/workers/d1-rest"

const CFG = { accountId: "acct", apiToken: "tok" }

type Reply = { status: number; body: unknown }
function fetchScript(replies: Reply[]): { calls: () => number } {
  let i = 0
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      const r = replies[Math.min(i++, replies.length - 1)]
      return new Response(JSON.stringify(r.body), { status: r.status })
    })
  )
  return { calls: () => i }
}

const ok = { status: 200, body: { success: true, errors: [], result: [{ results: [{ n: 7 }] }] } }
const transient7500 = {
  status: 200,
  body: { success: false, errors: [{ code: 7500, message: "internal error; reference = abc123" }], result: null },
}

afterEach(() => vi.unstubAllGlobals())

describe("the D1 REST door's failure classification", () => {
  it("retries a 7500-in-a-200 and succeeds on the next attempt", async () => {
    const s = fetchScript([transient7500, ok])
    const rows = await d1Query<{ n: number }>(CFG, "db1", "SELECT 1")
    expect(rows).toEqual([{ n: 7 }])
    expect(s.calls(), "one blip, one retry — two calls").toBe(2)
  })

  it("gives up after the attempts are spent, with the real message", async () => {
    const s = fetchScript([transient7500])
    await expect(d1Query(CFG, "db1", "SELECT 1")).rejects.toThrow(/internal error; reference/)
    // 1 + RETRIES attempts — if this number changes, the constant moved, which
    // is a decision, not drift.
    expect(s.calls()).toBe(3)
  })

  it("a REAL request error still fails immediately — no retry can fix bad SQL", async () => {
    // The REAL shape, measured live 2026-08-17: D1 answers code 7500 for
    // everything, so the message is the only discriminator. This fixture is the
    // exact wire shape of a bad statement — if the classifier ever goes back to
    // matching the code, this retries and the call count goes red.
    const s = fetchScript([
      {
        status: 200,
        body: { success: false, errors: [{ code: 7500, message: "no such table: nope: SQLITE_ERROR" }], result: null },
      },
    ])
    await expect(d1Query(CFG, "db1", "SELECT * FROM nope")).rejects.toThrow(/no such table/)
    expect(s.calls(), "retrying a caller mistake just repeats it — one call").toBe(1)
  })

  it("a rejected key still names itself immediately (the 2026-08-14 lesson)", async () => {
    const s = fetchScript([
      { status: 401, body: { success: false, errors: [{ code: 10000, message: "Authentication error" }], result: null } },
    ])
    await expect(d1Query(CFG, "db1", "SELECT 1")).rejects.toThrow(/cloud_key_rejected/)
    expect(s.calls(), "a dead token must not be retried into slowness").toBe(1)
  })

  it("a plain 5xx still retries (the branch that always worked)", async () => {
    const s = fetchScript([{ status: 503, body: {} }, ok])
    const rows = await d1Query<{ n: number }>(CFG, "db1", "SELECT 1")
    expect(rows).toEqual([{ n: 7 }])
    expect(s.calls()).toBe(2)
  })
})

// A TIMEOUT AND AN UNREACHABLE DOOR ARE TWO FACTS, AND THE ROW HAS TO SAY WHICH.
//
// When the attempts are spent, `lastError` IS the diagnosis: it is what the
// central catch records and all anyone reading the error store gets. For a
// network failure it used to be the raw abort — "The operation was aborted due
// to timeout" — which names no door, no call and no deadline, and reads the same
// whether the far side was slow or gone. The 500 branch beside it has always
// said `Cloudflare D1 API 500 on /d1/database/…`.
describe("a network failure on the D1 REST door names itself", () => {
  /** Every attempt rejects the way `AbortSignal.timeout` does — a DOMException
   * whose `name` is TimeoutError, which is the only thing separating the two
   * cases at the catch. */
  function fetchRejects(err: Error): { calls: () => number } {
    let i = 0
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        i++
        throw err
      })
    )
    return { calls: () => i }
  }

  it("a hung socket says it timed out, names the call and quotes the deadline", async () => {
    const timeout = Object.assign(new Error("The operation was aborted due to timeout"), {
      name: "TimeoutError",
    })
    const s = fetchRejects(timeout)
    await expect(d1Query(CFG, "db1", "SELECT 1")).rejects.toThrow(
      /Cloudflare D1 API did not answer within \d+ms on \/d1\/database\/db1\/query \(R11 deadline, attempt 3 of 3\)/
    )
    expect(s.calls(), "a hung socket is a blip: every attempt is spent on it").toBe(3)
  })

  it("an unreachable door says THAT instead, in different words, and still names the call", async () => {
    const s = fetchRejects(new TypeError("Network connection lost."))
    const thrown = (await d1Query(CFG, "db1", "SELECT 1").catch((e: Error) => e)) as Error
    expect(thrown.message).toMatch(/^Cloudflare D1 API could not be reached on \/d1\/database\/db1\/query \(attempt 3 of 3\)/)
    expect(thrown.message, "the far side's own words are kept").toMatch(/Network connection lost\./)
    expect(thrown.message, "and it must not claim a deadline it never hit").not.toMatch(/did not answer within/)
    expect(s.calls()).toBe(3)
  })
})
