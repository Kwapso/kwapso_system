// THE MAINTENANCE DOORS HAVE A SPEED LIMIT, AND A GUESS LEAVES A ROW.
//
// `/api/tenancy/*` and `/api/data-ops/*` are forwarded BY PREFIX, which publishes
// the eight `x-admin-key` doors to the public internet — the doors that roll DDL
// across every team database, seed tenants, relocate a module, and read the whole
// cross-tenant error log with its stack traces. `adminGuard` was the entire gate:
// two lines, no throttle, no lockout, and no record that anybody had ever tried.
// The key could be guessed at whatever rate Cloudflare allows, for ever, and the
// only thing bounding the damage was a secret the code cannot inspect.
//
// The owner chose a speed limit and a record over moving the doors to their own
// hostname (16 scripts and 10 documents call them at the public address).
//
// WHAT THIS FILE HOLDS, and each is a separate way the fix could rot:
//   1. an admin path over budget is refused BEFORE the worker behind it is
//      reached — every binding records whether it was called, so "refused" means
//      "the door was never opened" rather than "we liked the status code";
//   2. an ordinary path is never throttled, whatever the limiter says, so the
//      throttle cannot quietly become a ceiling on the whole app;
//   3. the refusal is RECORDED, with the address in it;
//   4. an absent limiter is today's behaviour exactly (fail open), because the
//      binding lands in a deploy after the code that reads it;
//   5. a caller sending no address lands in a bucket rather than walking past
//      the counter.

import { describe, expect, it, vi } from "vitest"

import worker from "../src/index"

/** The workers behind the gateway, each RECORDING whether it was reached.
 *
 * It records rather than throws, and that is worth a line: a throwing stub reads
 * like a stronger canary, but the gateway's own top-level catch turns a throw
 * into a 500 through `recordGatewayCrash` — so the throw never surfaces and the
 * assertion measures the crash handler instead of the throttle. Recording asks
 * the question directly: WAS the door opened? A refusal that opened it is a
 * failure whatever status came back. */
const reached: string[] = []
const behind = (name: string) => ({
  fetch: async () => {
    reached.push(name)
    return new Response(`${name} answered`, { status: 200 })
  },
})

type Recorded = { url: string; body: Record<string, unknown> }

/** An env whose limiter answers `success`, and whose AUTH binding records what
 * the gateway posted to the internal error pipe instead of forwarding it. */
function env(success: boolean, opts: { limiter?: boolean; throws?: boolean } = {}) {
  reached.length = 0
  const recorded: Recorded[] = []
  const limiter = opts.throws
    ? { limit: async () => { throw new Error("limiter unwell") } }
    : { limit: async () => ({ success }) }
  return {
    recorded,
    env: {
      ASSETS: behind("ASSETS"),
      AUTH: {
        fetch: async (url: string, init?: { body?: string }) => {
          recorded.push({ url, body: JSON.parse(init?.body ?? "{}") })
          return new Response(null, { status: 204 })
        },
      },
      TENANCY: behind("TENANCY"),
      DATAOPS: behind("DATAOPS"),
      CONTENT: behind("CONTENT"),
      REALTIME: behind("REALTIME"),
      MCP: behind("MCP"),
      INTERNAL_KEY: "k",
      ...(opts.limiter === false ? {} : { MAINTENANCE_LIMIT: limiter }),
    } as never,
  }
}

const post = (path: string, headers: Record<string, string> = {}) =>
  new Request(`https://agency.kwapso.app${path}`, { method: "POST", headers })

describe("the maintenance doors are throttled at the door that publishes them", () => {
  it("refuses an over-budget admin call WITHOUT reaching the worker behind it", async () => {
    const { env: e } = env(false)
    const res = await worker.fetch(post("/api/tenancy/admin/migrate-teams"), e)
    expect(res.status).toBe(429)
    expect(await res.json()).toMatchObject({ error: "too_many_requests" })
    expect(reached, "the worker behind the door must never have been called").toEqual([])
  })

  it("covers data-ops's admin doors too, not just tenancy's", async () => {
    const { env: e } = env(false)
    expect((await worker.fetch(post("/api/data-ops/admin/grant-credits"), e)).status).toBe(429)
    expect(reached).toEqual([])
  })

  it("writes the refusal down, with the address in it", async () => {
    const { env: e, recorded } = env(false)
    await worker.fetch(post("/api/tenancy/admin/db-sizes", { "CF-Connecting-IP": "203.0.113.9" }), e)
    const row = recorded.find((r) => r.url.includes("/internal/log-error"))
    expect(row, "a throttled maintenance call must leave a row").toBeDefined()
    expect(row!.body.message).toContain("203.0.113.9")
    // The row has to tell whoever reads it what to DO — a row that only says
    // "throttled" is a row nobody acts on.
    expect(String(row!.body.message)).toMatch(/rotate ADMIN_KEY/i)
    expect(row!.body.place).toBe("POST /api/tenancy/admin/db-sizes")
  })

  it("a caller sending no address is bucketed, never waved through", async () => {
    const { env: e, recorded } = env(false)
    const res = await worker.fetch(post("/api/tenancy/admin/db-sizes"), e)
    expect(res.status, "an absent CF-Connecting-IP must not skip the counter").toBe(429)
    expect(recorded[0]!.body.message).toContain("unknown")
  })

  it("lets an admin call through when it is inside its budget", async () => {
    const { env: e } = env(true)
    // Reaching TENANCY is the PROOF the throttle stood aside.
    const res = await worker.fetch(post("/api/tenancy/admin/db-sizes"), e)
    expect(res.status).toBe(200)
    expect(reached).toEqual(["TENANCY"])
  })

  it("never throttles an ordinary door, whatever the limiter says", async () => {
    const { env: e } = env(false)
    // Same limiter, answering "over budget" — an ordinary path must not consult
    // it at all, or the maintenance throttle becomes a ceiling on the whole app.
    expect((await worker.fetch(post("/api/tenancy/accounts"), e)).status).toBe(200)
    expect((await worker.fetch(post("/api/content/help"), e)).status).toBe(200)
    expect(reached).toEqual(["TENANCY", "CONTENT"])
  })

  it("fails OPEN when the binding is absent — a deploy lands before its binding", async () => {
    const { env: e } = env(false, { limiter: false })
    expect((await worker.fetch(post("/api/tenancy/admin/db-sizes"), e)).status).toBe(200)
    expect(reached).toEqual(["TENANCY"])
  })

  it("fails OPEN when the limiter is unwell — a broken valve is not an outage", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const { env: e } = env(false, { throws: true })
    expect((await worker.fetch(post("/api/tenancy/admin/db-sizes"), e)).status).toBe(200)
    expect(reached).toEqual(["TENANCY"])
    expect(spy, "…and says so, rather than failing open in silence").toHaveBeenCalled()
    spy.mockRestore()
  })

  it("…and the fail-open is RECORDED, not only printed", async () => {
    // The sixth way the fix could rot, and the quietest. A limiter that has
    // fallen over changes nothing anybody can see: every maintenance call
    // succeeds, nothing 500s, and the only difference is that the speed limit on
    // a guessable key is off. A console line expires in a week and nobody reads
    // a week in which nothing went wrong.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const { env: e, recorded } = env(false, { throws: true })
    await worker.fetch(post("/api/tenancy/admin/db-sizes", { "CF-Connecting-IP": "203.0.113.9" }), e)
    const row = recorded.find((r) => r.url.includes("/internal/log-error"))
    expect(row, "the guard on the maintenance doors was off and the store heard nothing").toBeDefined()
    expect(String(row!.body.message)).toMatch(/fail open/i)
    expect(String(row!.body.message), "and it names the binding to check").toMatch(/MAINTENANCE_LIMIT/)
    expect(row!.body.place).toBe("POST /api/tenancy/admin/db-sizes")
    spy.mockRestore()
  })
})
