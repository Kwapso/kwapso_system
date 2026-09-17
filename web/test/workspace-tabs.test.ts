// THE WORKSPACE TAB SET — the behaviour the client asked for, pinned, twice.
//
// THE FIRST ASK (2026-09-06) built the SET: places that stay open until
// closed. THE SECOND (17 SEP 2026, verbatim) changed what "opening" means:
//
//   "Unless I do it on purpose to open a new tab, everything happens on the
//    same tab. This means that I would navigate in the app, and this would
//    just keep making the breadcrumbs longer. Unless I press Command and
//    click, this would open a new tab, and the same behavior in Windows,
//    just replicating Google Chrome." / "Yes to Chrome navigation, push the
//    trail on a rail pick."
//
// So a tab is now `{ id, steps, cursor }` — its own back-history — and this
// file tests that shape directly: a plain `visitTrail` PUSHES onto the
// active tab instead of opening a new one; `openBeside` is the one door
// left that mints a second tab; `back`/`forward`/`jumpTo` walk a tab's own
// history without disturbing another tab's.
//
// SUPERSEDED BY THIS RULING, AND FLIPPED BELOW RATHER THAN KEPT: every test
// that used to assert "visiting an already-open path activates the existing
// tab instead of opening a duplicate" (the 16 Sep 2026 "make sure I cannot
// have the same tab 2 times" ruling) is gone. That dedupe lived in
// `visitTrail`; ordinary navigation no longer opens tabs at all under this
// ruling, so there is nothing left for it to dedupe against — and the ONE
// door that still deliberately opens a second tab (`openBeside`, a
// cmd/ctrl/middle-click) is asked, in the same conversation, to do the
// opposite: two tabs MAY now hold the same path. The one dedupe that
// survives is `openSoloTab`'s own (the Import wizard's L11 ruling), tested
// on its own below.

import { beforeEach, describe, expect, it } from "vitest"

import {
  MAX_OPEN_TABS,
  MAX_TAB_LABEL_CHARS,
  MAX_TRAIL_STEPS,
  NEW_TAB_PATH,
  activateTab,
  activeTabIdSnapshot,
  activeTabPathSnapshot,
  back,

  closeTab,
  forgetOpenTabs,
  forward,
  jumpTo,
  openBeside,
  openNewTab,
  openSoloTab,
  openTabsSnapshot,
  railPick,
  reorderTab,
  setWorkspaceScope,
  tabStripState,
  visitTrail,
  type TrailStep,
} from "@/lib/workspace-tabs"

const ME = "user1:team1"

/** The strip, as the reader sees it: each tab's CURRENT step's label, in the
 * FIXED order each tab was opened. */
const strip = () => openTabsSnapshot().map((tab) => tab.steps[tab.cursor]?.label)
/** Each tab's CURRENT step's path. */
const paths = () => openTabsSnapshot().map((tab) => tab.steps[tab.cursor]?.path)
/** One tab's own trail, as plain path strings, oldest first. */
const trailOf = (tabId: string) => openTabsSnapshot().find((t) => t.id === tabId)?.steps.map((s) => s.path)

/** One address, expressed the way `buildCrumbs` expresses it: the crumbs of
 * that address with the last one's missing href filled in by the current
 * path — unchanged shape from before this ruling, `visitTrail` still takes
 * it whole. */
const at = (...levels: [string, string][]): TrailStep[] => levels.map(([path, label]) => ({ path, label }))

beforeEach(() => {
  forgetOpenTabs()
  localStorage.clear()
  setWorkspaceScope(ME)
})

describe("a fresh tab is seeded by the trail, so nothing looks different on arrival", () => {
  it("a cold deep link opens ONE tab whose own history holds every level of its address", () => {
    // `/accounts/CONFIA/apps/A1` — landing on it cold must not produce a tab
    // called APP-1 with no way back to the client it sits inside; here that
    // "way back" is the tab's OWN cursor, not a second tab.
    visitTrail(at(["/accounts/CONFIA", "Confia"], ["/accounts/CONFIA/apps/A1", "APP-1"]))
    expect(strip()).toEqual(["APP-1"])
    expect(openTabsSnapshot()).toHaveLength(1)
    const [tab] = openTabsSnapshot()
    expect(tab?.steps.map((s) => s.label)).toEqual(["Confia", "APP-1"])
    expect(tab?.cursor).toBe(1)
  })

  it("a top-level collection is a tab of one step", () => {
    visitTrail(at(["/apps", "Apps"]))
    expect(strip()).toEqual(["Apps"])
    expect(openTabsSnapshot()[0]?.steps).toEqual([{ path: "/apps", label: "Apps" }])
  })

  it("an empty trail changes nothing — Welcome has no crumb and gets no tab", () => {
    visitTrail(at(["/apps", "Apps"]))
    visitTrail([])
    expect(strip()).toEqual(["Apps"])
  })
})

describe("the client's ruling, 17 Sep 2026: ordinary navigation grows the SAME tab", () => {
  it("plain navigation to a new path pushes a step onto the active tab, opening no new tab", () => {
    visitTrail(at(["/apps", "Apps"]))
    visitTrail(at(["/apps", "Apps"], ["/apps/A1", "APP-1"]))
    expect(openTabsSnapshot()).toHaveLength(1)
    expect(strip()).toEqual(["APP-1"])
    const [tab] = openTabsSnapshot()
    expect(tab?.steps.map((s) => s.path)).toEqual(["/apps", "/apps/A1"])
    expect(tab?.cursor).toBe(1)
  })

  it("a rail pick pushes too — her own second sentence, verbatim: \"push the trail on a rail pick\"", () => {
    visitTrail(at(["/apps", "Apps"]))
    // A rail pick builds a ONE-level trail (the section itself has no
    // ancestor), exactly like `goToSection` in app-shell.tsx.
    visitTrail(at(["/tickets", "Tickets"]))
    expect(openTabsSnapshot()).toHaveLength(1)
    expect(trailOf(activeTabIdSnapshot() ?? "")).toEqual(["/apps", "/tickets"])
  })

  it("several navigations in a row just keep making the trail longer", () => {
    visitTrail(at(["/apps", "Apps"]))
    visitTrail(at(["/apps/A1", "APP-1"]))
    visitTrail(at(["/apps/A2", "APP-2"]))
    visitTrail(at(["/apps/A3", "APP-3"]))
    expect(openTabsSnapshot()).toHaveLength(1)
    expect(paths()).toEqual(["/apps/A3"])
    expect(trailOf(activeTabIdSnapshot() ?? "")).toEqual(["/apps", "/apps/A1", "/apps/A2", "/apps/A3"])
  })

  it("a query-only re-render of the same address never grows the trail", () => {
    visitTrail(at(["/apps", "Apps"]))
    visitTrail(at(["/apps", "Apps"]))
    visitTrail(at(["/apps", "Apps"]))
    expect(trailOf(activeTabIdSnapshot() ?? "")).toEqual(["/apps"])
  })

  it("a record's name is corrected on the visit that knows it, without growing the trail", () => {
    visitTrail(at(["/apps/A1", "Account"]))
    visitTrail(at(["/apps/A1", "Confia"]))
    expect(strip()).toEqual(["Confia"])
    expect(trailOf(activeTabIdSnapshot() ?? "")).toEqual(["/apps/A1"])
  })

  it("a name too long for a step is clipped, never dropped", () => {
    const huge = "x".repeat(MAX_TAB_LABEL_CHARS + 40)
    visitTrail(at(["/apps/A1", huge]))
    const [label] = strip()
    expect(label?.length).toBe(MAX_TAB_LABEL_CHARS)
    expect(label?.endsWith("…")).toBe(true)
  })
})

describe("forward history is dropped the moment a fresh path is pushed — browser parity", () => {
  it("pushing after stepping back drops everything ahead of the cursor", () => {
    visitTrail(at(["/apps", "Apps"]))
    visitTrail(at(["/apps/A1", "APP-1"]))
    visitTrail(at(["/apps/A2", "APP-2"]))
    const id = activeTabIdSnapshot()
    if (!id) throw new Error("expected an active tab")
    expect(back()).toBe("/apps/A1") // cursor now at 1, "A2" still in steps
    expect(trailOf(id)).toEqual(["/apps", "/apps/A1", "/apps/A2"])

    // A fresh push from here must overwrite "A2" the way a browser's own redo
    // history disappears the instant you follow a new link.
    visitTrail(at(["/apps/A9", "APP-9"]))
    expect(trailOf(id)).toEqual(["/apps", "/apps/A1", "/apps/A9"])
    expect(strip()).toEqual(["APP-9"])
  })
})

describe("back, forward and jump — one tab's own history, Chrome-style", () => {
  it("back and forward walk the cursor and hand back the step's path", () => {
    visitTrail(at(["/apps", "Apps"]))
    visitTrail(at(["/apps/A1", "APP-1"]))
    visitTrail(at(["/apps/A2", "APP-2"]))
    expect(back()).toBe("/apps/A1")
    expect(back()).toBe("/apps")
    expect(back()).toBeNull() // at the first step — nothing further back
    expect(forward()).toBe("/apps/A1")
    expect(forward()).toBe("/apps/A2")
    expect(forward()).toBeNull() // at the last step — nothing further forward
  })

  it("jumpTo moves straight to any step, and refuses the step already active", () => {
    visitTrail(at(["/apps", "Apps"]))
    visitTrail(at(["/apps/A1", "APP-1"]))
    visitTrail(at(["/apps/A2", "APP-2"]))
    expect(jumpTo(0)).toBe("/apps")
    expect(jumpTo(0)).toBeNull() // already there
    expect(jumpTo(2)).toBe("/apps/A2")
    expect(jumpTo(99)).toBeNull() // out of range
    expect(jumpTo(-1)).toBeNull()
  })

  it("the navigation back/forward/jump cause does not itself push a new step", () => {
    // Wiring proof: the caller (app-shell.tsx) calls `visitTrail` again once
    // the address they were told to navigate to actually lands — the same
    // effect that fires on every ordinary navigation. That must not turn
    // Back into "go back, then silently go forward again".
    visitTrail(at(["/apps", "Apps"]))
    visitTrail(at(["/apps/A1", "APP-1"]))
    visitTrail(at(["/apps/A2", "APP-2"]))
    const id = activeTabIdSnapshot()
    if (!id) throw new Error("expected an active tab")
    const dest = back()
    expect(dest).toBe("/apps/A1")
    // The screen `dest` landed on reports its own crumb the same way any
    // navigation does.
    visitTrail(at(["/apps", "Apps"], ["/apps/A1", "APP-1"]))
    expect(trailOf(id)).toEqual(["/apps", "/apps/A1", "/apps/A2"]) // unchanged
    expect(openTabsSnapshot().find((t) => t.id === id)?.cursor).toBe(1) // still where Back left it
  })

  it("back/forward/jumpTo touch only the active tab's own history", () => {
    visitTrail(at(["/apps", "Apps"]))
    visitTrail(at(["/apps/A1", "APP-1"]))
    openBeside("/tickets", "Tickets")
    visitTrail(at(["/tickets/T1", "T1"])) // grows the NEW tab, not the first
    const [firstId, secondId] = openTabsSnapshot().map((t) => t.id)
    expect(back()).toBe("/tickets") // moves the ACTIVE (second) tab only
    if (!firstId || !secondId) throw new Error("expected two tabs")
    expect(trailOf(firstId)).toEqual(["/apps", "/apps/A1"])
    expect(trailOf(secondId)).toEqual(["/tickets", "/tickets/T1"])
  })
})

describe("opening beside — the one door left that mints a second tab (cmd/ctrl/middle-click)", () => {
  it("opens a new, one-step tab and fronts it", () => {
    visitTrail(at(["/tickets", "Tickets"]))
    visitTrail(at(["/tickets/T1", "T1"]))
    openBeside("/tickets/T2", "T2")
    expect(openTabsSnapshot()).toHaveLength(2)
    expect(openTabsSnapshot()[1]?.steps).toEqual([{ path: "/tickets/T2", label: "T2" }])
    expect(activeTabPathSnapshot()).toBe("/tickets/T2")
  })

  it("lands beside the active tab (L12's own insertion rule), and fronts it", () => {
    visitTrail(at(["/tickets", "Tickets"]))
    visitTrail(at(["/tickets/T1", "T1"]))
    visitTrail(at(["/tickets/T2", "T2"]))
    // She steps back to the FIRST tab conceptually — here there is only one
    // tab so far, so "beside the active tab" is beside the only one.
    openBeside("/tickets/T3", "T3")
    const tabs = openTabsSnapshot()
    expect(tabs).toHaveLength(2)
    expect(tabs[1]?.steps).toEqual([{ path: "/tickets/T3", label: "T3" }])
    expect(activeTabPathSnapshot()).toBe("/tickets/T3") // fronted
  })

  it("two tabs may hold the exact same path — cmd-clicking one link twice opens two tabs, Chrome-style", () => {
    visitTrail(at(["/apps", "Apps"]))
    openBeside("/apps/A1", "APP-1")
    openBeside("/apps/A1", "APP-1")
    expect(openTabsSnapshot()).toHaveLength(3)
    expect(paths().filter((p) => p === "/apps/A1")).toHaveLength(2)
  })

  it("openBeside participates in the same MAX_OPEN_TABS eviction as an ordinary open", () => {
    for (let i = 0; i < MAX_OPEN_TABS; i++) openBeside(`/apps/A${String(i)}`, `APP-${String(i)}`)
    expect(openTabsSnapshot()).toHaveLength(MAX_OPEN_TABS)
    openBeside("/apps/NEW", "NEW")
    expect(openTabsSnapshot()).toHaveLength(MAX_OPEN_TABS)
    expect(paths()).not.toContain("/apps/A0") // oldest-activated, evicted
    expect(paths()).toContain("/apps/NEW")
  })
})

describe("activateTab — what clicking an already-open tab in the strip means", () => {
  it("switches to the tab and touches neither tab's own history", () => {
    visitTrail(at(["/apps", "Apps"]))
    visitTrail(at(["/apps/A1", "APP-1"]))
    openBeside("/tickets", "Tickets")
    const [firstId, secondId] = openTabsSnapshot().map((t) => t.id)
    if (!firstId || !secondId) throw new Error("expected two tabs")
    expect(activeTabIdSnapshot()).toBe(secondId) // openBeside fronted it
    expect(activateTab(firstId)).toBe("/apps/A1")
    expect(activeTabIdSnapshot()).toBe(firstId)
    expect(trailOf(firstId)).toEqual(["/apps", "/apps/A1"]) // unchanged
    expect(trailOf(secondId)).toEqual(["/tickets"]) // unchanged
  })

  it("the navigation it causes does not push a fresh step onto the newly active tab", () => {
    visitTrail(at(["/apps", "Apps"]))
    visitTrail(at(["/apps/A1", "APP-1"]))
    openBeside("/tickets", "Tickets")
    const firstId = openTabsSnapshot()[0]?.id
    if (!firstId) throw new Error("expected a first tab")
    const dest = activateTab(firstId)
    expect(dest).toBe("/apps/A1")
    // The screen at `dest` reports its own address the same way any landing does.
    visitTrail(at(["/apps", "Apps"], ["/apps/A1", "APP-1"]))
    expect(trailOf(firstId)).toEqual(["/apps", "/apps/A1"]) // still just the two steps
  })

  it("an unknown id changes nothing", () => {
    visitTrail(at(["/apps", "Apps"]))
    expect(activateTab("not-a-real-id")).toBeNull()
    expect(activeTabPathSnapshot()).toBe("/apps")
  })
})

describe("openSoloTab — the Import wizard's own ruling (L11): fronted, never duplicated", () => {
  it("opens a fresh tab the first time", () => {
    visitTrail(at(["/apps", "Apps"]))
    openSoloTab("/apps/import", "Import CSV")
    expect(openTabsSnapshot()).toHaveLength(2)
    expect(activeTabPathSnapshot()).toBe("/apps/import")
  })

  it("fronts the same tab on a second press, rather than opening a duplicate", () => {
    visitTrail(at(["/apps", "Apps"]))
    openSoloTab("/apps/import", "Import CSV")
    openSoloTab("/apps/import", "Import CSV") // pressed Import again
    expect(openTabsSnapshot()).toHaveLength(2)
    expect(activeTabPathSnapshot()).toBe("/apps/import")
  })

  it("fronts the wizard even after she switched to another already-open tab in between", () => {
    visitTrail(at(["/apps", "Apps"]))
    openSoloTab("/apps/import", "Import CSV")
    // She switches back to the Apps TAB via the strip — `activateTab`, not a
    // plain `visitTrail` push (see `workspace-tabs.ts`'s own doc on why the
    // tab strip's click needs a dedicated door).
    const appsId = openTabsSnapshot()[0]?.id
    if (!appsId) throw new Error("expected an Apps tab")
    activateTab(appsId)
    openSoloTab("/apps/import", "Import CSV")
    expect(openTabsSnapshot()).toHaveLength(2)
    expect(activeTabPathSnapshot()).toBe("/apps/import")
  })
})

describe("railPick — the rail's own door (17 Sep 2026, replacing \"push the trail on a rail pick\")", () => {
  it("activates the tab already sitting on the module's root, rather than opening a new one", () => {
    visitTrail(at(["/apps", "Apps"]))
    openBeside("/tickets", "Tickets") // [Apps, Tickets(active)]
    openBeside("/accounts", "Accounts") // [Apps, Tickets, Accounts(active)]
    const ticketsId = openTabsSnapshot()[1]?.id
    if (!ticketsId) throw new Error("expected a Tickets tab")
    expect(railPick("/tickets", "Tickets")).toBe("/tickets")
    expect(openTabsSnapshot()).toHaveLength(3) // no new tab minted
    expect(activeTabIdSnapshot()).toBe(ticketsId)
  })

  it("a tab whose current step is DEEPER in the module does not count as open — a new tab beside the active one instead", () => {
    visitTrail(at(["/tickets", "Tickets"]))
    visitTrail(at(["/tickets", "Tickets"], ["/tickets/T1", "T1"])) // she opened a ticket
    const before = openTabsSnapshot().length
    expect(railPick("/tickets", "Tickets")).toBe("/tickets")
    expect(openTabsSnapshot()).toHaveLength(before + 1)
    expect(openTabsSnapshot().at(-1)?.steps).toEqual([{ path: "/tickets", label: "Tickets" }])
    expect(activeTabPathSnapshot()).toBe("/tickets") // fronted
  })

  it("clicking a module from inside a DIFFERENT module opens a new tab beside the active one", () => {
    visitTrail(at(["/apps", "Apps"]))
    visitTrail(at(["/apps", "Apps"], ["/apps/A1", "APP-1"]))
    expect(railPick("/tickets", "Tickets")).toBe("/tickets")
    const tabs = openTabsSnapshot()
    expect(tabs).toHaveLength(2)
    expect(tabs[1]?.steps).toEqual([{ path: "/tickets", label: "Tickets" }])
    expect(activeTabPathSnapshot()).toBe("/tickets")
  })

  it("nothing open at all — a rail pick still opens a new tab", () => {
    expect(openTabsSnapshot()).toHaveLength(0)
    expect(railPick("/tickets", "Tickets")).toBe("/tickets")
    expect(openTabsSnapshot()).toHaveLength(1)
    expect(activeTabPathSnapshot()).toBe("/tickets")
  })

  it("lands at the module's ROOT, never a query-string variant already open deeper in the trail", () => {
    // The root tab holds a filtered view of the collection (a query string),
    // which canonicalises to the same tab — still "the main screen", per
    // `openSoloTab`'s own canonicalisation.
    visitTrail(at(["/tickets?status=open", "Tickets"]))
    expect(railPick("/tickets", "Tickets")).toBe("/tickets?status=open")
    expect(openTabsSnapshot()).toHaveLength(1) // activated, not duplicated
  })
})

describe("openNewTab — the content strip's own \"+\"/cmd-T door: \"You cannot have two new tabs\"", () => {
  it("opens a fresh /new tab beside the active one, fronted", () => {
    visitTrail(at(["/apps", "Apps"]))
    openNewTab("New tab")
    expect(openTabsSnapshot()).toHaveLength(2)
    expect(activeTabPathSnapshot()).toBe(NEW_TAB_PATH)
    expect(strip()).toEqual(["Apps", "New tab"])
  })

  it("presses \"+\" twice: the second press REUSES the still-unused /new tab rather than opening a second one", () => {
    visitTrail(at(["/apps", "Apps"]))
    openNewTab("New tab")
    openNewTab("New tab") // pressed "+" again
    expect(openTabsSnapshot()).toHaveLength(2)
    expect(activeTabPathSnapshot()).toBe(NEW_TAB_PATH)
  })

  it("reuses the unused /new tab even after switching back to another already-open tab in between", () => {
    visitTrail(at(["/apps", "Apps"]))
    openNewTab("New tab")
    const appsId = openTabsSnapshot()[0]?.id
    if (!appsId) throw new Error("expected an Apps tab")
    activateTab(appsId)
    openNewTab("New tab")
    expect(openTabsSnapshot()).toHaveLength(2)
    expect(activeTabPathSnapshot()).toBe(NEW_TAB_PATH)
  })

  it("a /new tab that was actually USED (navigated away from and back to) no longer counts as unused — a third press opens a real second one", () => {
    visitTrail(at(["/apps", "Apps"]))
    openNewTab("New tab")
    // She searched from it and opened something IN this same tab — a real
    // step, not the blank arrival any more.
    visitTrail(at(["/accounts/BERG", "Bergman S.A."]))
    openNewTab("New tab")
    expect(openTabsSnapshot()).toHaveLength(3)
    expect(strip()).toEqual(["Apps", "Bergman S.A.", "New tab"])
  })

  // THE REPOSITIONING FIX — `moveAdjacentToActive`. Before this, the reuse
  // branch above called `touch()` alone: that fronts the still-unused /new
  // tab wherever it already sits in `tabs`, which is wherever it landed the
  // ONE time it was minted — not necessarily beside whoever is active NOW.
  it("REUSE repositions the still-unused /new tab beside whichever tab is active NOW, not where it first landed", () => {
    visitTrail(at(["/apps", "Apps"])) // [Apps(active)]
    openNewTab("New tab") // [Apps, New(active)] — minted beside Apps
    openBeside("/tickets", "Tickets") // [Apps, New, Tickets(active)]
    const [appsId, , ticketsId] = openTabsSnapshot().map((t) => t.id)
    if (!appsId || !ticketsId) throw new Error("expected three tabs")
    activateTab(appsId) // she looks at Apps again — array order unchanged
    activateTab(ticketsId) // then at Tickets — New is still sitting at index 1, LEFT of Tickets now
    expect(openTabsSnapshot().findIndex((t) => t.id === ticketsId)).toBe(2)
    expect(openTabsSnapshot().findIndex((t) => t.steps[0]?.path === NEW_TAB_PATH)).toBe(1) // stale, left of Tickets

    openNewTab("New tab") // presses "+" again, FROM Tickets

    const after = openTabsSnapshot()
    expect(after).toHaveLength(3) // still reused, never a duplicate
    const ticketsIndex = after.findIndex((t) => t.id === ticketsId)
    const newIndex = after.findIndex((t) => t.steps[0]?.path === NEW_TAB_PATH)
    expect(newIndex).toBe(ticketsIndex + 1) // moved to sit right of Tickets, every time
    expect(activeTabPathSnapshot()).toBe(NEW_TAB_PATH)
  })

  it("pressing \"+\" twice in a row (nothing navigated in between) is a no-op reposition — the tab is already its own neighbour", () => {
    visitTrail(at(["/apps", "Apps"]))
    openNewTab("New tab")
    const before = openTabsSnapshot().map((t) => t.id)
    openNewTab("New tab") // still unused, still the active tab itself
    expect(openTabsSnapshot().map((t) => t.id)).toEqual(before) // untouched order
  })
})

// ── THE CLIENT'S RULING, 17 SEP 2026, VERBATIM ───────────────────────────────
//
//   "When I open a new tab from an existing tab, every time, it needs to be
//    to the immediate right of the tab that is active."
//
// Every door that MINTS a tab — `openBeside` (cmd/ctrl-click, middle-click),
// `openSoloTab`'s fallback (the Import wizard, first press), and `openNewTab`'s
// own fallback (the "+"/cmd-T, first press) — is proved here against the same
// invariant: the new tab's index equals the PREVIOUS active tab's index + 1,
// with that active tab in the first, middle and last position, and again with
// the strip already at MAX_OPEN_TABS so eviction cannot be the thing that
// breaks it. `openNewTab`'s REUSE branch has its own proof above, since a
// reuse repositions an EXISTING tab rather than minting one.
describe("the new-tab invariant, proved per door: index === previous active index + 1", () => {
  /** Opens `n` one-step tabs via `openBeside`, oldest first — the array order
   * a person accumulates by repeatedly cmd-clicking, never touched again
   * after this returns. */
  function seedTabs(n: number): string[] {
    for (let i = 0; i < n; i++) openBeside(`/seed/S${String(i)}`, `S${String(i)}`)
    return openTabsSnapshot().map((t) => t.id)
  }

  describe.each([
    ["openBeside — cmd/ctrl-click and middle-click's own door", (path: string, label: string) => openBeside(path, label)],
    ["openSoloTab's fallback — the Import wizard, first press", (path: string, label: string) => openSoloTab(path, label)],
    [
      "openNewTab's fallback — the \"+\"/cmd-T, first press",
      // `openNewTab` always mints on `NEW_TAB_PATH` — it takes no path of its
      // own — so the mint helper's `path` argument goes unused here, same as
      // any other door in this table that ignores a parameter it does not need.
      (_path: string, label: string) => {
        openNewTab(label)
      },
    ],
  ] as const)("%s", (_name, mint) => {
    it("active tab FIRST", () => {
      const ids = seedTabs(3)
      activateTab(ids[0] ?? "")
      const prevActiveIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
      mint("/minted/first", "Minted")
      const newIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
      expect(newIndex).toBe(prevActiveIndex + 1)
    })

    it("active tab in the MIDDLE", () => {
      const ids = seedTabs(3)
      activateTab(ids[1] ?? "")
      const prevActiveIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
      mint("/minted/middle", "Minted")
      const newIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
      expect(newIndex).toBe(prevActiveIndex + 1)
    })

    it("active tab LAST", () => {
      const ids = seedTabs(3)
      activateTab(ids[2] ?? "") // already last — activating it changes nothing structural
      const prevActiveIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
      mint("/minted/last", "Minted")
      const newIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
      expect(newIndex).toBe(prevActiveIndex + 1)
    })

    it("with the strip already full, eviction still leaves the new tab immediately right of the active one", () => {
      const ids = seedTabs(MAX_OPEN_TABS)
      // Active somewhere in the middle, freshly touched by `activateTab` —
      // eviction-safe (recency is bumped the instant a tab becomes active).
      const anchor = ids[3] ?? ""
      activateTab(anchor)
      mint("/minted/full-strip", "Minted")
      expect(openTabsSnapshot()).toHaveLength(MAX_OPEN_TABS) // the ceiling held
      const anchorIndex = openTabsSnapshot().findIndex((t) => t.id === anchor)
      expect(anchorIndex, "the tab she opened FROM must survive its own eviction pass").toBeGreaterThanOrEqual(0)
      const newIndex = openTabsSnapshot().findIndex((t) => t.id === activeTabIdSnapshot())
      expect(newIndex).toBe(anchorIndex + 1)
    })
  })
})

// ── THE ONE PATH EXEMPT FROM THE INVARIANT ABOVE, AND WHY ───────────────────
//
// `visitTrail`'s cold-start branch ("no active tab yet, or a cold deep link
// into an empty scope" — its own doc, above) seeds a tab when `tabs` is
// EMPTY: there is no active tab for a fresh arrival to land beside, so
// "index === previous active index + 1" has no previous active index to add
// one to. It is not a fourth door that appends past a real tab set — it can
// only ever run against zero tabs (every other mutator keeps `activeId`
// synced with a real tab whenever `tabs` is non-empty: `setWorkspaceScope`
// seeds it from the persisted set, `openBeside`/`openNewTab`/`openSoloTab`
// all `touch()` before any eviction they trigger, and `closeTab` always hands
// `activeId` a survivor or `null`). Proved here rather than asserted in prose:
// landing cold on an address with tabs ALREADY open never goes through this
// branch at all — it pushes onto the active tab instead, same as any other
// ordinary navigation (the describe block above titled "ordinary navigation
// grows the SAME tab" already covers that half in full).
describe("visitTrail's cold-start seeding is exempt from the invariant above — it only ever runs against zero tabs", () => {
  it("a cold deep link into a truly empty scope opens exactly one tab, at index 0", () => {
    expect(openTabsSnapshot()).toHaveLength(0) // fresh scope, nothing seeded yet
    visitTrail(at(["/accounts/CONFIA", "Confia"], ["/accounts/CONFIA/apps/A1", "APP-1"]))
    expect(openTabsSnapshot()).toHaveLength(1)
    expect(openTabsSnapshot()[0]?.steps.map((s) => s.label)).toEqual(["Confia", "APP-1"])
  })

  it("a cold deep link never fires while real tabs are already open — visitTrail pushes onto the active one instead", () => {
    visitTrail(at(["/apps", "Apps"]))
    openBeside("/tickets", "Tickets")
    const before = openTabsSnapshot().length
    // A "cold" address arriving while tabs exist is just another navigation:
    // it grows the ACTIVE tab's own trail, it does not mint a third tab.
    visitTrail(at(["/accounts/CONFIA", "Confia"]))
    expect(openTabsSnapshot()).toHaveLength(before)
    expect(activeTabPathSnapshot()).toBe("/accounts/CONFIA")
  })
})

describe("it survives a reload, which is why it is not the nav memory", () => {
  it("a fresh document reads the set back, steps and cursor included", () => {
    visitTrail(at(["/apps", "Apps"]))
    visitTrail(at(["/apps/A1", "APP-1"]))
    const before = openTabsSnapshot()
    setWorkspaceScope(null)
    expect(strip()).toEqual([])
    setWorkspaceScope(ME)
    expect(strip()).toEqual(["APP-1"])
    expect(openTabsSnapshot()[0]?.steps).toEqual(before[0]?.steps)
  })

  it("another team is another set — a tab is pinned to one team", () => {
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
    localStorage.setItem("ss-open-tabs:user1:team8", '[{"id":42},{"steps":"nope"},"nope"]')
    setWorkspaceScope("user1:team8")
    expect(strip()).toEqual([])
  })

  it("MIGRATES the old flat {path,label}[] shape — each old tab becomes a one-step trail", () => {
    // The shape every browser on disk carried before 17 Sep 2026.
    const oldShape = [
      { path: "/apps", label: "Apps" },
      { path: "/apps/A1", label: "APP-1" },
    ]
    localStorage.setItem("ss-open-tabs:user1:team-migrate", JSON.stringify(oldShape))
    setWorkspaceScope("user1:team-migrate")
    expect(strip()).toEqual(["Apps", "APP-1"])
    const migrated = openTabsSnapshot()
    expect(migrated.every((t) => t.steps.length === 1 && t.cursor === 0)).toBe(true)
    expect(migrated.map((t) => t.id).every((id) => typeof id === "string" && id.length > 0)).toBe(true)
    // Distinct minted ids — nothing collides just because it migrated in the
    // same pass.
    expect(new Set(migrated.map((t) => t.id)).size).toBe(migrated.length)

    // AND THE MIGRATION IS WRITTEN BACK, so a second load in the same
    // session reads the new shape rather than re-migrating from scratch.
    const onDisk: unknown = JSON.parse(localStorage.getItem("ss-open-tabs:user1:team-migrate") ?? "[]")
    expect(Array.isArray(onDisk) && onDisk.length > 0 && "steps" in (onDisk[0] as object)).toBe(true)
  })
})

describe("it is bounded — this is not Chrome's ninety tabs", () => {
  it("the ceiling holds under a punishing walk of new tabs", () => {
    for (let i = 0; i < MAX_OPEN_TABS * 5; i++) openBeside(`/apps/A${String(i)}`, `APP-${String(i)}`)
    expect(openTabsSnapshot()).toHaveLength(MAX_OPEN_TABS)
  })

  it("a single tab's own trail is capped at MAX_TRAIL_STEPS, oldest step dropped", () => {
    visitTrail(at(["/apps/A0", "APP-0"]))
    for (let i = 1; i < MAX_TRAIL_STEPS + 10; i++) visitTrail(at([`/apps/A${String(i)}`, `APP-${String(i)}`]))
    const [tab] = openTabsSnapshot()
    expect(tab?.steps).toHaveLength(MAX_TRAIL_STEPS)
    expect(tab?.cursor).toBe(MAX_TRAIL_STEPS - 1)
    expect(tab?.steps[0]?.label).not.toBe("APP-0") // the oldest steps fell off
    expect(strip()).toEqual([`APP-${String(MAX_TRAIL_STEPS + 9)}`])
  })

  it("a background tab is two strings per step and nothing else beyond the derived current-step mirror", () => {
    visitTrail(at(["/apps", "Apps"]))
    visitTrail(at(["/apps/A1", "APP-1"]))
    for (const tab of openTabsSnapshot()) {
      // `path`/`label` are a DERIVED mirror of `steps[cursor]` (kept for
      // `agent-panel.tsx`'s own, unmodified read of a tab — see
      // `workspace-tabs.ts`'s own note on `OpenTab`), not a third source of
      // truth: every field here traces back to `id`, `steps` and `cursor`.
      expect(Object.keys(tab).sort()).toEqual(["cursor", "id", "label", "path", "steps"])
      expect(tab.path).toBe(tab.steps[tab.cursor]?.path)
      expect(tab.label).toBe(tab.steps[tab.cursor]?.label)
      for (const step of tab.steps) expect(Object.keys(step).sort()).toEqual(["label", "path"])
    }
  })
})

describe("closing lands somewhere real", () => {
  it("closing the active tab falls to the neighbour on its left", () => {
    visitTrail(at(["/apps", "Apps"]))
    openBeside("/apps/A1", "APP-1")
    const [firstId, secondId] = openTabsSnapshot().map((t) => t.id)
    if (!secondId || !firstId) throw new Error("expected two tabs")
    expect(closeTab(secondId)).toBe("/apps")
    expect(strip()).toEqual(["Apps"])
    expect(activeTabIdSnapshot()).toBe(firstId)
  })

  it("closing the FIRST tab falls to the one that took its place", () => {
    visitTrail(at(["/apps", "Apps"]))
    openBeside("/apps/A1", "APP-1")
    const [firstId, secondId] = openTabsSnapshot().map((t) => t.id)
    if (!firstId || !secondId) throw new Error("expected two tabs")
    expect(closeTab(firstId)).toBe("/apps/A1")
    expect(activeTabIdSnapshot()).toBe(secondId)
  })

  it("closing the last tab standing says so, and the caller falls back", () => {
    visitTrail(at(["/apps/A1", "APP-1"]))
    const id = activeTabIdSnapshot()
    if (!id) throw new Error("expected an active tab")
    expect(closeTab(id)).toBeNull()
    expect(strip()).toEqual([])
    expect(activeTabIdSnapshot()).toBeNull()
  })

  it("closing something that is not open moves nobody", () => {
    visitTrail(at(["/apps", "Apps"]))
    expect(closeTab("not-a-real-id")).toBe("/apps")
    expect(strip()).toEqual(["Apps"])
  })

  it("a closed tab stays closed across a reload", () => {
    visitTrail(at(["/apps", "Apps"]))
    openBeside("/apps/A1", "APP-1")
    const secondId = openTabsSnapshot()[1]?.id
    if (!secondId) throw new Error("expected a second tab")
    closeTab(secondId)
    setWorkspaceScope(null)
    setWorkspaceScope(ME)
    expect(strip()).toEqual(["Apps"])
  })
})

describe("drag to reorder — by id, position only, recency untouched", () => {
  it("moves a tab and touches nothing else", () => {
    visitTrail(at(["/apps/A0", "APP-0"]))
    openBeside("/apps/A1", "APP-1")
    openBeside("/apps/A2", "APP-2")
    const [id0, id1, id2] = openTabsSnapshot().map((t) => t.id)
    if (!id0 || !id1 || !id2) throw new Error("expected three tabs")
    reorderTab(id0, 2)
    expect(openTabsSnapshot().map((t) => t.id)).toEqual([id1, id2, id0])
    // The active tab (id2, fronted last by openBeside) is unaffected by the move.
    expect(activeTabIdSnapshot()).toBe(id2)
  })

  it("an unknown id, or a no-op index, changes nothing", () => {
    visitTrail(at(["/apps/A0", "APP-0"]))
    openBeside("/apps/A1", "APP-1")
    const before = openTabsSnapshot().map((t) => t.id)
    reorderTab("not-a-real-id", 0)
    expect(openTabsSnapshot().map((t) => t.id)).toEqual(before)
  })
})

describe("nothing is recorded unless somebody asks", () => {
  it("no scope, no set — which is how the phone stays exactly as it was", () => {
    setWorkspaceScope(null)
    visitTrail(at(["/apps", "Apps"], ["/apps/A1", "APP-1"]))
    expect(strip()).toEqual([])
  })
})

// THE STRIP'S OWN LABEL FOLLOWS THE CURSOR, NOT THE TAB'S OWN (NOW-RETIRED)
// FLAT `.label`. Back/Forward/Jump change what a tab SHOWS without opening
// or closing anything — `openTabsSnapshot()` is the same length before and
// after, and the strip's word for that tab changes anyway.
describe("what the strip draws", () => {
  const tabs = [
    { id: "a", steps: [{ path: "/apps/A0", label: "APP-0" }], cursor: 0 },
    {
      id: "b",
      steps: [
        { path: "/apps/A1", label: "APP-1" },
        { path: "/apps/A1/sub", label: "SUB" },
      ],
      cursor: 1,
    },
  ]

  it("still draws the set when the address is not the last tab", () => {
    const state = tabStripState(tabs, "/apps/A0", true)
    expect(state).toEqual({ showTabSet: true, activeIndex: 0 })
  })

  it("names a tab by its CURRENT step, not its first one", () => {
    expect(tabStripState(tabs, "/apps/A1", true).activeIndex).toBe(-1) // that step is no longer current
    expect(tabStripState(tabs, "/apps/A1/sub", true)).toEqual({ showTabSet: true, activeIndex: 1 })
  })

  it("the strip label follows the cursor: stepping a tab back changes what it draws, not which tab it is", () => {
    visitTrail(at(["/apps", "Apps"]))
    visitTrail(at(["/apps/A1", "APP-1"]))
    expect(strip()).toEqual(["APP-1"])
    back()
    expect(strip()).toEqual(["Apps"]) // same one tab, new current word
    expect(openTabsSnapshot()).toHaveLength(1)
  })

  it("falls back to the trail when the address is not in the set", () => {
    expect(tabStripState(tabs, "/home", true)).toEqual({ showTabSet: false, activeIndex: -1 })
    expect(tabStripState([], "/apps/A0", true)).toEqual({ showTabSet: false, activeIndex: -1 })
  })

  it("falls back to the trail on a phone even with a full set", () => {
    expect(tabStripState(tabs, "/apps/A0", false).showTabSet).toBe(false)
  })

  it("never reports a set without a live tab to paint", () => {
    for (const path of ["/apps/A0", "/apps/A1/sub", "/home", ""]) {
      const { showTabSet, activeIndex } = tabStripState(tabs, path, true)
      if (showTabSet) expect(activeIndex).toBeGreaterThanOrEqual(0)
    }
  })
})
