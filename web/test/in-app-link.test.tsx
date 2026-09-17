// IN-APP-LINK'S CLICK GRAMMAR — the client's ruling, 17 Sep 2026, verbatim:
//
//   "Unless I do it on purpose to open a new tab, everything happens on the
//    same tab... Unless I press Command and click, this would open a new
//    tab, and the same behavior in Windows, just replicating Google Chrome."
//
// A PLAIN LEFT CLICK still navigates in place (unchanged from before this
// ruling — `web/test/rich-text.test.ts` and the R37 census cover that half).
// This file is about the NEW half: cmd/ctrl-click and a middle-click open the
// destination as its own workspace tab beside the one she is on, and take
// the browser's own new-tab/new-window gesture away from it while doing so.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import * as React from "react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { InAppLink } from "@/components/shell/in-app-link"
import {
  activateTab,
  activeTabIdSnapshot,
  activeTabPathSnapshot,
  forgetOpenTabs,
  MAX_OPEN_TABS,
  openBeside,
  openTabsSnapshot,
  setWorkspaceScope,
  visitTrail,
} from "@/lib/workspace-tabs"

beforeEach(() => {
  forgetOpenTabs()
  localStorage.clear()
  setWorkspaceScope("in-app-link-test:team1")
  visitTrail([{ path: "/apps", label: "Apps" }])
})

afterEach(cleanup)

describe("a plain left click", () => {
  it("navigates in place and never opens a workspace tab", () => {
    const seen: string[] = []
    render(
      <InAppLink href="/apps/A1" onNavigate={(p) => seen.push(p)}>
        Confia
      </InAppLink>
    )
    fireEvent.click(screen.getByText("Confia"))
    expect(seen).toEqual(["/apps/A1"])
    expect(openTabsSnapshot()).toHaveLength(1) // still the one tab from beforeEach
  })
})

describe("cmd/ctrl-click — opens beside, and takes the gesture from the browser", () => {
  it("meta-click opens a new tab beside the active one and fronts it", () => {
    const seen: string[] = []
    render(
      <InAppLink href="/apps/A1" onNavigate={(p) => seen.push(p)}>
        Confia
      </InAppLink>
    )
    const before = openTabsSnapshot().length
    fireEvent.click(screen.getByText("Confia"), { metaKey: true })
    expect(openTabsSnapshot()).toHaveLength(before + 1)
    expect(activeTabPathSnapshot()).toBe("/apps/A1")
    expect(seen).toEqual(["/apps/A1"]) // she is taken to the new tab
  })

  it("ctrl-click does the same, for Windows/Linux", () => {
    render(<InAppLink href="/apps/A2">Beta</InAppLink>)
    const before = openTabsSnapshot().length
    fireEvent.click(screen.getByText("Beta"), { ctrlKey: true })
    expect(openTabsSnapshot()).toHaveLength(before + 1)
    expect(activeTabPathSnapshot()).toBe("/apps/A2")
  })

  it("the destination's own text becomes the new tab's label", () => {
    render(<InAppLink href="/apps/A3">Gamma</InAppLink>)
    fireEvent.click(screen.getByText("Gamma"), { metaKey: true })
    const opened = openTabsSnapshot().at(-1)
    expect(opened?.steps).toEqual([{ path: "/apps/A3", label: "Gamma" }])
  })

  it("cmd-clicking the same link twice opens two tabs, not one reactivated", () => {
    render(<InAppLink href="/apps/A1">Confia</InAppLink>)
    fireEvent.click(screen.getByText("Confia"), { metaKey: true })
    fireEvent.click(screen.getByText("Confia"), { metaKey: true })
    expect(openTabsSnapshot().filter((t) => t.steps[0]?.path === "/apps/A1")).toHaveLength(2)
  })
})

describe("middle-click (button 1) — the same gesture, via auxclick", () => {
  // `fireEvent` has no built-in `auxClick` helper (a middle-click fires the
  // DOM's own `auxclick`, which dom-testing-library's default event map does
  // not name) — dispatched by hand, the same event `onAuxClick` listens for.
  const auxClick = (el: Element, button: number) =>
    fireEvent(el, new MouseEvent("auxclick", { bubbles: true, cancelable: true, button }))

  it("opens beside and fronts it, exactly like a cmd-click", () => {
    render(<InAppLink href="/apps/A4">Delta</InAppLink>)
    const before = openTabsSnapshot().length
    auxClick(screen.getByText("Delta"), 1)
    expect(openTabsSnapshot()).toHaveLength(before + 1)
    expect(activeTabPathSnapshot()).toBe("/apps/A4")
  })

  it("a plain click never fires the beside behaviour through onAuxClick", () => {
    render(<InAppLink href="/apps/A5">Epsilon</InAppLink>)
    const before = openTabsSnapshot().length
    auxClick(screen.getByText("Epsilon"), 0)
    expect(openTabsSnapshot()).toHaveLength(before)
  })
})

// ── THE CLIENT'S RULING, 17 SEP 2026, VERBATIM ───────────────────────────────
//
//   "When I open a new tab from an existing tab, every time, it needs to be
//    to the immediate right of the tab that is active."
//
// `openBeside` (`workspace-tabs.ts`) already carries its own exhaustive proof
// of this per door — this file's own job is narrower: prove the TWO gestures
// it owns (cmd/ctrl-click, middle-click) actually reach that door with the
// currently active tab intact, at the moment of the click, in every position
// a person might have left it. `beforeEach` above already opens one tab
// (`/apps`); each test here grows the strip from there with `openBeside`
// directly (the store's own mint door — the same one a modified click ends
// up calling) so the fixture reflects a person who already has several tabs
// open before the click this test is actually about.
describe("cmd/ctrl-click and middle-click land the new tab at activeIndex + 1", () => {
  function seedThreeMore(): string[] {
    openBeside("/apps/B", "B")
    openBeside("/apps/C", "C")
    openBeside("/apps/D", "D")
    return openTabsSnapshot().map((t) => t.id) // [Apps, B, C, D] — D fronted
  }

  it("meta-click: active tab FIRST", () => {
    const [appsId] = seedThreeMore()
    activateTab(appsId ?? "")
    const prevActiveIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
    render(<InAppLink href="/apps/NEW">New</InAppLink>)
    fireEvent.click(screen.getByText("New"), { metaKey: true })
    const newIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
    expect(newIndex).toBe(prevActiveIndex + 1)
  })

  it("meta-click: active tab in the MIDDLE", () => {
    const ids = seedThreeMore()
    activateTab(ids[1] ?? "") // "B"
    const prevActiveIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
    render(<InAppLink href="/apps/NEW">New</InAppLink>)
    fireEvent.click(screen.getByText("New"), { metaKey: true })
    const newIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
    expect(newIndex).toBe(prevActiveIndex + 1)
  })

  it("meta-click: active tab LAST", () => {
    const ids = seedThreeMore()
    activateTab(ids[3] ?? "") // "D", already last/active
    const prevActiveIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
    render(<InAppLink href="/apps/NEW">New</InAppLink>)
    fireEvent.click(screen.getByText("New"), { metaKey: true })
    const newIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
    expect(newIndex).toBe(prevActiveIndex + 1)
  })

  it("middle-click lands at activeIndex + 1 too, not just meta-click", () => {
    const auxClick = (el: Element, button: number) =>
      fireEvent(el, new MouseEvent("auxclick", { bubbles: true, cancelable: true, button }))
    const ids = seedThreeMore()
    activateTab(ids[1] ?? "") // middle position
    const prevActiveIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
    render(<InAppLink href="/apps/NEW">New</InAppLink>)
    auxClick(screen.getByText("New"), 1)
    const newIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
    expect(newIndex).toBe(prevActiveIndex + 1)
  })

  it("with the strip already at MAX_OPEN_TABS, eviction still leaves the new tab immediately right of the active one", () => {
    // beforeEach already opened one tab; fill the rest of the way to the ceiling.
    for (let i = 0; i < MAX_OPEN_TABS - 1; i++) openBeside(`/apps/S${String(i)}`, `S${String(i)}`)
    const ids = openTabsSnapshot().map((t) => t.id)
    expect(ids).toHaveLength(MAX_OPEN_TABS)
    const anchor = ids[3] ?? "" // some tab in the middle, freshly touched by activateTab
    activateTab(anchor)
    render(<InAppLink href="/apps/NEW">New</InAppLink>)
    fireEvent.click(screen.getByText("New"), { metaKey: true })
    expect(openTabsSnapshot()).toHaveLength(MAX_OPEN_TABS) // the ceiling held
    const anchorIndex = openTabsSnapshot().findIndex((t) => t.id === anchor)
    expect(anchorIndex, "the tab she opened FROM must survive its own eviction pass").toBeGreaterThanOrEqual(0)
    const newIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
    expect(newIndex).toBe(anchorIndex + 1)
  })
})

describe("shift and alt clicks are left to the browser", () => {
  it("a shift-click is not intercepted at all — no tab opened, no onNavigate call", () => {
    const seen: string[] = []
    render(
      <InAppLink href="/apps/A6" onNavigate={(p) => seen.push(p)}>
        Zeta
      </InAppLink>
    )
    const before = openTabsSnapshot().length
    fireEvent.click(screen.getByText("Zeta"), { shiftKey: true })
    expect(openTabsSnapshot()).toHaveLength(before)
    expect(seen).toEqual([])
  })
})
