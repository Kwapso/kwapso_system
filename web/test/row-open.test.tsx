// THE HELPER ITSELF — `rowOpenHandlers` (web/lib/row-open.ts) is the one seam
// every collection row now opens through, so this pins its three behaviours
// directly rather than through whichever table happens to call it today:
// a plain click calls `onOpen` and never touches the workspace tab store; a
// cmd/ctrl-click or a middle-click opens `path` beside the active tab
// (`openBeside`) IN THE BACKGROUND and never calls `onOpen`; +Shift on either
// gesture opens beside AND calls `onOpen`, switching her there too.
// `ticket-row-opens-beside.test.tsx` and `record-table.test.tsx` prove the
// same behaviours again through each of their own tables — this is the one
// place they are proved once, against the seam itself, and against
// `clickGesture` — the shared classifier `InAppLink` now reads the identical
// grammar through (`in-app-link.test.tsx` proves it there).

import { describe, expect, it, beforeEach, afterEach } from "vitest"

import { clickGesture, rowOpenHandlers } from "@/lib/row-open"
import {
  activeTabIdSnapshot,
  forgetOpenTabs,
  openTabsSnapshot,
  setWorkspaceScope,
  visitTrail,
} from "@/lib/workspace-tabs"

/** A MINIMAL STAND-IN FOR `React.MouseEvent` — the helper reads exactly five
 * things off it (`metaKey`, `ctrlKey`, `shiftKey`, `altKey`, `button`,
 * `preventDefault`), so a fuller fake buys nothing; a `React.MouseEvent`
 * cast would need a whole DOM event behind it for no reason a test needs. */
function click(
  opts: Partial<{ metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; button: number }> = {}
) {
  let prevented = false
  const e = {
    metaKey: opts.metaKey ?? false,
    ctrlKey: opts.ctrlKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    altKey: opts.altKey ?? false,
    button: opts.button ?? 0,
    preventDefault: () => {
      prevented = true
    },
  }
  return { e: e as unknown as React.MouseEvent, wasPrevented: () => prevented }
}

beforeEach(() => {
  forgetOpenTabs()
  localStorage.clear()
  setWorkspaceScope("row-open-test:team1")
  visitTrail([{ path: "/accounts", label: "Accounts" }])
})

afterEach(() => {
  forgetOpenTabs()
})

describe("rowOpenHandlers — a plain click", () => {
  it("calls onOpen, never openBeside, and mints no tab", () => {
    let opened = 0
    const handlers = rowOpenHandlers("/t/team1/accounts/acc-1", "Acme", () => {
      opened++
    })
    const before = openTabsSnapshot().length
    const { e, wasPrevented } = click()
    handlers.onClick(e)
    expect(opened).toBe(1)
    expect(wasPrevented()).toBe(false)
    expect(openTabsSnapshot()).toHaveLength(before)
  })
})

describe("rowOpenHandlers — cmd/ctrl-click", () => {
  it("meta-click opens beside and never calls onOpen", () => {
    let opened = 0
    const handlers = rowOpenHandlers("/t/team1/accounts/acc-1", "Acme", () => {
      opened++
    })
    const before = openTabsSnapshot().length
    const { e, wasPrevented } = click({ metaKey: true })
    handlers.onClick(e)
    expect(opened).toBe(0)
    expect(wasPrevented()).toBe(true)
    expect(openTabsSnapshot()).toHaveLength(before + 1)
    const opened_tab = openTabsSnapshot().at(-1)
    expect(opened_tab?.steps).toEqual([{ path: "/t/team1/accounts/acc-1", label: "Acme" }])
  })

  it("ctrl-click does the same, for Windows/Linux", () => {
    let opened = 0
    const handlers = rowOpenHandlers("/t/team1/accounts/acc-1", "Acme", () => {
      opened++
    })
    const before = openTabsSnapshot().length
    const { e } = click({ ctrlKey: true })
    handlers.onClick(e)
    expect(opened).toBe(0)
    expect(openTabsSnapshot()).toHaveLength(before + 1)
  })
})

describe("rowOpenHandlers — middle-click, on onAuxClick", () => {
  it("button 1 opens beside and never calls onOpen", () => {
    let opened = 0
    const handlers = rowOpenHandlers("/t/team1/accounts/acc-1", "Acme", () => {
      opened++
    })
    const before = openTabsSnapshot().length
    const { e, wasPrevented } = click({ button: 1 })
    handlers.onAuxClick(e)
    expect(opened).toBe(0)
    expect(wasPrevented()).toBe(true)
    expect(openTabsSnapshot()).toHaveLength(before + 1)
  })

  it("any other button on onAuxClick does nothing — never onOpen, never a tab", () => {
    let opened = 0
    const handlers = rowOpenHandlers("/t/team1/accounts/acc-1", "Acme", () => {
      opened++
    })
    const before = openTabsSnapshot().length
    const { e, wasPrevented } = click({ button: 2 })
    handlers.onAuxClick(e)
    expect(opened).toBe(0)
    expect(wasPrevented()).toBe(false)
    expect(openTabsSnapshot()).toHaveLength(before)
  })
})

// THE BACKGROUND-TAB PROOF — 18 Sep 2026's grammar change. Before this date
// `openBeside` fronting what it opens was indistinguishable from "the row
// opened beside AND switched", because nothing here ever checked the STORE's
// own active tab. Now that a plain modifier click is Chrome's own background
// default, this is the seam that actually proves it holds for a row too, not
// just for `InAppLink` (`in-app-link.test.tsx`'s own "opens beside IN THE
// BACKGROUND" block).
describe("rowOpenHandlers — cmd/ctrl-click opens beside IN THE BACKGROUND", () => {
  it("meta-click never fronts the new tab — the previously active tab stays active", () => {
    const handlers = rowOpenHandlers("/t/team1/accounts/acc-1", "Acme", () => {})
    const beforeId = activeTabIdSnapshot()
    const { e } = click({ metaKey: true })
    handlers.onClick(e)
    expect(activeTabIdSnapshot()).toBe(beforeId)
  })
})

describe("rowOpenHandlers — +Shift opens beside AND switches (calls onOpen too)", () => {
  it("meta+shift-click opens beside, fronts the new tab, and calls onOpen", () => {
    let opened = 0
    const handlers = rowOpenHandlers("/t/team1/accounts/acc-1", "Acme", () => {
      opened++
    })
    const before = openTabsSnapshot().length
    const { e, wasPrevented } = click({ metaKey: true, shiftKey: true })
    handlers.onClick(e)
    expect(opened).toBe(1) // switched — the plain-click action ran too
    expect(wasPrevented()).toBe(true)
    expect(openTabsSnapshot()).toHaveLength(before + 1)
    const opened_tab = openTabsSnapshot().at(-1)
    expect(activeTabIdSnapshot()).toBe(opened_tab?.id)
  })

  it("middle-click+shift, via onAuxClick, does the same", () => {
    let opened = 0
    const handlers = rowOpenHandlers("/t/team1/accounts/acc-1", "Acme", () => {
      opened++
    })
    const before = openTabsSnapshot().length
    const { e } = click({ button: 1, shiftKey: true })
    handlers.onAuxClick(e)
    expect(opened).toBe(1)
    expect(openTabsSnapshot()).toHaveLength(before + 1)
  })
})

describe("rowOpenHandlers — Shift or Alt alone are left alone, same as a real anchor", () => {
  it("a plain shift-click does nothing — no onOpen, no tab, no preventDefault", () => {
    let opened = 0
    const handlers = rowOpenHandlers("/t/team1/accounts/acc-1", "Acme", () => {
      opened++
    })
    const before = openTabsSnapshot().length
    const { e, wasPrevented } = click({ shiftKey: true })
    handlers.onClick(e)
    expect(opened).toBe(0)
    expect(wasPrevented()).toBe(false)
    expect(openTabsSnapshot()).toHaveLength(before)
  })

  it("alt alone does nothing, even combined with cmd", () => {
    let opened = 0
    const handlers = rowOpenHandlers("/t/team1/accounts/acc-1", "Acme", () => {
      opened++
    })
    const before = openTabsSnapshot().length
    const { e, wasPrevented } = click({ metaKey: true, altKey: true })
    handlers.onClick(e)
    expect(opened).toBe(0)
    expect(wasPrevented()).toBe(false)
    expect(openTabsSnapshot()).toHaveLength(before)
  })
})

// `clickGesture` ITSELF — the pure classifier both `rowOpenHandlers` (above)
// and `InAppLink` (in-app-link.test.tsx) now read a click through. Tested
// directly here rather than only through a rendered component, because it is
// the one function the whole grammar actually lives in.
describe("clickGesture", () => {
  const base = { metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, button: 0 }

  it("a plain click (no modifiers, button 0) is \"same\"", () => {
    expect(clickGesture(base)).toBe("same")
  })

  it("mac: meta alone is \"beside\"", () => {
    expect(clickGesture({ ...base, metaKey: true })).toBe("beside")
  })

  it("mac: meta+shift is \"beside-switch\"", () => {
    expect(clickGesture({ ...base, metaKey: true, shiftKey: true })).toBe("beside-switch")
  })

  it("windows/linux: ctrl alone is \"beside\"", () => {
    expect(clickGesture({ ...base, ctrlKey: true })).toBe("beside")
  })

  it("windows/linux: ctrl+shift is \"beside-switch\"", () => {
    expect(clickGesture({ ...base, ctrlKey: true, shiftKey: true })).toBe("beside-switch")
  })

  it("the middle button (button 1) alone is \"beside\"", () => {
    expect(clickGesture({ ...base, button: 1 })).toBe("beside")
  })

  it("the middle button plus shift is \"beside-switch\"", () => {
    expect(clickGesture({ ...base, button: 1, shiftKey: true })).toBe("beside-switch")
  })

  it("a plain shift-click, no meta/ctrl, no middle button, is null — the browser's own gesture", () => {
    expect(clickGesture({ ...base, shiftKey: true })).toBeNull()
  })

  it("alt alone is null — the browser's own save-as", () => {
    expect(clickGesture({ ...base, altKey: true })).toBeNull()
  })

  it("alt always wins, even combined with meta/ctrl or shift", () => {
    expect(clickGesture({ ...base, altKey: true, metaKey: true })).toBeNull()
    expect(clickGesture({ ...base, altKey: true, ctrlKey: true, shiftKey: true })).toBeNull()
  })

  it("any other button (e.g. a right-click, button 2) with no modifier is null", () => {
    expect(clickGesture({ ...base, button: 2 })).toBeNull()
  })
})
