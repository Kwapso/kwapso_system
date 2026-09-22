// R102, THE ID COLUMN IS AS NARROW AS ITS CHIP, AND ITS HEADER IS THE RECORD'S
// OWN NOUN, NEVER "ID". Read at L43 alongside R96 and R101, from her list of
// minimal fixes, item 3, 22 Sep 2026: "the id column narrow and named after
// the record."
//
// R96 (id-chip-is-black.test.ts) already built the census that finds a
// STANDALONE id column, `field("ref", <label>)`, and proves its cell routes
// through `<RecordRef>` rather than drawing bare text. That census is a TONE
// question: is the chip black. This one is a SHAPE question, over the exact
// same subject, kept as a separate law rather than folded into R96 because
// the two questions have different reviewed exceptions (a tone bug and a
// layout choice are not the same kind of debt): does the column carry `w-px`
// so it shrinks to the chip's own content width under the table's auto
// layout, and does its header read the record's own noun rather than the
// bare word "ID".
//
// THE PATTERN ALREADY SHIPPED, dated 22 Sep 2026, the same day as this law:
// `stories-screen.tsx`'s own `tableColumns` builder (Planned/Backlog's and
// Reviews' `field("ref", "Story")`) sets `col.width = "w-px"` the moment
// `f.column === "ref"`, beside the `<RecordRef>` render R96 already wired.
// `tickets-collection.tsx`'s hand-rolled table (`w-px` on both its
// `<TableHead>` and its `<TableCell>`, header "Ticket") carries the identical
// shape, built by hand rather than through `field(...)`.
//
// SCOPE, THE SAME BOUNDARY R96'S OWN COLUMN CENSUS DRAWS. `field("ref", …)`
// is the one recipe-shaped declaration of a standalone id column in this
// codebase today (a source grep over `web/`, `web-portal/` and `shared/`
// found exactly the two sites this file already names, both in
// `stories-screen.tsx`); a hand-rolled table like `tickets-collection.tsx`'s
// own, or `web/components/records/record-table.tsx`'s GENERIC renderer
// (the leading column's own ref-glued-to-name shape, R87's title cell, which
// is a different question entirely: that cell grows to fit a truncating
// title and is never meant to be `w-px`), sits outside what a `field("ref", …)`
// regex can reach, the same reason R96's own `columnFindings()` scopes there
// too. Widening this census to every hand-rolled table in the app, with no
// shared declaration to key off, would be exactly the kind of check that is
// either so loose it passes anything or so specific it breaks on the next
// harmless refactor; `tickets-collection.tsx` is read here as a KNOWN
// COMPLIANT site, by hand, once, rather than chased by a wider regex nothing
// else in this file's own family of censuses would trust either.
//
// CHECKED over `web/components`, `shared/web/screen-engine` and
// `web/lib/screens.ts` (the recipe layer `field()` itself lives in): every
// `field("ref", "<label>")` call must (a) name a label from the record-noun
// list, never "ID", and (b) sit in a file that also sets `w-px` on that same
// "ref" column, or the finding is named in `ID_COLUMN_NOUN_EXEMPT`, keyed by
// `{file, expression}`, rot-checked both ways.

import { join } from "node:path"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { ID_COLUMN_NOUN_EXEMPT, type IdColumnNounExempt } from "@shared/rules/registry"

const REPO_ROOT = join(__dirname, "..", "..")

const ROOTS = [join(REPO_ROOT, "web", "components"), join(REPO_ROOT, "shared", "web", "screen-engine")]
const SCREENS_LIB = join(REPO_ROOT, "web", "lib", "screens.ts")

/** The record nouns this law names, verbatim from its own registry text. A
 * label outside this list, "ID" included, is a finding regardless of case. */
const NOUNS = ["Ticket", "Story", "Task", "Wave", "Phase", "App", "Account", "Contact", "Input", "Meeting"]

/** A standalone id column, the same shape `id-chip-is-black.test.ts`'s own
 * `ID_COLUMN_FIELD` reads, widened here to CAPTURE the label rather than only
 * matching its presence, since the label itself is half of what this law
 * checks. */
const STANDALONE_ID_COLUMN = /field\(\s*"ref"\s*,\s*"([^"]+)"\s*\)/g

/** Whether THIS FILE, anywhere, shrinks its own "ref" column to `w-px` the
 * way `stories-screen.tsx`'s own `tableColumns` builder does: the branch that
 * tests `f.column === "ref"` and, within it, sets `col.width = "w-px"`. A
 * file-wide test rather than a per-match one, because the width is set once,
 * in the column BUILDER, not beside each `field("ref", …)` declaration it
 * later resolves. */
function hasNarrowRefColumn(strippedSource: string): boolean {
  return /column\s*===\s*"ref"[\s\S]{0,400}?col\.width\s*=\s*"w-px"/.test(strippedSource)
}

interface Finding {
  rel: string
  expression: string
  reason: string
}

function excused(rel: string, expression: string): IdColumnNounExempt | undefined {
  return ID_COLUMN_NOUN_EXEMPT.find((e) => e.file === rel && expression.includes(e.expression))
}

function findings(): Finding[] {
  const files = [
    ...sourceFiles(ROOTS, { extensions: [".ts", ".tsx"], relativeTo: REPO_ROOT, skipTests: true }),
    { path: SCREENS_LIB, rel: "web/lib/screens.ts", source: readFileSync(SCREENS_LIB, "utf8") },
  ]
  const out: Finding[] = []
  for (const f of files) {
    const stripped = stripComments(f.source)
    const narrow = hasNarrowRefColumn(stripped)
    for (const m of stripped.matchAll(STANDALONE_ID_COLUMN)) {
      const [expression, label] = m
      if (!NOUNS.includes(label)) {
        out.push({ rel: f.rel, expression, reason: `its header "${label}" is not one of the record nouns` })
      }
      if (!narrow) {
        out.push({ rel: f.rel, expression, reason: 'no "ref" column in this file is shrunk to w-px' })
      }
    }
  }
  return out
}

describe("R102, the id column is as narrow as its chip, and its header is the record's own noun", () => {
  it('every standalone id column carries w-px and a noun header, never "ID", or is named in ID_COLUMN_NOUN_EXEMPT', () => {
    const found = findings()
    const unexempt = found.filter((f) => !excused(f.rel, f.expression))
    expect(
      unexempt,
      "these standalone id columns fail R102: narrow as their own chip, header from the noun list. Fix the " +
        "column, or name it in ID_COLUMN_NOUN_EXEMPT with the reason:\n  " +
        unexempt.map((f) => `${f.rel}  ${f.expression}  (${f.reason})`).join("\n  ")
    ).toEqual([])
  })

  it("ID_COLUMN_NOUN_EXEMPT names only real, still-open findings", () => {
    const all = findings()
    const stale = ID_COLUMN_NOUN_EXEMPT.filter(
      (e) => !all.some((f) => f.rel === e.file && f.expression.includes(e.expression))
    )
    expect(
      stale,
      "these ID_COLUMN_NOUN_EXEMPT entries no longer match a real finding. Fixed, or the source moved on, " +
        "delete the entry:\n  " + stale.map((e) => `${e.file}  ${e.expression}`).join("\n  ")
    ).toEqual([])
  })

  it("an exemption's expression matches only one current finding in its file", () => {
    const all = findings()
    const ambiguous: string[] = []
    for (const e of ID_COLUMN_NOUN_EXEMPT) {
      const hits = all.filter((f) => f.rel === e.file && f.expression.includes(e.expression))
      if (hits.length > 1) ambiguous.push(`${e.file}  "${e.expression}" matches ${hits.length} findings`)
    }
    expect(
      ambiguous,
      "an ID_COLUMN_NOUN_EXEMPT entry excuses more than one site, make it specific:\n  " + ambiguous.join("\n  ")
    ).toEqual([])
  })

  // PROVEN NOT VACUOUS, against synthetic source only, the same discipline
  // every other census in this repo holds itself to.
  it('catches a synthetic column still labelled "ID"', () => {
    const synthetic = 'const COLUMNS = [field("ref", "ID"), field("name", "Story")]'
    const matches = [...synthetic.matchAll(STANDALONE_ID_COLUMN)]
    expect(matches.length).toBe(1)
    expect(NOUNS.includes(matches[0][1])).toBe(false)
  })

  it("catches a synthetic column with a real noun label but no w-px anywhere in its file", () => {
    const synthetic = 'const COLUMNS = [field("ref", "Story"), field("name", "Title")]'
    expect(hasNarrowRefColumn(synthetic)).toBe(false)
  })

  it("recognises the real, shipped shape as narrow: column === \"ref\" beside col.width = \"w-px\"", () => {
    const synthetic = [
      "const tableColumns = fields.map((f) => {",
      '  const col = { key: f.column, label: f.field.label }',
      '  if (f.column === "ref") {',
      "    col.render = (value) => <RecordRef value={value} />",
      '    col.width = "w-px"',
      "  }",
      "  return col",
      "})",
    ].join("\n")
    expect(hasNarrowRefColumn(synthetic)).toBe(true)
  })

  it("does not flag a noun label paired with a narrow ref column", () => {
    const synthetic = [
      'const COLUMNS = [field("ref", "Story"), field("name", "Title")]',
      'if (f.column === "ref") { col.width = "w-px" }',
    ].join("\n")
    const label = [...synthetic.matchAll(STANDALONE_ID_COLUMN)][0][1]
    expect(NOUNS.includes(label)).toBe(true)
    expect(hasNarrowRefColumn(synthetic)).toBe(true)
  })

  it("stories-screen.tsx's own two sites are compliant, no exemption needed", () => {
    expect(findings().some((f) => f.rel.endsWith("stories-screen.tsx"))).toBe(false)
  })
})
