// THE SPRINT BOARD'S THREE STATE MARKS COME FROM CODE, AND THERE ARE THREE.
//
// ── WHAT THIS LOCKS, AND WHY IT IS A TEST RATHER THAN A COMMENT ──────────────
//
// Until 11 Sep 2026 the glyph beside "Running now" / "Coming up" / "Wrapped" was
// read off the team's own `Sprint status` dropdown rows — `markMap(selectableQ
// .data, MARK_GROUP.sprintStatus)` — and looked up BY THE ROW'S WORD against
// `STATE_HEADING`, a constant in the same file. Two halves of one lookup, one
// editable on a settings screen and one written in code, joined by nothing but
// the spelling. Renaming a row dropped the glyph SILENTLY and changed no word on
// screen, because the heading has always been `t(STATE_HEADING[state])`.
//
// That is now `STATE_MARK`, in `sprints-screen.tsx`, beside the headings it keys
// off. This file is what stops it drifting back:
//
//   i.   STATE_MARK exists and names EXACTLY the states SPRINT_STATES declares —
//        so "all three marks draw" is a fact about the table rather than a
//        promise. (`tsc` already refuses a missing key, because the constant is
//        typed `Record<SprintState, string>`; what tsc cannot see is a FOURTH
//        state added to SPRINT_STATES' array without a mark, or a mark left as
//        an empty string, and both are caught here.)
//   ii.  the heading renders it UNCONDITIONALLY. The old expression was
//        `stateMarks.get(...) && <span>…</span>` — a truthiness guard, which is
//        exactly what made a broken lookup invisible: no glyph looked like a
//        team that had cleared it. A guard reintroduced here would hide the same
//        failure again.
//   iii. the vocabulary lookup is GONE from that screen. Leaving `markMap` or
//        `MARK_GROUP` in the file beside the new constant would be two answers
//        to one question, which is how the first one came to be wrong.
//
// SOURCE OFF DISK, like every other structural check in this repo: what is being
// asserted is the SHAPE of two declarations and one JSX expression, and importing
// the constants would hand back values whose provenance this file could no longer
// see (`STATE_MARK` is not exported, and exporting it so a test could read it
// would loosen the very thing being pinned — `web/test/dead-exports.test.ts`
// counts an export nothing in another file names as dead).

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

// THE ONE COMMENT STRIPPER (shared/rules/source-scan.ts, re-exported from
// shared/rules/strip-comments.mjs). Imported rather than re-typed: a hand-rolled
// pair of regexes is blind to a comment marker inside a string, and
// `web/test/source-scan.test.ts` turns the build red for every copy.
import { stripComments } from "@shared/rules/source-scan"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const REL = "web/components/work/sprints-screen.tsx"
const SRC = readFileSync(join(ROOT, REL), "utf8")

/** Comments off. `STATE_MARK`'s own doc comment quotes the retired
 * `markMap(…, MARK_GROUP.sprintStatus)` expression at length — a census that
 * read prose would find the lookup it exists to prove is gone. */
const CODE = stripComments(SRC)

/** The members of a `const NAME: ... = [ "a", "b" ]` array literal. */
function arrayMembers(name: string): string[] {
  const at = CODE.indexOf(`const ${name}`)
  if (at < 0) return []
  // FROM THE `=`, NOT FROM THE NAME. `const SPRINT_STATES: SprintState[] = [...]`
  // carries a `[` in its TYPE, four characters before the literal this wants —
  // an empty slice, and every set relation below it vacuously true. The first
  // draft of this file did exactly that.
  const eq = CODE.indexOf("=", at)
  const open = CODE.indexOf("[", eq)
  const close = CODE.indexOf("]", open)
  return [...CODE.slice(open, close).matchAll(/"([a-z]+)"/g)].map((m) => m[1])
}

/** The keys of a `const NAME: Record<…> = { k: "v", … }` object literal, and the
 * values beside them. */
function recordEntries(name: string): [string, string][] {
  const at = CODE.indexOf(`const ${name}`)
  if (at < 0) return []
  const open = CODE.indexOf("{", at)
  const close = CODE.indexOf("\n}", open)
  return [...CODE.slice(open, close).matchAll(/(\w+):\s*"([^"]*)"/g)].map((m) => [m[1], m[2]])
}

describe("the sprint board's state marks are code, and all three of them draw", () => {
  it("SPRINT_STATES parsed (a set relation against an empty set proves nothing)", () => {
    // TRIPWIRE. Every clause below is measured against this list; if the slice
    // stopped matching, an app with no marks at all would pass silently.
    expect(
      arrayMembers("SPRINT_STATES"),
      `read no states out of ${REL}'s SPRINT_STATES — the slice above stopped matching, so nothing below is measuring anything`
    ).toEqual(["running", "upcoming", "wrapped"])
  })

  it("STATE_MARK names exactly those states, and every mark is a real glyph", () => {
    const marks = recordEntries("STATE_MARK")
    expect(
      marks.map(([k]) => k).sort(),
      `${REL} — STATE_MARK does not cover exactly the states SPRINT_STATES declares. A state with no mark draws a bare word where every other heading carries a glyph, and it is invisible in review because nothing else on the screen changes`
    ).toEqual([...arrayMembers("SPRINT_STATES")].sort())
    const blank = marks.filter(([, v]) => v.trim() === "").map(([k]) => k)
    expect(
      blank,
      `${REL} — STATE_MARK carries an empty mark for: ${blank.join(", ")}. An empty string is the shape the OLD, broken lookup produced on a renamed row; the point of moving this into code was that it can never happen again`
    ).toEqual([])
  })

  it("the heading draws the mark unconditionally — no truthiness guard back", () => {
    expect(
      /<span aria-hidden[^>]*>\s*\{STATE_MARK\[state\]\}/.test(CODE),
      `${REL} — the state heading no longer renders {STATE_MARK[state]} in a bare aria-hidden span. If the markup moved, teach this check the new shape; if a CONDITION was put back in front of it, that is the very thing this test exists to refuse — a guarded mark makes a broken lookup look like a team that cleared the glyph`
    ).toBe(true)
    expect(
      /STATE_MARK\[state\]\s*&&/.test(CODE),
      `${REL} — the state mark is behind a truthiness guard again. STATE_MARK is total over SprintState by construction, so a guard can only ever hide a bug`
    ).toBe(false)
  })

  it("the Sprint status vocabulary is not read by this screen any more", () => {
    for (const gone of ["markMap(", "MARK_GROUP"])
      expect(
        CODE.includes(gone),
        `${REL} — \`${gone}\` is back in this screen's code. The three state glyphs are STATE_MARK now; a second lookup beside it is two answers to one question, which is how the first one came to be keyed on a word a person could retype`
      ).toBe(false)
  })
})
