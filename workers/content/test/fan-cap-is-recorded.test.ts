// THE NUDGE NOBODY GOT, WRITTEN DOWN.
//
// `sendToMany` caps one send at SEND_FAN_CAP recipients and DROPS the rest —
// which is the right call (a Worker gets six outgoing connections and fifteen
// minutes of wall clock, and turning a nudge into the reason a tick died is the
// worse trade). What was wrong is where it said so. A console line lives as long
// as somebody is watching the tail, and this failure produces nothing to watch
// for: every send that DID go succeeded, the cron reported success, and forty
// people simply never heard from us.
//
// It is the same shape the retention sweep's `capped` already had a row for —
// work that stopped at a ceiling is indistinguishable from work that had nothing
// left to do — and this closes the last one of that shape in the workers.
//
// A SOURCE CENSUS, in the house style of `publish-seam` and `gating-seam` beside
// it, and it says so rather than dressing up as a behavioural test: `sendToMany`
// is module-private and reaching the branch through a real handler would mean
// standing up a team with a hundred and one contacts. The canaries below are the
// point — every assertion fails LOUDLY if the thing it is reading has moved,
// rather than passing over a string that is no longer there.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const SRC = readFileSync(join(__dirname, "..", "src", "lib", "notify.ts"), "utf8")

/** The body of `sendToMany`, brace-balanced from its own declaration. */
function fanOutBody(): string {
  const at = SRC.indexOf("async function sendToMany(")
  expect(at, "sendToMany moved or was renamed — this suite is now reading nothing").toBeGreaterThan(-1)
  // The signature carries `people: { email: string }[]`, so "the first brace
  // after the first close-paren" finds the PARAMETER's object type and balances
  // out of it immediately — which reads as a body of two words and passes half
  // the assertions below by accident. Anchor on the return type instead.
  const sig = SRC.indexOf("): Promise<void> {", at)
  expect(sig, "sendToMany's signature changed shape — re-anchor this reader").toBeGreaterThan(-1)
  const open = SRC.indexOf("{", sig)
  let depth = 0
  for (let i = open; i < SRC.length; i++) {
    if (SRC[i] === "{") depth++
    else if (SRC[i] === "}" && --depth === 0) return SRC.slice(open + 1, i)
  }
  return ""
}

describe("a send that hit its fan-out ceiling leaves a row, not just a log line", () => {
  it("the ceiling exists and is a number in the code", () => {
    const at = SRC.indexOf("const SEND_FAN_CAP =")
    expect(at, "the fan cap is gone — the drop this suite is about cannot happen any more").toBeGreaterThan(-1)
    expect(SRC.slice(at, at + 40)).toMatch(/SEND_FAN_CAP = \d+/)
  })

  it("the drop branch records, and the recorder is inside the branch rather than beside it", () => {
    const body = fanOutBody()
    const at = body.indexOf("people.length > list.length")
    expect(at, "the over-the-cap test moved — this check is now checking nothing").toBeGreaterThan(-1)
    const branch = body.slice(at, at + 700)
    expect(branch, "recipients were dropped and the store heard nothing").toMatch(/recordWorkerError\(/)
    expect(branch, "…and the row says how many people were not emailed").toMatch(/NOT emailed/)
  })

  it("the console line is still there — the tail is where a flood is watched live", () => {
    // Both, not one: `error_logs` is the history and the console is what somebody
    // debugging a cron at the time is actually looking at. Replacing one with the
    // other has been a regression in this codebase before.
    expect(fanOutBody()).toMatch(/console\.error\(/)
  })

  it("every caller hands it the env it records through", () => {
    // The recorder needs `env.DB`, so a call site that forgot it would not
    // compile — but a FOURTH call site added without one would be tempting to
    // "fix" by making the parameter optional, which is how this comes back.
    const calls = [...SRC.matchAll(/sendToMany\(/g)]
    expect(calls.length, "declaration plus three call sites").toBe(4)
    for (const m of calls.slice(1))
      expect(
        SRC.slice(m.index!, m.index! + 24),
        "a sendToMany call that does not pass env cannot record its own drop"
      ).toMatch(/sendToMany\(env,/)
  })
})
