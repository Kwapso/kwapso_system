// A MODULE'S OWN SETTINGS PAGE DRAWS ONE TAB PER CHOICE TYPE, NEVER A SINGLE
// COMBINED "Choices" TAB.
//
// Aurora, 22 Sep 2026, verbatim: "on the settttings for each module, i think
// t owuld make more sense to have one tab for each choice type: fe: for
// tickets, instead of chocies do type (with type emoji) and so on
// everywhere. the choices tab with column for type shoudl only be on main
// settings (where theya re altogether) on each module should be the tab for
// each type."
//
// `web/components/screens/module-settings-screen.tsx` used to push ONE
// `TabItem` with `value: "choices"` per page, stacking every vocabulary
// section (and `meetingTypesSection`) under it, with a "Where" column on
// `settings-choices-panel.tsx`'s own table saying which type each row was.
// This law is what stops that shape coming back: the combined tab, and the
// column that told its rows apart, now live ONLY on the MAIN Settings screen
// (`settings-screen.tsx`), where several modules' vocabularies genuinely do
// sit side by side. A module's own page derives one tab per TYPE instead —
// `typeTabValue`/`choiceTypeLabel` (module-settings-screen.tsx, just above
// `ModuleSettingsScreen`) — off that module's own declared `types`, never a
// hand-written list.
//
// OFF THE SOURCE, NOT A FULL RENDER. A module settings page with a real
// vocabulary section pulls the kit's whole `RecordTable`/`CollectionFrame`
// tree in through `SettingsChoicesPanel` — the one existing render test for
// this screen (`module-settings-waves-phase-days.test.tsx`) deliberately
// exercises the one page with NO vocabulary at all (`kind: "phaseDays"`) for
// exactly that reason. A static census, in the shape R61's own
// `module-settings-two-doors` and R70's `automations.test.ts` already take,
// proves the same invariant without paying for a tree neither of those
// screens' own suites pays for either.
//
// KEYED BY EXPRESSION, NEVER BY LINE. Every assertion below names a
// substring or a pattern it expects to find (or not find) in the stripped
// source, so an edit anywhere ABOVE the code in question — a new comment, a
// reordered import — never rots what this file is actually proving, the
// same discipline `web/test/rules.test.ts`'s own per-function censuses
// already take.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"

const ROOT = join(__dirname, "..", "..")
const read = (p: string) => readFileSync(p, "utf8")

const MODULE_SETTINGS_SCREEN = join(ROOT, "web", "components", "screens", "module-settings-screen.tsx")
const SETTINGS_SCREEN = join(ROOT, "web", "components", "screens", "settings-screen.tsx")
const SETTINGS_CHOICES_PANEL = join(ROOT, "web", "components", "screens", "settings-choices-panel.tsx")

describe("a module's own settings page draws one tab per choice type, never a combined Choices tab", () => {
  it('module-settings-screen.tsx never pushes a `value: "choices"` tab again', () => {
    const src = stripComments(read(MODULE_SETTINGS_SCREEN))
    expect(
      src.includes('value: "choices"'),
      "module-settings-screen.tsx pushes a tab literally named \"choices\" again. Aurora's 22 Sep 2026 ruling " +
        "retired the single combined Choices tab on a module's OWN settings page in favour of one tab per " +
        "declared type (see typeTabValue/choiceTypeLabel, module-settings-screen.tsx). The combined shape, " +
        "with its own type column, survives only on the MAIN Settings screen (settings-screen.tsx)."
    ).toBe(false)
  })

  it("its per-type tabs are DERIVED off each vocabulary section's own `types`, never a hand-written list", () => {
    const src = stripComments(read(MODULE_SETTINGS_SCREEN))
    // `choiceTypeTabs` walks `vocabularySections` and reads each section's
    // own `.types` — the derivation the brief itself asks for ("a module
    // that gains a type gains a tab without an edit"). A hand-written,
    // per-module tab list would not contain this shape at all.
    expect(
      /vocabularySections\.flatMap\(\s*\(?s\)?\s*=>\s*s\.types\.map/.test(src),
      "no `vocabularySections.flatMap((s) => s.types.map(...))`-shaped derivation found in " +
        "module-settings-screen.tsx — the per-type tabs must be READ off each module's own declared `types`, " +
        "never hand-listed per segment"
    ).toBe(true)
    // Both halves of a tab's own identity — its unique value and its
    // reader-facing word — come from the two shared helpers, not inlined ad
    // hoc at the call site (which is how a future edit would silently fork
    // the value a tab draws from the word it shows).
    expect(
      src.includes("typeTabValue(type)"),
      "typeTabValue(type) is not called while building the per-type tabs — a tab's own identity must come from " +
        "the shared helper, not be spelled out again at the call site"
    ).toBe(true)
    expect(
      src.includes("choiceTypeLabel(type)"),
      "choiceTypeLabel(type) is not called while building the per-type tabs — a tab's own word must come from " +
        "the shared helper (the same field selectableFieldWords/the general Choices table's Where column " +
        "already reads), not be spelled out again at the call site"
    ).toBe(true)
  })

  it('the main Settings screen keeps its own combined "choices" tab, with the type column, untouched', () => {
    const src = stripComments(read(SETTINGS_SCREEN))
    expect(
      src.includes('value: "choices"'),
      "settings-screen.tsx no longer pushes its own combined \"choices\" tab. She explicitly asked to KEEP the " +
        "combined table, with its type column, on the MAIN settings screen ('where theya re altogether') — " +
        "only a module's own page loses it."
    ).toBe(true)
  })

  it("settings-choices-panel.tsx drops the Where column once `scope.type` narrows to one type", () => {
    const src = stripComments(read(SETTINGS_CHOICES_PANEL))
    // The columns array branches on `scope?.type`: the narrowed (single-type)
    // branch must carry no "Where" column at all, and the unscoped branch
    // must still carry exactly the one it always has — proving the type
    // column really does disappear inside a per-type tab (the brief's own
    // fourth caution) without silently dropping it everywhere.
    const columnsAt = src.indexOf("const columns: TableColumn[] = scope?.type")
    expect(
      columnsAt,
      "settings-choices-panel.tsx no longer branches its `columns` array on `scope?.type` — the narrowed, " +
        "single-type mounting a module-settings tab uses must draw no \"Where\" column"
    ).toBeGreaterThan(-1)
    const trueBranchStart = src.indexOf("? [", columnsAt)
    const falseBranchStart = src.indexOf(": [", trueBranchStart)
    const falseBranchEnd = src.indexOf("async function addValue", falseBranchStart)
    expect(trueBranchStart, "no `? [` found after the columns ternary's own condition").toBeGreaterThan(columnsAt)
    expect(falseBranchStart, "no `: [` found — the ternary's other branch").toBeGreaterThan(trueBranchStart)
    expect(falseBranchEnd, "no `async function addValue` found after the columns array — the boundary this test slices to").toBeGreaterThan(falseBranchStart)

    const scopedBranch = src.slice(trueBranchStart, falseBranchStart)
    const unscopedBranch = src.slice(falseBranchStart, falseBranchEnd)
    expect(
      scopedBranch.includes('"where"'),
      "the `scope?.type` (narrowed, single-type) branch of the columns array still carries a \"Where\" column — " +
        "a tab that already says the type must not repeat it on every row"
    ).toBe(false)
    expect(
      unscopedBranch.includes('key: "where"'),
      'the unscoped branch of the columns array lost its "Where" column — the whole-team and page-level tables ' +
        "still need it (more than one type can appear together there)"
    ).toBe(true)
  })
})
