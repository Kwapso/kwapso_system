// PURE-FUNCTION LOCK for advanceRisingBackfill/advanceFallingBackfill's
// round-two guard (12 Sep 2026): an `incomplete` tick may only advance the
// watermark to a boundary it actually trusts. `firstEntryAt`/`lastEntryAt`
// reads null when nothing filed this tick carried a usable date — the exact
// shape the integration suite beside this one (google-backfill-stall.test.ts)
// proves end to end through the real sweep door. This file tests the two
// decision functions directly, since they are pure and now exported — cheaper
// and more exhaustive than reproducing the full pipeline for every edge case.

import { describe, expect, it } from "vitest"
import { advanceFallingBackfill, advanceRisingBackfill } from "../src/lib/knowledge-google"

describe("advanceRisingBackfill", () => {
  const window = { from: "2026-01-01T00:00:00.000Z", to: "2026-04-01T00:00:00.000Z" }
  const now = new Date("2026-09-01T00:00:00.000Z")

  it("a complete window (incomplete=false) advances to window.to regardless of lastEntryAt", () => {
    expect(advanceRisingBackfill(now, window, false, null)).toEqual({ done: false, through: window.to })
  })

  it("an incomplete window WITH a trusted boundary resumes there, not at window.to", () => {
    const at = "2026-02-15T00:00:00.000Z"
    expect(advanceRisingBackfill(now, window, true, at)).toEqual({ done: false, through: at })
  })

  it("an incomplete window with NO usable boundary (null) STAYS at window.from — does not advance", () => {
    expect(advanceRisingBackfill(now, window, true, null)).toEqual({ done: false, through: window.from })
  })

  it("an incomplete window with an UNPARSEABLE boundary also stays — same guard, same reason", () => {
    expect(advanceRisingBackfill(now, window, true, "not a date")).toEqual({ done: false, through: window.from })
  })

  it("an incomplete window whose boundary is not actually past window.from stays too (degenerate case)", () => {
    expect(advanceRisingBackfill(now, window, true, window.from)).toEqual({ done: false, through: window.from })
  })
})

describe("advanceFallingBackfill", () => {
  const window = { from: "2026-01-01T00:00:00.000Z", to: "2026-04-01T00:00:00.000Z" }
  const now = new Date("2026-09-01T00:00:00.000Z")

  it("a complete window (incomplete=false) advances to window.from regardless of firstEntryAt", () => {
    expect(advanceFallingBackfill(now, window, false, null)).toEqual({ done: false, through: window.from })
  })

  it("an incomplete window WITH a trusted boundary resumes there, not at window.from", () => {
    const at = "2026-02-15T00:00:00.000Z"
    expect(advanceFallingBackfill(now, window, true, at)).toEqual({ done: false, through: at })
  })

  it("an incomplete window with NO usable boundary (null) STAYS at window.to — does not advance", () => {
    expect(advanceFallingBackfill(now, window, true, null)).toEqual({ done: false, through: window.to })
  })

  it("an incomplete window with an UNPARSEABLE boundary also stays — same guard, same reason", () => {
    expect(advanceFallingBackfill(now, window, true, "not a date")).toEqual({ done: false, through: window.to })
  })

  it("an incomplete window whose boundary is not actually before window.to stays too (degenerate case)", () => {
    expect(advanceFallingBackfill(now, window, true, window.to)).toEqual({ done: false, through: window.to })
  })
})
