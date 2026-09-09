// A MEASUREMENT IS NOT A REASON TO WRITE TO SOMEBODY.
//
// THE MORNING OF 8 SEP 2026. The owner's ops digest led with "18 new error
// signatures" and every one of the eighteen was a `slow-door` row — the three
// loudest being GET /api/auth/me (65×), /api/tenancy/my-permissions (65×) and
// /api/tenancy/active (47×), each recorded as over its read budget having made
// ZERO database trips and read ZERO rows.
//
// A door that touches no database and is still "too slow" is not reporting a
// defect in that door. It is reporting that the budget sits under the
// platform's own floor: `shared/workers/timing.ts`'s own header measured
// routing ALONE at ~90ms against a 100ms read budget, so on those three doors
// the instrument is timing the transport and not the code. Eighteen lines of it
// do not tell a reader that a door regressed — they bury the one line that
// would have, which is the failure mode the digest was built to prevent. Its
// own test file already says it: a digest that arrives every night "would be
// filtered inside a week — and then the night something IS wrong would be
// filtered with it."
//
// So the MAIL is filtered and the RECORD is not, and both halves are asserted
// here. Suppressing the rows instead would throw away the latency instrument
// this app was deliberately given, which is the worse bug of the two and the
// tempting one, because it makes the symptom go away.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")
const OPS_ALERT = join(ROOT, "workers", "tenancy", "src", "lib", "ops-alert.ts")

describe("the ops digest writes to a person about exceptions only", () => {
  it("both of the digest's error queries exclude every measurement source", () => {
    const src = readFileSync(OPS_ALERT, "utf8")
    const queries = src.match(/FROM error_logs[\s\S]*?WHERE[^\n]*\n/g) ?? []
    expect(queries.length, "the night query and the 30-day history query").toBe(2)
    for (const q of queries) {
      expect(q, "a measurement must not compose a sentence addressed to a person").toContain(
        "source NOT IN (${measurementFilter})"
      )
    }
  })

  it("the filter is DERIVED from the shared list, never retyped here", () => {
    // If this file spelled the source out itself, a second measurement source
    // added to error-log.ts tomorrow would start emailing the owner again, in
    // silence, and the fix would look like it was still in place.
    const src = readFileSync(OPS_ALERT, "utf8")
    expect(src).toMatch(/import \{ MEASUREMENT_SOURCES \} from "@shared\/workers\/error-log"/)
    expect(src, "placeholders built from the list's own length").toMatch(
      /MEASUREMENT_SOURCES\.map\(\(\) => "\?"\)/
    )
    expect(src, "and both queries bind it").toMatch(/\.\.\.MEASUREMENT_SOURCES/)
    // The STRING LITERAL, not the word: this file's comment says slow-door in
    // backticks while explaining why, and prose is not a second source of truth.
    expect(src, "no source name written out as a literal").not.toMatch(/"slow-door"/)
  })

  it("the rows are still recorded and still readable — only the mail changed", () => {
    const admin = readFileSync(
      join(ROOT, "workers", "data-ops", "src", "routes", "admin.ts"),
      "utf8"
    )
    expect(admin, "the errors door still returns them, and says which are measurements").toMatch(
      /measurementSources: MEASUREMENT_SOURCES/
    )
    const timing = readFileSync(join(ROOT, "shared", "workers", "timing.ts"), "utf8")
    expect(timing, "the slow-door recorder still writes its row").toMatch(/logError\(/)
    const log = readFileSync(join(ROOT, "shared", "workers", "error-log.ts"), "utf8")
    expect(log, "and slow-door is still declared a measurement").toMatch(
      /MEASUREMENT_SOURCES[^=]*=\s*\[SLOW_DOOR_SOURCE\]/
    )
  })
})

describe("the digest can be switched off without being deleted", () => {
  // The owner's ruling of 8 Sep 2026: no ops mail at all. The trap this guards
  // is the obvious way to obey it — deleting the address. R12 makes an ABSENT
  // ALERT_TO throw, on purpose, so the store records that an alarm reached
  // nobody; obeying by deletion would have swapped a nightly email for a nightly
  // error row in the very log he asked to keep readable, AND destroyed the check
  // that catches an address somebody genuinely forgot to set.
  const OPS = readFileSync(OPS_ALERT, "utf8")
  const WRANGLER = readFileSync(
    join(ROOT, "workers", "tenancy", "wrangler.jsonc"),
    "utf8"
  )

  it("off is a VALUE, and absence still throws", () => {
    expect(OPS).toMatch(/export const OPS_DIGEST_OFF = "off"/)
    expect(OPS, "the word short-circuits the send").toMatch(/=== OPS_DIGEST_OFF/)
    expect(OPS, "an unset address is still the R12 fault it always was").toMatch(
      /ALERT_TO is not set, so nobody was emailed/
    )
  })

  it("both environments are actually off, and neither was emptied", () => {
    const values = [...WRANGLER.matchAll(/"ALERT_TO":\s*"([^"]*)"/g)].map((m) => m[1])
    expect(values.length, "production and staging").toBe(2)
    for (const v of values) {
      expect(v, "off, not blank — blank means forgotten").toBe("off")
    }
  })

  it("and the digest is still COMPUTED, so turning it back on needs no code", () => {
    // Everything up to the envelope still runs: the findings are derived nightly
    // whether or not anybody is told. If this ever becomes an early return in
    // the cron instead, switching the mail back on becomes a code change and the
    // 90 days of history behind it will be missing.
    expect(OPS, "the off-switch sits inside the SENDER, after the digest is built").toMatch(
      /export async function sendOpsDigest[\s\S]*?OPS_DIGEST_OFF/
    )
  })
})
