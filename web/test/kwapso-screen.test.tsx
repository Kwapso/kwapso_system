// KWAPSO-SCREEN.TSX OFFERS EXACTLY ONE EDIT DOOR — finding, 21 Sep 2026: this
// screen drew "Edit name and logo" twice, the head pencil beside the gear
// (R100, centred on `team.name`) and a second button of the same words in
// the (otherwise plain) Details tab body. Fixed by keeping the head pencil —
// the one door R100 already centres — and turning the Details tab body back
// into the plain fact list, no second control (R88 in spirit: one door).
//
// A STATIC CENSUS, the same discipline `roles-matrix-toolbar.test.tsx` and
// every other source-position law in this repo use: the claim is about the
// SHAPE of the file (how many edit triggers it wires, and where), which a
// source read proves directly and a full render would only prove indirectly
// through several more layers of API mocking this file does not need.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"

const ROOT = join(__dirname, "..", "..")
const SCREEN_PATH = join(ROOT, "web", "components", "screens", "kwapso-screen.tsx")
const source = () => stripComments(readFileSync(SCREEN_PATH, "utf8"))

describe("KwapsoScreen draws exactly one edit door (finding, 21 Sep 2026)", () => {
  it("mounts exactly one <EditPenButton> — the head pencil beside the gear", () => {
    const src = source()
    const matches = src.match(/<EditPenButton\b/g) ?? []
    expect(
      matches.length,
      "kwapso-screen.tsx must mount exactly one <EditPenButton> — a second edit trigger " +
        "is the duplicate door this finding removed"
    ).toBe(1)
  })

  it("no longer draws a second, body-level \"Edit name and logo\" button", () => {
    const src = source()
    expect(
      src,
      'the Details tab body must not draw its own "Edit name and logo" button any more — the head pencil is the one door'
    ).not.toContain("Edit name and logo")
    expect(
      src,
      "the body button's own identity-editing state must be gone with it"
    ).not.toContain("identityOpen")
    expect(
      src,
      "<TeamEditDialog> must be gone from this file — it is still reachable app-wide through " +
        "write-panels.tsx's own ?panel=edit&module=team deep link, just no longer triggered from here"
    ).not.toContain("TeamEditDialog")
  })

  it("the Details tab body is the plain fact list only — <OverviewList>, no trailing <Button>", () => {
    // `stripComments()` deletes comment text, so this is anchored on real
    // code either side of the branch: the fact list itself, through to the
    // IIFE call that closes `renderPanel`'s three branches.
    const src = source()
    const overviewIdx = src.indexOf("<OverviewList")
    const iifeCallIdx = src.indexOf("})({ value: tab })", overviewIdx)
    expect(overviewIdx, "the Details tab must still draw <OverviewList>").toBeGreaterThan(-1)
    expect(iifeCallIdx, "the renderPanel IIFE's own closing call must be findable after it").toBeGreaterThan(overviewIdx)

    const body = src.slice(overviewIdx, iifeCallIdx)
    expect(body, "no <Button> left in the Details tab body — the fact list is the whole of it").not.toMatch(/<Button\b/)
  })

  it("the head pencil is still the one that opens LegalDetailsDialog, unchanged by this fix", () => {
    const src = source()
    expect(src).toMatch(/<EditPenButton onClick=\{\(\) => setEditOpen\(true\)\} label=\{t\("Edit"\)\} \/>/)
    expect(src).toContain("<LegalDetailsDialog")
  })
})
