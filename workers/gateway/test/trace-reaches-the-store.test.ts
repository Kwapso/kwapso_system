// THE DOOR THAT NAMES THE REQUEST HAS TO PUT THAT NAME ON ITS OWN REPORT.
//
// `guardMaintenance` refuses an over-budget maintenance call and writes the
// attempt into the central error store through auth's internal pipe. Until this
// file existed that report went out with NO `requestId` — so `logError` minted a
// fresh ULID for the row and the one record of a throttled maintenance call
// could not be joined to the click that caused it, on the one door in the
// product with no session behind it. The gateway is where the id is MINTED
// (`stampTrace(request, requestId(request))` at the top of `fetch`), which makes
// this the most embarrassing place in the estate to drop it.
//
// AND IT HAD NO CEILING. The hop rides `ctx.waitUntil`, so it cannot hold the
// 429 — but a stuck auth holds the waitUntil open, and "allowed to fail" and
// "allowed to hang" are different permissions (the sentence front-door.ts writes
// out three times for its own three report hops). This one was the fourth, and
// the only one without it.
//
// Both halves are asserted on the SAME call, because they are the same call.

import { describe, expect, it } from "vitest"

import worker from "../src/index"

type Recorded = { url: string; init: { body?: string; headers?: Record<string, string>; signal?: unknown } }

/** A gateway whose limiter always says "over budget", and whose AUTH binding
 * records the report instead of forwarding it. */
function overBudget() {
  const recorded: Recorded[] = []
  const behind = { fetch: async () => new Response("ok", { status: 200 }) }
  return {
    recorded,
    env: {
      ASSETS: behind,
      AUTH: {
        fetch: async (url: string, init: Recorded["init"]) => {
          recorded.push({ url, init })
          return new Response(null, { status: 204 })
        },
      },
      TENANCY: behind,
      DATAOPS: behind,
      CONTENT: behind,
      REALTIME: behind,
      MCP: behind,
      INTERNAL_KEY: "k",
      MAINTENANCE_LIMIT: { limit: async () => ({ success: false }) },
    } as never,
  }
}

const throttled = async (headers: Record<string, string>) => {
  const { env, recorded } = overBudget()
  const res = await worker.fetch(
    new Request("https://agency.kwapso.app/api/tenancy/admin/db-sizes", { method: "POST", headers }),
    env
  )
  expect(res.status, "the fixture must actually be over budget").toBe(429)
  const row = recorded.find((r) => r.url.includes("/internal/log-error"))
  expect(row, "a throttled maintenance call must leave a row").toBeDefined()
  return row as Recorded
}

describe("the throttled maintenance call is recorded UNDER THE REQUEST'S OWN NAME", () => {
  it("carries the caller's x-request-id into the error row", async () => {
    // A caller's own sane id is kept by `requestId` on purpose (trace.ts): the
    // point is to join OUR rows to THEIR trace. So this is also the cheapest
    // way to assert the row's id is THIS request's and not a fresh one.
    const row = await throttled({ "x-request-id": "smoke-7", "CF-Connecting-IP": "203.0.113.9" })
    expect(JSON.parse(row.init.body ?? "{}").requestId).toBe("smoke-7")
  })

  it("and puts the same name on the hop, so auth's own rows join too", async () => {
    const row = await throttled({ "x-request-id": "smoke-7" })
    expect(row.init.headers?.["x-request-id"]).toBe("smoke-7")
  })

  it("mints one when the caller sent none — never a row with no thread at all", async () => {
    const row = await throttled({})
    const id = JSON.parse(row.init.body ?? "{}").requestId
    expect(typeof id, "the door mints an id at the top of fetch; the report must use it").toBe("string")
    expect(String(id).length).toBeGreaterThan(10)
    // The SAME id on the wire and in the body — two names would be no name.
    expect(row.init.headers?.["x-request-id"]).toBe(id)
  })

  it("caps the hop, so a stuck auth cannot hold the waitUntil open", async () => {
    const row = await throttled({})
    expect(row.init.signal, "the report hop needs an AbortSignal ceiling").toBeInstanceOf(AbortSignal)
  })
})
