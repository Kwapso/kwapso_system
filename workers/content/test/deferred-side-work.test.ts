// THE TWO SEAMS THAT STOPPED HOLDING THE RESPONSE — R1's ping and the audit row.
//
// Until 6 September 2026 every mutation in the app awaited `logActivity` (one
// team-database trip, measured ~150ms) and `publishChange` (a Durable Object
// hop, ceiling two seconds) before the person who clicked Save was told
// anything. `shared/workers/parallel.ts` had excluded both deliberately, because
// `shared/workers/realtime.ts` carried a recorded decision — "THE PING MUST NOT
// OUTLIVE THE WRITE IT DESCRIBES" — and re-reading a recorded decision belongs
// to the owner. The owner has now re-read it: say "saved" straight away, finish
// the history entry a moment later.
//
// WHAT HAS TO STAY TRUE FOR THAT TO BE SAFE, and it is what this file checks —
// because "it is faster" is easy to see and "nothing was dropped" is not:
//
//   • The work still HAPPENS. This is deferral through `ctx.waitUntil`, which
//     guarantees completion; it is not fire-and-forget. A ping that merely
//     stopped being awaited would be the live layer silently failing, which is
//     the one thing the live layer exists to prevent.
//   • The work still starts NOW. The outbound request must leave at the instant
//     it left before — only the awaiting moves. A colleague's screen is behind
//     by the hop, not by the handler.
//   • A FAILURE IS STILL RECORDED. Deferring must not cost either seam its
//     durable row (`error_logs`), or the two best-effort hops in the system
//     become the two with no evidence.
//   • A caller with NO deferrer still awaits. Crons, libs called directly and
//     every suite that hands `fetch` two arguments must behave exactly as they
//     did, or the change is a behaviour change in disguise.

import { afterEach, describe, expect, it, vi } from "vitest"
import { logActivity } from "@shared/workers/activity"
import { publishChange } from "@shared/workers/realtime"
import type { D1Rest } from "@shared/workers/d1-rest"

/** A deferrer that collects, so a test can assert both halves: that the caller
 * did NOT wait, and that the work nevertheless finished. */
function collector() {
  const pending: Promise<unknown>[] = []
  return {
    defer: (work: Promise<unknown>) => void pending.push(work),
    settle: () => Promise.all(pending),
    get count() {
      return pending.length
    },
  }
}

/** A promise somebody else decides when to resolve — how "did the caller wait?"
 * is asked without a timer, which would make this test a race. */
function gate() {
  let open!: () => void
  const opened = new Promise<void>((r) => (open = r))
  return { opened, open }
}

const actor = { id: "u1", email: "a@b.c", name: "A" }

afterEach(() => vi.unstubAllGlobals())

describe("publishChange", () => {
  it("hands the hop to the deferrer and returns without waiting for it", async () => {
    const g = gate()
    let fetched = false
    const c = collector()
    const env = {
      REALTIME: {
        fetch: async () => {
          fetched = true
          await g.opened
          return new Response("{}")
        },
      },
      DEFER: c.defer,
    }

    // The gate is still shut, so a version that awaited the hop cannot get here.
    await publishChange(env as never, "team1", "help", "h1", "edit")

    expect(c.count, "the hop was handed to the deferrer").toBe(1)
    expect(fetched, "and it LEFT immediately — deferral moves the await, not the send").toBe(true)

    g.open()
    await c.settle()
  })

  it("still awaits the hop when nothing offers a lifetime (crons, tests, libs)", async () => {
    const g = gate()
    let done = false
    const env = {
      REALTIME: {
        fetch: async () => {
          await g.opened
          done = true
          return new Response("{}")
        },
      },
    }
    const call = publishChange(env as never, "team1", "help", "h1", "edit")
    let settled = false
    void call.then(() => (settled = true))
    await Promise.resolve()
    expect(settled, "with no DEFER the caller is still waiting").toBe(false)
    g.open()
    await call
    expect(done).toBe(true)
  })

  it("records a failed hop even when it was deferred", async () => {
    const rows: { source: string; message: string }[] = []
    const c = collector()
    const env = {
      REALTIME: { fetch: async () => new Response("no", { status: 500 }) },
      DEFER: c.defer,
      DB: {
        prepare: () => ({
          bind: (...args: unknown[]) => ({
            run: async () => {
              rows.push({ source: String(args[2]), message: String(args[4]) })
            },
          }),
        }),
      },
    }
    await publishChange(env as never, "team1", "help", "h1", "edit")
    await c.settle()
    expect(rows.length, "a deferred failure still leaves a durable row").toBe(1)
    expect(rows[0].source).toBe("realtime-publish")
    expect(rows[0].message).toContain("500")
  })
})

describe("logActivity", () => {
  const entry = { type: "Ticket edited", description: "x", relatedTable: "help", relatedRowId: "h1" }

  it("hands the write to the deferrer and returns without waiting for it", async () => {
    const g = gate()
    let started = false
    const c = collector()
    // `d1Query` speaks to the REST door through the GLOBAL fetch, so that is
    // where "did the statement leave?" has to be observed.
    vi.stubGlobal("fetch", async () => {
      started = true
      await g.opened
      return new Response(JSON.stringify({ success: true, result: [{ results: [] }] }))
    })
    const cfg = { accountId: "a", apiToken: "t", defer: c.defer } as unknown as D1Rest

    await logActivity(cfg, "db1", actor, entry)

    expect(c.count, "the row was handed to the deferrer").toBe(1)
    expect(started, "and the statement LEFT immediately").toBe(true)
    g.open()
    await c.settle()
  })

  it("still awaits the write when nothing offers a lifetime", async () => {
    const g = gate()
    vi.stubGlobal("fetch", async () => {
      await g.opened
      return new Response(JSON.stringify({ success: true, result: [{ results: [] }] }))
    })
    const cfg = { accountId: "a", apiToken: "t" } as unknown as D1Rest
    const call = logActivity(cfg, "db1", actor, entry)
    let settled = false
    void call.then(() => (settled = true))
    await Promise.resolve()
    expect(settled, "with no cfg.defer the caller is still waiting").toBe(false)
    g.open()
    await call
  })

  it("never throws at the caller, deferred or not — the swallow is the contract", async () => {
    const c = collector()
    vi.stubGlobal("fetch", async () => {
      throw new Error("database down")
    })
    const cfg = { accountId: "a", apiToken: "t", defer: c.defer } as unknown as D1Rest
    await expect(logActivity(cfg, "db1", actor, entry)).resolves.toBeUndefined()
    await expect(c.settle()).resolves.toBeDefined()
  })
})
