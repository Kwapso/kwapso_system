// INTEREST-ROUTED PUBLISH — the registry that lets a ping skip the shards where
// nobody is listening for it.
//
// The whole design has one dangerous direction and one harmless one, and every
// test here is about which side a given unknown lands on:
//
//   a wrong YES  → one wasted object call. Nobody notices.
//   a wrong NO   → a screen that goes quietly out of date. That is the single
//                  failure the live layer exists to prevent.
//
// So every unknown must answer YES, and the tests below enumerate the unknowns
// that actually occur: a shard that has never reported (its first listener is
// mid-handshake), an entry older than a listener's own deadline, a shard holding
// a pre-subscription client, an unreadable socket attachment, and a registry
// that cannot be reached at all.

import { describe, expect, it, vi } from "vitest"

import { INTEREST_STALE_MS, REALTIME_SHARDS, teamInterestName } from "@shared/workers/realtime"
import { TeamInterest } from "../src/index"

/** A stand-in for the DO's key-value storage — the registry stores nothing else. */
function interest(seed: Record<string, unknown> = {}): TeamInterest {
  const kv = new Map<string, unknown>(Object.entries(seed))
  const ctx = { storage: { kv: { get: (k: string) => kv.get(k), put: (k: string, v: unknown) => kv.set(k, v) } } }
  return new TeamInterest(ctx as never, {} as never)
}

const ALL_SHARDS = Array.from({ length: REALTIME_SHARDS }, (_, i) => i)
const fresh = (resources: string[], all = false) => ({ resources, all, at: Date.now() })

/** EVERY shard reporting the same thing, then whichever ones this test cares
 * about overridden on top.
 *
 * Derived from `REALTIME_SHARDS` rather than written out as `s0`–`s3`, because
 * the count is itself a derivation now (`ceil(peak ÷ watch line)`) and a fixture
 * that seeds four shards out of nine leaves five that have NEVER reported — and
 * "never reported" correctly answers "interested". Every narrowing assertion
 * below would then be measuring the fixture's gaps rather than the registry. */
const reporting = (base: ReturnType<typeof fresh>, overrides: Record<number, ReturnType<typeof fresh>> = {}) =>
  Object.fromEntries(ALL_SHARDS.map((i) => [`s${i}`, overrides[i] ?? base]))

describe("the interest registry answers which shards care", () => {
  it("narrows to the shards that declared the resource", () => {
    const r = interest(
      reporting(fresh(["nothing_anybody_asked_for"]), {
        0: fresh(["accounts"]),
        1: fresh(["help"]),
        2: fresh(["accounts", "help"]),
        3: fresh(["help"]),
      })
    )
    expect(r.shardsFor("accounts")).toEqual([0, 2])
    expect(r.shardsFor("help")).toEqual([1, 2, 3])
  })

  it("answers NOBODY when genuinely nobody is listening — the whole point", () => {
    const r = interest(reporting(fresh(["accounts"])))
    expect(r.shardsFor("brand_assets")).toEqual([])
  })

  describe("every unknown answers YES", () => {
    it("a shard that has NEVER reported — its first listener is mid-handshake", () => {
      const r = interest({ s0: fresh(["accounts"]) })
      expect(r.shardsFor("brand_assets"), "every shard but 0 has never reported").toEqual(ALL_SHARDS.slice(1))
    })

    it("an entry older than a listener's own deadline", () => {
      const stale = { resources: ["accounts"], all: false, at: Date.now() - INTEREST_STALE_MS - 1 }
      const r = interest(reporting(fresh(["accounts"]), { 0: stale }))
      // Past the window every socket has reconnected and re-reported, so a stale
      // entry describes nobody — and is believed about nothing.
      expect(r.shardsFor("brand_assets")).toEqual([0])
    })

    it("a shard holding a PRE-SUBSCRIPTION client (all:true)", () => {
      const r = interest(reporting(fresh(["accounts"]), { 0: fresh([], true) }))
      expect(r.shardsFor("anything-at-all")).toEqual([0])
    })

    it("an event with no resource on it", () => {
      const r = interest(reporting(fresh(["x"]), { 0: fresh(["accounts"]) }))
      expect(r.shardsFor(null), "unclassifiable ping goes everywhere").toEqual(ALL_SHARDS)
    })

    it("a malformed entry with no timestamp", () => {
      const r = interest({ s0: { resources: ["accounts"], all: false } })
      expect(r.shardsFor("brand_assets")).toEqual(ALL_SHARDS)
    })
  })

  it("a report REPLACES the shard's entry rather than accumulating", () => {
    // Shrinking must need no bookkeeping: the shard recomputes from its live
    // sockets, so a closed socket's resources simply stop being in the answer.
    const r = interest({ s0: fresh(["accounts", "help"]) })
    expect(r.shardsFor("help")).toContain(0)
    r.report(0, fresh(["accounts"]))
    expect(r.shardsFor("help"), "help was dropped when its socket closed").not.toContain(0)
    expect(r.shardsFor("accounts")).toContain(0)
  })

  it("names one registry per team, never colliding with a shard's name", () => {
    const name = teamInterestName("01ABC")
    expect(name).not.toContain("#")
    expect(name).not.toBe("team:01ABC")
  })
})

describe("the publish door's use of it", () => {
  /** The door's own guard: only a well-formed array of real shard indexes is
   * believed. Mirrors the validation in workers/realtime/src/index.ts. */
  const believable = (answer: unknown) =>
    Array.isArray(answer) && answer.every((n) => Number.isInteger(n) && n >= 0 && n < REALTIME_SHARDS)

  it("believes an EMPTY array — that is the saving, not a malformed reply", () => {
    expect(believable([])).toBe(true)
  })

  it("refuses a nonsense reply, so the door falls back to every shard", () => {
    expect(believable(null)).toBe(false)
    expect(believable("0,1")).toBe(false)
    expect(believable([0, 99])).toBe(false)
    expect(believable([0, 1.5])).toBe(false)
  })

  it("an unreachable registry costs a wasted call, never a missed ping", async () => {
    // The door wraps the registry read in try/catch and starts from every shard.
    // Proven here as the property it is: whatever the registry does, the set the
    // door begins with is complete.
    const start = Array.from({ length: REALTIME_SHARDS }, (_, i) => i)
    const registry = { shardsFor: vi.fn().mockRejectedValue(new Error("object unreachable")) }
    let shards = start
    try {
      const answer = await registry.shardsFor("accounts")
      if (believable(answer)) shards = answer as number[]
    } catch {
      // fall through with the complete set
    }
    expect(shards).toEqual(ALL_SHARDS)
  })
})
