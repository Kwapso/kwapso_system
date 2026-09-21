// THE BOTTOM EDGE, THE PORTAL'S HALF — Aurora, 21 Sep 2026, the Minimal Kit
// page's decisions, item "the bottom edge": "go and imlpement tis appwide,
// also implement the to the bottom edge for main content and assistant like
// in yur previous artifact." The scratchpad page she validated measured the
// AGENCY shell only (`web/components/shell/app-shell.tsx`, the mango-ground
// floating card the kit's `ScreenShell` draws, 16px short of the window's
// bottom edge today) — see `web/test/shell-bottom-edge.test.ts` for that
// half.
//
// THIS FILE PROVES THE PORTAL NEVER HAD THAT BUG, RATHER THAN FIXING IT.
// `portal-shell.tsx` draws its own frame by hand and never imports the kit's
// `ScreenShell` (the kit's own file says so directly: "THE CLIENT PORTAL
// DOES NOT DOUBLE UP … `web-portal/components/portal-shell.tsx` draws its
// own `<main>` directly and never imports `ScreenShell`"). There is no
// mango ground, no floating rounded card, and no assistant dock here at
// all — `<main>` sits directly on the page's own `bg-background`, `flex-1`
// inside a `flex flex-col` column whose only other flow children are the
// sticky header and the sticky bottom nav. A flex-1 item with no bottom
// margin of its own, followed immediately by its column's next flow
// sibling, has no gutter to remove: it already ends exactly where the nav
// begins, at every content length, by construction rather than by a token
// this round could zero.
//
// So "implement it in web-portal/components/portal-shell.tsx" is answered
// by proving the invariant rather than by changing a class, and this suite
// is what stops a future gutter, wrapper card or fixed-position nav from
// quietly reintroducing the bug the agency side just removed.
//
// SABOTAGE: wrap `<main>` in a `bg-card`/`rounded-*` panel, give it its own
// `pb-*`/`mb-*` beyond the ordinary `py-8` content inset, drop `flex-1`, or
// change the bottom `<nav>` from `sticky` to `fixed` (which would take it
// out of the column's flow and could leave a gap under `<main>` again) →
//   × one of the assertions below fails.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const SRC = readFileSync(resolve(__dirname, "../components/portal-shell.tsx"), "utf8")

// Bound the search to PortalShell's own returned frame — from the outer
// `shellRef` div (the flex column every screen sits inside) to the closing
// of that same div, just before `</LanguageProvider>`. `PortalDoor` (the
// signed-out frame, further down the file) is a different component with a
// different layout and must not leak into this census.
const frameStart = SRC.indexOf('<div ref={shellRef} className="flex min-h-[100svh] flex-col">')
const frameEnd = SRC.indexOf("</LanguageProvider>", frameStart)

describe("portal-shell.tsx has no pane to flush — it never draws one", () => {
  it("still opens its one frame as a real flex column, top to bottom", () => {
    expect(frameStart, "PortalShell must still render its shellRef flex column").toBeGreaterThan(-1)
    expect(frameEnd, "the frame must still close before the LanguageProvider").toBeGreaterThan(frameStart)
  })

  const frame = () => SRC.slice(frameStart, frameEnd)

  it("draws no ScreenShell, no mango ground and no assistant dock — the agency's fix does not apply here", () => {
    expect(frame(), "the portal must not import the kit's floating-card shell").not.toContain("ScreenShell")
    expect(frame(), "the portal has no assistant column to flush").not.toContain("agent-dock")
    expect(frame(), "the portal has no assistant column to flush").not.toContain("AgentDockSlot")
  })

  it("renders <main> as a flex-1 item, not a fixed-height or auto-sized one", () => {
    const mainAt = frame().indexOf("<main")
    expect(mainAt, "the frame must still render a <main>").toBeGreaterThan(-1)
    const mainTagEnd = frame().indexOf(">", mainAt)
    const mainTag = frame().slice(mainAt, mainTagEnd)
    expect(mainTag, "<main> must grow to fill the column, or a bottom gap can reappear below it").toContain(
      "flex-1"
    )
  })

  it("<main> carries no card look — no background, radius or shadow that would need a squared corner", () => {
    const mainAt = frame().indexOf("<main")
    const mainTagEnd = frame().indexOf(">", mainAt)
    const mainTag = frame().slice(mainAt, mainTagEnd)
    expect(mainTag, "a bg- class here would mean a floating panel exists to flush").not.toMatch(/\bbg-(?!background)/)
    expect(mainTag, "a rounded- class here would mean a card corner exists to square").not.toMatch(/\brounded-/)
    expect(mainTag, "a shadow- class here would mean a lifted panel exists, which the portal does not draw").not.toMatch(
      /\bshadow-/
    )
  })

  it("<main> pays only its own ordinary content padding, no separate bottom gutter", () => {
    const mainAt = frame().indexOf("<main")
    const mainTagEnd = frame().indexOf(">", mainAt)
    const mainTag = frame().slice(mainAt, mainTagEnd)
    // `py-8` is the SAME inset agency's `screen-shell-body` pays on every
    // side (DENSITY_BODY) — the equivalent of "the pane's own scroller
    // keeps its bottom padding so the last content is not glued to the
    // edge." A second, larger pb-*/mb-* here would be the mango-gutter bug
    // in a different shape.
    expect(mainTag, "content padding must still be the ordinary py-8").toContain("py-8")
    expect(mainTag, "no extra bottom margin/padding beyond the ordinary content inset").not.toMatch(
      /\b(?:pb|mb)-(?!8\b)\S/
    )
  })

  it("the bottom nav stays sticky (in flow) and is the frame's last child, immediately after <main>", () => {
    const mainCloseAt = frame().indexOf("</main>")
    const navAt = frame().indexOf("<nav ref={tabBarRef}")
    expect(mainCloseAt, "the frame must still close its <main>").toBeGreaterThan(-1)
    expect(navAt, "the frame must still render the bottom nav").toBeGreaterThan(mainCloseAt)
    // `sticky`, never `fixed` — fixed would remove the nav from the column's
    // flow and could leave a gap under a shorter <main> again.
    const navTagEnd = frame().indexOf(">", navAt)
    const navTag = frame().slice(navAt, navTagEnd)
    expect(navTag, "the bottom nav must stay a flow item (sticky), not fixed").toContain("sticky bottom-0")
    expect(navTag, "the bottom nav must not switch to fixed positioning").not.toMatch(/\bfixed\b/)
    // Between </main> and <nav there is only LiveStatus, which is
    // position:fixed and contributes no flow height — no spacer div of any
    // kind is allowed to reintroduce a gap.
    const between = frame().slice(mainCloseAt, navAt)
    expect(between, "nothing but the fixed, out-of-flow LiveStatus pill may sit between main and the nav").not.toMatch(
      /<div\b/
    )
  })
})
