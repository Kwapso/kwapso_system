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
import { canDefer, deferrerFor } from "@shared/workers/parallel"
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

// ── THE GUARANTEE ITSELF, not the speed ──────────────────────────────────────
//
// Everything above asks whether the caller stopped WAITING. This asks the
// question that actually matters and is far harder to see: does the work still
// HAPPEN? A deferred write that silently never runs looks exactly like one that
// ran — no error, no red suite, just a history row that is sometimes absent and
// a screen that is sometimes stale, on some requests, for no visible reason.
//
// The hole is real and this suite caught it: `afterResponse` is
// `waitUntil`-or-nothing (`contexts.get(request)?.waitUntil`), so a deferrer
// handed out where no context was ever registered runs the work with NOBODY
// awaiting it. For `afterResponse`'s original callers that is the documented
// best-effort contract. For these two seams — which were AWAITED before the
// deferral landed — it would be a silent downgrade from "guaranteed" to "if we
// are lucky". `deferrerFor` therefore reports absence rather than papering over
// it, and these three tests are what stop that regressing.
describe("the deferred work is guaranteed, not merely started", () => {
  it("offers no deferrer at all when no lifetime was registered", () => {
    // The honest answer, and the one that makes the seams fall back to awaiting.
    expect(deferrerFor(new Request("https://x/none"))).toBeUndefined()
  })

  it("offers one once a context is registered, and it reaches waitUntil", () => {
    const req = new Request("https://x/some")
    const held: Promise<unknown>[] = []
    canDefer(req, { waitUntil: (w) => void held.push(w) })
    const defer = deferrerFor(req)
    expect(defer, "a request with a lifetime gets a deferrer").toBeTypeOf("function")
    defer?.(Promise.resolve("done"))
    // THE GUARANTEE: the runtime is holding the request open for this work. If
    // this array is empty the work is running with nobody awaiting it, which is
    // the invisible failure this whole block exists for.
    expect(held.length, "the work was handed to the runtime, not dropped").toBe(1)
  })

  it("THE WHOLE PATH: a request with no lifetime still lands its ping", async () => {
    // The regression end to end, built exactly as a dispatcher builds it — the
    // scoped env carries whatever `deferrerFor` gives for THIS request, and this
    // request never had `canDefer` called on it (a cron tick, a direct call, a
    // suite invoking fetch with two arguments).
    //
    // Under the defect this suite caught, `deferrerFor` handed back a working
    // function anyway, `publishChange` took the deferred branch, and
    // `afterResponse`'s optional chain dropped the work on the floor — so this
    // returns with the hop still unstarted and NOTHING anywhere says so.
    const req = new Request("https://x/no-lifetime")
    let landed = false
    // A MACROTASK GATE, so this cannot pass by accident. `await` on a dropped
    // promise still drains the MICROtask queue, so a hop built out of resolved
    // promises finishes either way and the test proves nothing. A `setTimeout`
    // fires strictly after that queue drains: an awaiting caller reaches it, an
    // abandoning one has already moved on. Deterministic in both directions.
    const g = gate()
    setTimeout(() => g.open(), 0)
    const env = {
      REALTIME: {
        fetch: async () => {
          await g.opened
          landed = true
          return new Response("{}")
        },
      },
      DEFER: deferrerFor(req),
    }
    await publishChange(env as never, "team1", "help", "h1", "edit")
    expect(landed, "the ping completed before the caller moved on — not abandoned").toBe(true)
  })

  it("THE WHOLE PATH, the other seam: the history row is written, not abandoned", async () => {
    const req = new Request("https://x/no-lifetime-2")
    let landed = false
    const g = gate()
    setTimeout(() => g.open(), 0)
    vi.stubGlobal("fetch", async () => {
      await g.opened
      landed = true
      return new Response(JSON.stringify({ success: true, result: [{ results: [] }] }))
    })
    const cfg = { accountId: "a", apiToken: "t", defer: deferrerFor(req) } as unknown as D1Rest
    await logActivity(cfg, "db1", actor, {
      type: "Ticket edited",
      description: "x",
      relatedTable: "help",
      relatedRowId: "h1",
    })
    expect(landed, "the activity row was written before the caller moved on").toBe(true)
  })
})
