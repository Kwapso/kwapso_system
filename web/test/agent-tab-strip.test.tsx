// THE ASSISTANT'S TAB STRIP, AS PAINTED. The client's own words: "all the
// time, there is a visible tab that has a plus button. That's how you create
// a new one." — and later the same day, "I like the history rail tab. Put it
// before the plus tab." CORRECTED 16 Sep 2026, over a screenshot of History
// pinned ahead of every conversation tab: "I want the history tab to be on
// the left of the plus, not the very far left. Put it to the left of the
// plus." This reads the actual DOM the strip draws — every open conversation
// tab FIRST, a pinned clock tab named "History" immediately after them (no
// close button of its own), an icon-only "+" LAST (same), and a real
// conversation tab that DOES carry a close button once `onClose` is wired —
// rather than trusting the component's own comments.

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createPortal } from "react-dom"

import { ScreenShell } from "@shared/ui/compositions/templates/screen-shell"
import { BreadcrumbFolders, type BreadcrumbFoldersItem } from "@shared/ui/components/breadcrumbs/breadcrumb-folders"

import { AgentTabStrip } from "@/components/assistant/agent-tab-strip"
import { AgentDockTabsSlot, useAgentDockTabs } from "@/lib/agent-dock"
import type { AgentTab } from "@/lib/agent-conversation-tabs"

afterEach(cleanup)

const tabs: AgentTab[] = [
  { id: "a", threadId: "t-a", scope: "everything", label: "Conversation" },
  { id: "b", threadId: "t-b", scope: "record", label: "Beringer", recordLabel: "Beringer" },
]

/** The five props every render below needs — spread and overridden per test,
 * so a new required prop only has to be named once here. */
function baseProps() {
  return {
    tabs,
    activeId: "a" as string | null,
    historyActive: false,
    onSelect: vi.fn(),
    onClose: vi.fn(),
    onNew: vi.fn(),
    onOpenHistory: vi.fn(),
  }
}

describe("AgentTabStrip", () => {
  it("draws the \"+\" icon-only, named \"New conversation\", with no close button of its own", () => {
    render(<AgentTabStrip {...baseProps()} />)
    expect(screen.getByRole("link", { name: "New conversation" })).toBeTruthy()
    // "Never closable" — the kit's own × is a SIBLING button beside the tab
    // it belongs to (breadcrumb-folders.tsx), so proving there is exactly one
    // close control per REAL tab and none tied to "+" (or to History) is the
    // DOM-level version of `closable: false`.
    expect(screen.getAllByRole("button", { name: /close tab/i })).toHaveLength(tabs.length)
  })

  it("pressing \"+\" calls onNew, never onSelect or onOpenHistory", () => {
    const props = baseProps()
    render(<AgentTabStrip {...props} />)
    fireEvent.click(screen.getByRole("link", { name: "New conversation" }))
    expect(props.onNew).toHaveBeenCalledTimes(1)
    expect(props.onSelect).not.toHaveBeenCalled()
    expect(props.onOpenHistory).not.toHaveBeenCalled()
  })

  it("clicking a background tab activates it by id, and never navigates the address bar", () => {
    const props = baseProps()
    render(<AgentTabStrip {...props} />)
    const before = window.location.href
    fireEvent.click(screen.getByRole("link", { name: "Beringer" }))
    expect(props.onSelect).toHaveBeenCalledWith("b")
    expect(window.location.href).toBe(before)
  })

  it("closing a real tab reports that tab's own id, never the \"+\"'s or History's", () => {
    const props = baseProps()
    render(<AgentTabStrip {...props} />)
    fireEvent.click(screen.getByRole("button", { name: "Close tab: Beringer" }))
    expect(props.onClose).toHaveBeenCalledWith("b")
  })

  it("a draft tab with an empty label shows the translated \"New\" placeholder", () => {
    const draft: AgentTab[] = [{ id: "d", scope: null, label: "" }]
    render(<AgentTabStrip {...baseProps()} tabs={draft} activeId="d" />)
    // The active/current crumb renders read-only (no link), so it is read by
    // text rather than by role — see breadcrumb-folders.tsx's own TEN STATES.
    expect(screen.getByText("New")).toBeTruthy()
  })

  describe("the pinned History tab — client ruling, 15 Sep 2026, corrected 16 Sep 2026", () => {
    it("draws immediately before \"+\", never at the very front, named \"History\", never closable", () => {
      render(<AgentTabStrip {...baseProps()} />)
      const links = screen.getAllByRole("link")
      const historyIndex = links.indexOf(screen.getByRole("link", { name: "History" }))
      const newIndex = links.indexOf(screen.getByRole("link", { name: "New conversation" }))
      // NOT THE VERY FAR LEFT — the client's own 16 Sep 2026 correction over
      // a screenshot of exactly that regression.
      expect(historyIndex, "History must not be the strip's first tab").toBeGreaterThan(0)
      // AND DIRECTLY LEFT OF "+" — "Put it to the left of the plus."
      expect(historyIndex, "History must sit immediately before \"+\"").toBe(newIndex - 1)
      // NEVER CLOSABLE — the same DOM-level proof the top test above makes
      // for "+": one close button per REAL conversation tab, none for
      // History.
      expect(screen.getAllByRole("button", { name: /close tab/i })).toHaveLength(tabs.length)
    })

    it("pressing it calls onOpenHistory, never onSelect or onNew", () => {
      const props = baseProps()
      render(<AgentTabStrip {...props} />)
      fireEvent.click(screen.getByRole("link", { name: "History" }))
      expect(props.onOpenHistory).toHaveBeenCalledTimes(1)
      expect(props.onSelect).not.toHaveBeenCalled()
      expect(props.onNew).not.toHaveBeenCalled()
    })

    it("shows as the live tab when historyActive is true, even though a conversation is still activeId", () => {
      render(<AgentTabStrip {...baseProps()} historyActive />)
      // The label is still there (an sr-only span, same text either way) —
      // whether it renders as a link or as the read-only live crumb is the
      // kit's own call (`breadcrumb-folders.tsx`'s TEN STATES), not something
      // this strip asserts on directly.
      expect(screen.getByText("History")).toBeTruthy()
      // And the conversation `activeId` still points at is NOT the live
      // crumb while History is showing — it stays an ordinary, clickable
      // link, same as "Beringer" (the other background tab) already is.
      expect(screen.getByRole("link", { name: "Conversation" })).toBeTruthy()
    })
  })

  describe("stacking — the active tab paints above its pinned neighbours (client ruling, 16 Sep 2026, amended 17 Sep 2026)", () => {
    // Her screenshot, verbatim account: "Conversation ×" (active, FIRST) then
    // the clock tab then "+" — and the pinned pair's grey fill covering the
    // active tab's right edge. `agent-tab-strip.tsx` places every open
    // conversation ahead of History and "+" (see this file's own header), so
    // the active tab is very often the LEFTMOST one here, the opposite shape
    // from the main content strip (whose active crumb is always the trail's
    // own last one).
    //
    // AMENDED 17 Sep 2026, kit v1.2.108-era: once the tabs began overlapping
    // ON PURPOSE (`TAB_OVERLAP_MARGIN`), a flat two-value z-index (live vs.
    // rest, both classes) stopped being enough to rank two OVERLAPPING rest
    // tabs against each other, so `breadcrumb-folders.tsx` moved the number
    // off the inner link's `className` entirely: every tab now carries its
    // OWN `style={{ zIndex: stackZ }}` on the `<li>` itself
    // (`[data-slot="breadcrumb-item"]`) — `1`, flat, for the live tab, and
    // `restZIndex(position)` (`-position`, strictly descending by render
    // order) for every rest tab, so the earlier tab always outranks a later
    // one it now overlaps. Proven wrong at the source rather than assumed
    // fixed: this reads the actual rendered inline style, the same
    // discipline the portal and "look" tests above already hold, rather than
    // trusting the mechanism's own comment.
    const activeFirst: AgentTab[] = [
      { id: "a", threadId: "t-a", scope: "everything", label: "Conversation" },
    ]

    /** The stacking authority lives on the `<li>` itself now
     * (`shared/ui/CHANGELOG.md`'s own "Z-INDEX, NOT DOM ORDER" entry), as an
     * inline style rather than a class — `restZIndex`'s own comment explains
     * why it cannot be a class: the value depends on render-time position,
     * which Tailwind cannot see. Read `style.zIndex` directly rather than
     * `getComputedStyle`, because jsdom applies no stylesheet and the value
     * was written inline in the first place. */
    const stackZ = (li: Element): string => (li as HTMLElement).style.zIndex

    it("the active conversation tab (index 0) carries the live z-index 1; History and \"+\" descend strictly by position", () => {
      render(<AgentTabStrip {...baseProps()} tabs={activeFirst} activeId="a" />)
      const items = document.querySelectorAll('[data-slot="breadcrumb-item"]')
      // Conversation (active) · History · "+" — nothing else in this strip.
      expect(items).toHaveLength(3)
      const [conversation, history, plus] = Array.from(items)
      expect(stackZ(conversation), "the active tab, first in the DOM, is still the flat live 1").toBe("1")
      expect(stackZ(history), "History, one position after the live tab, is restZIndex(1)").toBe("-1")
      expect(stackZ(plus), "\"+\", two positions after the live tab, is restZIndex(2)").toBe("-2")
      // 1 > -1 > -2 regardless of paint order, which is the whole mechanism:
      // an active tab ahead of its neighbours in the DOM still paints over
      // them, exactly as the main content strip's own (always-last) active
      // crumb already does over ITS neighbours — and an earlier rest tab
      // still outranks a later one it now overlaps on purpose.
    })

    it("still holds with a second, background conversation tab open", () => {
      render(<AgentTabStrip {...baseProps()} activeId="a" />)
      const items = document.querySelectorAll('[data-slot="breadcrumb-item"]')
      // Conversation (active) · Beringer (background) · History · "+".
      expect(items).toHaveLength(4)
      const [conversation, beringer, history, plus] = Array.from(items)
      expect(stackZ(conversation)).toBe("1")
      expect(stackZ(beringer), "a background conversation tab is restZIndex(1) too").toBe("-1")
      expect(stackZ(history)).toBe("-2")
      expect(stackZ(plus)).toBe("-3")
    })
  })
})

// MOUNTED THROUGH THE KIT'S OWN SLOT — the client's ruling, 15 Sep 2026, over
// a screenshot of this strip nested one level below the kit's single, fixed
// "Assistant" tab, verbatim: "The tabs need to be at the same level as the
// assistant tab, so it will have no assistant name... it's only one tab
// level." Kit v1.2.88's `ScreenShell` gained `asideTabs` for exactly this —
// drawn IN PLACE of the kit's own fixed tab, not beside or under it — and
// this is the proof that the app's own call site (`app-shell.tsx`'s
// `asideTabs={<AgentDockTabsSlot />}`, portalled from `agent-panel.tsx`)
// actually lands there: render the real kit composition with this app's real
// strip as its `asideTabs` and read the aside's own DOM, rather than trusting
// either file's comments.
// DRAG-TO-REORDER — client ruling, 16 Sep 2026, the second of the day on the
// kit's `BreadcrumbFolders`: "go with the drag order" (native HTML5 first),
// corrected the same day to Chrome's own pointer-driven model ("Research and
// implement that", quoted in full in that file's own `onReorder` doc). Kit
// v1.2.95 added the prop; `agent-tab-strip.tsx` forwards it straight through
// (`onReorder={onReorder}` on `BreadcrumbFolders`) and marks History/"+"
// `closable: false` — the SAME field the kit's own `isMovable` gate reads
// (`items[index]?.closable !== false`), so proving `closable: false` here (as
// the tests above already do, at the close-button level) is proving the drag
// gate too, not a second fact to separately pin.
describe("parity with the main content tab strip — client ruling, 17 Sep 2026, verbatim: \"the inctove tabds shape is still overlapping with the active one. tahts worng. shoudl 100% replicate what hapens with main content tabs\"", () => {
  // THE KIT HAS ONE STRIP IMPLEMENTATION — `BreadcrumbFolders` — called
  // directly, with no wrapping `className`, from BOTH mounts: the main
  // content trail (`app-shell.tsx`'s `breadcrumb` prop) and this file's own
  // `AgentTabStrip`. Measured live on staging the same day this test was
  // written (kit v1.2.121, `shared/ui/VERSION.json`, synced 2026-09-18): both
  // strips already carry the identical `--folder-shoulder`/
  // `--folder-tab-overlap` custom properties, the identical per-`<li>`
  // z-index formula (live tab `1`, every rest tab `restZIndex(position)`, the
  // "stacking" describe block above), and an identical, non-overlapping 8px
  // gap between adjacent tabs (`STRIP`'s own `gap-[var(--space-2)]`,
  // `breadcrumb-folders.tsx`'s "THE OVERLAP IS GONE, 18 SEP 2026" comment —
  // the negative-margin NESTING mechanism this law used to complain about was
  // retired upstream, in the kit, for both mounts at once). So there is
  // nothing left for either app-side file to diverge on — this pins that by
  // reading the actual rendered class string rather than trusting the
  // comment: neither call site may grow its OWN className on the strip,
  // because a single character of drift here is exactly how the two strips
  // would stop being "100% the same" again.
  it("AgentTabStrip's own <nav> carries byte-for-byte the same class string as a bare BreadcrumbFolders call — the exact shape app-shell.tsx's content trail uses", () => {
    const { container: agentContainer } = render(<AgentTabStrip {...baseProps()} />)
    const agentNav = agentContainer.querySelector('nav[data-slot="breadcrumb-folders"]')
    expect(agentNav, "AgentTabStrip must mount the kit's own BreadcrumbFolders").toBeTruthy()

    // The content trail's own call shape (`app-shell.tsx`), for the SAME
    // scenario the client's ruling is about — a set of open, closable tabs
    // ("adjacent tab boxes"): `items`, `activeIndex`, a REAL `onClose`,
    // `closeLabel`, `onReorder`, `onClickCapture` — no `className` —
    // reproduced here directly rather than rendering the whole shell, which
    // needs none of AgentTabStrip's own conversation-tab plumbing to make the
    // SAME comparison. `onClose` must be a real function, not left
    // `undefined`: the kit's own `textTrail` gate
    // (`onCurrentActivate === undefined && onClose === undefined`) adds a
    // `max-md:hidden` class the moment BOTH are absent, which is the kit's
    // phone/text-trail fallback and not a difference between the two MOUNTS —
    // `app-shell.tsx` only ever leaves `onClose` `undefined` on a trail with
    // nothing closable at all, never on the open-tab-set shape this test (and
    // the client's own report) is about.
    // `fit="shrink"` HERE TOO, kit v1.2.125 — `app-shell.tsx`'s own tab-set
    // call (`onCloseCrumb` given) now passes it, the identical opt-in
    // `agent-tab-strip.tsx` gives `BreadcrumbFolders` a few lines below this
    // test. Leaving it off this side of the comparison would compare the
    // assistant's real SHRINK shape against a NATURAL one that no real
    // tab-set caller renders any more — a parity test that could pass while
    // the two mounts had already diverged, exactly the class of gap this
    // describe block exists to close.
    const contentItems: BreadcrumbFoldersItem[] = [
      { key: "tasks", label: "Tasks", href: "#tasks" },
      { key: "tickets", label: "Tickets", href: "#tickets" },
    ]
    const { container: contentContainer } = render(
      <BreadcrumbFolders
        items={contentItems}
        activeIndex={0}
        onClose={() => {}}
        closeLabel="Close tab"
        fit="shrink"
      />
    )
    const contentNav = contentContainer.querySelector('nav[data-slot="breadcrumb-folders"]')
    expect(contentNav, "the bare content-strip-shaped call must mount the same component").toBeTruthy()

    expect(
      agentNav!.className,
      "the assistant dock strip's <nav> class string must match the content strip's exactly — neither file may add its own overlap/spacing class"
    ).toBe(contentNav!.className)
  })

  // THE FIT ITSELF — kit v1.2.125, `fit="shrink"`. Her THIRD report on this
  // strip was not the gap or the z-order (both already proven above and in
  // the "stacking" describe block) but OVERFLOW: at the assistant pane's
  // fixed 380px, three open conversations pushed History and "+" off the
  // right edge entirely. `fit="shrink"` splits the strip into a shrinking
  // scroll list and a pinned, never-shrinking one for exactly that trailing
  // run — see breadcrumb-folders.tsx's own `STRIP_SHRINK_ROW` comment for
  // the whole mechanism; this proves only that `AgentTabStrip` actually asks
  // for it, and that History/"+" land in the PINNED half, never the
  // scrolling one.
  it("AgentTabStrip renders through fit=\"shrink\" — two breadcrumb lists, History and \"+\" in the pinned (second) one", () => {
    render(<AgentTabStrip {...baseProps()} />)
    const lists = document.querySelectorAll('[data-slot="breadcrumb-list"]')
    expect(lists, "fit=\"shrink\" draws a scrolling list and a pinned one").toHaveLength(2)

    const plusLink = screen.getByRole("link", { name: "New conversation" })
    const historyLink = screen.getByRole("link", { name: "History" })
    expect(lists[1].contains(plusLink), "\"+\" sits in the pinned (second) list, never the scrolling one").toBe(true)
    expect(lists[0].contains(plusLink), "\"+\" is never a descendant of the scrolling list").toBe(false)
    expect(lists[1].contains(historyLink), "History sits in the pinned (second) list too").toBe(true)
  })
})

describe("drag-to-reorder — client ruling, 16 Sep 2026 (\"go with the drag order\")", () => {
  it("only conversation tabs carry the kit's drag handle; History and \"+\" never do", () => {
    render(<AgentTabStrip {...baseProps()} onReorder={vi.fn()} />)
    const items = document.querySelectorAll('[data-slot="breadcrumb-item"]')
    // Conversation (a) · Beringer (b) · History · "+" — nothing else here.
    expect(items).toHaveLength(4)
    const [a, b, history, plus] = Array.from(items)
    expect(a.className, "a real conversation tab is a drag source").toMatch(/motion-drag/)
    expect(b.className, "so is a background conversation tab").toMatch(/motion-drag/)
    expect(history.className, "the pinned History tab is never a drag source").not.toMatch(/motion-drag/)
    expect(plus.className, "neither is the pinned \"+\"").not.toMatch(/motion-drag/)
  })

  it("with no onReorder given, nothing in the strip carries the drag handle", () => {
    render(<AgentTabStrip {...baseProps()} />)
    const items = document.querySelectorAll('[data-slot="breadcrumb-item"]')
    for (const item of Array.from(items)) {
      expect(item.className).not.toMatch(/motion-drag/)
    }
  })

  it("dragging a conversation tab past its neighbour reorders the conversations, and the move never reaches History/\"+\"'s slots", () => {
    const onReorder = vi.fn()
    const three: AgentTab[] = [
      { id: "a", threadId: "t-a", scope: "everything", label: "Conversation" },
      { id: "b", threadId: "t-b", scope: "record", label: "Beringer", recordLabel: "Beringer" },
      { id: "c", threadId: "t-c", scope: "everything", label: "Chalmers" },
    ]
    render(<AgentTabStrip {...baseProps()} tabs={three} onReorder={onReorder} />)

    // jsdom lays out nothing at all — the kit's own drag maths reads
    // `getBoundingClientRect`, so the geometry it needs is stubbed by hand.
    // a · b · c · History · "+", 100px tabs with a 10px seam between them;
    // History and "+" are never actually read (`movableRange` stops the walk
    // at the first pinned neighbour, index 2), so their numbers here are
    // arbitrary.
    const items = Array.from(document.querySelectorAll('[data-slot="breadcrumb-item"]')) as HTMLLIElement[]
    expect(items).toHaveLength(5)
    const rect = (left: number, width: number) =>
      ({ left, right: left + width, width, top: 0, bottom: 0, height: 0, x: left, y: 0, toJSON: () => ({}) }) as DOMRect
    const lefts = [0, 110, 220, 330, 400]
    const widths = [100, 100, 100, 60, 60]
    items.forEach((li, i) => {
      vi.spyOn(li, "getBoundingClientRect").mockReturnValue(rect(lefts[i], widths[i]))
    })
    const strip = items[0].closest("ol")
    expect(strip, "BreadcrumbList renders an <ol>, which is what the kit measures the run against").toBeTruthy()
    vi.spyOn(strip as HTMLOListElement, "getBoundingClientRect").mockReturnValue(rect(0, 500))
    // jsdom implements neither of these (a real engine gap the kit's own
    // pick-up handler already guards with a try/catch) — a bare stub is
    // enough to let the gesture actually start.
    const draggedEl = items[0] as unknown as {
      setPointerCapture: (id: number) => void
      releasePointerCapture: (id: number) => void
      hasPointerCapture: (id: number) => boolean
    }
    draggedEl.setPointerCapture = () => {}
    draggedEl.releasePointerCapture = () => {}
    draggedEl.hasPointerCapture = () => true

    fireEvent.pointerDown(items[0], { button: 0, pointerId: 1, clientX: 50 })
    fireEvent.pointerMove(items[0], { pointerId: 1, clientX: 165 })
    fireEvent.pointerUp(items[0], { pointerId: 1, clientX: 165 })

    expect(onReorder).toHaveBeenCalledTimes(1)
    const [fromIndex, toIndex] = onReorder.mock.calls[0] as [number, number]
    expect(fromIndex).toBe(0)
    // A REAL MOVE AMONG CONVERSATIONS, AND NOTHING PAST THEM. `movableRange`
    // never lets the run reach History (index 3) or "+" (index 4) — the
    // strongest proof of that is algebraic, not a pixel-perfect one: `toIndex`
    // is `min + target`, where `target` counts only the OTHER tabs in the
    // movable run (here, at most Beringer and Chalmers), so it can never
    // name a pinned tab's slot regardless of how far the pointer travels.
    expect(toIndex).toBeGreaterThan(0)
    expect(toIndex).toBeLessThan(three.length)
  })
})

describe("AgentTabStrip mounted as ScreenShell's asideTabs", () => {
  it("the aside draws exactly one tab strip — the app's own, never the kit's fixed one nested beside it", () => {
    const { container } = render(
      <ScreenShell asideOpen aside={<div>panel body</div>} asideTabs={<AgentTabStrip {...baseProps()} />}>
        <div>content</div>
      </ScreenShell>
    )
    // Scoped to the aside itself (`screen-shell-aside`), not the whole
    // document — the RAIL draws its own `<nav>` too (`Rail`, R45), and this
    // proof is about the ASIDE's tab level specifically, not a document-wide
    // count that a change to the rail could move for an unrelated reason.
    const aside = container.querySelector('[data-slot="screen-shell-aside"]')
    expect(aside, "ScreenShell must draw the aside at all when asideOpen + asideTabs are given").toBeTruthy()
    const navs = aside!.querySelectorAll("nav")
    expect(navs, "one tab level — the app's AgentTabStrip, not a second one nested under the kit's own").toHaveLength(1)
  })

  it("no tab is named \"Assistant\" — that word is the landmark's own name now, never a tab", () => {
    render(
      <ScreenShell asideOpen aside={<div>panel body</div>} asideTabs={<AgentTabStrip {...baseProps()} />}>
        <div>content</div>
      </ScreenShell>
    )
    // The landmark itself still carries the word (`asideLabel`'s default,
    // unchanged) — this is `role="complementary"`'s OWN accessible name, read
    // off the region rather than off any tab inside it.
    expect(screen.getByRole("complementary", { name: "Assistant" })).toBeTruthy()
    // But nothing INSIDE it is a tab called "Assistant" any more — every link
    // the strip actually draws is History, a real conversation, or "+".
    expect(screen.queryByRole("link", { name: "Assistant" })).toBeNull()
  })
})

// THROUGH THE REAL PORTAL, NOT A DIRECT `asideTabs` HAND-OFF. Both describes
// above pass `<AgentTabStrip>` straight to `asideTabs`, which proves the kit
// slot draws this app's strip but never exercises the actual production
// wiring: `agent-panel.tsx` builds the strip at the ROOT and portals it
// (`createPortal`) into the node `AgentDockTabsSlot` publishes
// (`web/lib/agent-dock.tsx`'s `useAgentDockTabs`), several React levels away
// from the routed `ScreenShell`. A regression in that portal specifically —
// the client's report, 16 Sep 2026, that "when I click on the tab, it
// doesn't close" — could pass every test above and still fail in the
// browser, because none of them route a click through the portal boundary.
// This does, reproducing `agent-panel.tsx`'s own shape: a sibling component
// reads `useAgentDockTabs()` and portals `<AgentTabStrip>` into it, exactly
// as the root-mounted `AgentPanel` does.
function PortalledAgentTabStrip(props: ReturnType<typeof baseProps> & { onReorder?: (fromIndex: number, toIndex: number) => void }) {
  const dockTabs = useAgentDockTabs()
  if (!dockTabs) return null
  return createPortal(<AgentTabStrip {...props} />, dockTabs)
}

describe("AgentTabStrip through the real AgentDockTabsSlot portal (agent-panel.tsx's own wiring)", () => {
  it("lands in the aside's tab slot as exactly one tab strip", () => {
    render(
      <>
        <ScreenShell asideOpen aside={<div>panel body</div>} asideTabs={<AgentDockTabsSlot />}>
          <div>content</div>
        </ScreenShell>
        <PortalledAgentTabStrip {...baseProps()} />
      </>
    )
    const aside = document.querySelector('[data-slot="screen-shell-aside"]')
    expect(aside, "ScreenShell must draw the aside").toBeTruthy()
    expect(aside!.querySelectorAll("nav"), "one tab level, reached through the portal").toHaveLength(1)
  })

  it("closing a real conversation tab through the portal still reports that tab's own id", () => {
    const props = baseProps()
    render(
      <>
        <ScreenShell asideOpen aside={<div>panel body</div>} asideTabs={<AgentDockTabsSlot />}>
          <div>content</div>
        </ScreenShell>
        <PortalledAgentTabStrip {...props} />
      </>
    )
    fireEvent.click(screen.getByRole("button", { name: "Close tab: Beringer" }))
    expect(props.onClose).toHaveBeenCalledWith("b")
  })

  // THE LIVE-PAGE REGRESSION, 17 Sep 2026 — "I still cannot switch or close
  // tabs." Measured on staging (main 1a1a86c3) with a headless-Chromium
  // script driving real mouse clicks against the deployed tab strip — a
  // throwaway live-measurement script, not a file this repo keeps: a genuine
  // pointerdown+pointerup on the × — no drag, no movement — produces
  // `Element.setPointerCapture` on the tab's own `<li>` (the kit's
  // `onTabPointerDown`, `breadcrumb-folders.tsx`, fires on ANY primary-button
  // pointerdown inside a `movable` tab, unconditionally on target) BEFORE the
  // browser ever synthesizes the `click`. Per the Pointer Events spec, once an
  // element holds pointer capture the derived `click` for that gesture is
  // retargeted to the CAPTURING element — here the `<li>` — rather than to
  // whatever was visually under the cursor. The `<li>` (`BreadcrumbItem`)
  // carries no `onClick` of its own, so the click is swallowed in the browser
  // before it ever reaches the close `<button>`'s handler — `onClose` never
  // fires. The test above (line ~352) missed this because it calls
  // `fireEvent.click` directly, skipping the pointerdown that triggers the
  // capture, and because `baseProps()` passes no `onReorder` — the tab is
  // `movable: false`, so the kit's drag-pickup handler is never attached in
  // the FIRST PLACE and the bug cannot reproduce. Production always wires
  // `onReorder` (`agent-panel.tsx`: `onReorder={reorderAgentTab}`), so every
  // real conversation tab IS movable, and every real close click is exposed.
  //
  // THE FIX IS `agent-tab-strip.tsx`'s OWN `onPointerDownCapture`, ADDED
  // BELOW `onClickCapture` on the same `<BreadcrumbFolders>` call: a
  // capture-phase pointerdown handler on the `<nav>` (an ANCESTOR of the
  // `<li>` in both the DOM and the fiber tree) that calls `stopPropagation`
  // when the pointerdown's target sits inside `[data-slot="breadcrumb-
  // folders-close"]` — the kit's own stable data-slot for the close control.
  // Capture-phase handlers run top-down, strictly before any bubble-phase
  // handler on a descendant, so stopping propagation there means the kit's
  // own `onPointerDown` (a BUBBLE handler on the `<li>`) never runs for a
  // gesture that started on the close button — `setPointerCapture` is never
  // called, and the click reaches the button exactly as it would on an
  // ordinary (non-draggable) tab. Nothing about dragging the TAB ITSELF
  // changes: a pointerdown anywhere else inside the `<li>` (the label, the
  // shape) still reaches the kit's handler unmodified.
  //
  // The kit's own pointer-capture-on-pointerdown is the deeper defect — the
  // SAME mechanism silently breaks a plain (non-drag) click on a background
  // tab's own LINK too, confirmed live on the content/workspace tab strip
  // (`app-shell.tsx`, the same `BreadcrumbFolders` with its own `onReorder`):
  // a real, no-movement pointerdown+pointerup on a background tab's link also
  // calls `setPointerCapture` on that `<li>` and the tab never activates. The
  // durable fix belongs upstream, in `breadcrumb-folders.tsx`'s
  // `onTabPointerDown` — defer `setPointerCapture` to the first `pointermove`
  // that actually crosses a movement threshold (inside `onTabPointerMove`),
  // rather than taking it unconditionally on `pointerdown`, so an ordinary
  // click never engages capture/retargeting in the first place. This test
  // pins the half of that bug this file can fix without touching the kit —
  // the assistant's own close control.
  it("closing a DRAGGABLE conversation tab still works after a real pointerdown+click on the ×, through the real portal", () => {
    const props = baseProps()
    render(
      <>
        <ScreenShell asideOpen aside={<div>panel body</div>} asideTabs={<AgentDockTabsSlot />}>
          <div>content</div>
        </ScreenShell>
        <PortalledAgentTabStrip {...props} onReorder={vi.fn()} />
      </>
    )
    const closeButton = screen.getByRole("button", { name: "Close tab: Beringer" })
    const li = closeButton.closest('[data-slot="breadcrumb-item"]')
    expect(li, "the close button is the tab's <li> sibling").toBeTruthy()
    expect(li!.className, "this tab must actually be a drag source for the regression to be live").toMatch(/motion-drag/)

    // jsdom implements neither real pointer capture nor click retargeting
    // (the drag test above stubs the same method for the same reason) — a
    // spy is enough to prove the kit's drag-pickup handler never claims a
    // pointerdown that started on the close control, which is what keeps the
    // real browser's retargeting from ever having anything to retarget.
    const captureSpy = vi.fn()
    ;(li as unknown as { setPointerCapture: (id: number) => void }).setPointerCapture = captureSpy

    fireEvent.pointerDown(closeButton, { button: 0, pointerId: 7 })
    expect(
      captureSpy,
      "the drag-pickup handler must not capture the pointer for a gesture that started on the close control — a real browser retargets the click that follows to the capturing <li>, which has no onClick, and the close button never hears about it"
    ).not.toHaveBeenCalled()
    fireEvent.pointerUp(closeButton, { button: 0, pointerId: 7 })
    fireEvent.click(closeButton)
    expect(props.onClose).toHaveBeenCalledWith("b")
  })
})
