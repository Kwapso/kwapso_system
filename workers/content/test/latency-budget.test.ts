// THE BUDGET, AND THE WAVE — the two seams speed_review's repair rests on.
//
// `shared/workers/timing.ts` used to hold ONE threshold, 750ms, for every door
// in the product. A read that took 700ms passed the same test as a bulk import
// that took 700ms, which is the same as having no test — and the class that
// mattered most, the CSV import, was the one the single number flattered.
// `shared/workers/limits.ts` now states four budgets and the route's own `kind`
// picks which one it answers to.
//
// `shared/workers/parallel.ts` is the other half: independent preflight reads run
// together instead of one after another. Its whole reason to exist rather than
// being a bare `Promise.all` is that a sequence of `await`s fails with the FIRST
// error IN ORDER, while `Promise.all` fails with the first one IN TIME. That is
// a difference nobody sees until two things are wrong at once — and then it is a
// person being told the wrong thing about their own form, differently on each
// re-run. So the test that matters here is the one where the LATER task rejects
// SOONER, which is exactly the case a plain `Promise.all` gets wrong.

import { describe, expect, it, vi } from "vitest"
import { beginD1Timing, beginRequest, countedDb, logIfSlow, noteTeam, withTiming } from "@shared/workers/timing"
import { LATENCY_BUDGET_MS, MAX_D1_TRIPS_PER_DOOR, budgetForKind } from "@shared/workers/limits"
import { inOrder } from "@shared/workers/parallel"

/** A request that has already been running for `ms`. `beginRequest` stamps
 * `Date.now()`, so the clean way to pretend a door was slow is to move the clock
 * rather than to sleep for a second in a unit test. */
function agedRequest(ms: number, method = "GET"): Request {
  const request = new Request("https://x/api/content/thing", { method })
  const now = Date.now
  vi.spyOn(Date, "now").mockReturnValue(now() - ms)
  beginRequest(request)
  vi.mocked(Date.now).mockRestore()
  return request
}

function warnings(run: () => void): string[] {
  const said: string[] = []
  const spy = vi.spyOn(console, "warn").mockImplementation((m: unknown) => void said.push(String(m)))
  try {
    run()
  } finally {
    spy.mockRestore()
  }
  return said
}

describe("a door is measured against its own class", () => {
  it("the four budgets exist and delete is deliberately the same as write", () => {
    // Named rather than inferred: this app deactivates instead of deleting, so
    // the delete class IS a write. Stating it stops somebody concluding the
    // removal path was never considered.
    expect(Object.keys(LATENCY_BUDGET_MS).sort()).toEqual(["bulk", "delete", "read", "write"])
    expect(LATENCY_BUDGET_MS.delete).toBe(LATENCY_BUDGET_MS.write)
    expect(LATENCY_BUDGET_MS.read).toBeLessThan(LATENCY_BUDGET_MS.write)
    expect(LATENCY_BUDGET_MS.write).toBeLessThan(LATENCY_BUDGET_MS.bulk)
  })

  it("the route's own tag picks the budget", () => {
    expect(budgetForKind("read")).toBe(LATENCY_BUDGET_MS.read)
    expect(budgetForKind("mutation")).toBe(LATENCY_BUDGET_MS.write)
    expect(budgetForKind("housekeeping")).toBe(LATENCY_BUDGET_MS.bulk)
    // An untagged door (auth's switch, the MCP surface) gets the STRICTER of the
    // two it could be, never the minute a bulk job gets.
    expect(budgetForKind(undefined)).toBe(LATENCY_BUDGET_MS.write)
  })

  it("150ms is a breach for a read and silence for a mutation", () => {
    // THE WHOLE POINT OF FOUR NUMBERS, in one assertion: the SAME duration is a
    // finding on one door and unremarkable on another. Under the old single
    // 750ms threshold neither of these said anything at all.
    const read = agedRequest(150)
    expect(warnings(() => logIfSlow(read, "GET /api/content/tickets", "read"))).toHaveLength(1)

    const write = agedRequest(150, "POST")
    expect(warnings(() => logIfSlow(write, "POST /api/content/tickets", "mutation"))).toHaveLength(0)
  })

  it("a bulk door is given its minute", () => {
    const bulk = agedRequest(5_000, "POST")
    expect(warnings(() => logIfSlow(bulk, "POST /api/data-ops/import/confirm", "housekeeping"))).toHaveLength(0)
  })

  it("a door with no database trip is still measured — which is why auth can be seen", () => {
    // The gap this closed: `logIfSlow` used to return early when nothing had
    // been counted, so `auth` — which every request in the product passes
    // through and which reads the CORE database over a binding rather than the
    // REST door — reported nothing at all, ever.
    const request = agedRequest(900)
    const said = warnings(() => logIfSlow(request, "GET /api/auth/me"))
    expect(said).toHaveLength(1)
    expect(said[0]).toContain("0 D1 trips")
  })

  it("the line names the tenant", () => {
    const request = agedRequest(900)
    noteTeam(request, "01TEAMID")
    const said = warnings(() => logIfSlow(request, "GET /api/auth/me"))
    expect(said[0]).toContain("team=01TEAMID")
  })

  it("a fast door that made too many trips still says so", () => {
    // Time and trip count come apart in both directions. A door that made
    // fifteen statements and got away with it today is one bad day from being
    // the slow one, and the count is the thing that causes the time.
    const request = agedRequest(10)
    const stats = beginD1Timing(request)
    for (let i = 0; i <= MAX_D1_TRIPS_PER_DOOR; i++) stats.push({ op: "SELECT help", ms: 1 })
    const said = warnings(() => logIfSlow(request, "GET /api/content/tickets", "read"))
    expect(said).toHaveLength(1)
    expect(said[0]).toContain("within its")
    expect(said[0]).toContain(`over the ${MAX_D1_TRIPS_PER_DOOR} ceiling`)
  })

  it("Server-Timing carries the total and the budget it answers to", async () => {
    const request = agedRequest(120)
    const res = withTiming(request, new Response("{}"), "read")
    const timing = res.headers.get("Server-Timing") ?? ""
    expect(timing).toMatch(/app;desc="total";dur=\d+/)
    expect(timing).toContain(`budget;desc="read";dur=${LATENCY_BUDGET_MS.read}`)
    await res.text()
  })
})

describe("independent reads run together and fail in order", () => {
  it("runs them at the same time, not one after another", async () => {
    const slow = (ms: number) => new Promise<number>((resolve) => setTimeout(() => resolve(ms), ms))
    const t0 = Date.now()
    const [a, b, c] = await inOrder([slow(40), slow(40), slow(40)])
    // Three 40ms tasks in ~40ms rather than ~120ms. Generous margin: this is a
    // statement about concurrency, not about the machine it runs on.
    expect(Date.now() - t0).toBeLessThan(110)
    expect([a, b, c]).toEqual([40, 40, 40])
  })

  it("throws the FIRST failure in ARRAY order, even when a later one fails sooner", async () => {
    // THE ASSERTION THIS FILE EXISTS FOR. A plain `Promise.all` fails this: it
    // would reject with "the app" because that promise settles first, and a
    // person naming both a dead client and a dead app would be told about the
    // app today and the client tomorrow, depending on the network.
    const client = new Promise((_, reject) => setTimeout(() => reject(new Error("the client")), 50))
    const app = new Promise((_, reject) => setTimeout(() => reject(new Error("the app")), 5))
    await expect(inOrder([client, app])).rejects.toThrow("the client")
  })

  it("every task still RUNS — which is why only reads may ride a wave", async () => {
    // A sequence of awaits would never have reached the second task. A wave
    // does, so a WRITE in a wave is a write that happens on a request that
    // fails: parallel.ts states the rule and this is the behaviour behind it.
    let ran = false
    const boom = Promise.reject(new Error("first"))
    const other = new Promise((resolve) => {
      ran = true
      resolve(1)
    })
    await expect(inOrder([boom, other])).rejects.toThrow("first")
    expect(ran).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

/** A core database that answers instantly and remembers what it was asked. Only
 * the four things a handler ever calls on a binding. */
function fakeCore(): D1Database & { asked: string[] } {
  const asked: string[] = []
  const statement = (sql: string): D1PreparedStatement =>
    ({
      bind: () => statement(sql),
      first: async () => ({ id: "u1" }),
      run: async () => ({ success: true, meta: { changes: 1 } }),
      all: async () => ({ success: true, results: [{ id: "u1" }, { id: "u2" }], meta: {} }),
      raw: async () => [["u1"]],
    }) as unknown as D1PreparedStatement
  return {
    asked,
    prepare: (sql: string) => {
      asked.push(sql)
      return statement(sql)
    },
    batch: async (statements: unknown[]) => statements.map(() => ({ success: true, meta: { changes: 1 } })),
    exec: async () => ({ count: 1, duration: 0 }),
    dump: async () => new ArrayBuffer(0),
  } as unknown as D1Database & { asked: string[] }
}

describe("the CORE database's own trips are counted too", () => {
  it("a native env.DB statement lands in the same census the REST door writes to", async () => {
    // THE BUG THIS LOCKS. `beginD1Timing` hangs its array on the D1 REST config,
    // so it could only ever see the per-team databases. `auth` makes 42 native
    // core-DB calls and zero REST ones, so every slow-door line it ever printed
    // said "0 D1 trips, 0 rows" — not merely missing, but pointing away from the
    // cause.
    const request = agedRequest(900)
    const db = countedDb(request, fakeCore())
    await db.prepare("SELECT id FROM sessions WHERE token = ?").bind("t").first()
    await db.prepare("SELECT id FROM users WHERE id = ?").bind("u1").all()

    const said = warnings(() => logIfSlow(request, "GET /api/auth/me", "read"))
    expect(said).toHaveLength(1)
    expect(said[0]).toContain("2 D1 trips")
    // Three rows: one from `first`, two from `all`.
    expect(said[0]).toContain("3 rows")
    // And the SHAPE, which is the half that says what to fix.
    expect(said[0]).toContain("SELECT sessions")
    expect(said[0]).toContain("SELECT users")
  })

  it("a batch is ONE trip, and D1 gets its own statements back", async () => {
    const request = agedRequest(10)
    const core = fakeCore()
    const db = countedDb(request, core)
    const stats = beginD1Timing(request)
    await db.batch([db.prepare("INSERT INTO a VALUES (?)"), db.prepare("INSERT INTO b VALUES (?)")])
    expect(stats).toHaveLength(1)
    expect(stats[0].op).toBe("BATCH ×2")
  })

  it("a statement that THREW is still a trip somebody waited for", async () => {
    const request = agedRequest(10)
    const stats = beginD1Timing(request)
    const broken = {
      prepare: () =>
        ({ bind: () => ({ first: async () => { throw new Error("no") } }) }) as unknown as D1PreparedStatement,
    } as unknown as D1Database
    const db = countedDb(request, broken)
    await expect(db.prepare("SELECT id FROM users").bind("x").first()).rejects.toThrow("no")
    expect(stats).toHaveLength(1)
    expect(stats[0].op).toBe("SELECT users")
  })

  it("the label carries a verb and a table and NOTHING a caller supplied", async () => {
    // Same rule as the REST door's: this count reaches a response header.
    const request = agedRequest(10)
    const stats = beginD1Timing(request)
    const db = countedDb(request, fakeCore())
    await db.prepare("SELECT * FROM users WHERE email = ?").bind("aurora@kwapso.com").first()
    expect(stats[0].op).toBe("SELECT users")
    expect(JSON.stringify(stats)).not.toContain("aurora@kwapso.com")
  })
})
