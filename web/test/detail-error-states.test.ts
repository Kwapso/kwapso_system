// A FAILED READ MUST REACH THE ERROR CARD — EVERY READ THE SCREEN WAITS ON.
//
// A record screen with TWO reads is the shape this file is about: a LIST (page
// one, cache-first) and a BY-ID read for the record the list did not reach.
// Every one of them already draws a `state="error"` card with a Try again
// button. On 2026-09-10 not one of the three routed the BY-ID read's failure
// to it — they all asked only whether the LIST had failed.
//
// The by-id read is the one that can find a record past the cursor (R14 pages,
// R38 reads by id), so on a cold deep link it is frequently the only read that
// could have answered. When it failed, each screen picked a different wrong
// answer and neither was the error card:
//
//   help-detail    the loading gate carried `!oneQ.error`, so it LET GO and the
//                  screen said "That ticket no longer exists." A dropped
//                  connection is not a deletion. Its own comment two lines up
//                  calls that class of sentence "a lie that happens to be
//                  quick" — this was the same lie made one step later.
//   meeting-detail no `oneQ` term anywhere, so `oneQ.data` stayed undefined for
//                  ever and the loading skeleton stayed on screen with nothing
//                  coming. A spinner that never resolves is the one state a
//                  person cannot act on, complain about precisely, or retry.
//
// Two spellings of one bug, which is why this is a CENSUS and not two edits.
// The rule is positional and derived from each screen's own source: whatever
// the loading gate WAITS ON, the error branch must ASK ABOUT. Nothing is
// hand-listed except the exemption below, which carries its own deletion
// condition.

import { describe, expect, it } from "vitest"
import { join } from "node:path"

import { sourceFiles } from "@shared/rules/source-scan"

const ROOT = join(__dirname, "..", "..")
const COMPONENTS = join(ROOT, "web", "components")

/** Every `*-detail.tsx` under web/components/, at any depth, WITH its source.
 *
 * Through `sourceFiles()` and not a `readdirSync` of its own — `source-scan`'s
 * own law says so, and it caught this file's first draft doing exactly that.
 * The reason is the reason this census exists at all: one shared walk means a
 * module folder added tomorrow is covered without editing anything, which is
 * what left every RECURSING census intact through the 7 Sep 2026 fold of 128
 * flat files and broke the ones that walked for themselves. `skipTests` is off
 * on purpose: nothing here matches `*-detail.tsx` and a test, but saying so is
 * cheaper than a reader wondering. */
const screenFiles = () =>
  sourceFiles(COMPONENTS, {
    extensions: [".tsx"],
    relativeTo: COMPONENTS,
  }).filter((f) => f.path.endsWith("-detail.tsx"))

/** The `if (...)` that guards the return carrying `state="<which>"`. Walks back
 * from the state line to the nearest guard at statement indentation, which is
 * how every one of these screens is written — a chain of early returns before
 * the ready body. Returns null when there is no such guard, and the caller
 * treats that as "this screen does not have this state" rather than as a pass. */
function guardFor(src: string, which: string): string | null {
  const lines = src.split("\n")
  const at = lines.findIndex((l) => l.includes(`state="${which}"`))
  if (at < 0) return null
  for (let i = at; i >= 0 && at - i < 12; i--) {
    const m = /^ {2}if \((.*)\)$/.exec(lines[i])
    if (m) return m[1]
  }
  return null
}

/** The queries a guard WAITS ON — `xQ.data === undefined`, the positional
 * signature of "this read has not answered yet". */
const waitsOn = (guard: string): string[] => [
  ...new Set([...guard.matchAll(/\b(\w+Q)\.data === undefined/g)].map((m) => m[1])),
]

/** The queries a guard ASKS ABOUT — `xQ.error`. */
const asksAbout = (guard: string): string[] => [
  ...new Set([...guard.matchAll(/\b(\w+Q)\.error/g)].map((m) => m[1])),
]

/** THE ONE WAY OUT, and it carries the condition that deletes it.
 *
 * `knowledge-detail.tsx` is the third instance of exactly this bug — same two
 * queries, same missing term, same permanent skeleton as meeting-detail. It is
 * NOT fixed here because a separate session owns the knowledge base right now
 * and the owner asked for it to be left alone; editing this file from two
 * places at once is how a merge eats somebody's work.
 *
 * DELETE THIS ENTRY, and fix the screen, the moment that session's work lands.
 * It is rot-checked below in both directions: an entry naming a file that no
 * longer exists fails, and an entry naming a screen that has since been fixed
 * fails too — so it cannot quietly outlive its reason. */
const ERROR_STATE_EXEMPT: Record<string, string> = {
  "knowledge/knowledge-detail.tsx":
    "A parallel session owns the knowledge base (owner's instruction, 2026-09-10), " +
    "so this screen is not edited from here. Same bug as meeting-detail had: " +
    "sourcesQ.error is asked, oneQ.error is not, and a failed by-id read holds the " +
    "loading skeleton for ever. Delete this line and fix the guard once that " +
    "session has landed.",
}

describe("a record screen's error card catches every read it waits on", () => {
  const files = screenFiles()
  const screens = files.map((f) => f.rel)
  const sourceOf = (rel: string) => files.find((f) => f.rel === rel)?.source ?? ""

  it("the walk finds the detail screens — this census cannot go quiet", () => {
    // The same tripwire every census in this repo carries: a scan over an empty
    // list passes, and is indistinguishable from a clean one.
    expect(
      screens.length,
      "no *-detail.tsx found under web/components — did the folders move?"
    ).toBeGreaterThan(5)
  })

  it("every query a loading gate waits on is asked about by the error branch", () => {
    const wrong: string[] = []
    for (const rel of screens) {
      if (ERROR_STATE_EXEMPT[rel]) continue
      const src = sourceOf(rel)
      const loading = guardFor(src, "loading")
      const error = guardFor(src, "error")
      if (!loading) continue // no loading gate to hold open
      const waited = waitsOn(loading)
      if (waited.length === 0) continue
      if (!error) {
        wrong.push(`${rel}: waits on ${waited.join(", ")} and has no error card at all`)
        continue
      }
      const asked = asksAbout(error)
      for (const q of waited)
        if (!asked.includes(q))
          wrong.push(
            `${rel}: the loading gate waits on \`${q}.data === undefined\`, but the error ` +
              `branch only asks about ${asked.map((a) => `\`${a}.error\``).join(", ") || "nothing"}. ` +
              `If ${q} fails, this screen never leaves the state the gate put it in.`
          )
    }
    expect(
      wrong,
      `A record screen can be held in loading (or pushed into "no longer exists") by a ` +
        `read whose failure nothing asks about:\n` + wrong.join("\n")
    ).toEqual([])
  })

  it("the exemption has not rotted", () => {
    for (const [rel, why] of Object.entries(ERROR_STATE_EXEMPT)) {
      expect(why.length, `${rel} needs a real reason`).toBeGreaterThan(40)
      expect(screens, `ERROR_STATE_EXEMPT names ${rel}, which is gone — delete the line`).toContain(
        rel
      )
      // AND THE HALF THAT ACTUALLY EXPIRES IT. An exemption is a claim that the
      // screen is still broken; once somebody fixes it the line is a lie that
      // would hide the NEXT regression on that same file.
      const src = sourceOf(rel)
      const loading = guardFor(src, "loading")
      const error = guardFor(src, "error")
      const stillBroken =
        !!loading &&
        waitsOn(loading).some((q) => !(error ? asksAbout(error) : []).includes(q))
      expect(
        stillBroken,
        `${rel} is exempt but no longer breaks the rule — delete its ERROR_STATE_EXEMPT line`
      ).toBe(true)
    }
  })
})
