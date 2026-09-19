// THE TICKETS PAGE "RELOADS BY ITSELF WITH A YELLOW ANIMATION" (T3656/B0293).
//
// `healStaleShell`'s own unconditional `location.reload()` was right for the
// ONE place it was written for — a render-phase crash the ErrorBoundary
// catches, where the tree already failed to draw a frame and there is nothing
// under anybody's hands to lose. `VersionWatch`'s own `window` listeners
// reused the SAME function for a bare `import()` outside the render phase — a
// lazy dialog, a script tag — where the screen is NOT broken: reached this
// way on a day with five or six staging deploys while lanes had /tickets open
// creating test tickets, it silently replaced a working screen mid-task and
// replayed the mango boot mark, which read exactly like an unprompted reload.
//
// `healStaleShellGently` is the fix: a visible tab is never yanked. It arms a
// deferred reload (a toast, and reloading for real the next time the tab goes
// hidden) instead of reloading on the spot; an already-hidden tab reloads
// immediately, same as `healStaleShell`, because nobody is looking at it.

import { beforeEach, describe, expect, it, vi } from "vitest"

const toast = vi.hoisted(() => vi.fn())
vi.mock("@shared/ui/components/sonner/sonner", () => ({ toast }))

import {
  healStaleShellGently,
  resetDeferredReloadForTest,
} from "@/components/shell/version-watch"

const reload = vi.fn()

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  })
}

function chunkError(): Error {
  const e = new Error("Loading chunk 5 failed.")
  e.name = "ChunkLoadError"
  return e
}

beforeEach(() => {
  reload.mockClear()
  toast.mockClear()
  sessionStorage.clear()
  resetDeferredReloadForTest()
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { reload, href: "https://agency-staging.kwapso.app/tickets" },
  })
  setVisibility("visible")
})

describe("a stale chunk caught outside the render phase, tab visible", () => {
  // SABOTAGE: call healStaleShell instead of healStaleShellGently from
  // VersionWatch's own listeners →
  //   × never reloads a visible tab on the spot
  //     AssertionError: expected "vi.fn()" to be called 0 times, but got 1 times
  it("never reloads a visible tab on the spot", () => {
    const handled = healStaleShellGently(chunkError(), undefined, (s) => s)
    expect(handled).toBe(true)
    expect(reload).not.toHaveBeenCalled()
  })

  // SABOTAGE: drop the toast call from healStaleShellGently →
  //   × says a new version is ready instead of yanking the page
  //     AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times
  it("says a new version is ready instead of yanking the page", () => {
    healStaleShellGently(chunkError(), undefined, (s) => s)
    expect(toast).toHaveBeenCalledTimes(1)
    expect(toast.mock.calls[0][0]).toBe("A new version is available.")
    expect(toast.mock.calls[0][1].action.label).toBe("Reload")
  })

  // SABOTAGE: drop the visibilitychange listener that arms the deferred
  // reload →
  //   × reloads for real once the tab is hidden, with nobody's hands on it
  //     AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times
  it("reloads for real once the tab is hidden, with nobody's hands on it", () => {
    healStaleShellGently(chunkError(), undefined, (s) => s)
    expect(reload).not.toHaveBeenCalled()
    setVisibility("hidden")
    document.dispatchEvent(new Event("visibilitychange"))
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it("the toast's own Reload button also reloads immediately", () => {
    healStaleShellGently(chunkError(), undefined, (s) => s)
    const onClick = toast.mock.calls[0][1].action.onClick as () => void
    onClick()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it("arms only once per tab — a second stale event does not stack a second toast", () => {
    healStaleShellGently(chunkError(), undefined, (s) => s)
    healStaleShellGently(chunkError(), undefined, (s) => s)
    expect(toast).toHaveBeenCalledTimes(1)
  })
})

describe("a stale chunk caught while the tab is already hidden", () => {
  it("reloads immediately — nobody is looking at it", () => {
    setVisibility("hidden")
    const handled = healStaleShellGently(chunkError(), undefined, (s) => s)
    expect(handled).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(toast).not.toHaveBeenCalled()
  })
})

describe("the cooldown still applies", () => {
  it("refuses a second stale event within the cooldown, even a hidden-tab one", () => {
    setVisibility("hidden")
    healStaleShellGently(chunkError(), undefined, (s) => s)
    expect(reload).toHaveBeenCalledTimes(1)
    reload.mockClear()
    const handled = healStaleShellGently(chunkError(), undefined, (s) => s)
    expect(handled).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })
})

describe("an ordinary error is not a stale shell", () => {
  it("does nothing at all", () => {
    const handled = healStaleShellGently(new Error("account_id is not defined"), undefined, (s) => s)
    expect(handled).toBe(false)
    expect(reload).not.toHaveBeenCalled()
    expect(toast).not.toHaveBeenCalled()
  })
})
