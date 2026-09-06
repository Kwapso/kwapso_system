// R1 — THE LIVE-SYNC SEAM FOR THE MACHINE SURFACE. New on 6 Sep 2026, and the
// gap it closes is not a bug so much as an absence: CLAUDE.md has always named
// "mcp's caller-private token rows" as a reviewed exception to "every mutation
// publishes", and no test had ever asserted that the exception was still the
// truth. A reviewed exception nothing checks is an exception that grows.
//
// What this locks: the housekeeping deny-list is EXACTLY the three non-GET doors
// below, and every one of them is a route that really exists. Add a fourth write
// to this worker and the build goes red until somebody decides, in writing,
// whether it publishes or joins the list.
//
// WHY EVERY WRITE HERE IS HOUSEKEEPING, in one sentence each — the reasons live
// on the ROUTES table in src/index.ts, because that is what a reviewer reads.

import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { publishSeam } from "@shared/rules/seam-scan"
import { ROUTES } from "../src/index"

publishSeam({
  name: "mcp",
  routes: ROUTES,
  src: join(__dirname, "..", "src"),
  minRoutes: 4,
  // No mutation exists on this surface — see the ROUTES table's own note. The
  // tripwire still demands a populated table carrying a non-GET route.
  requiresMutation: false,
  housekeeping: [
    // Forwards a tool call to a REAL door, which gates, writes and publishes for
    // itself. Nothing is written here to broadcast.
    "POST /mcp",
    // A personal access token row: caller-private bookkeeping in the core DB,
    // on a screen that refetches synchronously. No other member can see it.
    "POST /api/mcp/tokens",
    "POST /api/mcp/tokens/revoke",
  ],
})

describe("live-sync seam (mcp): the exception is still the truth", () => {
  // The claim CLAUDE.md makes about this worker, asserted rather than trusted:
  // the ONLY writes here are the token doors and the tool forwarder. If a
  // genuinely team-visible write ever lands, this is the line that notices,
  // because it would have to be classified `mutation` to pass the seam above
  // and `mutation` is what this forbids.
  it("declares no mutation — a team-visible write on this surface needs a decision first", () => {
    const mutations = Object.entries(ROUTES).filter(([, d]) => d.kind === "mutation")
    expect(
      mutations.map(([r]) => r),
      "a mutation on the machine surface means a row other members can see. Publish it and delete this assertion, " +
        "or route the write through the domain door that already publishes"
    ).toEqual([])
  })

  it("every non-GET door is one of the three reviewed writes", () => {
    const writes = Object.keys(ROUTES).filter((r) => !r.startsWith("GET "))
    expect(writes.length, "three writes, and the seam above names each one").toBe(3)
  })
})
