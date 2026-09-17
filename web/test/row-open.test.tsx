// THE HELPER ITSELF — `rowOpenHandlers` (web/lib/row-open.ts) is the one seam
// every collection row now opens through, so this pins its three behaviours
// directly rather than through whichever table happens to call it today:
// a plain click calls `onOpen` and never touches the workspace tab store; a
// cmd/ctrl-click or a middle-click opens `path` beside the active tab
// (`openBeside`) and never calls `onOpen`. `ticket-row-opens-beside.test.tsx`
// and `record-table.test.tsx` prove the same three behaviours again through
// each of their own tables — this is the one place they are proved once,
// against the seam itself.

import { describe, expect, it, beforeEach, afterEach } from "vitest"

import { rowOpenHandlers } from "@/lib/row-open"
import { forgetOpenTabs, openTabsSnapshot, setWorkspaceScope, visitTrail } from "@/lib/workspace-tabs"

/** A MINIMAL STAND-IN FOR `React.MouseEvent` — the helper reads exactly four
 * things off it (`metaKey`, `ctrlKey`, `button`, `preventDefault`), so a
 * fuller fake buys nothing; a `React.MouseEvent` cast would need a whole DOM
 * event behind it for no reason a test needs. */
function click(opts: Partial<{ metaKey: boolean; ctrlKey: boolean; button: number }> = {}) {
  let prevented = false
  const e = {
    metaKey: opts.metaKey ?? false,
    ctrlKey: opts.ctrlKey ?? false,
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
