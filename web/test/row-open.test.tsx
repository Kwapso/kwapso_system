// THE HELPER ITSELF — `rowOpenHandlers` (web/lib/row-open.ts) is the one seam
// every collection row now opens through, so this pins its three behaviours
// directly rather than through whichever table happens to call it today:
// a plain click calls `onOpen` and never touches the workspace tab store; a
// cmd/ctrl-click or a middle-click opens `path` beside the active tab
// (`openBeside`) IN THE BACKGROUND and never calls `onOpen`; +Shift on either
// gesture opens beside AND calls `onOpen`, switching her there too.
// `ticket-row-opens-beside.test.tsx` and `record-table-opens-beside.test.tsx`
// prove the same behaviours again through each of their own tables — this is
// the one place they are proved once, against the seam itself, and against
// `clickGesture` — the shared classifier `InAppLink` now reads the identical
// grammar through (`in-app-link.test.tsx` proves it there).
//
// REAL DOM EVENTS, ON A MOUNTED ELEMENT — NEVER A HAND-BUILT FAKE OBJECT.
// Until 18 Sep 2026 every test below called `handlers.onClick(fakeEvent)` /
// `handlers.onAuxClick(fakeEvent)` directly, with a five-field stand-in for
// `React.MouseEvent`. That shape passed every one of these tests while the
// live app, on staging, failed three different ways: a real `<a href>`'s
// middle-click did nothing at all, a cmd+shift-click REPLACED the tab instead
// of opening beside it, and a board card's cmd-click navigated in place — none
// of which a direct function call, with a hand-rolled `preventDefault` that
// never has to survive React's own event system or a real browser's own
// default actions (autoscroll on a middle mousedown, a link's own navigation),
// could ever have caught. `in-app-link.test.tsx` already tests through a
// mounted anchor; this file now mounts `rowOpenHandlers`'s own two handlers on
// a plain element and drives them with `fireEvent`, the identical discipline,
// so the SEAM's own suite can no longer pass on a claim the DOM does not back.
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import * as React from "react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { clickGesture, rowOpenHandlers } from "@/lib/row-open"
import {
  activeTabIdSnapshot,
  forgetOpenTabs,
  openTabsSnapshot,
  setWorkspaceScope,
  visitTrail,
} from "@/lib/workspace-tabs"

/** THE MINIMAL ROW `rowOpenHandlers` IS BUILT FOR — a plain element with no
 * anchor under it (the shape `TicketRowsTable`/`RecordTable`/`AppTicketsBoard`
 * each wire the returned handlers onto), so this proves the seam the way its
 * real callers actually reach it: through React's own synthetic event system
 * on a mounted DOM node, driven by `fireEvent`, never by calling a handler
 * function with a value this file constructed itself. */
function Row({ path, label, onOpen }: { path: string; label: string; onOpen: () => void }) {
  const handlers = rowOpenHandlers(path, label, onOpen)
  return (
    <div role="row" onClick={handlers.onClick} onAuxClick={handlers.onAuxClick}>
      {label}
    </div>
  )
}

const auxClick = (el: Element, opts: { button: number; shiftKey?: boolean }) =>
  fireEvent(el, new MouseEvent("auxclick", { bubbles: true, cancelable: true, ...opts }))

beforeEach(() => {
  forgetOpenTabs()
  localStorage.clear()
  setWorkspaceScope("row-open-test:team1")
  visitTrail([{ path: "/accounts", label: "Accounts" }])
})

afterEach(() => {
  cleanup()
  forgetOpenTabs()
})

describe("rowOpenHandlers — a plain click", () => {
  it("calls onOpen, never openBeside, mints no tab, and never prevents the default", () => {
    let opened = 0
    render(<Row path="/t/team1/accounts/acc-1" label="Acme" onOpen={() => { opened++ }} />)
    const before = openTabsSnapshot().length
    const notCanceled = fireEvent.click(screen.getByText("Acme"))
    expect(opened).toBe(1)
    expect(notCanceled, "a plain click must not call preventDefault").toBe(true)
    expect(openTabsSnapshot()).toHaveLength(before)
  })
})

describe("rowOpenHandlers — cmd/ctrl-click", () => {
  it("meta-click opens beside, prevents the default, and never calls onOpen", () => {
    let opened = 0
    render(<Row path="/t/team1/accounts/acc-1" label="Acme" onOpen={() => { opened++ }} />)
    const before = openTabsSnapshot().length
    const notCanceled = fireEvent.click(screen.getByText("Acme"), { metaKey: true })
    expect(opened).toBe(0)
    expect(notCanceled, "a beside-opening click must call preventDefault").toBe(false)
    expect(openTabsSnapshot()).toHaveLength(before + 1)
    const opened_tab = openTabsSnapshot().at(-1)
    expect(opened_tab?.steps).toEqual([{ path: "/t/team1/accounts/acc-1", label: "Acme" }])
  })

  it("ctrl-click does the same, for Windows/Linux", () => {
    let opened = 0
    render(<Row path="/t/team1/accounts/acc-1" label="Acme" onOpen={() => { opened++ }} />)
    const before = openTabsSnapshot().length
    fireEvent.click(screen.getByText("Acme"), { ctrlKey: true })
    expect(opened).toBe(0)
    expect(openTabsSnapshot()).toHaveLength(before + 1)
  })
})

describe("rowOpenHandlers — middle-click, via a real auxclick event", () => {
  it("button 1 opens beside, prevents the default, and never calls onOpen", () => {
    let opened = 0
    render(<Row path="/t/team1/accounts/acc-1" label="Acme" onOpen={() => { opened++ }} />)
    const before = openTabsSnapshot().length
    const notCanceled = auxClick(screen.getByText("Acme"), { button: 1 })
    expect(opened).toBe(0)
    expect(notCanceled, "a middle-click open must call preventDefault").toBe(false)
    expect(openTabsSnapshot()).toHaveLength(before + 1)
  })

  it("any other button on auxclick does nothing — never onOpen, never a tab, never prevented", () => {
    let opened = 0
    render(<Row path="/t/team1/accounts/acc-1" label="Acme" onOpen={() => { opened++ }} />)
    const before = openTabsSnapshot().length
    const notCanceled = auxClick(screen.getByText("Acme"), { button: 2 })
    expect(opened).toBe(0)
    expect(notCanceled).toBe(true)
    expect(openTabsSnapshot()).toHaveLength(before)
  })

  it("a plain click never fires the beside behaviour through onAuxClick either", () => {
    let opened = 0
    render(<Row path="/t/team1/accounts/acc-1" label="Acme" onOpen={() => { opened++ }} />)
    const before = openTabsSnapshot().length
    auxClick(screen.getByText("Acme"), { button: 0 })
    expect(opened).toBe(0)
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
    render(<Row path="/t/team1/accounts/acc-1" label="Acme" onOpen={() => {}} />)
    const beforeId = activeTabIdSnapshot()
    fireEvent.click(screen.getByText("Acme"), { metaKey: true })
    expect(activeTabIdSnapshot()).toBe(beforeId)
  })
})

describe("rowOpenHandlers — +Shift opens beside AND switches (calls onOpen too)", () => {
  it("meta+shift-click opens beside, fronts the new tab, prevents the default, and calls onOpen", () => {
    let opened = 0
    render(<Row path="/t/team1/accounts/acc-1" label="Acme" onOpen={() => { opened++ }} />)
    const before = openTabsSnapshot().length
    const notCanceled = fireEvent.click(screen.getByText("Acme"), { metaKey: true, shiftKey: true })
    expect(opened).toBe(1) // switched — the plain-click action ran too
    expect(notCanceled).toBe(false)
    expect(openTabsSnapshot()).toHaveLength(before + 1)
    const opened_tab = openTabsSnapshot().at(-1)
    expect(activeTabIdSnapshot()).toBe(opened_tab?.id)
  })

  it("middle-click+shift, via a real auxclick event, does the same", () => {
    let opened = 0
    render(<Row path="/t/team1/accounts/acc-1" label="Acme" onOpen={() => { opened++ }} />)
    const before = openTabsSnapshot().length
    auxClick(screen.getByText("Acme"), { button: 1, shiftKey: true })
    expect(opened).toBe(1)
    expect(openTabsSnapshot()).toHaveLength(before + 1)
    const opened_tab = openTabsSnapshot().at(-1)
    expect(activeTabIdSnapshot()).toBe(opened_tab?.id)
  })
})

describe("rowOpenHandlers — Shift or Alt alone are left alone, same as a real anchor", () => {
  it("a plain shift-click does nothing — no onOpen, no tab, no preventDefault", () => {
    let opened = 0
    render(<Row path="/t/team1/accounts/acc-1" label="Acme" onOpen={() => { opened++ }} />)
    const before = openTabsSnapshot().length
    const notCanceled = fireEvent.click(screen.getByText("Acme"), { shiftKey: true })
    expect(opened).toBe(0)
    expect(notCanceled).toBe(true)
    expect(openTabsSnapshot()).toHaveLength(before)
  })

  it("alt alone does nothing, even combined with cmd", () => {
    let opened = 0
    render(<Row path="/t/team1/accounts/acc-1" label="Acme" onOpen={() => { opened++ }} />)
    const before = openTabsSnapshot().length
    const notCanceled = fireEvent.click(screen.getByText("Acme"), { metaKey: true, altKey: true })
    expect(opened).toBe(0)
    expect(notCanceled).toBe(true)
    expect(openTabsSnapshot()).toHaveLength(before)
  })
})

// `clickGesture` ITSELF — the pure classifier both `rowOpenHandlers` (above)
// and `InAppLink` (in-app-link.test.tsx) now read a click through. This part
// alone stays a direct call: there is no DOM behaviour to bypass by calling a
// function that reads five fields and returns a string — the whole grammar
// lives here, and it is the one function worth pinning in isolation from any
// element at all.
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
