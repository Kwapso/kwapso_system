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
// The store is a MODULE — one per document, exactly as `nav-memory.ts` is — so
// each test re-scopes it rather than re-importing it, which is also the
// mechanism a team switch uses in the app.

import { beforeEach, describe, expect, it } from "vitest"

import {
  MAX_OPEN_TABS,
  MAX_TAB_LABEL_CHARS,
  closeTab,
  forgetOpenTabs,
  openTabsSnapshot,
  setWorkspaceScope,
  visitTrail,
} from "@/lib/workspace-tabs"

const ME = "user1:team1"

/** The strip, as the reader sees it: names, oldest first, active last. */
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
  it("clicking the collection keeps the record open, and only moves the front folder", () => {
    visitTrail(at(["/apps", "Apps"]))
    visitTrail(at(["/apps", "Apps"], ["/apps/A1", "APP-1"]))
    expect(strip()).toEqual(["Apps", "APP-1"])

    // …and now she clicks the first tab. Before this feature the record's crumb
    // simply vanished, because the trail is derived from the address.
    visitTrail(at(["/apps", "Apps"]))
    expect(strip()).toContain("APP-1")
    // The tab she is looking at is the LAST one — the folder joined to the card
    // (breadcrumb-folders.tsx paints the last item live and has no
    // `activeIndex`), so activating one pulls it to the front of the drawer.
    expect(strip()).toEqual(["APP-1", "Apps"])
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
    // The active tab is the last one, always — the one just opened.
    expect(strip()[strip().length - 1]).toBe("NEW")
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

describe("closing lands somewhere real", () => {
  it("closing the active tab falls to the neighbour on its left", () => {
    visitTrail(at(["/apps", "Apps"]))
    visitTrail(at(["/apps", "Apps"], ["/apps/A1", "APP-1"]))
    expect(closeTab("/apps/A1")).toBe("/apps")
    expect(strip()).toEqual(["Apps"])
  })

  it("closing the FIRST tab falls to the one that took its place", () => {
    visitTrail(at(["/apps", "Apps"], ["/apps/A1", "APP-1"]))
    expect(closeTab("/apps")).toBe("/apps/A1")
  })

  it("closing the last tab standing says so, and the caller falls back", () => {
    visitTrail(at(["/apps/A1", "APP-1"]))
    expect(closeTab("/apps/A1")).toBeNull()
    expect(strip()).toEqual([])
  })

  it("closing something that is not open moves nobody", () => {
    visitTrail(at(["/apps", "Apps"]))
    expect(closeTab("/apps/GONE")).toBe("/apps")
    expect(strip()).toEqual(["Apps"])
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
