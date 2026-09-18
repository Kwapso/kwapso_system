// THE RAIL'S BRAND ROW IS THE KIT'S OWN SLOT, NOT A HAND-ROLLED COPY.
//
// kit v1.2.120/122 aligned `rail.tsx`'s `data-slot="rail-brand"` row to the
// workspace tab strip's own label centre — by construction, `h-[var(
// --strip-row)]` + `items-center` inside a band both boxes share, not a
// computed offset. The app never called that code: `app-shell.tsx` passed
// `mark={null} wordmark={null}` to `<Rail>` and drew its own `NavBrandHeader`
// beside it instead — an app-side copy of a kit composition, which R45 (and
// this base's standing rule, "the kit is the only UI input") calls a bug,
// not a variant. Measured live before the fix: the hand-rolled header's
// logotype centred 8.65px above the tab strip's own label centre.
//
// THE FIX HANDS THE SAME ARTWORK TO RAIL'S OWN `mark` PROP so the kit's
// alignment lands on it for free. What survives app-side is only what the
// kit's brand slot genuinely cannot carry — a click-to-home handler (the
// kit ships components, not routing) and one size override the client asked
// for after the kit's own default was set (`--icon-24` vs. the kit's
// `--icon-20`) — both documented on `railBrandMark` itself.
//
// Read off the disk rather than rendered: `AppShell` mounts a whole
// application (team switcher, permission sheet, live socket — see the note
// atop `rail-groups.test.ts`), so a render here would be testing the harness.
// What is asserted is structural: the mark reaches Rail's own slot, and no
// second copy of the artwork is drawn outside it.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"

const RAW = readFileSync(join(__dirname, "..", "components", "shell", "app-shell.tsx"), "utf8")
/** THE CODE, WITHOUT THE PROSE ABOUT IT — a check that reads its own
 * explanation is a check measuring the wrong text. */
const SHELL = stripComments(RAW)

describe("the rail's brand mark rides Rail's own data-slot=\"rail-brand\" slot", () => {
  it("hands Rail a real mark, never the null that skipped the kit's alignment fix", () => {
    const railCall = SHELL.indexOf("<Rail")
    expect(railCall, "app-shell must render the kit's Rail").toBeGreaterThan(-1)
    const block = SHELL.slice(railCall, SHELL.indexOf("/>", railCall) + 2)
    expect(block, "mark must be a real node — `Rail` only draws `rail-brand` when it isn't null")
      .toMatch(/mark=\{railBrandMark\(/)
    expect(block, "mark={null} is the regression this test exists to catch").not.toMatch(/mark=\{null\}/)
  })

  it("builds the mark from the kit's own artwork, through the one helper", () => {
    expect(SHELL, "the hand-rolled header component is gone").not.toMatch(/function NavBrandHeader/)
    expect(SHELL, "replaced by a plain node-builder for Rail's mark prop")
      .toMatch(/function railBrandMark\(/)
  })

  it("draws the artwork in exactly one place — no second copy beside Rail's own slot", () => {
    // Two branches (collapsed → Isotype, expanded → Logotype), both inside
    // `railBrandMark`. A second pair anywhere else in the file is the old
    // hand-rolled header's shape creeping back in beside the kit's slot.
    const isotypes = SHELL.match(/<Isotype\b/g) ?? []
    const logotypes = SHELL.match(/<Logotype\b/g) ?? []
    expect(isotypes.length, "exactly one Isotype call — railBrandMark's collapsed branch").toBe(1)
    expect(logotypes.length, "exactly one Logotype call — railBrandMark's expanded branch").toBe(1)
  })

  it("no longer spends a hand-kept pb-6 to buy air under the mark", () => {
    // The air is the kit's own root gap (`gap-[var(--space-6)]` between
    // `rail-brand` and the nav below it, `rail.tsx`) now that the mark moved
    // inside Rail — a `pb-6` wrapper here would be a second source of the
    // same space, and the sign that the mark slipped back outside Rail.
    expect(SHELL, "no leftover pb-6 wrapper around the mark").not.toMatch(/<div className="pb-6">/)
  })

  it("the mark still carries the app's click-to-home behaviour the kit's slot cannot express", () => {
    // `Rail`'s own `mark` prop takes a bare node with no notion of a click
    // (SHELL.md: "the repo ships components, not routing") — so this app
    // keeps building a real <button> with softNavigate around the artwork.
    const fn = SHELL.slice(SHELL.indexOf("function railBrandMark("))
    const body = fn.slice(0, fn.indexOf("\n}\n") + 2)
    expect(body, "the mark is a real button, not a bare span").toMatch(/<button\b/)
    expect(body, "…that navigates home through the soft-nav bus, never a hard reload").toContain('softNavigate("/home")')
  })
})
