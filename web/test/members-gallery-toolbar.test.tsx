// THE MEMBERS TOOLBAR SITS OUTSIDE TEAMPANEL'S OWN PADDED BOX — finding, 21 Sep
// 2026, the same fault `roles-matrix-toolbar.test.tsx`'s own Part Three
// describes on the neighbouring Roles tab: `<TeamPanel>` (default
// `narrowGround`, always soft paper) wrapped the heading, the toolbar AND the
// wall of member cards together inside its own `p-6 lg:p-[var(--space-7)]`
// inset, so this toolbar sat 32px under the tab strip and 32px in from the
// pane edge instead of the app's standard 10px/flush (R83). Fixed the same
// way: the outer box is `<CollectionCard>` now (plain, publishes
// `--toolbar-lead-gap` on itself), and `<TeamPanel>` moved down to wrap only
// the invites disclosure and the wall of `raised` member cards — the soft
// paper those cards still need for contrast.
//
// A STATIC CENSUS, the same discipline as `roles-matrix-toolbar.test.tsx`'s
// own Part Three: the claim is a source-position fact, not a rendered pixel.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"

const ROOT = join(__dirname, "..", "..")
const GALLERY_PATH = join(ROOT, "web", "components", "team", "members-gallery.tsx")
const source = () => stripComments(readFileSync(GALLERY_PATH, "utf8"))

describe("the members toolbar sits outside TeamPanel's own padded box (finding, 21 Sep 2026)", () => {
  it("opens on <CollectionCard>, not <TeamPanel> — the toolbar's own container carries no padding", () => {
    const src = source()
    expect(
      src,
      "members-gallery.tsx must import CollectionCard from screen-bits.tsx, the app's own R83 seam"
    ).toMatch(/import \{[^}]*\bCollectionCard\b[^}]*\}\s*from\s*"@\/components\/deep-link\/screen-bits"/)

    const returnIdx = src.indexOf("return (")
    expect(returnIdx, "this file's return statement must be findable").toBeGreaterThan(-1)
    const collectionCardIdx = src.indexOf("<CollectionCard>", returnIdx)
    expect(
      collectionCardIdx,
      "the return must open on <CollectionCard>, the padding-free container"
    ).toBeGreaterThan(-1)
  })

  it("draws the sr-only heading and <ToolbarRow> BEFORE the nested <TeamPanel> opens", () => {
    const src = source()
    const headlineIdx = src.indexOf('<Headline as="h2" size="h4" className="sr-only">')
    const toolbarIdx = src.search(/<ToolbarRow\b/)
    // The FIRST <TeamPanel> after the toolbar is the nested one wrapping the
    // wall — `source()` strips comments, so this is a plain string search.
    const teamPanelOpenIdx = src.indexOf("<TeamPanel>", toolbarIdx)

    expect(headlineIdx, "the sr-only Members heading must still be drawn").toBeGreaterThan(-1)
    expect(toolbarIdx, "the toolbar must still be drawn").toBeGreaterThan(-1)
    expect(teamPanelOpenIdx, "TeamPanel must still wrap the wall").toBeGreaterThan(-1)

    expect(headlineIdx, "the heading must come before the toolbar").toBeLessThan(toolbarIdx)
    expect(
      toolbarIdx,
      "<ToolbarRow> must open, and its whole call must sit, BEFORE the nested <TeamPanel> — " +
        "the toolbar is no longer inside TeamPanel's own padded box"
    ).toBeLessThan(teamPanelOpenIdx)
  })

  it("wraps <TeamPanel> exactly once, around the invites disclosure and the wall only", () => {
    const src = source()
    const opens = src.match(/<TeamPanel>/g) ?? []
    expect(
      opens.length,
      "exactly one TeamPanel call — a second one would mean the fix duplicated the wrapper instead of moving it"
    ).toBe(1)

    const teamPanelOpenIdx = src.indexOf("<TeamPanel>")
    const teamPanelCloseIdx = src.indexOf("</TeamPanel>", teamPanelOpenIdx)
    const collectionCardCloseIdx = src.lastIndexOf("</CollectionCard>")

    expect(teamPanelCloseIdx, "TeamPanel must still close").toBeGreaterThan(-1)
    expect(collectionCardCloseIdx, "the return must close on </CollectionCard>").toBeGreaterThan(-1)
    expect(
      teamPanelCloseIdx,
      "</TeamPanel> must close before </CollectionCard> — TeamPanel is nested inside the card, not the other way round"
    ).toBeLessThan(collectionCardCloseIdx)

    // AND THE WALL IS INSIDE IT — the soft paper the raised member cards
    // still need for contrast (team-panel.tsx's own comment carries the
    // full argument).
    const cardGridIdx = src.indexOf("<CardGrid", teamPanelOpenIdx)
    expect(cardGridIdx, "the member wall must still be inside TeamPanel").toBeGreaterThan(teamPanelOpenIdx)
    expect(cardGridIdx).toBeLessThan(teamPanelCloseIdx)
  })

  it("the toolbar and the nested TeamPanel still share ONE gapless outer column, so the pinned toolbar has a box to stick through", () => {
    // R63's own trap: `position: sticky` is bounded by its own containing
    // block, so a wrapper around the toolbar ALONE would leave it nothing to
    // stick through (this file's own header, quoted verbatim above the
    // outer gapless column). Proved here as a nesting fact: the toolbar and
    // the nested TeamPanel must both be DIRECT children of the same outer
    // `flex min-w-0 flex-col` column, not the toolbar alone.
    const src = source()
    const outerColIdx = src.indexOf('<div className="flex min-w-0 flex-col">')
    expect(outerColIdx, "the outer gapless column must still exist").toBeGreaterThan(-1)
    const toolbarIdx = src.indexOf("<ToolbarRow", outerColIdx)
    const teamPanelIdx = src.indexOf("<TeamPanel>", outerColIdx)
    expect(toolbarIdx).toBeGreaterThan(outerColIdx)
    expect(teamPanelIdx).toBeGreaterThan(toolbarIdx)
  })
})
