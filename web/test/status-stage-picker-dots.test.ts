// CLIENT RULING, 18 Sep 2026, verbatim: "everywhere where choico component is
// status/stage add the points." Every horizontal choice/pill picker whose
// options are a STATUS or a STAGE draws the tone dot on each pill — the same
// dot `Badge variant="status"` draws, from the kind's own tone map. ONE SEAM:
// the option shape (`PickerOption` in record-picker.tsx, `AppearancePillOption`
// in shared/web/appearance-pill-group.tsx) carries an optional `dot` tone and
// the pill renderer draws it; a caller passes the tone from the SAME map its
// screen's own list/board already reads for a `Badge` — never a second one.
//
// THIS FILE HOLDS TWO THINGS: that the seam itself exists on both pill
// components (so a future row picker has somewhere to plug a dot into without
// re-inventing the drawing), and a CENSUS — any file that imports one of the
// app's known status/stage tone maps AND draws a `RecordPicker` row or an
// `AppearancePillGroup` must also wire a `dot:` into that row's options. Today
// that is exactly one call site, the App stage picker (`app-form-dialog.tsx`,
// `appStageDotTone`) — the census is written to grow with the app rather than
// naming that one file, so the day a ticket-status or a sprint-state row
// picker is built, forgetting the dot fails the build instead of shipping
// silently.
//
// THE IMPORT CHECK IS DELIBERATELY AN `import { … } FROM "…"` MATCH, not a bare
// substring search for the function's name — five ticket files (`triage-queue.tsx`
// and its siblings) mention `helpStatusDotTone` in a comment about a DIFFERENT
// picker (the Status FACET dropdown, `control` layout, out of this ruling's
// "horizontal choice/pill" scope) without ever importing it, and a substring
// census would have flagged every one of them for a row picker that carries no
// status vocabulary at all.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles } from "@shared/rules/source-scan"

const ROOT = join(import.meta.dirname, "..", "..")

const RECORD_PICKER = join(ROOT, "web/components/records/record-picker.tsx")
const APPEARANCE_PILL_GROUP = join(ROOT, "shared/web/appearance-pill-group.tsx")
const APP_FORM_DIALOG = join(ROOT, "web/components/apps/app-form-dialog.tsx")

function read(path: string): string {
  return readFileSync(path, "utf8")
}

describe("status/stage tone dot — the shared seam (record-picker.tsx, appearance-pill-group.tsx)", () => {
  it("RecordPicker's PickerOption carries an optional BadgeDot tone", () => {
    const src = read(RECORD_PICKER)
    expect(src, "PickerOption has lost its `dot` field").toMatch(/dot\?:\s*BadgeDot/)
  })

  it("RecordPicker imports BadgeDot from the kit's own Badge, never a second dot vocabulary", () => {
    const src = read(RECORD_PICKER)
    expect(src).toMatch(/import\s*\{\s*type BadgeDot\s*\}\s*from\s*"@shared\/ui\/components\/badge\/badge"/)
  })

  it("RowChip (the row layout's own pill) draws `dot` through the same Swatch a free colour uses", () => {
    const src = read(RECORD_PICKER)
    // Both the open list's row and RowChip must read `option.dot`/`o.dot` —
    // one call site drawing it and the other silently dropping it is exactly
    // the "two drawings of one idea" this file's own header refuses elsewhere.
    const dotReads = src.match(/\bo(?:ption)?\.dot\b/g) ?? []
    expect(dotReads.length, "expected `option.dot`/`o.dot` read in both the open list row and RowChip").toBeGreaterThanOrEqual(2)
  })

  it("AppearancePillOption carries an optional BadgeDot tone, and the row draws it", () => {
    const src = read(APPEARANCE_PILL_GROUP)
    expect(src, "AppearancePillOption has lost its `dot` field").toMatch(/dot\?:\s*BadgeDot/)
    expect(src, "the pill button no longer reads `option.dot`").toMatch(/option\.dot/)
  })
})

describe("status/stage tone dot — the App stage picker (client's own named example)", () => {
  it("app-form-dialog.tsx reads the SAME tone map the apps board reads, never a second one", () => {
    const src = read(APP_FORM_DIALOG)
    expect(src).toMatch(/import\s*\{[^}]*\bappStageDotTone\b[^}]*\}\s*from\s*"@shared\/app-stages"/)
    expect(src, "the stage pill row never calls appStageDotTone").toMatch(/dot:\s*appStageDotTone\(/)
  })
})

/** The app's own status/stage tone maps — one function per lifecycle, each
 * already the map SOME list/board reads for its own `Badge variant="status"`.
 * Adding a fifth here (a new lifecycle gets its own map) is the only edit this
 * census ever needs; it does not enumerate call sites. */
const STATUS_STAGE_TONE_MAPS: { fn: string; module: string }[] = [
  { fn: "helpStatusDotTone", module: "@shared/status-tones" },
  { fn: "storyStatusDotTone", module: "@shared/status-tones" },
  { fn: "appStageDotTone", module: "@shared/app-stages" },
  { fn: "sprintDotTone", module: "@shared/sprint-state" },
]

/** True only for a REAL `import { …, fn, … } from "module"` — never a bare
 * mention of the function's name, which several ticket files carry in a
 * comment about the Status FACET dropdown (`control` layout, not a row/pill
 * picker, out of scope for this ruling). */
function importsToneFn(source: string, fn: string, module: string): boolean {
  const re = new RegExp(`import\\s*\\{[^}]*\\b${fn}\\b[^}]*\\}\\s*from\\s*"${module.replace(/\//g, "\\/")}"`)
  return re.test(source)
}

describe("status/stage tone dot — CENSUS (any row/pill picker fed a status or stage list must dot it)", () => {
  it("every file that imports a status/stage tone map AND draws a RecordPicker row or an AppearancePillGroup wires `dot:`", () => {
    const files = sourceFiles([join(ROOT, "web"), join(ROOT, "shared/web")], {
      extensions: [".tsx"],
      skipTests: true,
    }).filter((f) => f.path !== RECORD_PICKER && f.path !== APPEARANCE_PILL_GROUP)

    const offenders: string[] = []
    for (const f of files) {
      const drawsRowOrPill = /layout="row"/.test(f.source) || /<AppearancePillGroup/.test(f.source)
      if (!drawsRowOrPill) continue

      const usesToneMap = STATUS_STAGE_TONE_MAPS.some(({ fn, module }) => importsToneFn(f.source, fn, module))
      if (!usesToneMap) continue

      if (!/\bdot:/.test(f.source)) offenders.push(f.rel)
    }

    expect(
      offenders,
      `status/stage row picker(s) reading a tone map with no \`dot:\` wired: ${offenders.join(", ")}`
    ).toEqual([])
  })

  it("is not vacuous — app-form-dialog.tsx is a real positive case the census must see", () => {
    const files = sourceFiles([join(ROOT, "web")], { extensions: [".tsx"], skipTests: true })
    const appForm = files.find((f) => f.path === APP_FORM_DIALOG)
    expect(appForm, "app-form-dialog.tsx not found by the census walk").toBeTruthy()
    expect(appForm!.source).toMatch(/<AppearancePillGroup/)
    expect(importsToneFn(appForm!.source, "appStageDotTone", "@shared/app-stages")).toBe(true)
  })
})
