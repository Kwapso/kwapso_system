// ONE FAULT IS ONE SIGNATURE, AND BOTH SURFACES MUST AGREE WHICH ONE.
//
// The nightly ops digest (tenancy) groups failures so four transient D1 hiccups
// arrive as one line rather than four. The resolve door (data-ops, this
// workspace) closes the rows behind that line in one act. Both answers now come
// from `shared/workers/error-signature.ts`, and they have to be the SAME answer —
// a digest that reports a signature the resolve door cannot find is worse than no
// grouping at all, because it looks like it worked.
//
// tenancy/test/ops-alert.test.ts already proves the FOLD on the digest's side.
// This proves the half that only exists here: that a row read back out of the
// store rebuilds the identical signature, and that the door's batching survives
// D1's parameter ceiling.
//
// The owner's actual mail, 2026-09-06, is the fixture.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { foldSignature, signatureOf, SIGNATURE_PREFIX, SIGNATURE_SQL } from "@shared/workers/error-signature"
import { D1_MAX_BOUND_PARAMS, idBatches, RESOLVE_SCAN_CAP } from "@shared/workers/limits"

/** The four rows behind "1 new error signature" that morning. */
const HICCUPS = ["vf4c1", "p333t", "oa3pj", "8kk2m"].map((ref) => ({
  source: "content",
  message: `Error: D1_ERROR: internal error; reference = ${ref}`,
}))

describe("a row read back out of the store rebuilds its signature", () => {
  it("the owner's four hiccups are one signature, so one act closes them", () => {
    const sigs = new Set(HICCUPS.map(signatureOf))
    expect(sigs.size, `four rows folded to ${sigs.size}: ${[...sigs].join(" | ")}`).toBe(1)
  })

  it("…and it is still recognisably that failure, not a row of hashes", () => {
    const [sig] = HICCUPS.map(signatureOf)
    expect(sig).toContain("content")
    expect(sig).toContain("internal error")
    expect(sig, "the volatile reference must be gone").not.toContain("vf4c1")
  })

  // THE OTHER DIRECTION IS THE DANGEROUS ONE. A fold that is too eager collapses
  // two genuinely different failures into one line and hides the second for ever —
  // and on THIS surface it would also resolve rows nobody looked at.
  it("two different real failures never collapse into each other", () => {
    const a = signatureOf({ source: "tenancy", message: "D1_ERROR: no such table: sync_leases: SQLITE_ERROR" })
    const b = signatureOf({ source: "content", message: "D1_ERROR: no such column: spine: SQLITE_ERROR" })
    expect(a).not.toBe(b)
  })

  // The door folds the caller's input too, so a signature pasted from the digest
  // (already folded) and one read off a raw row both find the same rows.
  it("folding an already-folded signature changes nothing", () => {
    const once = signatureOf(HICCUPS[0])
    expect(foldSignature(once)).toBe(once)
  })

  it("a long message is cut at the same place in SQL and in JavaScript", () => {
    // The digest asks SQLite for `substr(message, 1, N)`; the door rebuilds it in
    // JS. If those two Ns ever disagreed the digest would report a signature the
    // door could not match — silently, and only for long messages.
    expect(SIGNATURE_SQL).toContain(String(SIGNATURE_PREFIX))
    const long = "x".repeat(SIGNATURE_PREFIX + 50)
    expect(signatureOf({ source: "content", message: long })).toBe(`content · ${"x".repeat(SIGNATURE_PREFIX)}`)
  })
})

describe("the resolve door's write survives D1, not just SQLite", () => {
  // limits.ts names this failure and says why it keeps being missed: local SQLite
  // allows 999 bound parameters and D1 allows 100, so a statement binding 500
  // passes every test in this repo and 500s in production. The scan cap is 500,
  // so a single `IN (…)` over its results would be exactly that bug.
  it("a full scan's worth of ids is batched under the platform's ceiling", () => {
    const ids = Array.from({ length: RESOLVE_SCAN_CAP }, (_, i) => `id${i}`)
    const batches = idBatches(ids, 2)
    expect(batches.length, "500 ids must not go out in one statement").toBeGreaterThan(1)
    for (const b of batches)
      expect(
        b.length + 2,
        `a batch of ${b.length} ids plus the two other parameters exceeds D1's ${D1_MAX_BOUND_PARAMS}`
      ).toBeLessThanOrEqual(D1_MAX_BOUND_PARAMS)
    expect(batches.flat(), "batching must not lose or duplicate an id").toEqual(ids)
  })

  // …and the door must actually USE it, or the test above is about a helper
  // nothing calls.
  it("the door batches rather than binding every id at once", () => {
    const src = readFileSync(join(__dirname, "..", "src", "routes", "admin.ts"), "utf8")
    const start = src.indexOf("export async function postResolveErrorSignature")
    const body = src.slice(start, src.indexOf("\n}", src.indexOf("return json({", start)))
    expect(body, "the resolve-signature door must batch its ids").toContain("idBatches(ids")
    expect(body, "and the claim must ride the UPDATE, so a second call moves nothing").toContain("status = 'open'")
  })
})
