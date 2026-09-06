// THE WORKSPACE TAB SET — the behaviour the client asked for, pinned.
//
// THE ASK, 2026-09-06, verbatim: "i am in a detail app, but i click the first
// tab 'apps' see all the apps but the detail where i was stays open… all tabs i
// open stay open unless i close them."
//
// Every test below is one sentence of that, or one of the six things the store
// has to get right so it can be true without costing anything: the URL is not
// the set, the set survives a reload, it is bounded, a background tab is two
// strings, the phone never builds one, and closing lands somewhere real.
//
// SINCE KIT v1.2.59 (`BreadcrumbFoldersProps.activeIndex`) THERE ARE TWO
// SEPARATE FACTS RATHER THAN ONE ARRAY ORDER DOING BOTH JOBS: `openTabsSnapshot()`
// is POSITION — fixed, growth-only, the order each tab was first opened — and
// `activeTabPathSnapshot()` is WHICH ONE the reader is looking at, which moves
// freely without ever touching position. Every test below that used to read
// "the active tab is the last one" now reads the two apart.
//
// The store is a MODULE — one per document, exactly as `nav-memory.ts` is — so
// each test re-scopes it rather than re-importing it, which is also the
// mechanism a team switch uses in the app.

import { beforeEach, describe, expect, it } from "vitest"

import {
  MAX_OPEN_TABS,
  MAX_TAB_LABEL_CHARS,
  activeTabPathSnapshot,
  closeTab,
  forgetOpenTabs,
  openTabsSnapshot,
  setWorkspaceScope,
  visitTrail,
  tabStripState,
} from "@/lib/workspace-tabs"

const ME = "user1:team1"

/** The strip, as the reader sees it: names, in the FIXED order each was
 * opened — no longer "active last", see the file header. */
const strip = () => openTabsSnapshot().map((tab) => tab.label)
const paths = () => openTabsSnapshot().map((tab) => tab.path)

/** One address, expressed the way the shell expresses it: the crumbs of that
 * address with the last one's missing href filled in by the current path. */
const at = (...levels: [string, string][]) => levels.map(([path, label]) => ({ path, label }))

beforeEach(() => {
  forgetOpenTabs()
  localStorage.clear()
  setWorkspaceScope(ME)
})

describe("a tab set is seeded by the trail, so nothing looks different on arrival", () => {
  it("a cold deep link opens every level of its own address", () => {
    // `/accounts/CONFIA/apps/A1` — the case the owner's own nesting ruling is
    // about. Landing on it cold must not produce ONE tab called APP-1 with no
    // way back to the client it sits inside.
    visitTrail(at(["/accounts/CONFIA", "Confia"], ["/accounts/CONFIA/apps/A1", "APP-1"]))
    expect(strip()).toEqual(["Confia", "APP-1"])
  })

  it("a top-level collection is a set of exactly one", () => {
    visitTrail(at(["/apps", "Apps"]))
    expect(strip()).toEqual(["Apps"])
  })

  it("an empty trail changes nothing — Welcome has no crumb and gets no tab", () => {
    visitTrail(at(["/apps", "Apps"]))
    visitTrail([])
    expect(strip()).toEqual(["Apps"])
  })
})

describe("the client's own sentence: the detail stays open", () => {
  it("clicking the collection keeps the record open, and moves nothing — position holds", () => {
    visitTrail(at(["/apps", "Apps"]))
    visitTrail(at(["/apps", "Apps"], ["/apps/A1", "APP-1"]))
    expect(strip()).toEqual(["Apps", "APP-1"])

    // …and now she clicks the first tab. Before this feature the record's crumb
    // simply vanished, because the trail is derived from the address. Before
    // `activeIndex` existed (kit v1.2.59) the strip had no other way to mark a
    // tab live than to drag it to the last position, so this same click used
    // to reorder the set to ["APP-1", "Apps"]. It no longer does: the kit's
    // `activeIndex` marks liveness without moving anything, so this store
    // stopped re-ordering to match — Chrome-exact, which was the whole point.
    visitTrail(at(["/apps", "Apps"]))
    expect(strip()).toEqual(["Apps", "APP-1"])
    expect(paths()).toEqual(["/apps", "/apps/A1"])
    // She IS looking at "Apps" now — that fact still exists, it just lives
    // apart from position.
    expect(activeTabPathSnapshot()).toBe("/apps")
  })

  it("a second record joins the set rather than replacing the first", () => {
    visitTrail(at(["/apps", "Apps"], ["/apps/A1", "APP-1"]))
    visitTrail(at(["/apps", "Apps"], ["/apps/A2", "APP-2"]))
    expect(strip()).toEqual(["Apps", "APP-1", "APP-2"])
  })

  it("an already-open ancestor keeps its place — the strip does not reshuffle twice", () => {
    visitTrail(at(["/apps", "Apps"], ["/apps/A1", "APP-1"]))
    visitTrail(at(["/apps", "Apps"], ["/apps/A2", "APP-2"]))
    // "Apps" is an ancestor of the address just visited and is already open; it
    // must not be dragged to the end alongside the record that WAS activated.
    expect(paths()[0]).toBe("/apps")
  })

  it("a record's name is corrected on the visit that knows it", () => {
    // The crumb label arrives late: `useTrailNames` reads an ancestor by id
    // after the first paint, so the first `visitTrail` for a cold deep link
    // carries the generic fallback and the second carries the real name.
    visitTrail(at(["/accounts/CONFIA", "Account"], ["/accounts/CONFIA/apps/A1", "APP-1"]))
    visitTrail(at(["/accounts/CONFIA", "Confia"], ["/accounts/CONFIA/apps/A1", "APP-1"]))
    expect(strip()).toEqual(["Confia", "APP-1"])
  })

  it("a name too long for a tab is clipped, never dropped", () => {
    const huge = "x".repeat(MAX_TAB_LABEL_CHARS + 40)
    visitTrail(at(["/apps/A1", huge]))
    const [label] = strip()
    expect(label.length).toBe(MAX_TAB_LABEL_CHARS)
    expect(label.endsWith("…")).toBe(true)
  })
})

describe("it survives a reload, which is why it is not the nav memory", () => {
  it("a fresh document reads the set back", () => {
    visitTrail(at(["/apps", "Apps"], ["/apps/A1", "APP-1"]))
    // The reload: the module forgets, storage does not.
    setWorkspaceScope(null)
    expect(strip()).toEqual([])
    setWorkspaceScope(ME)
    expect(strip()).toEqual(["Apps", "APP-1"])
  })

  it("another team is another set — a path is pinned to one team", () => {
    visitTrail(at(["/apps", "Apps"]))
    setWorkspaceScope("user1:team2")
    expect(strip()).toEqual([])
    visitTrail(at(["/tickets", "Tickets"]))
    setWorkspaceScope(ME)
    expect(strip()).toEqual(["Apps"])
  })

  it("signing out drops every scope, not just the loaded one", () => {
    visitTrail(at(["/apps", "Apps"]))
    setWorkspaceScope("user2:team1")
    visitTrail(at(["/tickets", "Tickets"]))
    forgetOpenTabs()
    setWorkspaceScope(ME)
    expect(strip()).toEqual([])
    setWorkspaceScope("user2:team1")
    expect(strip()).toEqual([])
  })

  it("a hand-edited or half-written value leaves the app whole", () => {
    localStorage.setItem("ss-open-tabs:user1:team9", '{"not":"a list"}')
    setWorkspaceScope("user1:team9")
    expect(strip()).toEqual([])
    localStorage.setItem("ss-open-tabs:user1:team8", '[{"path":42},{"label":"no path"},"nope"]')
    setWorkspaceScope("user1:team8")
    expect(strip()).toEqual([])
  })
})

describe("it is bounded — this is not Chrome's ninety tabs", () => {
  it("the ceiling holds under a punishing walk", () => {
    for (let i = 0; i < MAX_OPEN_TABS * 5; i++) visitTrail(at([`/apps/A${String(i)}`, `APP-${String(i)}`]))
    expect(openTabsSnapshot()).toHaveLength(MAX_OPEN_TABS)
  })

  it("the oldest goes, and the one being opened never does", () => {
    for (let i = 0; i < MAX_OPEN_TABS; i++) visitTrail(at([`/apps/A${String(i)}`, `APP-${String(i)}`]))
    expect(strip()[0]).toBe("APP-0")
    visitTrail(at(["/apps/NEW", "NEW"]))
    expect(strip()).not.toContain("APP-0")
    // NEW is the one just opened, so it is both the newest POSITION (appended
    // at the end — the only thing position ever does now) and the active tab
    // (`touch()` runs for every new entry) — the two facts happen to agree
    // here because nothing in this walk ever re-activates an old tab out of
    // position order.
    expect(strip()[strip().length - 1]).toBe("NEW")
    expect(activeTabPathSnapshot()).toBe("/apps/NEW")
    expect(openTabsSnapshot()).toHaveLength(MAX_OPEN_TABS)
  })

  it("re-activating an old tab saves it from the next eviction", () => {
    for (let i = 0; i < MAX_OPEN_TABS; i++) visitTrail(at([`/apps/A${String(i)}`, `APP-${String(i)}`]))
    visitTrail(at(["/apps/A0", "APP-0"])) // she went back to it
    visitTrail(at(["/apps/NEW", "NEW"]))
    expect(strip()).toContain("APP-0")
    expect(strip()).not.toContain("APP-1")
  })

  it("a background tab is two strings and nothing else", () => {
    visitTrail(at(["/apps", "Apps"], ["/apps/A1", "APP-1"]))
    for (const tab of openTabsSnapshot()) expect(Object.keys(tab).sort()).toEqual(["label", "path"])
  })
})

describe("a tab holds the position it was opened in — Chrome parity, kit v1.2.59", () => {
  it("activating an already-open tab marks it active and moves nothing", () => {
    visitTrail(at(["/apps/A0", "APP-0"]))
    visitTrail(at(["/apps/A1", "APP-1"]))
    visitTrail(at(["/apps/A2", "APP-2"]))
    expect(paths()).toEqual(["/apps/A0", "/apps/A1", "/apps/A2"])
    expect(activeTabPathSnapshot()).toBe("/apps/A2")

    // She clicks the FIRST tab. Before `activeIndex` existed this would have
    // dragged it to the end; now the array is untouched and only the active
    // fact changes.
    visitTrail(at(["/apps/A0", "APP-0"]))
    expect(paths()).toEqual(["/apps/A0", "/apps/A1", "/apps/A2"])
    expect(activeTabPathSnapshot()).toBe("/apps/A0")

    // …and the MIDDLE one, same story.
    visitTrail(at(["/apps/A1", "APP-1"]))
    expect(paths()).toEqual(["/apps/A0", "/apps/A1", "/apps/A2"])
    expect(activeTabPathSnapshot()).toBe("/apps/A1")
  })

  it("closing a background tab that neighbours nothing active leaves the active tab exactly where it was", () => {
    visitTrail(at(["/apps/A0", "APP-0"]))
    visitTrail(at(["/apps/A1", "APP-1"]))
    visitTrail(at(["/apps/A2", "APP-2"]))
    visitTrail(at(["/apps/A0", "APP-0"])) // A0 is active; A1 sits between it and A2

    // A1 is a true background tab here — not adjacent to the active one by
    // recency, only by position — which `activeIndex` makes possible for the
    // first time. Closing it must not disturb A0.
    expect(closeTab("/apps/A1")).toBe("/apps/A0")
    expect(paths()).toEqual(["/apps/A0", "/apps/A2"])
    expect(activeTabPathSnapshot()).toBe("/apps/A0")
  })
})

describe("closing lands somewhere real", () => {
  it("closing the active tab falls to the neighbour on its left", () => {
    visitTrail(at(["/apps", "Apps"]))
    visitTrail(at(["/apps", "Apps"], ["/apps/A1", "APP-1"]))
    expect(closeTab("/apps/A1")).toBe("/apps")
    expect(strip()).toEqual(["Apps"])
    expect(activeTabPathSnapshot()).toBe("/apps")
  })

  it("closing the FIRST tab falls to the one that took its place", () => {
    visitTrail(at(["/apps", "Apps"], ["/apps/A1", "APP-1"]))
    expect(closeTab("/apps")).toBe("/apps/A1")
    expect(activeTabPathSnapshot()).toBe("/apps/A1")
  })

  it("closing the last tab standing says so, and the caller falls back", () => {
    visitTrail(at(["/apps/A1", "APP-1"]))
    expect(closeTab("/apps/A1")).toBeNull()
    expect(strip()).toEqual([])
    expect(activeTabPathSnapshot()).toBeNull()
  })

  it("closing something that is not open moves nobody", () => {
    visitTrail(at(["/apps", "Apps"]))
    expect(closeTab("/apps/GONE")).toBe("/apps")
    expect(strip()).toEqual(["Apps"])
    expect(activeTabPathSnapshot()).toBe("/apps")
  })

  it("a closed tab stays closed across a reload", () => {
    visitTrail(at(["/apps", "Apps"], ["/apps/A1", "APP-1"]))
    closeTab("/apps/A1")
    setWorkspaceScope(null)
    setWorkspaceScope(ME)
    expect(strip()).toEqual(["Apps"])
  })
})

describe("nothing is recorded unless somebody asks", () => {
  it("no scope, no set — which is how the phone stays exactly as it was", () => {
    setWorkspaceScope(null)
    visitTrail(at(["/apps", "Apps"], ["/apps/A1", "APP-1"]))
    // The shell never calls `visitTrail` below `md` (see `useRoomForTabs` in
    // deep-link-screen.tsx), and with no scope there is nowhere to write even
    // if it did — so a phone session accumulates nothing rather than filling a
    // set up invisibly behind a strip that never draws it.
    expect(strip()).toEqual([])
  })
})

/* THE SEAM THAT BROKE, and the case no test crossed.
 *
 * The store stopped re-ordering (a tab holds the position it was opened in) on
 * the same day the kit learned `activeIndex` (liveness stopped meaning last).
 * Each change was correct alone. Together they left the shell asking whether
 * the LAST tab was the address in order to decide whether to draw a set at all
 * — so stepping BACK to an earlier tab made the whole strip fall back to an
 * ordinary trail, the feature disappearing exactly when it was doing its job.
 */
describe("what the strip draws", () => {
  const tabs = [
    { path: "/apps/A0", label: "APP-0" },
    { path: "/apps/A1", label: "APP-1" },
    { path: "/apps/A2", label: "APP-2" },
  ]

  it("still draws the set when the address is not the last tab", () => {
    const state = tabStripState(tabs, "/apps/A0", true)
    expect(state.showTabSet, "stepping back to the first tab must not lose the set").toBe(true)
    expect(state.activeIndex, "and the FIRST tab is the live one, not the last").toBe(0)
  })

  it("names the middle tab live when that is where she is standing", () => {
    expect(tabStripState(tabs, "/apps/A1", true)).toEqual({ showTabSet: true, activeIndex: 1 })
  })

  it("falls back to the trail when the address is not in the set", () => {
    // The first paint, before the effect has recorded anything, and Welcome,
    // which has no crumb and so no tab.
    expect(tabStripState(tabs, "/home", true)).toEqual({ showTabSet: false, activeIndex: -1 })
    expect(tabStripState([], "/apps/A0", true)).toEqual({ showTabSet: false, activeIndex: -1 })
  })

  it("falls back to the trail on a phone even with a full set", () => {
    expect(tabStripState(tabs, "/apps/A1", false).showTabSet).toBe(false)
  })

  it("never reports a set without a live tab to paint", () => {
    // The pair cannot contradict itself — that was the whole bug.
    for (const path of ["/apps/A0", "/apps/A1", "/apps/A2", "/home", ""]) {
      const { showTabSet, activeIndex } = tabStripState(tabs, path, true)
      if (showTabSet) expect(activeIndex).toBeGreaterThanOrEqual(0)
    }
  })
})
