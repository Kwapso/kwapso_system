// THE CHOICES TABLE'S ADDED ON / ADDED BY STAY TWO COLUMNS.
//
// Aurora's ruling, 23 Sep 2026, reviewing the settings screen, verbatim:
// "split added on and by in 2 separate columns." This is the THIRD time this
// exact pair has moved — split apart 21 Sep 2026 (evening), folded back into
// one "Added" cell 22 Sep 2026 (later) to hold R82's six-column ceiling once
// Details reclaimed its own seat, split again this round, this time with the
// unscoped table named in `TABLE_COLUMN_BUDGET_EXEMPT`
// (shared/rules/registry.ts) instead of folding anything else — see
// `shapeChoicesTable`'s own header (deep-link/shape.tsx, "ADDED, creator's
// face and the date, SPLIT AGAIN") and `SettingsChoicesPanel`'s own header
// (settings-choices-panel.tsx, "ADDED BY / ADDED ON FOLD BACK TOGETHER") for
// the full back-and-forth.
//
// A plain unit test asserting today's row shape (`shape.test.ts`'s own
// `shapeChoicesTable` suite already has several) is exactly the kind of
// check a THIRD fold would delete along with the code it was protecting —
// nothing stops a future edit from re-merging the two cells and quietly
// updating the unit test to match. This is a STATIC CENSUS instead, reading
// both files off disk for the two expressions the split actually depends on,
// keyed by FILE and EXPRESSION TEXT rather than a line number (an edit
// anywhere above either one cannot rot this the way a `file:123` key would):
//
//   1. `web/components/deep-link/shape.tsx` — `shapeChoicesTable`'s own
//      returned row carries `addedOn:` AND `addedBy:` as two distinct
//      properties, never one merged `added:` property.
//   2. `web/components/screens/settings-choices-panel.tsx` — BOTH of
//      `SettingsChoicesPanel`'s own `TableColumn[]` literals (the
//      `scope.type`-narrowed one and the whole-team one) name both
//      `key: "addedOn"` and `key: "addedBy"`, never a merged
//      `key: "added"`.
//
// PROVED RED: merging the two properties/columns back into one `added`
// shape in a scratch copy of both files (restored from `cp`, never left in
// the tree) turns every assertion below red before the restore — the proof
// this file's own PR record carries.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"

const ROOT = join(import.meta.dirname, "..", "..")
const read = (p: string) => stripComments(readFileSync(join(ROOT, ...p.split("/")), "utf8"))

const SHAPE_FILE = "web/components/deep-link/shape.tsx"
const PANEL_FILE = "web/components/screens/settings-choices-panel.tsx"

/** Count of `name` used as an OBJECT PROPERTY in `source` — either the full
 * `name: value` shape or the ES2015 shorthand `name,`/`name}` this file's own
 * `addedOn`/`addedBy` fields use (the local `const` and the property share a
 * name) — at a WORD BOUNDARY on both sides, so `addedOn` never matches a
 * search for `added`, and `addedByText` never matches a search for
 * `addedBy`. */
function propertyCount(source: string, name: string): number {
  const re = new RegExp(`\\b${name}\\b\\s*[,:}]`, "g")
  return (source.match(re) ?? []).length
}

describe("the Choices table's Added on / Added by stay split (K59, Aurora, 23 Sep 2026)", () => {
  it(`${SHAPE_FILE} — shapeChoicesTable's row carries addedOn and addedBy as two distinct properties, never one merged added`, () => {
    const src = read(SHAPE_FILE)
    expect(
      propertyCount(src, "addedOn") >= 1,
      `expected an "addedOn:" property in ${SHAPE_FILE} — the date, its own cell (Aurora, 23 Sep 2026: "split added on and by in 2 separate columns")`
    ).toBe(true)
    expect(
      propertyCount(src, "addedBy") >= 1,
      `expected an "addedBy:" property in ${SHAPE_FILE} — the person, its own cell, same ruling`
    ).toBe(true)
    expect(
      propertyCount(src, "added"),
      `found a merged "added:" property in ${SHAPE_FILE} — the two columns have been fused back together, which is exactly what Aurora's 23 Sep 2026 ruling undid ("split added on and by in 2 separate columns"); see this function's own header for the two prior folds this would be a third of`
    ).toBe(0)
  })

  it(`${PANEL_FILE} — both of SettingsChoicesPanel's own column lists name key: "addedOn" and key: "addedBy", never a merged key: "added"`, () => {
    const src = read(PANEL_FILE)
    const addedOnKeys = (src.match(/key:\s*"addedOn"/g) ?? []).length
    const addedByKeys = (src.match(/key:\s*"addedBy"/g) ?? []).length
    const mergedAddedKey = (src.match(/key:\s*"added"/g) ?? []).length

    // TWO of each — the `scope.type`-narrowed branch and the whole-team
    // branch, `SettingsChoicesPanel`'s own two `TableColumn[]` literals (see
    // this file's header, "THE ADDED COLUMNS, SPLIT AGAIN"). A count under 2
    // means one of the two branches still carries the old merged column.
    expect(
      addedOnKeys,
      `expected 2 occurrences of key: "addedOn" in ${PANEL_FILE} (one per TableColumn[] literal) — found ${addedOnKeys}`
    ).toBe(2)
    expect(
      addedByKeys,
      `expected 2 occurrences of key: "addedBy" in ${PANEL_FILE} (one per TableColumn[] literal) — found ${addedByKeys}`
    ).toBe(2)
    expect(
      mergedAddedKey,
      `found key: "added" in ${PANEL_FILE} — a column list has been folded back to the merged shape; Aurora's 23 Sep 2026 ruling ("split added on and by in 2 separate columns") is what this table is holding`
    ).toBe(0)
  })
})
