// EVERY SWITCH ON THE ROLES GRID DECIDES SOMETHING — R36's OTHER HALF.
//
// ── WHY THIS FILE EXISTS, WHICH IS A GAP R36 CANNOT SEE ──────────────────────
//
// R36 (`offered-rights`, web/test/rules.test.ts) is about DATA: it derives the
// consulted set off the source — literal `requireRight`/`gated` pairs, the MCP
// `TOOL_GATES`, `ACTIVITY_GATE_MAP`, the import `TARGETS` — and fails both ways
// against `MODULE_OFFERED_RIGHTS`. Offered-but-unasked is theatre; asked-but-
// unoffered refuses everybody. It is a good law and it passed every day of the
// defect this file exists for, because it never looks at the GRID. Whether a
// right is offered and whether the screen DRAWS it as offered are two different
// questions, and only the first had a check.
//
// The defect, in the client's own count on 21 Aug 2026: fifteen of the eighty-
// eight boxes in a role's band decided nothing, and an inert box looks exactly
// like a live one. The kit shipped the fix as `PermissionModule.rights` on
// 2026-09-07 — and it stayed unusable for two days, because `roles-matrix.tsx`
// drew the client's approved shape by HAND-TRANSPOSING the kit's axes, which
// put `rights` on the wrong one. Kit v1.2.75's `orientation="roles-as-rows"`
// retires the transpose and the prop can finally be passed.
//
// So this file holds the half nothing held: that the grid a person looks at
// draws fifteen boxes as un-decidable, and that the number is DERIVED from
// `MODULE_OFFERED_RIGHTS` rather than typed in — the same data R36 rules, read
// the way a reader meets it.

import { cleanup, render, screen, within } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import * as React from "react"
import { afterEach, describe, expect, it } from "vitest"

import { PermissionMatrix } from "@shared/ui/components/permission-matrix/permission-matrix"
import { stripComments } from "@shared/rules/source-scan"
import { MODULE_RIGHTS, TEAM_MODULES, offeredRights } from "@shared/team-modules"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")
const MATRIX = join(ROOT, "web", "components", "team", "roles-matrix.tsx")
const source = () => stripComments(readFileSync(MATRIX, "utf8"))

afterEach(cleanup)

/** The app's own SERVER ⇄ KIT rights vocabulary, which `roles-matrix.tsx` owns.
 * Duplicated here deliberately and asserted against that file below: a test that
 * imported the mapping could not notice it changing. */
const RIGHT_TO_KIT: Record<string, string> = {
  read: "see",
  create: "create",
  edit: "edit",
  delete: "delete",
}

/** THE NUMBER, DERIVED. Every module gets one slot per right whether or not a
 * decision exists behind it, so the inert count is the shortfall summed over the
 * catalogue — never a literal, because a literal would go on being right while
 * the data underneath it moved. */
function inertBoxesPerRoleBand(): number {
  let inert = 0
  for (const key of TEAM_MODULES) inert += MODULE_RIGHTS.length - offeredRights(key).length
  return inert
}

describe("R36 · the roles grid draws no box that decides nothing", () => {
  // ── THE TRIPWIRE, FIRST. Every count below is derived from the catalogue,
  //    and a catalogue that read empty would make each of them trivially true.
  it("the catalogue is really being read (it must not go blind)", () => {
    expect(TEAM_MODULES.length, "the module catalogue is empty — this suite is measuring nothing").
      toBeGreaterThan(15)
    expect(MODULE_RIGHTS.length, "the rights vocabulary is empty").toBe(4)
    // And it can SEE a restriction: if `offeredRights` started answering "all
    // four" for everything, every assertion below would pass with the grid
    // drawing eighty-eight live switches again.
    const restricted = TEAM_MODULES.filter((m) => offeredRights(m).length < MODULE_RIGHTS.length)
    expect(
      restricted.length,
      "no module restricts its rights — MODULE_OFFERED_RIGHTS has stopped being read, and an " +
        "inert-box count derived from it is now zero for the wrong reason"
    ).toBeGreaterThan(0)
    expect(inertBoxesPerRoleBand()).toBeGreaterThan(0)
  })

  /* THE GRID ITSELF, rendered with the props the app builds — one role, so the
   * count below is exactly one role's band. The kit draws an unoffered slot as
   * its own no-value em dash with no control under it; that glyph is what a
   * reader sees where a switch used to be, so that glyph is what is counted. */
  function renderOneBand(rights: (key: string) => readonly string[] | undefined) {
    const modules = TEAM_MODULES.map((key) => ({
      id: key,
      label: key,
      rights: rights(key),
      held: { r1: [] as string[] },
    }))
    render(
      <PermissionMatrix
        modules={modules}
        roles={[{ id: "r1", label: "Admin" }]}
        orientation="roles-as-rows"
        onChange={() => {}}
      />
    )
  }

  /* THE WIDE GRID ONLY. The kit mounts BOTH renders and lets CSS choose — the
   * table is `hidden min-[45rem]:block` and the cards are `min-[45rem]:hidden` —
   * and jsdom applies no media query, so an unscoped count sees the wide grid,
   * the narrow cards and the legend's own teaching dash at once. Scoping to the
   * table is what makes the number mean "one role's band". */
  const band = () => within(screen.getByRole("table"))

  it("fifteen of the eighty-eight boxes are drawn as un-decidable, and the number is derived", () => {
    renderOneBand((key) => offeredRights(key).map((r) => RIGHT_TO_KIT[r]))

    const expected = inertBoxesPerRoleBand()
    const dashes = band().getAllByText("—")
    expect(
      dashes.length,
      `the grid draws ${dashes.length} un-decidable boxes where MODULE_OFFERED_RIGHTS says ` +
        `${expected}. A slot a module does not offer must lose its control (R36) — check that ` +
        `roles-matrix.tsx still passes \`rights\` on its module rows`
    ).toBe(expected)

    // AND THE REST ARE REAL SWITCHES. The complement matters as much as the
    // count: a grid that drew every box as a dash would satisfy an assertion
    // about dashes and decide nothing at all.
    const live = TEAM_MODULES.length * MODULE_RIGHTS.length - expected
    expect(
      band().getAllByRole("checkbox").length,
      "the boxes that ARE offered must still be switches somebody can press"
    ).toBe(live)
  })

  it("the narrow render withholds the same fifteen — one drawing, two shapes", () => {
    // CH27.12's narrow render is the same instruction read on the other axis,
    // and it is the shape a phone gets. A fix that reached only the table would
    // leave every inert box live for exactly the readers who cannot see the
    // grid at all.
    renderOneBand((key) => offeredRights(key).map((r) => RIGHT_TO_KIT[r]))
    const narrow = within(
      document.querySelector('[data-slot="permission-matrix-narrow"]') as HTMLElement
    )
    expect(narrow.getAllByText("—").length).toBe(inertBoxesPerRoleBand())
  })

  it("without `rights` the same grid draws eighty-eight switches — the defect, reproduced", () => {
    // THE POSITIVE CONTROL, and the reason the assertions above are not vacuous:
    // this is precisely what the screen did while the axes were transposed by
    // hand. If the kit ever stopped honouring `rights`, those go red and this
    // stays green, which tells the next reader which of the two halves moved.
    renderOneBand(() => undefined)
    expect(band().queryAllByText("—").length).toBe(0)
    expect(band().getAllByRole("checkbox").length).toBe(
      TEAM_MODULES.length * MODULE_RIGHTS.length
    )
  })

  // ── AND THE CALL SITE, so the render above cannot pass on props the app does
  //    not actually send. The test builds its own; these read the app's.
  describe("the screen sends what this suite renders", () => {
    it("turns the grid with `orientation` rather than by transposing the props", () => {
      const src = source()
      expect(src, "roles-matrix.tsx must turn the grid with the kit's own prop").
        toContain('orientation="roles-as-rows"')
      // THE RATCHET ON THE TRANSPOSE. `modules` takes the modules and `roles`
      // takes the roles; swapping them back is the exact move that made `rights`
      // unpassable and cost fifteen boxes for two days.
      expect(src).toContain("modules={moduleColumns}")
      expect(src).toContain("roles={roleRows}")
    })

    /* THAT THE SCREEN PASSES `rights` AT ALL, and that the two honesty patches
     * it used to carry are gone, is R36's own clause — `offered-rights: the
     * Roles screen hands the kit each module's offered rights`, in
     * web/test/rules.test.ts. It is not repeated here. What that clause CANNOT
     * do is look at the drawing, which is everything above and below. */

    it("keeps no second opinion about what is offered", () => {
      // The local `offered()` predicate the two deleted patches were spelled
      // against. R36 asserts each patch absent by its own shape; this asserts
      // the shared helper absent, so the pair cannot come back under new names.
      expect(
        /\boffered\s*\(/.test(source()),
        "roles-matrix.tsx has grown back a local offered() — the kit answers this now (kit v1.2.75)"
      ).toBe(false)
    })

    it("pins the name column, and names the paper it paints", () => {
      // Twenty-two columns overflow; without this a role's band is bands of
      // `S C E D` with nothing saying whose they are. The ground is not
      // cosmetic — the wrong one is a pale band down every grid at rest.
      const src = source()
      expect(src).toContain("stickyNames")
      expect(src).toContain('stickyGround="panel"')
    })

    it("still owns the vocabulary this suite assumes", () => {
      // `RIGHT_TO_KIT` is duplicated at the top of this file so a change to it
      // is visible here rather than silently absorbed.
      const src = source()
      for (const [ours, kits] of Object.entries(RIGHT_TO_KIT))
        expect(
          src,
          `roles-matrix.tsx no longer maps ${ours} → ${kits}; this suite's copy of the mapping is stale`
        ).toMatch(new RegExp(`${ours}:\\s*"${kits}"`))
    })
  })
})
